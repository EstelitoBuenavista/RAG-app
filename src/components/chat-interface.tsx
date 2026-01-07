'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'

interface Message {
    id: string
    role: 'user' | 'assistant'
    content: string
    sources?: { filename: string; chunk: string }[]
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
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMessage.content }),
            })

            const data = await response.json()

            if (response.ok) {
                const assistantMessage: Message = {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: data.response,
                    sources: data.sources?.map((s: { document_id: string; chunk: string }) => ({
                        filename: s.document_id,
                        chunk: s.chunk
                    })),
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
                content: 'Error: Failed to connect to the server',
                timestamp: new Date(),
            }
            setMessages((prev) => [...prev, errorMessage])
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex flex-col h-full">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                        <div className="text-center max-w-md">
                            <div className="text-6xl mb-4">💬</div>
                            <h2 className="text-2xl font-bold mb-2">Start a conversation</h2>
                            <p className="text-zinc-500">
                                Ask questions about your uploaded documents and get AI-powered answers.
                            </p>
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
                                            <p className="text-xs text-zinc-500 mb-2">SOURCES</p>
                                            <div className="space-y-2">
                                                {message.sources.map((source, idx) => (
                                                    <div key={idx} className="text-xs text-zinc-400 bg-zinc-800 p-2">
                                                        📄 {source.filename}
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
                                    <div className="flex space-x-2">
                                        <div className="w-2 h-2 bg-zinc-500 animate-pulse" />
                                        <div className="w-2 h-2 bg-zinc-500 animate-pulse delay-75" />
                                        <div className="w-2 h-2 bg-zinc-500 animate-pulse delay-150" />
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
