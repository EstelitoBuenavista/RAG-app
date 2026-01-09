import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateEmbedding } from '@/lib/processing/embed'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

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

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()

        // Verify user is authenticated
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            })
        }

        const { message, chatId, conversationHistory } = await request.json()

        if (!message) {
            return new Response(JSON.stringify({ error: 'Message required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            })
        }

        // Create or get chat
        let currentChatId = chatId
        if (!currentChatId) {
            // Create new chat with title from first message
            const title = message.length > 50 ? message.substring(0, 47) + '...' : message
            const { data: newChat, error: chatError } = await supabase
                .from('chats')
                .insert({ user_id: user.id, title })
                .select('id')
                .single()

            if (chatError) {
                console.error('Chat creation error:', chatError)
                return new Response(JSON.stringify({ error: 'Failed to create chat' }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json' }
                })
            }
            currentChatId = newChat.id
        }

        // Save user message
        const { error: userMsgError } = await supabase
            .from('messages')
            .insert({
                chat_id: currentChatId,
                role: 'user',
                content: message
            })

        if (userMsgError) {
            console.error('User message save error:', userMsgError)
        }

        // Check if user has any documents
        const { count: docCount } = await supabase
            .from('documents')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('status', 'ready')

        const hasDocuments = (docCount ?? 0) > 0

        let matches: MatchResult[] = []

        if (hasDocuments) {
            // Generate embedding for the query
            const queryEmbedding = await generateEmbedding(message)

            // Search for similar chunks using vector similarity
            const { data: matchData, error: searchError } = await supabase
                .rpc('match_embeddings', {
                    query_embedding: queryEmbedding,
                    match_threshold: 0.5,
                    match_count: 5,
                    user_id_input: user.id
                })

            if (searchError) {
                console.error('Search error:', searchError)
            } else {
                matches = matchData || []
            }
        }

        // Get document filenames for sources
        const documentIds = [...new Set(matches.map(m => m.document_id))]
        let documentMap: Record<string, string> = {}

        if (documentIds.length > 0) {
            const { data: docs } = await supabase
                .from('documents')
                .select('id, filename')
                .in('id', documentIds)

            if (docs) {
                documentMap = docs.reduce((acc: Record<string, string>, doc: DocumentInfo) => {
                    acc[doc.id] = doc.filename
                    return acc
                }, {})
            }
        }

        // Build numbered sources for citations
        const numberedSources: NumberedSource[] = matches.map((m, index) => ({
            number: index + 1,
            document_id: m.document_id,
            filename: documentMap[m.document_id] || 'Unknown document',
            content: m.content,
            similarity: m.similarity
        }))

        // Build context with numbered references
        const numberedContext = numberedSources
            .map(s => `[Source ${s.number}] (${s.filename}):\n${s.content}`)
            .join('\n\n---\n\n')

        // Build conversation history for context
        let historyContext = ''
        if (conversationHistory && conversationHistory.length > 0) {
            const recentHistory = conversationHistory.slice(-10)
            historyContext = recentHistory
                .map((msg: { role: string; content: string }) =>
                    `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
                )
                .join('\n')
        }

        // Generate response using Gemini
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

        let prompt: string

        if (hasDocuments && numberedSources.length > 0) {
            prompt = `You are a strict document-based Q&A assistant. You MUST follow these rules:

CRITICAL RULES:
1. ONLY answer using information explicitly stated in the provided document sources
2. Do NOT use any external knowledge, prior training, or assumptions
3. ALWAYS cite your sources using the format [1], [2], etc. when referencing information
4. Each claim or piece of information MUST have a citation
5. If the answer is not found in the sources, say: "I could not find information about this in your documents."
6. If only partial information is available, cite what you found and note what's missing

CITATION FORMAT:
- Use [1], [2], [3] etc. to reference sources inline
- Place citations immediately after the relevant statement
- You can cite multiple sources for one statement like [1][2]

${historyContext ? `Previous conversation:\n${historyContext}\n\n` : ''}
DOCUMENT SOURCES:
${numberedContext}

USER QUESTION: ${message}

Provide an answer with inline citations [1], [2], etc. based STRICTLY on the sources above:`
        } else if (hasDocuments) {
            prompt = `You are a document-based Q&A assistant. The user has uploaded documents, but no relevant passages were found matching their question.

RESPONSE GUIDELINES:
- Inform the user that no relevant information was found in their documents for this specific question
- Suggest they rephrase their question or check if the topic is covered in their uploaded documents
- Do NOT try to answer from external knowledge

USER QUESTION: ${message}

Response:`
        } else {
            prompt = `You are a document-based Q&A assistant for Inkwell. The user has not uploaded any documents yet.

RESPONSE:
- Inform the user that they need to upload documents first
- Explain that you can only answer questions based on their uploaded documents
- Do NOT provide any answer to their question from external knowledge

USER QUESTION: ${message}

Response:`
        }

        // Create streaming response with SSE
        const encoder = new TextEncoder()

        const stream = new ReadableStream({
            async start(controller) {
                try {
                    // Send initial metadata
                    const metadata = {
                        type: 'metadata',
                        chatId: currentChatId,
                        sources: numberedSources,
                        hasDocuments
                    }
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(metadata)}\n\n`))

                    // Stream the response
                    const result = await model.generateContentStream(prompt)
                    let fullResponse = ''

                    for await (const chunk of result.stream) {
                        const text = chunk.text()
                        if (text) {
                            fullResponse += text
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'chunk', text })}\n\n`))
                        }
                    }

                    // Save assistant message after streaming completes
                    await supabase
                        .from('messages')
                        .insert({
                            chat_id: currentChatId,
                            role: 'assistant',
                            content: fullResponse,
                            sources: numberedSources.length > 0 ? numberedSources : null
                        })

                    // Update chat timestamp
                    await supabase
                        .from('chats')
                        .update({ updated_at: new Date().toISOString() })
                        .eq('id', currentChatId)

                    // Send done signal
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`))
                    controller.close()
                } catch (error) {
                    console.error('Streaming error:', error)
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: 'Streaming failed' })}\n\n`))
                    controller.close()
                }
            }
        })

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive'
            }
        })

    } catch (error) {
        console.error('Query error:', error)
        return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Query failed' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        })
    }
}
