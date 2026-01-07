'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'

interface Source {
    document_id: string
    filename: string
    chunk: string
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
    const messagesEndRef = useRef<HTMLDivElement>(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

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

        try {
            // Build conversation history for context
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
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header with clear button */}
            {messages.length > 0 && (
                <div className="p-4 border-b border-zinc-800 flex justify-end">
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
                                Ask questions about your uploaded documents and get AI-powered answers grounded in your data.
                            </p>
                            <div className="pt-4 space-y-2 text-left border border-zinc-800 p-4">
                                <p className="text-sm text-zinc-400 font-medium">EXAMPLE QUESTIONS:</p>
                                <p className="text-sm text-zinc-500">• What are the main topics in my documents?</p>
                                <p className="text-sm text-zinc-500">• Summarize the key points from [document name]</p>
                                <p className="text-sm text-zinc-500">• What does the document say about [topic]?</p>
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
                                    <p className="whitespace-pre-wrap">{message.content}</p>

                                    {message.sources && message.sources.length > 0 && (
                                        <div className="mt-4 pt-4 border-t border-zinc-700">
                                            <p className="text-xs text-zinc-500 mb-2">
                                                SOURCES ({message.sources.length} relevant chunks)
                                            </p>
                                            <div className="space-y-2">
                                                {message.sources.map((source, idx) => (
                                                    <div key={idx} className="text-xs bg-zinc-800 p-3 space-y-1">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-zinc-300 font-medium">
                                                                📄 {source.filename}
                                                            </span>
                                                            <span className="text-zinc-600">
                                                                {Math.round(source.similarity * 100)}% match
                                                            </span>
                                                        </div>
                                                        <p className="text-zinc-500 line-clamp-2">
                                                            {source.chunk}
                                                        </p>
                                                    </div>
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
                                        <span className="text-zinc-500 text-sm">Thinking...</span>
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
    )
}
