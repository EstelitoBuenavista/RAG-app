// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse')
import mammoth from 'mammoth'

export interface ParseResult {
    text: string
    metadata?: {
        title?: string
        author?: string
        pages?: number
    }
}

/**
 * Parse a document and extract its text content
 * Supports: PDF, DOCX, DOC, TXT, MD
 */
export async function parseDocument(
    content: Buffer | ArrayBuffer,
    mimeType: string,
    filename: string
): Promise<ParseResult> {
    const buffer = content instanceof ArrayBuffer
        ? Buffer.from(content)
        : content

    // PDF files
    if (mimeType === 'application/pdf' || filename.endsWith('.pdf')) {
        return parsePDF(buffer)
    }

    // Word documents (DOCX)
    if (
        mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        filename.endsWith('.docx')
    ) {
        return parseDOCX(buffer)
    }

    // Plain text, markdown, or other text-based files
    if (
        mimeType.startsWith('text/') ||
        mimeType === 'application/json' ||
        filename.endsWith('.txt') ||
        filename.endsWith('.md') ||
        filename.endsWith('.json')
    ) {
        return parseText(buffer)
    }

    throw new Error(`Unsupported file type: ${mimeType} (${filename})`)
}

/**
 * Parse PDF file
 */
async function parsePDF(buffer: Buffer): Promise<ParseResult> {
    try {
        const data = await pdfParse(buffer)

        return {
            text: data.text,
            metadata: {
                title: data.info?.Title,
                author: data.info?.Author,
                pages: data.numpages,
            }
        }
    } catch (error) {
        throw new Error(`Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
}

/**
 * Parse DOCX file
 */
async function parseDOCX(buffer: Buffer): Promise<ParseResult> {
    try {
        const result = await mammoth.extractRawText({ buffer })

        if (result.messages.length > 0) {
            console.warn('DOCX parsing warnings:', result.messages)
        }

        return {
            text: result.value,
        }
    } catch (error) {
        throw new Error(`Failed to parse DOCX: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
}

/**
 * Parse plain text file
 */
function parseText(buffer: Buffer): ParseResult {
    return {
        text: buffer.toString('utf-8'),
    }
}

/**
 * Get supported file extensions
 */
export function getSupportedExtensions(): string[] {
    return ['.pdf', '.docx', '.txt', '.md', '.json']
}

/**
 * Check if a file type is supported
 */
export function isSupported(mimeType: string, filename: string): boolean {
    const supportedMimes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'text/markdown',
        'application/json',
    ]

    const supportedExtensions = getSupportedExtensions()

    return (
        supportedMimes.some(mime => mimeType.includes(mime)) ||
        supportedExtensions.some(ext => filename.toLowerCase().endsWith(ext))
    )
}
