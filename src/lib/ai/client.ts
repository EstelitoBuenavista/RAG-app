import { GoogleGenAI } from '@google/genai'

let client: GoogleGenAI | null = null

/**
 * Lazily-constructed shared Gemini client.
 *
 * Lazy rather than module-scope so that importing this file during a build (or
 * in a route that never reaches Gemini) doesn't explode when the key is absent.
 */
export function getGenAI(): GoogleGenAI {
    if (!client) {
        const apiKey = process.env.GEMINI_API_KEY
        if (!apiKey) {
            throw new Error(
                'GEMINI_API_KEY is not set. Add it to .env.local — see env.template.'
            )
        }
        client = new GoogleGenAI({ apiKey })
    }
    return client
}
