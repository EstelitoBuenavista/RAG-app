'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
    FileText,
    Loader2,
    RefreshCw,
    RotateCw,
    Trash2,
    XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Skeleton } from '@/components/ui/skeleton'
import {
    DocumentStatusBadge,
    type DocumentStatus,
} from '@/components/document-status-badge'

interface Document {
    id: string
    filename: string
    mime_type: string
    file_size: number
    status: DocumentStatus
    created_at: string
}

function formatFileSize(bytes: number): string {
    if (!bytes) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}

export function DocumentList() {
    const router = useRouter()
    const [documents, setDocuments] = useState<Document[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [deleting, setDeleting] = useState<string | null>(null)
    const [clearingAll, setClearingAll] = useState(false)
    const [reprocessing, setReprocessing] = useState(false)

    // Avoids a stale-closure read of `documents` inside the poll interval.
    const isBusy = useRef(false)
    isBusy.current = clearingAll || reprocessing

    const fetchDocuments = useCallback(async () => {
        try {
            const response = await fetch('/api/documents')
            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch documents')
            }

            setDocuments(
                (data.documents || []).filter(
                    (doc: Document) => doc.filename && doc.filename.trim() !== ''
                )
            )
        } catch (err) {
            toast.error('Could not load documents', {
                description: err instanceof Error ? err.message : undefined,
            })
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchDocuments()

        // Poll so status transitions land without a manual refresh.
        const interval = setInterval(() => {
            if (!isBusy.current) fetchDocuments()
        }, 5000)

        let debounceTimer: ReturnType<typeof setTimeout> | null = null
        const handleDocumentUploaded = () => {
            if (debounceTimer) clearTimeout(debounceTimer)
            debounceTimer = setTimeout(fetchDocuments, 300)
        }
        window.addEventListener('document-uploaded', handleDocumentUploaded)

        return () => {
            clearInterval(interval)
            if (debounceTimer) clearTimeout(debounceTimer)
            window.removeEventListener('document-uploaded', handleDocumentUploaded)
        }
    }, [fetchDocuments])

    const handleRefresh = async () => {
        setRefreshing(true)
        await fetchDocuments()
        setRefreshing(false)
    }

    const handleClearAll = async () => {
        setClearingAll(true)
        try {
            const response = await fetch('/api/documents', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clearAll: true }),
            })
            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to clear documents')
            }

            setDocuments([])
            router.refresh()
            toast.success('All documents deleted')
        } catch (err) {
            toast.error('Could not clear documents', {
                description: err instanceof Error ? err.message : undefined,
            })
        } finally {
            setClearingAll(false)
        }
    }

    const handleDelete = async (documentId: string, filename: string) => {
        setDeleting(documentId)
        try {
            const response = await fetch('/api/documents', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ documentId }),
            })
            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to delete document')
            }

            setDocuments(docs => docs.filter(d => d.id !== documentId))
            router.refresh()
            toast.success(`Deleted ${filename}`)
        } catch (err) {
            toast.error('Could not delete document', {
                description: err instanceof Error ? err.message : undefined,
            })
        } finally {
            setDeleting(null)
        }
    }

    /**
     * Rebuilds vectors for anything not currently indexed. This is the path back
     * to a working index after the embedding-model migration, which clears all
     * old vectors and resets documents to 'pending'.
     */
    const handleReprocess = async () => {
        const stale = documents.filter(d => d.status !== 'ready')
        if (stale.length === 0) return

        setReprocessing(true)
        const toastId = toast.loading(
            `Reprocessing 0 of ${stale.length} documents...`
        )
        let succeeded = 0
        let failed = 0

        // Sequential on purpose: each document is many embedding calls, and
        // firing them all at once trips provider rate limits.
        for (const [i, doc] of stale.entries()) {
            toast.loading(`Reprocessing ${i + 1} of ${stale.length} documents...`, {
                id: toastId,
                description: doc.filename,
            })
            try {
                const response = await fetch('/api/process-document', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ documentId: doc.id }),
                })
                if (!response.ok) throw new Error()
                succeeded++
            } catch {
                failed++
            }
            await fetchDocuments()
        }

        setReprocessing(false)
        router.refresh()

        if (failed === 0) {
            toast.success(`Reprocessed ${succeeded} document${succeeded === 1 ? '' : 's'}`, {
                id: toastId,
                description: undefined,
            })
        } else {
            toast.error(`${failed} document${failed === 1 ? '' : 's'} failed`, {
                id: toastId,
                description: `${succeeded} succeeded. Check the failed items and try again.`,
            })
        }
    }

    const staleCount = documents.filter(d => d.status !== 'ready').length
    const busy = clearingAll || reprocessing

    return (
        <Card>
            <CardHeader className="border-b [.border-b]:pb-6">
                <CardTitle>Your documents</CardTitle>
                <CardDescription>
                    {documents.length > 0
                        ? `${documents.length} document${documents.length === 1 ? '' : 's'} in your knowledge base`
                        : 'Manage your uploaded documents'}
                </CardDescription>

                <CardAction className="flex items-center gap-2">
                    {staleCount > 0 && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleReprocess}
                            disabled={busy}
                        >
                            {reprocessing ? (
                                <Loader2 className="animate-spin" />
                            ) : (
                                <RotateCw />
                            )}
                            <span className="hidden sm:inline">
                                Reprocess{' '}
                                <span className="text-muted-foreground">
                                    ({staleCount})
                                </span>
                            </span>
                        </Button>
                    )}

                    <AlertDialog>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <AlertDialogTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        disabled={busy || documents.length === 0}
                                        aria-label="Clear all documents"
                                        className="text-muted-foreground hover:text-destructive"
                                    >
                                        {clearingAll ? (
                                            <Loader2 className="animate-spin" />
                                        ) : (
                                            <XCircle />
                                        )}
                                    </Button>
                                </AlertDialogTrigger>
                            </TooltipTrigger>
                            <TooltipContent>Clear all</TooltipContent>
                        </Tooltip>

                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>
                                    Delete all {documents.length} document
                                    {documents.length === 1 ? '' : 's'}?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                    This permanently removes every uploaded file and its
                                    embeddings. Your chat history is kept, but answers
                                    will no longer be able to cite these sources. This
                                    cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={handleClearAll}
                                    className="bg-destructive text-white hover:bg-destructive/90"
                                >
                                    Delete all
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={handleRefresh}
                                disabled={busy}
                                aria-label="Refresh document list"
                                className="text-muted-foreground"
                            >
                                <RefreshCw className={refreshing ? 'animate-spin' : ''} />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Refresh</TooltipContent>
                    </Tooltip>
                </CardAction>
            </CardHeader>

            <CardContent className="px-0">
                {loading ? (
                    <div className="divide-y divide-border">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="flex items-center gap-4 px-6 py-4">
                                <Skeleton className="size-10 rounded-md" />
                                <div className="flex-1 space-y-2">
                                    <Skeleton className="h-4 w-48" />
                                    <Skeleton className="h-3 w-64" />
                                </div>
                                <Skeleton className="h-6 w-20 rounded-full" />
                            </div>
                        ))}
                    </div>
                ) : documents.length === 0 ? (
                    <div className="flex flex-col items-center px-6 py-16 text-center">
                        <div className="mb-4 flex size-12 items-center justify-center rounded-lg bg-muted">
                            <FileText className="size-6 text-muted-foreground" />
                        </div>
                        <p className="font-medium">No documents yet</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Upload a file above to start building your knowledge base.
                        </p>
                    </div>
                ) : (
                    <ul className="divide-y divide-border">
                        {documents.map(doc => (
                            <li
                                key={doc.id}
                                className="group flex items-center gap-4 px-6 py-4 transition-colors hover:bg-muted/40"
                            >
                                <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
                                    <FileText className="size-5 text-muted-foreground" />
                                </div>

                                <div className="min-w-0 flex-1">
                                    <p className="truncate font-medium" title={doc.filename}>
                                        {doc.filename}
                                    </p>
                                    <p className="mt-0.5 truncate text-sm text-muted-foreground">
                                        {formatFileSize(doc.file_size)} ·{' '}
                                        {formatDate(doc.created_at)}
                                    </p>
                                </div>

                                <DocumentStatusBadge status={doc.status} />

                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon-sm"
                                            onClick={() => handleDelete(doc.id, doc.filename)}
                                            disabled={deleting === doc.id || busy}
                                            aria-label={`Delete ${doc.filename}`}
                                            className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 hover:text-destructive"
                                        >
                                            {deleting === doc.id ? (
                                                <Loader2 className="animate-spin" />
                                            ) : (
                                                <Trash2 />
                                            )}
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Delete</TooltipContent>
                                </Tooltip>
                            </li>
                        ))}
                    </ul>
                )}
            </CardContent>
        </Card>
    )
}
