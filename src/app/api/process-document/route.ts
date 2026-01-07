import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateEmbedding } from '@/lib/processing/embed'
import { chunkText } from '@/lib/processing/chunk'

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

        // Extract text (for now, only supports plain text)
        const text = await fileData.text()

        // Chunk the text
        const chunks = chunkText(text, { chunkSize: 1000, chunkOverlap: 200 })

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
            chunks: chunks.length
        })

    } catch (error) {
        console.error('Processing error:', error)
        return NextResponse.json(
            { error: 'Processing failed' },
            { status: 500 }
        )
    }
}
