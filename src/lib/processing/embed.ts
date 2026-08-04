import { getGenAI } from '@/lib/ai/client'
import {
    EMBEDDING_BATCH_SIZE,
    EMBEDDING_DIMENSIONS,
    EMBEDDING_MODEL,
} from '@/lib/ai/config'

/**
 * Embedding generation for the RAG pipeline.
 *
 * ## Why documents and queries are embedded differently
 *
 * `gemini-embedding-2` drops the `taskType` parameter used by the older
 * embedding models and instead expects the task to be stated as a prefix on the
 * text itself. Retrieval is *asymmetric*: a stored passage and the question that
 * should find it look nothing alike, so they get different prefixes. Applying
 * them at both index time and query time is the single largest retrieval-quality
 * win available here — embedding both sides identically (which is what this app
 * used to do) leaves accuracy on the table.
 *
 *   documents -> "title: {title} | text: {content}"
 *   queries   -> "task: question answering | query: {content}"
 *
 * Because the prefixes differ, **document and query vectors are only comparable
 * when both were produced by this module.** Changing a prefix invalidates the
 * index and requires a full re-embed.
 */

/** Prefix applied to every stored passage. */
function documentInput(content: string, title?: string | null): string {
    const safeTitle = title?.trim() ? title.trim() : 'none'
    return `title: ${safeTitle} | text: ${content}`
}

/** Prefix applied to every incoming user question. */
function queryInput(query: string): string {
    return `task: question answering | query: ${query}`
}

/** Retries a request on transient rate-limit / server errors. */
async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
    let lastError: unknown

    for (let attempt = 0; attempt < attempts; attempt++) {
        try {
            return await fn()
        } catch (error) {
            lastError = error
            const message = error instanceof Error ? error.message : String(error)
            const retryable = /\b(429|5\d\d)\b|quota|rate limit|unavailable|overloaded/i.test(
                message
            )
            if (!retryable || attempt === attempts - 1) throw error

            // 1s, 2s, 4s — enough to clear a per-minute quota bucket.
            await new Promise(r => setTimeout(r, 1000 * 2 ** attempt))
        }
    }

    throw lastError
}

/**
 * Embed a batch of texts that already carry their task prefix.
 *
 * Each input is wrapped as its own `Content` object. This matters: passing a
 * plain array of strings makes the API treat them as multiple *parts* of one
 * document and return a single aggregated vector, whereas separate `Content`
 * entries return one vector each, in order.
 *
 * Vectors come back pre-normalised at reduced dimensionality, so no
 * client-side normalisation is required.
 */
async function embedBatch(inputs: string[]): Promise<number[][]> {
    if (inputs.length === 0) return []

    const response = await withRetry(() =>
        getGenAI().models.embedContent({
            model: EMBEDDING_MODEL,
            contents: inputs.map(text => ({ parts: [{ text }] })),
            config: { outputDimensionality: EMBEDDING_DIMENSIONS },
        })
    )

    const embeddings = response.embeddings ?? []

    if (embeddings.length !== inputs.length) {
        throw new Error(
            `Embedding count mismatch: sent ${inputs.length} inputs, received ${embeddings.length} vectors.`
        )
    }

    return embeddings.map((embedding, i) => {
        const values = embedding.values
        if (!values?.length) {
            throw new Error(`Embedding ${i} came back empty.`)
        }
        if (values.length !== EMBEDDING_DIMENSIONS) {
            throw new Error(
                `Embedding ${i} has ${values.length} dimensions, expected ${EMBEDDING_DIMENSIONS}. ` +
                `The database vector column must match GEMINI_EMBEDDING_DIMENSIONS.`
            )
        }
        return values
    })
}

/**
 * Embed document chunks for storage, in batches.
 *
 * `title` is typically the filename — it gives the model document-level context
 * that an isolated mid-document chunk otherwise lacks.
 */
export async function embedDocumentChunks(
    contents: string[],
    title?: string | null
): Promise<number[][]> {
    const vectors: number[][] = []

    for (let i = 0; i < contents.length; i += EMBEDDING_BATCH_SIZE) {
        const batch = contents.slice(i, i + EMBEDDING_BATCH_SIZE)
        vectors.push(...(await embedBatch(batch.map(c => documentInput(c, title)))))
    }

    return vectors
}

/**
 * Embed a single user question for vector search.
 *
 * Must be used for every query — embedding a question with the *document*
 * prefix silently degrades every result.
 */
export async function embedQuery(query: string): Promise<number[]> {
    const [vector] = await embedBatch([queryInput(query)])
    return vector
}
