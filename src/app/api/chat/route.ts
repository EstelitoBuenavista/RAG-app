import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateEmbedding } from '@/lib/processing/embed'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()

        // Verify user is authenticated
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { message, chatId } = await request.json()

        if (!message) {
            return NextResponse.json({ error: 'Message required' }, { status: 400 })
        }

        // Generate embedding for the query
        const queryEmbedding = await generateEmbedding(message)

        // Search for similar chunks using vector similarity
        // Note: This requires a Supabase function - see NEXT_STEPS.md
        const { data: matches, error: searchError } = await supabase
            .rpc('match_embeddings', {
                query_embedding: queryEmbedding,
                match_threshold: 0.7,
                match_count: 5,
                user_id_input: user.id
            })

        if (searchError) {
            console.error('Search error:', searchError)
            // Continue without context if search fails
        }

        // Build context from matched chunks
        const context = matches?.map((m: { content: string }) => m.content).join('\n\n') || ''

        // Generate response using Gemini
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

        const prompt = context
            ? `Based on the following context from the user's documents, answer their question. If the context doesn't contain relevant information, say so.

Context:
${context}

Question: ${message}

Answer:`
            : `The user hasn't uploaded any documents yet, or no relevant context was found. Please let them know they should upload documents first, or answer their general question if possible.

Question: ${message}

Answer:`

        const result = await model.generateContent(prompt)
        const response = result.response.text()

        // Store messages in database if chatId provided
        if (chatId) {
            await supabase.from('messages').insert([
                { chat_id: chatId, role: 'user', content: message },
                {
                    chat_id: chatId,
                    role: 'assistant',
                    content: response,
                    sources: matches?.map((m: { document_id: string; content: string }) => ({
                        document_id: m.document_id,
                        chunk: m.content.substring(0, 100) + '...'
                    })) || []
                }
            ])
        }

        return NextResponse.json({
            response,
            sources: matches?.map((m: { document_id: string; content: string }) => ({
                document_id: m.document_id,
                chunk: m.content.substring(0, 100) + '...'
            })) || []
        })

    } catch (error) {
        console.error('Query error:', error)
        return NextResponse.json(
            { error: 'Query failed' },
            { status: 500 }
        )
    }
}
