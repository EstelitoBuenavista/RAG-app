import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateEmbedding } from '@/lib/processing/embed'
import { chunkText, TextChunk } from '@/lib/processing/chunk'
import { parseDocument } from '@/lib/processing/parse'
import {
    processWithUnstructured,
    convertToTextChunks,
    isUnstructuredConfigured
} from '@/lib/processing/unstructured'

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()

        // Verify user is authenticated
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { documentId } = await request.json()

        if (!documentId) {
            return NextResponse.json({ error: 'Document ID required' }, { status: 400 })
        }

        // Get document from database
        const { data: document, error: docError } = await supabase
            .from('documents')
            .select('*')
            .eq('id', documentId)
            .eq('user_id', user.id)
            .single()

        if (docError || !document) {
            return NextResponse.json({ error: 'Document not found' }, { status: 404 })
        }

        // Update status to processing
        await supabase
            .from('documents')
            .update({ status: 'processing' })
            .eq('id', documentId)

        // Download file from storage
        const { data: fileData, error: downloadError } = await supabase.storage
            .from('documents')
            .download(document.storage_path)

        if (downloadError || !fileData) {
            await supabase
                .from('documents')
                .update({ status: 'error' })
                .eq('id', documentId)
            return NextResponse.json({ error: 'Failed to download file' }, { status: 500 })
        }

        const buffer = Buffer.from(await fileData.arrayBuffer())
        let chunks: TextChunk[]
        let processingMethod = 'fallback'

        // Try Unstructured.io first if configured
        if (isUnstructuredConfigured()) {
            try {
                console.log('Attempting Unstructured.io processing...')
                const result = await processWithUnstructured(
                    buffer,
                    document.filename || 'document',
                    {
                        chunkingStrategy: 'by_title',
                        maxCharacters: 1500,
                        overlap: 200
                    }
                )
                chunks = convertToTextChunks(result)
                processingMethod = 'unstructured'
                console.log(`Unstructured.io processed ${chunks.length} chunks`)
            } catch (unstructuredError) {
                console.warn('Unstructured.io processing failed, falling back to regular chunking:', unstructuredError)
                // Fall through to regular processing
                const { text } = await parseDocument(
                    buffer,
                    document.mime_type || '',
                    document.filename || ''
                )
                chunks = chunkText(text, { chunkSize: 1000, chunkOverlap: 200 })
            }
        } else {
            // Unstructured not configured, use regular processing
            console.log('Unstructured.io not configured, using regular chunking')
            const { text } = await parseDocument(
                buffer,
                document.mime_type || '',
                document.filename || ''
            )
            chunks = chunkText(text, { chunkSize: 1000, chunkOverlap: 200 })
        }

        // Generate embeddings and store
        for (const chunk of chunks) {
            const embedding = await generateEmbedding(chunk.content)

            await supabase
                .from('embeddings')
                .insert({
                    document_id: documentId,
                    content: chunk.content,
                    embedding: embedding,
                    chunk_index: chunk.index,
                })
        }

        // Update status to ready
        await supabase
            .from('documents')
            .update({ status: 'ready' })
            .eq('id', documentId)

        return NextResponse.json({
            success: true,
            chunks: chunks.length,
            processingMethod
        })

    } catch (error) {
        console.error('Processing error:', error)
        const errorMessage = error instanceof Error ? error.message : 'Processing failed'
        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        )
    }
}
