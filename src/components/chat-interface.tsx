'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'

interface Source {
    number: number
    document_id: string
    filename: string
    content: string
    similarity: number
}

interface Message {
    id: string
    role: 'user' | 'assistant'
    content: string
    sources?: Source[]
    timestamp: Date
}

export function ChatInterface() {
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [selectedSource, setSelectedSource] = useState<Source | null>(null)
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    // Get all sources from the last assistant message for citation lookup
    const getSourceByNumber = useCallback((num: number): Source | undefined => {
        const lastAssistantMessage = [...messages].reverse().find(m => m.role === 'assistant')
        return lastAssistantMessage?.sources?.find(s => s.number === num)
    }, [messages])

    const handleCitationClick = (sourceNumber: number, msgSources?: Source[]) => {
        const source = msgSources?.find(s => s.number === sourceNumber)
        if (source) {
            setSelectedSource(source)
            setSidebarOpen(true)
        }
    }

    const renderMessageWithCitations = (content: string, sources?: Source[]) => {
        if (!sources || sources.length === 0) {
            return <span>{content}</span>
        }

        // Parse citations like [1], [2], [1][2]
        const parts = content.split(/(\[\d+\])/g)

        return (
            <span>
                {parts.map((part, index) => {
                    const match = part.match(/\[(\d+)\]/)
                    if (match) {
                        const num = parseInt(match[1])
                        const source = sources.find(s => s.number === num)
                        if (source) {
                            return (
                                <button
                                    key={index}
                                    onClick={() => handleCitationClick(num, sources)}
                                    className="inline-flex items-center justify-center w-5 h-5 text-xs bg-zinc-700 hover:bg-zinc-600 text-white rounded mx-0.5 transition-colors"
                                    title={`View source: ${source.filename}`}
                                >
                                    {num}
                                </button>
                            )
                        }
                    }
                    return <span key={index}>{part}</span>
                })}
            </span>
        )
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!input.trim() || isLoading) return

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input.trim(),
            timestamp: new Date(),
        }

        setMessages((prev) => [...prev, userMessage])
        setInput('')
        setIsLoading(true)
        setSidebarOpen(false)
        setSelectedSource(null)

        try {
            const conversationHistory = messages.map(m => ({
                role: m.role,
                content: m.content
            }))

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMessage.content,
                    conversationHistory
                }),
            })

            const data = await response.json()

            if (response.ok) {
                const assistantMessage: Message = {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: data.response,
                    sources: data.sources,
                    timestamp: new Date(),
                }
                setMessages((prev) => [...prev, assistantMessage])
            } else {
                const errorMessage: Message = {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: `Error: ${data.error || 'Failed to get response'}`,
                    timestamp: new Date(),
                }
                setMessages((prev) => [...prev, errorMessage])
            }
        } catch {
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: 'Error: Failed to connect to the server. Please check your connection and try again.',
                timestamp: new Date(),
            }
            setMessages((prev) => [...prev, errorMessage])
        } finally {
            setIsLoading(false)
        }
    }

    const clearChat = () => {
        setMessages([])
        setSidebarOpen(false)
        setSelectedSource(null)
    }

    return (
        <div className="flex h-full">
            {/* Main Chat Area */}
            <div className={`flex flex-col flex-1 transition-all duration-300 ${sidebarOpen ? 'mr-96' : ''}`}>
                {/* Header with clear button */}
                {messages.length > 0 && (
                    <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
                        <span className="text-sm text-zinc-500">
                            Click on numbered citations to view sources
                        </span>
                        <Button
                            variant="ghost"
                            onClick={clearChat}
                            className="text-zinc-500 hover:text-white text-sm"
                        >
                            Clear Chat
                        </Button>
                    </div>
                )}

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {messages.length === 0 ? (
                        <div className="h-full flex items-center justify-center">
                            <div className="text-center max-w-md space-y-4">
                                <div className="text-6xl mb-4">💬</div>
                                <h2 className="text-2xl font-bold">Start a conversation</h2>
                                <p className="text-zinc-500">
                                    Ask questions about your documents. Answers will include clickable citations.
                                </p>
                                <div className="pt-4 space-y-2 text-left border border-zinc-800 p-4">
                                    <p className="text-sm text-zinc-400 font-medium">HOW IT WORKS:</p>
                                    <p className="text-sm text-zinc-500">• Ask any question about your documents</p>
                                    <p className="text-sm text-zinc-500">• Answers include numbered citations like <span className="inline-flex items-center justify-center w-4 h-4 text-xs bg-zinc-700 text-white rounded">1</span></p>
                                    <p className="text-sm text-zinc-500">• Click citations to view the source text</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            {messages.map((message) => (
                                <div
                                    key={message.id}
                                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-2xl ${message.role === 'user'
                                            ? 'bg-white text-zinc-950'
                                            : 'bg-zinc-900 border border-zinc-800'
                                            } p-4`}
                                    >
                                        <div className="whitespace-pre-wrap">
                                            {message.role === 'assistant'
                                                ? renderMessageWithCitations(message.content, message.sources)
                                                : message.content
                                            }
                                        </div>

                                        {message.sources && message.sources.length > 0 && (
                                            <div className="mt-4 pt-4 border-t border-zinc-700">
                                                <p className="text-xs text-zinc-500 mb-2">
                                                    {message.sources.length} SOURCE{message.sources.length > 1 ? 'S' : ''} REFERENCED
                                                </p>
                                                <div className="flex flex-wrap gap-2">
                                                    {message.sources.map((source) => (
                                                        <button
                                                            key={source.number}
                                                            onClick={() => handleCitationClick(source.number, message.sources)}
                                                            className={`text-xs px-2 py-1 border transition-colors ${selectedSource?.number === source.number
                                                                    ? 'border-white bg-white text-zinc-950'
                                                                    : 'border-zinc-700 hover:border-zinc-500 text-zinc-400'
                                                                }`}
                                                        >
                                                            [{source.number}] {source.filename}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-zinc-900 border border-zinc-800 p-4">
                                        <div className="flex items-center space-x-2">
                                            <div className="flex space-x-1">
                                                <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                            </div>
                                            <span className="text-zinc-500 text-sm">Searching documents...</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </>
                    )}
                </div>

                {/* Input */}
                <div className="border-t border-zinc-800 p-4">
                    <form onSubmit={handleSubmit} className="flex gap-4">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask a question about your documents..."
                            className="flex-1 h-12 px-4 bg-zinc-900 border border-zinc-800 text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
                            disabled={isLoading}
                        />
                        <Button
                            type="submit"
                            disabled={!input.trim() || isLoading}
                            className="h-12 px-6 bg-white text-zinc-950 hover:bg-zinc-200 font-medium rounded-none disabled:opacity-50"
                        >
                            Send
                        </Button>
                    </form>
                </div>
            </div>

            {/* Source Sidebar */}
            <div
                className={`fixed right-0 top-0 h-full w-96 bg-zinc-900 border-l border-zinc-800 transform transition-transform duration-300 z-40 ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'
                    }`}
            >
                {selectedSource && (
                    <div className="flex flex-col h-full">
                        {/* Sidebar Header */}
                        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                            <div>
                                <p className="text-sm text-zinc-500">SOURCE [{selectedSource.number}]</p>
                                <p className="text-white font-medium truncate">{selectedSource.filename}</p>
                            </div>
                            <Button
                                variant="ghost"
                                onClick={() => setSidebarOpen(false)}
                                className="text-zinc-500 hover:text-white"
                            >
                                ✕
                            </Button>
                        </div>

                        {/* Similarity Score */}
                        <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-800/50">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-zinc-400">Relevance</span>
                                <span className="text-white font-medium">
                                    {Math.round(selectedSource.similarity * 100)}% match
                                </span>
                            </div>
                            <div className="mt-2 h-1 bg-zinc-700 rounded">
                                <div
                                    className="h-full bg-white rounded"
                                    style={{ width: `${selectedSource.similarity * 100}%` }}
                                />
                            </div>
                        </div>

                        {/* Source Content */}
                        <div className="flex-1 overflow-y-auto p-4">
                            <p className="text-xs text-zinc-500 mb-3">SOURCE TEXT</p>
                            <div className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap bg-zinc-800 p-4 border border-zinc-700">
                                {selectedSource.content}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Overlay when sidebar is open on mobile */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-30 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}
        </div>
    )
}
