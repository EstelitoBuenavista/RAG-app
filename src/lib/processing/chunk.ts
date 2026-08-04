/**
 * Split text into overlapping chunks for embedding.
 */
export interface ChunkOptions {
    chunkSize?: number      // Target size in characters
    chunkOverlap?: number   // Overlap between chunks
}

export interface TextChunk {
    content: string
    index: number
    startChar: number
    endChar: number
}

/**
 * Defaults are sized for `gemini-embedding-2`, whose 8,192-token window leaves
 * plenty of headroom. ~1500 characters keeps a chunk topically focused (so its
 * vector stays sharp) while still carrying enough context to stand alone, and
 * matches the Unstructured.io chunk size so both paths behave alike.
 */
const DEFAULT_CHUNK_SIZE = 1500
const DEFAULT_CHUNK_OVERLAP = 250

export function chunkText(
    text: string,
    options: ChunkOptions = {}
): TextChunk[] {
    const {
        chunkSize = DEFAULT_CHUNK_SIZE,
        chunkOverlap = DEFAULT_CHUNK_OVERLAP,
    } = options

    // Overlap must leave forward progress, or the loop below never terminates.
    const overlap = Math.min(chunkOverlap, Math.floor(chunkSize / 2))

    const chunks: TextChunk[] = []
    let startIndex = 0
    let chunkIndex = 0

    while (startIndex < text.length) {
        let endIndex = startIndex + chunkSize

        // Prefer breaking on a sentence, then a word, rather than mid-token.
        if (endIndex < text.length) {
            const sentenceEnd = text.lastIndexOf('. ', endIndex)
            if (sentenceEnd > startIndex + chunkSize / 2) {
                endIndex = sentenceEnd + 1
            } else {
                const wordEnd = text.lastIndexOf(' ', endIndex)
                if (wordEnd > startIndex + chunkSize / 2) {
                    endIndex = wordEnd
                }
            }
        }

        const content = text.slice(startIndex, endIndex).trim()

        if (content.length > 0) {
            chunks.push({
                content,
                index: chunkIndex,
                startChar: startIndex,
                endChar: endIndex,
            })
            chunkIndex++
        }

        const nextStart = endIndex - overlap
        // Guard against a pathological boundary that fails to advance.
        startIndex = nextStart > startIndex ? nextStart : endIndex
        if (startIndex >= text.length) break
    }

    return chunks
}
