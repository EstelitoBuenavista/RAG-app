/**
 * Unstructured.io Integration for Document Processing
 * 
 * Uses Unstructured.io API for intelligent document parsing and chunking.
 * Supports PDFs, DOCX, and other document types with structure-aware chunking.
 */

import { UnstructuredClient } from 'unstructured-client'
import { Strategy } from 'unstructured-client/sdk/models/shared'

// Chunking strategy types
export type ChunkingStrategy = 'basic' | 'by_title' | 'by_page' | 'by_similarity'

export interface UnstructuredOptions {
    chunkingStrategy?: ChunkingStrategy  // Default: 'by_title'
    maxCharacters?: number               // Max chars per chunk (default: 1500)
    newAfterNChars?: number              // Soft max before starting new chunk (default: 1000)
    overlap?: number                     // Overlap between chunks (default: 200)
    combineUnderNChars?: number          // Combine small sections (default: 500)
    similarityThreshold?: number         // For 'by_similarity' strategy (default: 0.5)
}

export interface UnstructuredChunk {
    content: string
    index: number
    elementType: string
    metadata: {
        page_number?: number
        filename?: string
        filetype?: string
        languages?: string[]
    }
}

export interface UnstructuredResult {
    chunks: UnstructuredChunk[]
    metadata: {
        totalElements: number
        totalChunks: number
        filename?: string
        filetype?: string
    }
}

/**
 * Create Unstructured client instance
 */
function createUnstructuredClient(): UnstructuredClient {
    const apiKey = process.env.UNSTRUCTURED_API_KEY

    if (!apiKey) {
        throw new Error('UNSTRUCTURED_API_KEY environment variable is not set. Get your API key at https://unstructured.io/api-key-hosted')
    }

    return new UnstructuredClient({
        security: {
            apiKeyAuth: apiKey,
        },
    })
}

/**
 * Process a document using Unstructured.io API
 * 
 * This function handles:
 * - Intelligent document parsing (tables, headers, paragraphs)
 * - Structure-aware chunking
 * - PDF, DOCX, and other format support
 * 
 * @param fileBuffer - The file content as a Buffer
 * @param filename - Original filename (used for type detection)
 * @param options - Chunking configuration options
 * @returns Processed chunks with metadata
 */
export async function processWithUnstructured(
    fileBuffer: Buffer,
    filename: string,
    options: UnstructuredOptions = {}
): Promise<UnstructuredResult> {
    const {
        chunkingStrategy = 'by_title',
        maxCharacters = 1500,
        newAfterNChars = 1000,
        overlap = 200,
        combineUnderNChars = 500,
        similarityThreshold = 0.5,
    } = options

    const client = createUnstructuredClient()

    console.log(`Processing document with Unstructured.io: ${filename}`)
    console.log(`Chunking strategy: ${chunkingStrategy}, max chars: ${maxCharacters}`)

    try {
        // Build partition parameters
        const partitionParameters: Record<string, unknown> = {
            files: {
                content: fileBuffer,
                fileName: filename,
            },
            strategy: Strategy.Auto,
            chunkingStrategy: chunkingStrategy,
            maxCharacters: maxCharacters,
            newAfterNChars: newAfterNChars,
            overlap: overlap,
        }

        // Add strategy-specific parameters
        if (chunkingStrategy === 'by_title') {
            partitionParameters.combineUnderNChars = combineUnderNChars
            partitionParameters.multipageSections = true
        }

        if (chunkingStrategy === 'by_similarity') {
            partitionParameters.similarityThreshold = similarityThreshold
        }

        const response = await client.general.partition({
            partitionParameters: partitionParameters as any,
        })

        // The SDK returns elements directly or throws on error
        const elements = (response as unknown as Array<{
            type?: string
            text?: string
            metadata?: Record<string, unknown>
        }>) || []

        // Convert elements to chunks
        const chunks: UnstructuredChunk[] = elements
            .filter(el => el.text && el.text.trim().length > 0)
            .map((el, index) => ({
                content: el.text || '',
                index,
                elementType: el.type || 'unknown',
                metadata: {
                    page_number: el.metadata?.page_number as number | undefined,
                    filename: el.metadata?.filename as string | undefined,
                    filetype: el.metadata?.filetype as string | undefined,
                    languages: el.metadata?.languages as string[] | undefined,
                },
            }))

        console.log(`Unstructured.io returned ${elements.length} elements, ${chunks.length} chunks with content`)

        return {
            chunks,
            metadata: {
                totalElements: elements.length,
                totalChunks: chunks.length,
                filename,
                filetype: chunks[0]?.metadata?.filetype,
            },
        }
    } catch (error) {
        console.error('Unstructured.io processing error:', error)
        throw error
    }
}

/**
 * Convert Unstructured chunks to the format expected by our embedding system
 */
export function convertToTextChunks(result: UnstructuredResult): Array<{
    content: string
    index: number
    startChar: number
    endChar: number
}> {
    let currentPosition = 0

    return result.chunks.map((chunk, index) => {
        const startChar = currentPosition
        const endChar = currentPosition + chunk.content.length
        currentPosition = endChar + 1 // +1 for spacing between chunks

        return {
            content: chunk.content,
            index,
            startChar,
            endChar,
        }
    })
}

/**
 * Check if Unstructured.io is configured
 */
export function isUnstructuredConfigured(): boolean {
    return !!process.env.UNSTRUCTURED_API_KEY
}
