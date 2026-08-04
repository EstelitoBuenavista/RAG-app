'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
    ArrowDown,
    Check,
    Copy,
    FileText,
    PanelLeftClose,
    PanelLeftOpen,
    SendHorizonal,
    Sparkles,
    Square,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ChatList, type Chat } from '@/components/chat/chat-list'
import { MarkdownMessage, type Source } from '@/components/chat/markdown-message'
import { SourceDock, SourceSheet } from '@/components/chat/source-sheet'
import { useMediaQuery } from '@/lib/use-media-query'
import { cn } from '@/lib/utils'

interface Message {
    id: string
    role: 'user' | 'assistant'
    content: string
    sources?: Source[]
    timestamp: Date
}

const SUGGESTIONS = [
    'Summarise the key points across my documents',
    'What are the main conclusions?',
    'List any dates, figures, or deadlines mentioned',
]

export function ChatInterface() {
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [isStreaming, setIsStreaming] = useState(false)
    const [selectedSource, setSelectedSource] = useState<Source | null>(null)
    const [sourceOpen, setSourceOpen] = useState(false)
    const [sidebarOpen, setSidebarOpen] = useState(true)
    const [mobileNavOpen, setMobileNavOpen] = useState(false)
    const [chats, setChats] = useState<Chat[]>([])
    const [currentChatId, setCurrentChatId] = useState<string | null>(null)
    const [loadingChats, setLoadingChats] = useState(true)
    const [copiedId, setCopiedId] = useState<string | null>(null)
    const [showJumpToLatest, setShowJumpToLatest] = useState(false)

    // Above this width the source panel docks as a real column instead of
    // floating over the conversation.
    const canDockSource = useMediaQuery('(min-width: 1280px)')

    const scrollRef = useRef<HTMLDivElement>(null)
    const bottomRef = useRef<HTMLDivElement>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const abortRef = useRef<AbortController | null>(null)
    // Whether the user is reading at the bottom. Auto-scrolling while they've
    // scrolled up to read an earlier answer is hostile, so we only follow along
    // when they're already there.
    const pinnedToBottom = useRef(true)

    const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
        bottomRef.current?.scrollIntoView({ behavior })
    }, [])

    const handleScroll = useCallback(() => {
        const el = scrollRef.current
        if (!el) return
        const distance = el.scrollHeight - el.scrollTop - el.clientHeight
        pinnedToBottom.current = distance < 120
        setShowJumpToLatest(distance > 400)
    }, [])

    useEffect(() => {
        if (pinnedToBottom.current) scrollToBottom()
    }, [messages, scrollToBottom])

    const loadChats = useCallback(async () => {
        try {
            const response = await fetch('/api/chats')
            if (response.ok) {
                const data = await response.json()
                setChats(data.chats || [])
            }
        } catch {
            // Non-fatal: the chat list is navigation, not the conversation.
        } finally {
            setLoadingChats(false)
        }
    }, [])

    useEffect(() => {
        loadChats()
    }, [loadChats])

    // Autosize the composer up to a ceiling, then let it scroll.
    useEffect(() => {
        const el = textareaRef.current
        if (!el) return
        el.style.height = 'auto'
        el.style.height = `${Math.min(el.scrollHeight, 200)}px`
    }, [input])

    const loadChat = async (chatId: string) => {
        setMobileNavOpen(false)
        try {
            const response = await fetch(`/api/chats/${chatId}`)
            if (!response.ok) throw new Error()

            const data = await response.json()
            setMessages(
                data.messages.map(
                    (msg: {
                        id: string
                        role: 'user' | 'assistant'
                        content: string
                        sources?: Source[]
                        created_at: string
                    }) => ({
                        id: msg.id,
                        role: msg.role,
                        content: msg.content,
                        sources: msg.sources ?? undefined,
                        timestamp: new Date(msg.created_at),
                    })
                )
            )
            setCurrentChatId(chatId)
            setSourceOpen(false)
            pinnedToBottom.current = true
            requestAnimationFrame(() => scrollToBottom('auto'))
        } catch {
            toast.error('Could not open that chat')
        }
    }

    const createNewChat = () => {
        abortRef.current?.abort()
        setMessages([])
        setCurrentChatId(null)
        setSelectedSource(null)
        setSourceOpen(false)
        setMobileNavOpen(false)
        pinnedToBottom.current = true
        textareaRef.current?.focus()
    }

    const deleteChat = async (chatId: string) => {
        try {
            const response = await fetch(`/api/chats/${chatId}`, { method: 'DELETE' })
            if (!response.ok) throw new Error()

            setChats(prev => prev.filter(c => c.id !== chatId))
            if (currentChatId === chatId) createNewChat()
            toast.success('Chat deleted')
        } catch {
            toast.error('Could not delete chat')
        }
    }

    const renameChat = async (chatId: string, title: string) => {
        const previous = chats
        setChats(prev => prev.map(c => (c.id === chatId ? { ...c, title } : c)))
        try {
            const response = await fetch(`/api/chats/${chatId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title }),
            })
            if (!response.ok) throw new Error()
        } catch {
            setChats(previous)
            toast.error('Could not rename chat')
        }
    }

    const openSource = (source: Source) => {
        setSelectedSource(source)
        setSourceOpen(true)
    }

    const copyMessage = async (message: Message) => {
        try {
            await navigator.clipboard.writeText(message.content)
            setCopiedId(message.id)
            setTimeout(() => setCopiedId(null), 2000)
        } catch {
            toast.error('Could not copy to clipboard')
        }
    }

    const stopStreaming = () => abortRef.current?.abort()

    const send = async (text: string) => {
        const question = text.trim()
        if (!question || isStreaming) return

        const userMessage: Message = {
            id: `u-${Date.now()}`,
            role: 'user',
            content: question,
            timestamp: new Date(),
        }
        const assistantId = `a-${Date.now()}`

        // Snapshot history before appending, so the model doesn't see the
        // question twice.
        const history = messages.map(m => ({ role: m.role, content: m.content }))

        setMessages(prev => [
            ...prev,
            userMessage,
            { id: assistantId, role: 'assistant', content: '', timestamp: new Date() },
        ])
        setInput('')
        setIsStreaming(true)
        setSourceOpen(false)
        pinnedToBottom.current = true

        const controller = new AbortController()
        abortRef.current = controller

        const setAssistant = (changes: Partial<Message>) =>
            setMessages(prev =>
                prev.map(m => (m.id === assistantId ? { ...m, ...changes } : m))
            )

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: question,
                    chatId: currentChatId,
                    conversationHistory: history,
                }),
                signal: controller.signal,
            })

            if (!response.ok || !response.body) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.error || 'Failed to get a response')
            }

            const reader = response.body.getReader()
            const decoder = new TextDecoder()
            // SSE events can straddle chunk boundaries, so incomplete lines are
            // held here until the rest of the event arrives.
            let buffer = ''
            let streamed = ''

            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                buffer += decoder.decode(value, { stream: true })
                const lines = buffer.split('\n')
                buffer = lines.pop() ?? ''

                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue

                    let data: {
                        type: string
                        text?: string
                        chatId?: string
                        sources?: Source[]
                        message?: string
                    }
                    try {
                        data = JSON.parse(line.slice(6))
                    } catch {
                        continue
                    }

                    if (data.type === 'metadata') {
                        if (!currentChatId && data.chatId) setCurrentChatId(data.chatId)
                    } else if (data.type === 'chunk') {
                        streamed += data.text ?? ''
                        setAssistant({ content: streamed })
                    } else if (data.type === 'done') {
                        setAssistant({ sources: data.sources ?? [] })
                        loadChats()
                    } else if (data.type === 'error') {
                        throw new Error(data.message || 'The model stopped unexpectedly')
                    }
                }
            }
        } catch (err) {
            if (err instanceof DOMException && err.name === 'AbortError') {
                // User pressed stop; keep whatever streamed in.
                setMessages(prev =>
                    prev.map(m =>
                        m.id === assistantId && !m.content
                            ? { ...m, content: '_Response stopped._' }
                            : m
                    )
                )
            } else {
                const message =
                    err instanceof Error ? err.message : 'Something went wrong'
                // Drop the empty placeholder rather than leaving a blank bubble.
                setMessages(prev => prev.filter(m => m.id !== assistantId))
                toast.error('Could not get an answer', { description: message })
            }
        } finally {
            setIsStreaming(false)
            abortRef.current = null
        }
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        send(input)
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            send(input)
        }
    }

    const sidebar = (
        <ChatList
            chats={chats}
            currentChatId={currentChatId}
            loading={loadingChats}
            onSelect={loadChat}
            onNew={createNewChat}
            onRename={renameChat}
            onDelete={deleteChat}
        />
    )

    return (
        <div className="flex h-full min-h-0 overflow-hidden">
            {/* Desktop sidebar */}
            <aside
                className={cn(
                    'hidden shrink-0 border-r border-border bg-sidebar transition-[width] duration-200 md:block',
                    sidebarOpen ? 'w-72' : 'w-0'
                )}
            >
                {sidebarOpen && sidebar}
            </aside>

            <div className="flex min-w-0 flex-1 flex-col">
                {/* Chat toolbar */}
                <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => setSidebarOpen(o => !o)}
                                aria-label={sidebarOpen ? 'Hide chat list' : 'Show chat list'}
                                className="hidden text-muted-foreground md:inline-flex"
                            >
                                {sidebarOpen ? <PanelLeftClose /> : <PanelLeftOpen />}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            {sidebarOpen ? 'Hide chat list' : 'Show chat list'}
                        </TooltipContent>
                    </Tooltip>

                    <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
                        <SheetTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label="Show chat list"
                                className="text-muted-foreground md:hidden"
                            >
                                <PanelLeftOpen />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-80 p-0">
                            <SheetTitle className="sr-only">Chats</SheetTitle>
                            {sidebar}
                        </SheetContent>
                    </Sheet>

                    <span className="truncate text-sm font-medium">
                        {chats.find(c => c.id === currentChatId)?.title ?? 'New chat'}
                    </span>
                </div>

                {/* Messages */}
                <div
                    ref={scrollRef}
                    onScroll={handleScroll}
                    className="scrollbar-subtle relative min-h-0 flex-1 overflow-y-auto"
                >
                    {messages.length === 0 ? (
                        <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center px-6 text-center">
                            <div className="mb-5 flex size-12 items-center justify-center rounded-xl bg-secondary">
                                <Sparkles className="size-6" />
                            </div>
                            <h2 className="text-2xl font-bold tracking-tight">
                                Ask your documents
                            </h2>
                            <p className="mt-2 text-sm text-muted-foreground">
                                Answers are grounded in your uploaded files, with numbered
                                citations you can click to read the exact source passage.
                            </p>

                            <div className="mt-8 grid w-full gap-2">
                                {SUGGESTIONS.map(suggestion => (
                                    <button
                                        key={suggestion}
                                        type="button"
                                        onClick={() => send(suggestion)}
                                        className="cursor-pointer rounded-lg border border-border px-4 py-3 text-left text-sm transition-colors outline-none hover:border-muted-foreground/40 hover:bg-secondary/50 focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                    >
                                        {suggestion}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6">
                            {messages.map(message => {
                                const isUser = message.role === 'user'
                                const isPending =
                                    !isUser && message.content === '' && isStreaming

                                return (
                                    <div
                                        key={message.id}
                                        className={cn(
                                            'flex',
                                            isUser ? 'justify-end' : 'justify-start'
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                'group min-w-0 rounded-xl px-4 py-3',
                                                isUser
                                                    ? 'max-w-[85%] bg-primary text-primary-foreground'
                                                    : 'w-full border border-border bg-card'
                                            )}
                                        >
                                            {isUser ? (
                                                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                                    {message.content}
                                                </p>
                                            ) : isPending ? (
                                                <div className="flex items-center gap-3 py-1">
                                                    <div className="flex gap-1">
                                                        {[0, 150, 300].map(delay => (
                                                            <span
                                                                key={delay}
                                                                className="size-1.5 animate-pulse rounded-full bg-muted-foreground"
                                                                style={{
                                                                    animationDelay: `${delay}ms`,
                                                                }}
                                                            />
                                                        ))}
                                                    </div>
                                                    <span className="text-sm text-muted-foreground">
                                                        Searching your documents...
                                                    </span>
                                                </div>
                                            ) : (
                                                <>
                                                    <MarkdownMessage
                                                        content={message.content}
                                                        sources={message.sources}
                                                        onCitationClick={openSource}
                                                        activeSourceNumber={
                                                            sourceOpen
                                                                ? selectedSource?.number
                                                                : null
                                                        }
                                                    />

                                                    {message.sources &&
                                                        message.sources.length > 0 && (
                                                            <div className="mt-4 border-t border-border pt-3">
                                                                <p className="label-caps mb-2">
                                                                    {message.sources.length} source
                                                                    {message.sources.length === 1
                                                                        ? ''
                                                                        : 's'}{' '}
                                                                    cited
                                                                </p>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {message.sources.map(source => (
                                                                        <button
                                                                            key={source.number}
                                                                            type="button"
                                                                            onClick={() =>
                                                                                openSource(source)
                                                                            }
                                                                            className={cn(
                                                                                'inline-flex max-w-full cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                                                                                sourceOpen &&
                                                                                    selectedSource?.number ===
                                                                                        source.number
                                                                                    ? 'border-primary bg-primary text-primary-foreground'
                                                                                    : 'border-border text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground'
                                                                            )}
                                                                        >
                                                                            <FileText className="size-3 shrink-0" />
                                                                            <span className="truncate">
                                                                                [{source.number}]{' '}
                                                                                {source.filename}
                                                                            </span>
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                    {message.content && (
                                                        <div className="mt-2 flex justify-end opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                                                            <Button
                                                                variant="ghost"
                                                                size="xs"
                                                                onClick={() => copyMessage(message)}
                                                                className="text-muted-foreground"
                                                            >
                                                                {copiedId === message.id ? (
                                                                    <>
                                                                        <Check />
                                                                        Copied
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Copy />
                                                                        Copy
                                                                    </>
                                                                )}
                                                            </Button>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                            <div ref={bottomRef} />
                        </div>
                    )}
                </div>

                {/* Composer */}
                <div className="shrink-0 border-t border-border bg-background px-4 py-3 sm:px-6">
                    <div className="relative mx-auto max-w-3xl">
                        {showJumpToLatest && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => scrollToBottom()}
                                className="absolute -top-14 left-1/2 -translate-x-1/2 shadow-md"
                            >
                                <ArrowDown />
                                Jump to latest
                            </Button>
                        )}

                        <form onSubmit={handleSubmit} className="flex items-end gap-2">
                            <Textarea
                                ref={textareaRef}
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Ask a question about your documents..."
                                rows={1}
                                aria-label="Your question"
                                className="scrollbar-subtle max-h-[200px] min-h-11 resize-none py-3"
                            />

                            {isStreaming ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon-lg"
                                    onClick={stopStreaming}
                                    aria-label="Stop generating"
                                >
                                    <Square className="fill-current" />
                                </Button>
                            ) : (
                                <Button
                                    type="submit"
                                    size="icon-lg"
                                    disabled={!input.trim()}
                                    aria-label="Send message"
                                >
                                    <SendHorizonal />
                                </Button>
                            )}
                        </form>

                        <p className="mt-2 text-center text-xs text-muted-foreground">
                            <kbd className="font-sans font-medium">Enter</kbd> to send ·{' '}
                            <kbd className="font-sans font-medium">Shift + Enter</kbd> for a
                            new line
                        </p>
                    </div>
                </div>
            </div>

            {canDockSource ? (
                <SourceDock
                    source={selectedSource}
                    open={sourceOpen}
                    onOpenChange={setSourceOpen}
                />
            ) : (
                <SourceSheet
                    source={selectedSource}
                    open={sourceOpen}
                    onOpenChange={setSourceOpen}
                />
            )}
        </div>
    )
}
