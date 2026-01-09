import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
    params: Promise<{ id: string }>
}

// GET /api/chats/[id] - Get chat with messages
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get chat (RLS ensures user owns it)
        const { data: chat, error: chatError } = await supabase
            .from('chats')
            .select('id, title, created_at, updated_at')
            .eq('id', id)
            .single()

        if (chatError || !chat) {
            return NextResponse.json({ error: 'Chat not found' }, { status: 404 })
        }

        // Get messages for this chat
        const { data: messages, error: msgError } = await supabase
            .from('messages')
            .select('id, role, content, sources, created_at')
            .eq('chat_id', id)
            .order('created_at', { ascending: true })

        if (msgError) {
            console.error('Fetch messages error:', msgError)
            return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
        }

        return NextResponse.json({ chat, messages })
    } catch (error) {
        console.error('Get chat error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// DELETE /api/chats/[id] - Delete chat
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { error } = await supabase
            .from('chats')
            .delete()
            .eq('id', id)

        if (error) {
            console.error('Delete chat error:', error)
            return NextResponse.json({ error: 'Failed to delete chat' }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Delete chat error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// PATCH /api/chats/[id] - Update chat title
export async function PATCH(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { title } = await request.json()

        if (!title) {
            return NextResponse.json({ error: 'Title required' }, { status: 400 })
        }

        const { data: chat, error } = await supabase
            .from('chats')
            .update({ title })
            .eq('id', id)
            .select('id, title, created_at, updated_at')
            .single()

        if (error) {
            console.error('Update chat error:', error)
            return NextResponse.json({ error: 'Failed to update chat' }, { status: 500 })
        }

        return NextResponse.json({ chat })
    } catch (error) {
        console.error('Update chat error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
