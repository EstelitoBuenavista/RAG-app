-- ============================================================================
-- Migrate embeddings from text-embedding-004 (768d) to gemini-embedding-2 (1536d)
-- ============================================================================
--
-- Run this in the Supabase SQL Editor BEFORE uploading or querying documents
-- with the upgraded app.
--
-- IMPORTANT: Embedding spaces are not compatible across models. Old vectors
-- cannot be converted — they must be regenerated from the source files. This
-- migration therefore DELETES every stored vector and marks all documents
-- 'pending' so they can be reprocessed.
--
-- Your uploaded files in Storage are NOT touched, and neither are your chats.
-- After running this, click "Reprocess all" on the Dashboard (or re-upload) to
-- rebuild the index.
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS vector;

-- 1. Drop any existing vector index; it is bound to the old dimensionality.
DROP INDEX IF EXISTS embeddings_embedding_idx;

-- 2. Clear vectors produced by the previous model.
DELETE FROM embeddings;

-- 3. Widen the column to 1536 dimensions.
--    1536 keeps near-3072 retrieval quality at half the storage, and stays
--    under pgvector's 2000-dimension ceiling for hnsw/ivfflat indexes.
ALTER TABLE embeddings
    ALTER COLUMN embedding TYPE vector(1536);

-- 4. Rebuild the ANN index.
--    hnsw gives better recall/latency than ivfflat and needs no training pass.
--    Cosine distance matches the normalised vectors gemini-embedding-2 returns.
CREATE INDEX embeddings_embedding_idx
    ON embeddings
    USING hnsw (embedding vector_cosine_ops);

-- Supporting index for the per-document deletes the pipeline performs.
CREATE INDEX IF NOT EXISTS embeddings_document_id_idx
    ON embeddings (document_id);

-- 5. Recreate the similarity search function at the new dimensionality.
--    Every existing overload is dropped by OID rather than by a guessed
--    signature: CREATE OR REPLACE cannot change a function's argument types, so
--    a leftover 768-dimension version would make the statement below fail.
DO $$
DECLARE
    fn record;
BEGIN
    FOR fn IN
        SELECT oid::regprocedure AS signature
        FROM pg_proc
        WHERE proname = 'match_embeddings'
          AND pronamespace = 'public'::regnamespace
    LOOP
        EXECUTE format('DROP FUNCTION IF EXISTS %s', fn.signature);
    END LOOP;
END $$;

CREATE FUNCTION match_embeddings(
    query_embedding vector(1536),
    match_threshold float,
    match_count int,
    user_id_input uuid
)
RETURNS TABLE (
    id uuid,
    document_id uuid,
    content text,
    similarity float
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
    SELECT
        e.id,
        e.document_id,
        e.content,
        1 - (e.embedding <=> query_embedding) AS similarity
    FROM embeddings e
    JOIN documents d ON d.id = e.document_id
    WHERE d.user_id = user_id_input
      AND d.status = 'ready'
      AND 1 - (e.embedding <=> query_embedding) > match_threshold
    ORDER BY e.embedding <=> query_embedding
    LIMIT match_count;
$$;

-- 6. Flag every document for reprocessing.
UPDATE documents
SET status = 'pending'
WHERE status IN ('ready', 'error', 'processing');

COMMIT;
