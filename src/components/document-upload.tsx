'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

interface UploadedFile {
    id: string
    name: string
    size: number
    status: 'uploading' | 'processing' | 'ready' | 'error'
    uploadedAt: Date
}

export function DocumentUpload() {
    const [isDragging, setIsDragging] = useState(false)
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

    const uploadFile = async (file: File): Promise<UploadedFile> => {
        const fileExt = file.name.split('.').pop()
        const storagePath = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

        // Create a temporary entry with uploading status
        const tempId = `temp-${Date.now()}`
        const tempFile: UploadedFile = {
            id: tempId,
            name: file.name,
            size: file.size,
            status: 'uploading',
            uploadedAt: new Date(),
        }

        // Update UI immediately
        setUploadedFiles(prev => [...prev, tempFile])

        try {
            // 1. Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('documents')
                .upload(storagePath, file)

            if (uploadError) throw uploadError

            // 2. Create database record
            const { data: document, error: dbError } = await supabase
                .from('documents')
                .insert({
                    filename: file.name,
                    storage_path: storagePath,
                    file_size: file.size,
                    mime_type: file.type,
                    status: 'pending',
                })
                .select()
                .single()

            if (dbError) throw dbError

            // Update with real ID and status
            setUploadedFiles(prev =>
                prev.map(f =>
                    f.id === tempId
                        ? { ...f, id: document.id, status: 'processing' as const }
                        : f
                )
            )

            // 3. Trigger processing
            const processResponse = await fetch('/api/process-document', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ documentId: document.id }),
            })

            if (processResponse.ok) {
                // Update status to ready
                setUploadedFiles(prev =>
                    prev.map(f =>
                        f.id === document.id
                            ? { ...f, status: 'ready' as const }
                            : f
                    )
                )
            } else {
                throw new Error('Processing failed')
            }

            return {
                id: document.id,
                name: file.name,
                size: file.size,
                status: 'ready',
                uploadedAt: new Date(),
            }
        } catch (err) {
            // Update status to error
            setUploadedFiles(prev =>
                prev.map(f =>
                    f.id === tempId
                        ? { ...f, status: 'error' as const }
                        : f
                )
            )
            throw err
        }
    }

    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        setError(null)

        const files = Array.from(e.dataTransfer.files)
        if (files.length === 0) return

        try {
            // Process files one by one to show progress
            for (const file of files) {
                try {
                    await uploadFile(file)
                } catch (err) {
                    console.error(`Failed to upload ${file.name}:`, err)
                }
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to upload files')
        }
    }, [])

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        setError(null)
        const files = Array.from(e.target.files || [])
        if (files.length === 0) return

        try {
            // Process files one by one to show progress
            for (const file of files) {
                try {
                    await uploadFile(file)
                } catch (err) {
                    console.error(`Failed to upload ${file.name}:`, err)
                }
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to upload files')
        }

        // Reset input
        e.target.value = ''
    }

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes'
        const k = 1024
        const sizes = ['Bytes', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    const getStatusIcon = (status: UploadedFile['status']) => {
        switch (status) {
            case 'uploading':
                return <span className="text-yellow-500">↑</span>
            case 'processing':
                return <span className="text-blue-500 animate-pulse">⚙</span>
            case 'ready':
                return <span className="text-green-500">✓</span>
            case 'error':
                return <span className="text-red-500">✗</span>
        }
    }

    const getStatusText = (status: UploadedFile['status']) => {
        switch (status) {
            case 'uploading':
                return 'Uploading...'
            case 'processing':
                return 'Processing...'
            case 'ready':
                return 'Ready'
            case 'error':
                return 'Error'
        }
    }

    const isAnyUploading = uploadedFiles.some(f => f.status === 'uploading' || f.status === 'processing')

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
                        disabled={isAnyUploading}
                    />
                    <div className="space-y-2">
                        <div className="text-4xl">📄</div>
                        <p className="text-zinc-400">
                            {isAnyUploading
                                ? 'Processing...'
                                : isDragging
                                    ? 'Drop files here'
                                    : 'Drag and drop, or click to browse'
                            }
                        </p>
                    </div>
                </div>

                {uploadedFiles.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-sm text-zinc-500 font-medium">DOCUMENTS</p>
                        <div className="divide-y divide-zinc-800 border border-zinc-800">
                            {uploadedFiles.map((file) => (
                                <div
                                    key={file.id}
                                    className="flex items-center justify-between p-4"
                                >
                                    <div className="flex items-center space-x-3">
                                        <span className="text-xl">📄</span>
                                        <div>
                                            <p className="text-sm text-white">{file.name}</p>
                                            <p className="text-xs text-zinc-500">{formatFileSize(file.size)}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <span className="text-xs text-zinc-500">{getStatusText(file.status)}</span>
                                        {getStatusIcon(file.status)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <Button
                    disabled={isAnyUploading}
                    className="w-full h-12 bg-white text-zinc-950 hover:bg-zinc-200 font-medium rounded-none"
                    onClick={() => document.querySelector<HTMLInputElement>('input[type="file"]')?.click()}
                >
                    {isAnyUploading ? 'Processing...' : 'Select Files'}
                </Button>
            </div>
        </div>
    )
}
