import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - Fetch all documents for the current user
export async function GET() {
    try {
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: documents, error } = await supabase
            .from('documents')
            .select('id, filename, mime_type, file_size, status, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ documents })
    } catch (error) {
        console.error('Error fetching documents:', error)
        return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 })
    }
}

// DELETE - Delete a document (or all documents if no ID provided)
export async function DELETE(request: NextRequest) {
    try {
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { documentId, clearAll } = await request.json()

        // Clear all documents for the user
        if (clearAll) {
            // Get all user's documents
            const { data: userDocs } = await supabase
                .from('documents')
                .select('id, storage_path')
                .eq('user_id', user.id)

            if (userDocs && userDocs.length > 0) {
                const docIds = userDocs.map(d => d.id)
                const storagePaths = userDocs.map(d => d.storage_path).filter(Boolean)

                // Delete all embeddings
                await supabase
                    .from('embeddings')
                    .delete()
                    .in('document_id', docIds)

                // Delete all document records
                await supabase
                    .from('documents')
                    .delete()
                    .eq('user_id', user.id)

                // Delete files from storage
                if (storagePaths.length > 0) {
                    await supabase.storage
                        .from('documents')
                        .remove(storagePaths)
                }
            }

            return NextResponse.json({ success: true, deleted: userDocs?.length ?? 0 })
        }

        // Delete single document
        if (!documentId) {
            return NextResponse.json({ error: 'Document ID required' }, { status: 400 })
        }

        // Verify document belongs to user and get storage path
        const { data: document, error: docError } = await supabase
            .from('documents')
            .select('id, storage_path')
            .eq('id', documentId)
            .eq('user_id', user.id)
            .single()

        if (docError || !document) {
            return NextResponse.json({ error: 'Document not found' }, { status: 404 })
        }

        // Delete embeddings first (foreign key constraint)
        await supabase
            .from('embeddings')
            .delete()
            .eq('document_id', documentId)

        // Delete document record
        const { error: deleteError } = await supabase
            .from('documents')
            .delete()
            .eq('id', documentId)

        if (deleteError) {
            return NextResponse.json({ error: deleteError.message }, { status: 500 })
        }

        // Delete file from storage
        if (document.storage_path) {
            await supabase.storage
                .from('documents')
                .remove([document.storage_path])
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting document:', error)
        return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 })
    }
}
