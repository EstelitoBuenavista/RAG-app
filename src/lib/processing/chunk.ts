/**
 * Split text into overlapping chunks for embedding
 */
export interface ChunkOptions {
    chunkSize?: number      // Target size in characters
    chunkOverlap?: number   // Overlap between chunks
}

export interface TextChunk {
    content: string
    index: number
    startChar: number
    endChar: number
}

export function chunkText(
    text: string,
    options: ChunkOptions = {}
): TextChunk[] {
    const { chunkSize = 1000, chunkOverlap = 200 } = options

    const chunks: TextChunk[] = []
    let startIndex = 0
    let chunkIndex = 0

    while (startIndex < text.length) {
        let endIndex = startIndex + chunkSize

        // Try to break at a sentence or word boundary
        if (endIndex < text.length) {
            // Look for sentence end
            const sentenceEnd = text.lastIndexOf('. ', endIndex)
            if (sentenceEnd > startIndex + chunkSize / 2) {
                endIndex = sentenceEnd + 1
            } else {
                // Look for word boundary
                const wordEnd = text.lastIndexOf(' ', endIndex)
                if (wordEnd > startIndex + chunkSize / 2) {
                    endIndex = wordEnd
                }
            }
        }

        const content = text.slice(startIndex, endIndex).trim()

        if (content.length > 0) {
            chunks.push({
                content,
                index: chunkIndex,
                startChar: startIndex,
                endChar: endIndex,
            })
            chunkIndex++
        }

        // Move to next chunk with overlap
        startIndex = endIndex - chunkOverlap
        if (startIndex >= text.length) break
    }

    return chunks
}

/**
 * Simple text extraction from common file types
 * For production, use dedicated parsers for PDF, DOCX etc.
 */
export function extractTextFromFile(
    content: string | ArrayBuffer,
    mimeType: string
): string {
    // For now, handle plain text only
    // TODO: Add PDF parsing with pdf-parse
    // TODO: Add DOCX parsing with mammoth

    if (mimeType.includes('text/') || mimeType.includes('markdown')) {
        if (typeof content === 'string') {
            return content
        }
        return new TextDecoder().decode(content)
    }

    throw new Error(`Unsupported file type: ${mimeType}`)
}
