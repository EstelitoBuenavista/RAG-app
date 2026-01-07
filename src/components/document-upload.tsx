'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

interface UploadedFile {
    name: string
    size: number
    uploadedAt: Date
}

export function DocumentUpload() {
    const [isDragging, setIsDragging] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
    const [error, setError] = useState<string | null>(null)
    const supabase = createClient()

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(true)
    }, [])

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
    }, [])

    const uploadFile = async (file: File) => {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

        const { error: uploadError } = await supabase.storage
            .from('documents')
            .upload(fileName, file)

        if (uploadError) {
            throw uploadError
        }

        return {
            name: file.name,
            size: file.size,
            uploadedAt: new Date(),
        }
    }

    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        setError(null)

        const files = Array.from(e.dataTransfer.files)
        if (files.length === 0) return

        setIsUploading(true)
        try {
            const uploaded = await Promise.all(files.map(uploadFile))
            setUploadedFiles((prev) => [...prev, ...uploaded])
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to upload files')
        } finally {
            setIsUploading(false)
        }
    }, [])

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        setError(null)
        const files = Array.from(e.target.files || [])
        if (files.length === 0) return

        setIsUploading(true)
        try {
            const uploaded = await Promise.all(files.map(uploadFile))
            setUploadedFiles((prev) => [...prev, ...uploaded])
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to upload files')
        } finally {
            setIsUploading(false)
        }
    }

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes'
        const k = 1024
        const sizes = ['Bytes', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    return (
        <div className="border border-zinc-800">
            <div className="border-b border-zinc-800 p-6">
                <h2 className="text-lg font-bold">Upload Documents</h2>
                <p className="text-zinc-500 text-sm mt-1">PDF, TXT, DOCX supported</p>
            </div>

            <div className="p-6 space-y-4">
                {error && (
                    <div className="p-4 border border-red-500/50 bg-red-500/10 text-red-400 text-sm">
                        {error}
                    </div>
                )}

                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`
                        relative border-2 border-dashed p-12 text-center transition-colors
                        ${isDragging
                            ? 'border-white bg-zinc-900'
                            : 'border-zinc-700 hover:border-zinc-600'
                        }
                    `}
                >
                    <input
                        type="file"
                        multiple
                        accept=".pdf,.txt,.docx,.doc,.md"
                        onChange={handleFileSelect}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        disabled={isUploading}
                    />
                    <div className="space-y-2">
                        <div className="text-4xl">📄</div>
                        <p className="text-zinc-400">
                            {isUploading
                                ? 'Uploading...'
                                : isDragging
                                    ? 'Drop files here'
                                    : 'Drag and drop, or click to browse'
                            }
                        </p>
                    </div>
                </div>

                {uploadedFiles.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-sm text-zinc-500 font-medium">UPLOADED</p>
                        <div className="divide-y divide-zinc-800 border border-zinc-800">
                            {uploadedFiles.map((file, index) => (
                                <div
                                    key={index}
                                    className="flex items-center justify-between p-4"
                                >
                                    <div className="flex items-center space-x-3">
                                        <span className="text-xl">📄</span>
                                        <div>
                                            <p className="text-sm text-white">{file.name}</p>
                                            <p className="text-xs text-zinc-500">{formatFileSize(file.size)}</p>
                                        </div>
                                    </div>
                                    <span className="text-xs text-green-500">✓</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <Button
                    disabled={isUploading}
                    className="w-full h-12 bg-white text-zinc-950 hover:bg-zinc-200 font-medium rounded-none"
                    onClick={() => document.querySelector<HTMLInputElement>('input[type="file"]')?.click()}
                >
                    {isUploading ? 'Uploading...' : 'Select Files'}
                </Button>
            </div>
        </div>
    )
}
