import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/chats - List user's chats
export async function GET() {
    try {
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: chats, error } = await supabase
            .from('chats')
            .select('id, title, created_at, updated_at')
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false })

        if (error) {
            console.error('Fetch chats error:', error)
            return NextResponse.json({ error: 'Failed to fetch chats' }, { status: 500 })
        }

        return NextResponse.json({ chats })
    } catch (error) {
        console.error('Chats error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// POST /api/chats - Create new chat
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json().catch(() => ({}))
        const title = body.title || 'New Chat'

        const { data: chat, error } = await supabase
            .from('chats')
            .insert({ user_id: user.id, title })
            .select('id, title, created_at, updated_at')
            .single()

        if (error) {
            console.error('Create chat error:', error)
            return NextResponse.json({ error: 'Failed to create chat' }, { status: 500 })
        }

        return NextResponse.json({ chat })
    } catch (error) {
        console.error('Create chat error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
