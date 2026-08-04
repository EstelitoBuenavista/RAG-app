'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
    AlertCircle,
    CheckCircle2,
    FileText,
    Loader2,
    Upload,
    UploadCloud,
    X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'

type UploadStatus = 'queued' | 'uploading' | 'processing' | 'ready' | 'error'

interface UploadedFile {
    id: string
    name: string
    size: number
    status: UploadStatus
    error?: string
}

const ACCEPTED_EXTENSIONS = ['.pdf', '.txt', '.docx', '.doc', '.md', '.json']
const MAX_FILE_BYTES = 25 * 1024 * 1024 // 25 MB

function formatFileSize(bytes: number): string {
    if (!bytes) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function validate(file: File): string | null {
    const name = file.name.toLowerCase()
    if (!ACCEPTED_EXTENSIONS.some(ext => name.endsWith(ext))) {
        return `Unsupported file type. Accepted: ${ACCEPTED_EXTENSIONS.join(', ')}`
    }
    if (file.size > MAX_FILE_BYTES) {
        return `File is ${formatFileSize(file.size)} — the limit is ${formatFileSize(MAX_FILE_BYTES)}`
    }
    if (file.size === 0) {
        return 'File is empty'
    }
    return null
}

const statusMeta: Record<UploadStatus, { label: string; className: string }> = {
    queued: { label: 'Queued', className: 'text-muted-foreground' },
    uploading: { label: 'Uploading', className: 'text-warning' },
    processing: { label: 'Processing', className: 'text-warning' },
    ready: { label: 'Ready', className: 'text-success' },
    error: { label: 'Failed', className: 'text-destructive' },
}

function StatusIcon({ status }: { status: UploadStatus }) {
    switch (status) {
        case 'uploading':
        case 'processing':
            return <Loader2 className="size-4 animate-spin text-warning" />
        case 'ready':
            return <CheckCircle2 className="size-4 text-success" />
        case 'error':
            return <AlertCircle className="size-4 text-destructive" />
        default:
            return <FileText className="size-4 text-muted-foreground" />
    }
}

export function DocumentUpload() {
    const router = useRouter()
    const [isDragging, setIsDragging] = useState(false)
    const [files, setFiles] = useState<UploadedFile[]>([])
    const inputRef = useRef<HTMLInputElement>(null)
    // dragenter/dragleave fire for every child element; counting keeps the
    // highlight from flickering as the cursor crosses them.
    const dragDepth = useRef(0)
    const supabase = createClient()

    const patch = (id: string, changes: Partial<UploadedFile>) =>
        setFiles(prev => prev.map(f => (f.id === id ? { ...f, ...changes } : f)))

    const notifyList = () =>
        window.dispatchEvent(new CustomEvent('document-uploaded'))

    const uploadOne = async (file: File, id: string) => {
        const fileExt = file.name.split('.').pop()
        const storagePath = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

        patch(id, { status: 'uploading' })

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('You are not signed in')

        const { error: uploadError } = await supabase.storage
            .from('documents')
            .upload(storagePath, file)

        if (uploadError) {
            throw new Error(`Upload failed: ${uploadError.message}`)
        }

        const { data: document, error: dbError } = await supabase
            .from('documents')
            .insert({
                user_id: user.id,
                filename: file.name,
                storage_path: storagePath,
                file_size: file.size,
                mime_type: file.type,
                status: 'pending',
            })
            .select()
            .single()

        if (dbError) {
            throw new Error(`Could not save document: ${dbError.message}`)
        }

        notifyList()
        patch(id, { status: 'processing' })

        const processResponse = await fetch('/api/process-document', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ documentId: document.id }),
        })

        if (!processResponse.ok) {
            let message = `Server error (${processResponse.status})`
            try {
                message = (await processResponse.json()).error || message
            } catch {
                // Response wasn't JSON; keep the status-code message.
            }
            throw new Error(message)
        }

        patch(id, { status: 'ready' })
        notifyList()
        router.refresh()
    }

    // Not memoised: the React Compiler handles that, and a manual dependency
    // list here goes stale against `uploadOne`.
    const processFiles = async (incoming: File[]) => {
        if (incoming.length === 0) return

        const queued: UploadedFile[] = incoming.map((file, index) => {
            const problem = validate(file)
            return {
                id: `${Date.now()}-${index}-${file.name}`,
                name: file.name,
                size: file.size,
                status: problem ? 'error' : 'queued',
                error: problem ?? undefined,
            }
        })

        setFiles(prev => [...prev, ...queued])

        const rejected = queued.filter(f => f.status === 'error')
        if (rejected.length > 0) {
            toast.error(
                `${rejected.length} file${rejected.length === 1 ? '' : 's'} skipped`,
                { description: rejected[0].error }
            )
        }

        let succeeded = 0
        // Sequential: each document fans out into many embedding calls, so
        // parallel uploads would hammer the provider's rate limit.
        for (const [index, file] of incoming.entries()) {
            const entry = queued[index]
            if (entry.status === 'error') continue

            try {
                await uploadOne(file, entry.id)
                succeeded++
            } catch (err) {
                const message =
                    err instanceof Error ? err.message : 'Something went wrong'
                patch(entry.id, { status: 'error', error: message })
                toast.error(`Could not process ${file.name}`, {
                    description: message,
                })
            }
        }

        if (succeeded > 0) {
            toast.success(
                `${succeeded} document${succeeded === 1 ? '' : 's'} ready`,
                { description: 'You can now ask questions about them in Chat.' }
            )
        }
        notifyList()
    }

    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault()
        dragDepth.current++
        setIsDragging(true)
    }

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault()
        dragDepth.current--
        if (dragDepth.current <= 0) {
            dragDepth.current = 0
            setIsDragging(false)
        }
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        dragDepth.current = 0
        setIsDragging(false)
        processFiles(Array.from(e.dataTransfer.files))
    }

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        processFiles(Array.from(e.target.files || []))
        e.target.value = ''
    }

    const isBusy = files.some(
        f => f.status === 'uploading' || f.status === 'processing'
    )
    const openPicker = () => inputRef.current?.click()

    return (
        <Card className="flex flex-col">
            <CardHeader className="border-b [.border-b]:pb-6">
                <CardTitle>Upload documents</CardTitle>
                <CardDescription>
                    PDF, DOCX, TXT, Markdown · up to {formatFileSize(MAX_FILE_BYTES)} each
                </CardDescription>
            </CardHeader>

            <CardContent className="flex flex-1 flex-col gap-4">
                <div
                    onDragEnter={handleDragEnter}
                    onDragOver={e => e.preventDefault()}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={openPicker}
                    onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            openPicker()
                        }
                    }}
                    role="button"
                    tabIndex={isBusy ? -1 : 0}
                    aria-label="Upload documents. Drag files here or press Enter to browse."
                    aria-disabled={isBusy}
                    className={cn(
                        'flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-12 text-center transition-colors outline-none',
                        'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
                        isBusy
                            ? 'cursor-not-allowed border-border opacity-60'
                            : 'cursor-pointer border-border hover:border-muted-foreground/50 hover:bg-muted/30',
                        isDragging && 'border-primary bg-primary/5'
                    )}
                >
                    <input
                        ref={inputRef}
                        type="file"
                        multiple
                        accept={ACCEPTED_EXTENSIONS.join(',')}
                        onChange={handleFileSelect}
                        className="sr-only"
                        disabled={isBusy}
                        tabIndex={-1}
                    />

                    <div
                        className={cn(
                            'flex size-12 items-center justify-center rounded-full transition-colors',
                            isDragging ? 'bg-primary/10' : 'bg-muted'
                        )}
                    >
                        <UploadCloud
                            className={cn(
                                'size-6',
                                isDragging ? 'text-primary' : 'text-muted-foreground'
                            )}
                        />
                    </div>

                    <div className="space-y-1">
                        <p className="text-sm font-medium">
                            {isBusy
                                ? 'Processing your documents...'
                                : isDragging
                                    ? 'Drop to upload'
                                    : 'Drag and drop files here'}
                        </p>
                        {!isBusy && !isDragging && (
                            <p className="text-xs text-muted-foreground">
                                or click to browse
                            </p>
                        )}
                    </div>
                </div>

                {files.length > 0 && (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="label-caps">This session</p>
                            {!isBusy && (
                                <Button
                                    variant="ghost"
                                    size="xs"
                                    onClick={() => setFiles([])}
                                    className="text-muted-foreground"
                                >
                                    <X />
                                    Clear
                                </Button>
                            )}
                        </div>

                        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                            {files.map(file => (
                                <li
                                    key={file.id}
                                    className="flex items-center gap-3 px-4 py-3"
                                >
                                    <StatusIcon status={file.status} />
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium" title={file.name}>
                                            {file.name}
                                        </p>
                                        <p
                                            className="truncate text-xs text-muted-foreground"
                                            title={file.error}
                                        >
                                            {file.error ?? formatFileSize(file.size)}
                                        </p>
                                    </div>
                                    <span
                                        className={cn(
                                            'shrink-0 text-xs font-medium',
                                            statusMeta[file.status].className
                                        )}
                                    >
                                        {statusMeta[file.status].label}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                <Button
                    onClick={openPicker}
                    disabled={isBusy}
                    className="mt-auto w-full"
                    size="lg"
                >
                    {isBusy ? (
                        <>
                            <Loader2 className="animate-spin" />
                            Processing
                        </>
                    ) : (
                        <>
                            <Upload />
                            Select files
                        </>
                    )}
                </Button>
            </CardContent>
        </Card>
    )
}
