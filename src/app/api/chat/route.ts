import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { embedQuery } from '@/lib/processing/embed'
import { getGenAI } from '@/lib/ai/client'
import { CHAT_MODEL, HISTORY_TURNS, MATCH_COUNT, MATCH_THRESHOLD } from '@/lib/ai/config'
import {
    SYSTEM_INSTRUCTION,
    buildGroundedPrompt,
    buildNoDocumentsPrompt,
    buildNoMatchPrompt,
    type HistoryTurn,
} from '@/lib/ai/prompts'

interface MatchResult {
    id: string
    document_id: string
    content: string
    similarity: number
}

interface DocumentInfo {
    id: string
    filename: string
}

interface NumberedSource {
    number: number
    document_id: string
    filename: string
    content: string
    similarity: number
}

function json(body: unknown, status: number) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    })
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return json({ error: 'Unauthorized' }, 401)
        }

        const { message, chatId, conversationHistory } = await request.json()

        if (typeof message !== 'string' || !message.trim()) {
            return json({ error: 'Message required' }, 400)
        }
        const question = message.trim()

        // Create or reuse the chat row.
        let currentChatId = chatId
        if (!currentChatId) {
            const title =
                question.length > 50 ? `${question.substring(0, 47)}...` : question
            const { data: newChat, error: chatError } = await supabase
                .from('chats')
                .insert({ user_id: user.id, title })
                .select('id')
                .single()

            if (chatError) {
                console.error('Chat creation error:', chatError)
                return json({ error: 'Failed to create chat' }, 500)
            }
            currentChatId = newChat.id
        }

        const { error: userMsgError } = await supabase
            .from('messages')
            .insert({ chat_id: currentChatId, role: 'user', content: question })

        if (userMsgError) {
            console.error('User message save error:', userMsgError)
        }

        // Does this user have anything to search at all?
        const { count: docCount } = await supabase
            .from('documents')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('status', 'ready')

        const hasDocuments = (docCount ?? 0) > 0

        let matches: MatchResult[] = []

        if (hasDocuments) {
            // Query-side task prefix is applied inside embedQuery.
            const queryEmbedding = await embedQuery(question)

            const { data: matchData, error: searchError } = await supabase.rpc(
                'match_embeddings',
                {
                    query_embedding: queryEmbedding,
                    match_threshold: MATCH_THRESHOLD,
                    match_count: MATCH_COUNT,
                    user_id_input: user.id,
                }
            )

            if (searchError) {
                console.error('Search error:', searchError)
            } else {
                matches = matchData || []
            }
        }

        // Resolve filenames for the matched chunks.
        const documentIds = [...new Set(matches.map(m => m.document_id))]
        let documentMap: Record<string, string> = {}

        if (documentIds.length > 0) {
            const { data: docs } = await supabase
                .from('documents')
                .select('id, filename')
                .in('id', documentIds)

            if (docs) {
                documentMap = docs.reduce(
                    (acc: Record<string, string>, doc: DocumentInfo) => {
                        acc[doc.id] = doc.filename
                        return acc
                    },
                    {}
                )
            }
        }

        const numberedSources: NumberedSource[] = matches.map((m, index) => ({
            number: index + 1,
            document_id: m.document_id,
            filename: documentMap[m.document_id] || 'Unknown document',
            content: m.content,
            similarity: m.similarity,
        }))

        const history: HistoryTurn[] = Array.isArray(conversationHistory)
            ? conversationHistory.slice(-HISTORY_TURNS)
            : []

        const prompt =
            hasDocuments && numberedSources.length > 0
                ? buildGroundedPrompt(question, numberedSources, history)
                : hasDocuments
                    ? buildNoMatchPrompt(question, history)
                    : buildNoDocumentsPrompt(question, history)

        const encoder = new TextEncoder()

        const stream = new ReadableStream({
            async start(controller) {
                const send = (payload: unknown) =>
                    controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify(payload)}\n\n`)
                    )

                try {
                    send({
                        type: 'metadata',
                        chatId: currentChatId,
                        sources: numberedSources,
                        hasDocuments,
                    })

                    const result = await getGenAI().models.generateContentStream({
                        model: CHAT_MODEL,
                        contents: prompt,
                        config: {
                            systemInstruction: SYSTEM_INSTRUCTION,
                            // Grounded extraction wants determinism, not flair.
                            temperature: 0.2,
                        },
                    })

                    let fullResponse = ''
                    for await (const chunk of result) {
                        const text = chunk.text
                        if (text) {
                            fullResponse += text
                            send({ type: 'chunk', text })
                        }
                    }

                    // Keep only sources the model actually cited.
                    const citedNumbers = new Set<number>()
                    for (const match of fullResponse.matchAll(/\[(\d+)\]/g)) {
                        citedNumbers.add(parseInt(match[1]))
                    }
                    const citedSources = numberedSources.filter(s =>
                        citedNumbers.has(s.number)
                    )

                    await supabase.from('messages').insert({
                        chat_id: currentChatId,
                        role: 'assistant',
                        content: fullResponse,
                        sources: citedSources.length > 0 ? citedSources : null,
                    })

                    await supabase
                        .from('chats')
                        .update({ updated_at: new Date().toISOString() })
                        .eq('id', currentChatId)

                    send({ type: 'done', sources: citedSources })
                    controller.close()
                } catch (error) {
                    console.error('Streaming error:', error)
                    send({
                        type: 'error',
                        message:
                            error instanceof Error
                                ? error.message
                                : 'Streaming failed',
                    })
                    controller.close()
                }
            },
        })

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache, no-transform',
                Connection: 'keep-alive',
                'X-Accel-Buffering': 'no',
            },
        })
    } catch (error) {
        console.error('Query error:', error)
        return json(
            { error: error instanceof Error ? error.message : 'Query failed' },
            500
        )
    }
}
