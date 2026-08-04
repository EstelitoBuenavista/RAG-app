import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { embedDocumentChunks } from '@/lib/processing/embed'
import { chunkText, TextChunk } from '@/lib/processing/chunk'
import { parseDocument } from '@/lib/processing/parse'
import {
    processWithUnstructured,
    convertToTextChunks,
    isUnstructuredConfigured,
} from '@/lib/processing/unstructured'

/** Rows inserted per Supabase call. Keeps payloads well under request limits. */
const INSERT_BATCH_SIZE = 50

export async function POST(request: NextRequest) {
    const supabase = await createClient()
    let documentId: string | undefined

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        documentId = body.documentId

        if (!documentId) {
            return NextResponse.json(
                { error: 'Document ID required' },
                { status: 400 }
            )
        }

        const { data: document, error: docError } = await supabase
            .from('documents')
            .select('*')
            .eq('id', documentId)
            .eq('user_id', user.id)
            .single()

        if (docError || !document) {
            return NextResponse.json({ error: 'Document not found' }, { status: 404 })
        }

        await supabase
            .from('documents')
            .update({ status: 'processing' })
            .eq('id', documentId)

        const { data: fileData, error: downloadError } = await supabase.storage
            .from('documents')
            .download(document.storage_path)

        if (downloadError || !fileData) {
            await supabase
                .from('documents')
                .update({ status: 'error' })
                .eq('id', documentId)
            return NextResponse.json(
                { error: 'Failed to download file' },
                { status: 500 }
            )
        }

        const buffer = Buffer.from(await fileData.arrayBuffer())
        const filename = document.filename || 'document'
        let chunks: TextChunk[]
        let processingMethod = 'fallback'

        // Prefer Unstructured.io's structure-aware chunking when available.
        if (isUnstructuredConfigured()) {
            try {
                const result = await processWithUnstructured(buffer, filename, {
                    chunkingStrategy: 'by_title',
                    maxCharacters: 1500,
                    overlap: 200,
                })
                chunks = convertToTextChunks(result)
                processingMethod = 'unstructured'
            } catch (unstructuredError) {
                console.warn(
                    'Unstructured.io failed, falling back to local chunking:',
                    unstructuredError
                )
                const { text } = await parseDocument(
                    buffer,
                    document.mime_type || '',
                    filename
                )
                chunks = chunkText(text)
            }
        } else {
            const { text } = await parseDocument(
                buffer,
                document.mime_type || '',
                filename
            )
            chunks = chunkText(text)
        }

        if (chunks.length === 0) {
            await supabase
                .from('documents')
                .update({ status: 'error' })
                .eq('id', documentId)
            return NextResponse.json(
                { error: 'No readable text found in this document.' },
                { status: 422 }
            )
        }

        // Reprocessing the same document shouldn't duplicate its vectors.
        await supabase.from('embeddings').delete().eq('document_id', documentId)

        // One batched call per EMBEDDING_BATCH_SIZE chunks instead of one HTTP
        // round trip per chunk. The filename is passed as the document title so
        // each chunk carries document-level context into its vector.
        const vectors = await embedDocumentChunks(
            chunks.map(c => c.content),
            filename
        )

        const rows = chunks.map((chunk, i) => ({
            document_id: documentId,
            content: chunk.content,
            embedding: vectors[i],
            chunk_index: chunk.index,
        }))

        for (let i = 0; i < rows.length; i += INSERT_BATCH_SIZE) {
            const { error: insertError } = await supabase
                .from('embeddings')
                .insert(rows.slice(i, i + INSERT_BATCH_SIZE))

            if (insertError) {
                throw new Error(`Failed to store embeddings: ${insertError.message}`)
            }
        }

        await supabase
            .from('documents')
            .update({ status: 'ready' })
            .eq('id', documentId)

        return NextResponse.json({
            success: true,
            chunks: chunks.length,
            processingMethod,
        })
    } catch (error) {
        console.error('Processing error:', error)

        // Without this the document sits at "processing" forever and the UI
        // polls it indefinitely.
        if (documentId) {
            await supabase
                .from('documents')
                .update({ status: 'error' })
                .eq('id', documentId)
        }

        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Processing failed' },
            { status: 500 }
        )
    }
}
