import { NextRequest, NextResponse } from 'next/server'
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

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()

        // Verify user is authenticated
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { message, conversationHistory } = await request.json()

        if (!message) {
            return NextResponse.json({ error: 'Message required' }, { status: 400 })
        }

        // Check if user has any documents
        const { count: docCount } = await supabase
            .from('documents')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('status', 'ready')

        const hasDocuments = (docCount ?? 0) > 0

        let matches: MatchResult[] = []
        let context = ''

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

            // Build context from matched chunks
            context = matches.map((m: MatchResult) => m.content).join('\n\n')
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

        // Build conversation history for context
        let historyContext = ''
        if (conversationHistory && conversationHistory.length > 0) {
            // Take last 5 exchanges for context
            const recentHistory = conversationHistory.slice(-10)
            historyContext = recentHistory
                .map((msg: { role: string; content: string }) =>
                    `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
                )
                .join('\n')
        }

        // Generate response using Gemini
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

        let prompt: string

        if (hasDocuments && context) {
            prompt = `You are a strict document-based Q&A assistant. You MUST follow these rules:

CRITICAL RULES:
1. ONLY answer using information explicitly stated in the provided document context
2. Do NOT use any external knowledge, prior training, or assumptions
3. If the answer is not found in the context, say: "I could not find information about this in your documents."
4. Do NOT make inferences beyond what is directly stated
5. Quote or paraphrase directly from the documents when possible
6. If only partial information is available, state what you found and note what's missing

${historyContext ? `Previous conversation:\n${historyContext}\n\n` : ''}
DOCUMENT CONTEXT:
---
${context}
---

USER QUESTION: ${message}

Provide an answer based STRICTLY on the document context above. If the information is not in the documents, say so clearly:`
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

        const result = await model.generateContent(prompt)
        const response = result.response.text()

        // Build sources with actual filenames
        const sources = matches.map((m: MatchResult) => ({
            document_id: m.document_id,
            filename: documentMap[m.document_id] || 'Unknown document',
            chunk: m.content.length > 150 ? m.content.substring(0, 150) + '...' : m.content,
            similarity: m.similarity
        }))

        return NextResponse.json({
            response,
            sources,
            hasDocuments
        })

    } catch (error) {
        console.error('Query error:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Query failed' },
            { status: 500 }
        )
    }
}
