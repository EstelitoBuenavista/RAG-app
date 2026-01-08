/**
 * Recursive Text Splitter for RAG Applications
 * 
 * Splits text hierarchically by structure (sections → paragraphs → sentences → words)
 * to preserve semantic coherence and improve retrieval quality.
 */

export interface ChunkOptions {
    chunkSize?: number           // Target size in characters (default: 1000)
    chunkOverlap?: number        // Overlap between chunks (default: 200)
    preserveStructure?: boolean  // Try to keep headers with content (default: true)
}

export interface TextChunk {
    content: string
    index: number
    startChar: number
    endChar: number
}

/**
 * Separators ordered by priority (largest structural units first)
 * The splitter will try each separator in order until chunks are small enough
 */
const SEPARATORS = [
    // Document structure (headers, horizontal rules)
    '\n## ',           // Markdown H2
    '\n### ',          // Markdown H3
    '\n#### ',         // Markdown H4
    '\n---\n',         // Horizontal rule
    '\n___\n',         // Horizontal rule alt

    // Paragraph boundaries
    '\n\n\n',          // Multiple blank lines
    '\n\n',            // Standard paragraph break

    // Sentence boundaries
    '.\n',             // Sentence ending with newline
    '!\n',             // Exclamation with newline
    '?\n',             // Question with newline
    '. ',              // Standard sentence end
    '! ',              // Exclamation
    '? ',              // Question mark

    // Clause/phrase boundaries
    ';\n',             // Semicolon with newline
    '; ',              // Semicolon
    ',\n',             // Comma with newline

    // List items
    '\n- ',            // Markdown list
    '\n* ',            // Markdown list alt
    '\n• ',            // Bullet point
    '\n',              // Any newline

    // Word boundary (last resort)
    ' ',               // Space
]

/**
 * Preprocess text to normalize formatting issues common in PDF extraction
 */
export function preprocessText(text: string): string {
    let processed = text

    // 1. Normalize line endings
    processed = processed.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

    // 2. Remove excessive whitespace within lines (but preserve paragraph breaks)
    processed = processed.replace(/[ \t]+/g, ' ')

    // 3. Fix broken sentences from PDF column extraction
    // Pattern: lowercase letter + newline + lowercase letter (likely mid-sentence break)
    processed = processed.replace(/([a-z,])\n([a-z])/g, '$1 $2')

    // 4. Normalize multiple blank lines to double newline (paragraph break)
    processed = processed.replace(/\n{3,}/g, '\n\n')

    // 5. Remove common PDF artifacts
    // Page numbers at start/end of lines
    processed = processed.replace(/^\s*\d+\s*$/gm, '')
    processed = processed.replace(/^\s*Page \d+\s*$/gmi, '')
    processed = processed.replace(/^\s*-\s*\d+\s*-\s*$/gm, '')

    // 6. Trim whitespace from line endings
    processed = processed.replace(/[ \t]+$/gm, '')

    // 7. Remove leading/trailing whitespace from the entire text
    processed = processed.trim()

    return processed
}

/**
 * Split text using a specific separator
 */
function splitBySeparator(text: string, separator: string): string[] {
    if (!separator) {
        // Split into individual characters as last resort
        return text.split('')
    }

    const parts = text.split(separator)

    // Re-attach the separator to the beginning of each part (except first)
    // This preserves context like headers staying with their content
    const result: string[] = []
    for (let i = 0; i < parts.length; i++) {
        if (i === 0) {
            result.push(parts[i])
        } else {
            result.push(separator + parts[i])
        }
    }

    return result.filter(part => part.trim().length > 0)
}

/**
 * Merge small chunks with overlap to reach target size
 */
function mergeChunks(
    chunks: string[],
    chunkSize: number,
    chunkOverlap: number
): string[] {
    if (chunks.length === 0) return []

    const merged: string[] = []
    let currentChunk = ''

    for (const chunk of chunks) {
        const trimmedChunk = chunk.trim()
        if (!trimmedChunk) continue

        // If adding this chunk would exceed the limit
        if (currentChunk.length + trimmedChunk.length + 1 > chunkSize && currentChunk.length > 0) {
            merged.push(currentChunk.trim())

            // Start new chunk with overlap from previous
            if (chunkOverlap > 0 && currentChunk.length > chunkOverlap) {
                // Find a good break point for overlap (prefer sentence boundary)
                const overlapStart = findOverlapStart(currentChunk, chunkOverlap)
                currentChunk = currentChunk.slice(overlapStart) + '\n' + trimmedChunk
            } else {
                currentChunk = trimmedChunk
            }
        } else {
            // Add to current chunk
            currentChunk = currentChunk
                ? currentChunk + '\n' + trimmedChunk
                : trimmedChunk
        }
    }

    // Don't forget the last chunk
    if (currentChunk.trim()) {
        merged.push(currentChunk.trim())
    }

    return merged
}

/**
 * Find a good starting point for overlap (prefer sentence boundaries)
 */
function findOverlapStart(text: string, targetOverlap: number): number {
    const searchStart = Math.max(0, text.length - targetOverlap - 100)
    const searchText = text.slice(searchStart)

    // Look for sentence boundaries in the overlap region
    const sentenceEnds = ['. ', '! ', '? ', '.\n', '!\n', '?\n']

    let bestPos = text.length - targetOverlap

    for (const ending of sentenceEnds) {
        const pos = searchText.indexOf(ending)
        if (pos !== -1) {
            const absolutePos = searchStart + pos + ending.length
            if (absolutePos > bestPos && absolutePos < text.length - targetOverlap / 2) {
                bestPos = absolutePos
                break
            }
        }
    }

    return bestPos
}

/**
 * Recursively split text until all chunks are within size limit
 */
function recursiveSplit(
    text: string,
    separatorIndex: number,
    chunkSize: number
): string[] {
    // If text is small enough, return it
    if (text.length <= chunkSize) {
        return [text]
    }

    // If we've exhausted all separators, force split
    if (separatorIndex >= SEPARATORS.length) {
        // Last resort: split by character count at word boundaries
        const result: string[] = []
        let start = 0
        while (start < text.length) {
            let end = Math.min(start + chunkSize, text.length)

            // Try to break at a word boundary
            if (end < text.length) {
                const lastSpace = text.lastIndexOf(' ', end)
                if (lastSpace > start + chunkSize / 2) {
                    end = lastSpace
                }
            }

            result.push(text.slice(start, end).trim())
            start = end
        }
        return result.filter(chunk => chunk.length > 0)
    }

    // Try splitting with current separator
    const separator = SEPARATORS[separatorIndex]
    const parts = splitBySeparator(text, separator)

    // If no split occurred, try next separator
    if (parts.length === 1) {
        return recursiveSplit(text, separatorIndex + 1, chunkSize)
    }

    // Recursively process each part that's still too large
    const result: string[] = []
    for (const part of parts) {
        if (part.length > chunkSize) {
            result.push(...recursiveSplit(part, separatorIndex + 1, chunkSize))
        } else {
            result.push(part)
        }
    }

    return result
}

/**
 * Main chunking function - recursive text splitter with preprocessing
 * 
 * @param text - The text to chunk
 * @param options - Chunking options
 * @returns Array of text chunks with metadata
 */
export function chunkText(
    text: string,
    options: ChunkOptions = {}
): TextChunk[] {
    const {
        chunkSize = 1000,
        chunkOverlap = 200,
        preserveStructure = true
    } = options

    // Step 1: Preprocess the text
    const processedText = preprocessText(text)

    if (!processedText) {
        return []
    }

    // Step 2: Recursively split into manageable pieces
    const rawChunks = recursiveSplit(processedText, 0, chunkSize)

    // Step 3: Merge small chunks and add overlap
    const mergedChunks = mergeChunks(rawChunks, chunkSize, chunkOverlap)

    // Step 4: Create TextChunk objects with position tracking
    const chunks: TextChunk[] = []
    let currentPosition = 0

    for (let i = 0; i < mergedChunks.length; i++) {
        const content = mergedChunks[i]

        // Find actual position in original processed text
        const startChar = processedText.indexOf(content.slice(0, 50), currentPosition)
        const actualStart = startChar !== -1 ? startChar : currentPosition

        chunks.push({
            content,
            index: i,
            startChar: actualStart,
            endChar: actualStart + content.length,
        })

        // Update position for next search (accounting for overlap)
        currentPosition = actualStart + content.length - chunkOverlap
    }

    return chunks
}

/**
 * Legacy function for backwards compatibility
 * Simple text extraction from common file types
 */
export function extractTextFromFile(
    content: string | ArrayBuffer,
    mimeType: string
): string {
    if (mimeType.includes('text/') || mimeType.includes('markdown')) {
        if (typeof content === 'string') {
            return content
        }
        return new TextDecoder().decode(content)
    }

    throw new Error(`Unsupported file type: ${mimeType}`)
}
