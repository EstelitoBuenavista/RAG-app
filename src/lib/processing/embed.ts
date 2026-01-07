import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

/**
 * Generate embeddings for a text using Gemini's text-embedding-004 model
 * Returns a 768-dimensional vector
 */
export async function generateEmbedding(text: string): Promise<number[]> {
    const model = genAI.getGenerativeModel({ model: 'text-embedding-004' })

    const result = await model.embedContent(text)
    return result.embedding.values
}

/**
 * Generate embeddings for multiple texts in batch
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
    const embeddings = await Promise.all(
        texts.map(text => generateEmbedding(text))
    )
    return embeddings
}
