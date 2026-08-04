/**
 * Central configuration for every Gemini model the app talks to.
 *
 * Keeping the IDs here means a model upgrade is a one-line change instead of a
 * hunt through the API routes.
 */

/** Chat / generation model. */
export const CHAT_MODEL = process.env.GEMINI_CHAT_MODEL ?? 'gemini-3.6-flash'

/**
 * Embedding model.
 *
 * `gemini-embedding-2` (GA, April 2026) replaces the retired
 * `text-embedding-004`. It accepts 8,192 input tokens (vs 2,048), supports
 * Matryoshka dimension truncation, and auto-normalises truncated vectors, so we
 * never have to renormalise client-side.
 */
export const EMBEDDING_MODEL =
    process.env.GEMINI_EMBEDDING_MODEL ?? 'gemini-embedding-2'

/**
 * Output dimensionality for stored vectors.
 *
 * 1536 is the sweet spot: near-3072 retrieval quality at half the storage, and
 * it stays under pgvector's 2,000-dimension ceiling for hnsw/ivfflat indexes.
 * This MUST match `vector(N)` on `embeddings.embedding` in Postgres — see
 * `supabase/migrations/`.
 */
export const EMBEDDING_DIMENSIONS = Number(
    process.env.GEMINI_EMBEDDING_DIMENSIONS ?? 1536
)

/**
 * How many chunks to send per `embedContent` call. The API returns one vector
 * per entry, so batching turns an N-round-trip loop into N/BATCH round trips.
 */
export const EMBEDDING_BATCH_SIZE = 16

/**
 * Minimum cosine similarity for a chunk to be handed to the model.
 *
 * Calibrated against gemini-embedding-2 at 1536 dimensions with the task
 * prefixes in `processing/embed.ts`. Measured over known-relevant vs
 * known-irrelevant query/passage pairs:
 *
 *   relevant   0.74 - 0.79
 *   irrelevant 0.45 - 0.56
 *
 * This model's similarity floor sits far higher than text-embedding-004's, so
 * the old 0.5 threshold admitted roughly two thirds of *unrelated* passages.
 * 0.6 sits in the empty band between the two clusters — it dropped every
 * irrelevant passage while keeping every relevant one.
 *
 * Retune this if you change the model, the dimensionality, or the prefixes.
 */
export const MATCH_THRESHOLD = Number(process.env.RAG_MATCH_THRESHOLD ?? 0.6)

/** Maximum chunks retrieved per question. */
export const MATCH_COUNT = Number(process.env.RAG_MATCH_COUNT ?? 8)

/** Turns of prior conversation replayed into the prompt. */
export const HISTORY_TURNS = 10
