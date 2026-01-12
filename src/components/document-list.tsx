'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Trash2, FileText, Loader2, RefreshCw, AlertCircle, CheckCircle2, Clock, XCircle } from 'lucide-react'
import { motion, staggerContainer, staggerItem, useMotionVariants } from '@/lib/motion'

interface Document {
    id: string
    filename: string
    mime_type: string
    file_size: number
    status: 'pending' | 'processing' | 'ready' | 'error'
    created_at: string
}

function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function formatDate(dateString: string): string {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })
}

function getStatusIcon(status: Document['status']) {
    switch (status) {
        case 'ready':
            return <CheckCircle2 className="w-4 h-4 text-green-500" />
        case 'processing':
            return <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />
        case 'pending':
            return <Clock className="w-4 h-4 text-zinc-500" />
        case 'error':
            return <AlertCircle className="w-4 h-4 text-red-500" />
        default:
            return null
    }
}

function getStatusText(status: Document['status']) {
    switch (status) {
        case 'ready':
            return 'Ready'
        case 'processing':
            return 'Processing...'
        case 'pending':
            return 'Pending'
        case 'error':
            return 'Error'
        default:
            return status
    }
}

export function DocumentList() {
    const router = useRouter()
    const [documents, setDocuments] = useState<Document[]>([])
    const [loading, setLoading] = useState(true)
    const [deleting, setDeleting] = useState<string | null>(null)
    const [clearingAll, setClearingAll] = useState(false)
    const [showClearModal, setShowClearModal] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const containerVariants = useMotionVariants(staggerContainer)
    const itemVariants = useMotionVariants(staggerItem)

    const fetchDocuments = async () => {
        try {
            setError(null)
            const response = await fetch('/api/documents')
            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch documents')
            }

            // Filter out any documents with missing filenames
            const validDocs = (data.documents || []).filter(
                (doc: Document) => doc.filename && doc.filename.trim() !== ''
            )
            setDocuments(validDocs)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch documents')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchDocuments()

        // Poll for updates every 5 seconds to catch processing status changes
        const interval = setInterval(fetchDocuments, 5000)

        // Debounced handler for document upload events to prevent race conditions
        let debounceTimer: NodeJS.Timeout | null = null
        const handleDocumentUploaded = () => {
            // Clear any pending refresh and wait for events to settle
            if (debounceTimer) clearTimeout(debounceTimer)
            debounceTimer = setTimeout(() => {
                fetchDocuments()
            }, 300)
        }
        window.addEventListener('document-uploaded', handleDocumentUploaded)

        return () => {
            clearInterval(interval)
            if (debounceTimer) clearTimeout(debounceTimer)
            window.removeEventListener('document-uploaded', handleDocumentUploaded)
        }
    }, [])

    const handleClearAll = async () => {
        setShowClearModal(false)
        setClearingAll(true)
        try {
            const response = await fetch('/api/documents', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clearAll: true })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to clear documents')
            }

            setDocuments([])
            // Refresh server components to update Quick Stats
            router.refresh()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to clear documents')
        } finally {
            setClearingAll(false)
        }
    }

    const handleDelete = async (documentId: string) => {
        setDeleting(documentId)
        try {
            const response = await fetch('/api/documents', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ documentId })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to delete document')
            }

            // Remove from local state
            setDocuments(docs => docs.filter(d => d.id !== documentId))
            // Refresh server components to update Quick Stats
            router.refresh()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete document')
        } finally {
            setDeleting(null)
        }
    }

    if (loading) {
        return (
            <div className="border border-zinc-800">
                <div className="border-b border-zinc-800 p-6">
                    <h2 className="text-lg font-bold">Your Documents</h2>
                    <p className="text-zinc-500 text-sm mt-1">Manage your uploaded documents</p>
                </div>
                <div className="p-12 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
                </div>
            </div>
        )
    }

    return (
        <div className="border border-zinc-800">
            <div className="border-b border-zinc-800 p-6 flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-bold">Your Documents</h2>
                    <p className="text-zinc-500 text-sm mt-1">Manage your uploaded documents</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowClearModal(true)}
                        disabled={clearingAll || documents.length === 0}
                        className="text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                    >
                        {clearingAll ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <XCircle className="w-4 h-4" />
                        )}
                        <span className="ml-1.5">Clear All</span>
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            setLoading(true)
                            fetchDocuments()
                        }}
                        className="text-zinc-500 hover:text-white"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-500/10 border-b border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                </div>
            )}

            {documents.length === 0 ? (
                <div className="p-12 text-center">
                    <FileText className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                    <p className="text-zinc-500">No documents uploaded yet</p>
                    <p className="text-zinc-600 text-sm mt-1">Upload documents to get started</p>
                </div>
            ) : (
                <div className="divide-y divide-zinc-800">
                    {documents.map((doc) => (
                        <motion.div
                            key={doc.id}
                            className="p-4 flex items-center justify-between hover:bg-zinc-900/50 transition-colors"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.2 }}
                        >
                            <div className="flex items-center gap-4 min-w-0 flex-1">
                                <div className="w-10 h-10 bg-zinc-800 flex items-center justify-center flex-shrink-0">
                                    <FileText className="w-5 h-5 text-zinc-400" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="font-medium truncate" title={doc.filename}>
                                        {doc.filename}
                                    </p>
                                    <div className="flex items-center gap-3 text-sm text-zinc-500 mt-0.5">
                                        <span>{formatFileSize(doc.file_size)}</span>
                                        <span>•</span>
                                        <span>{formatDate(doc.created_at)}</span>
                                        <span>•</span>
                                        <span className="flex items-center gap-1">
                                            {getStatusIcon(doc.status)}
                                            {getStatusText(doc.status)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(doc.id)}
                                disabled={deleting === doc.id}
                                className="text-zinc-500 hover:text-red-400 hover:bg-red-500/10 ml-4"
                            >
                                {deleting === doc.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Trash2 className="w-4 h-4" />
                                )}
                            </Button>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Clear All Confirmation Modal */}
            {showClearModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    {/* Overlay */}
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowClearModal(false)}
                    />
                    {/* Modal */}
                    <motion.div
                        className="relative bg-zinc-900 border border-zinc-800 p-6 max-w-md w-full mx-4 shadow-2xl"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.2 }}
                    >
                        <h3 className="text-lg font-bold text-white mb-2">Clear All Documents?</h3>
                        <p className="text-zinc-400 text-sm mb-6">
                            This will permanently delete all {documents.length} document{documents.length !== 1 ? 's' : ''} and their embeddings. This action cannot be undone.
                        </p>
                        <div className="flex gap-3 justify-end">
                            <Button
                                variant="ghost"
                                onClick={() => setShowClearModal(false)}
                                className="text-zinc-400 hover:text-white hover:bg-zinc-800"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleClearAll}
                                className="bg-red-600 hover:bg-red-700 text-white"
                            >
                                Delete All
                            </Button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    )
}
