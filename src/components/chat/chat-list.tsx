'use client'

import { useState } from 'react'
import { Check, MessageSquare, Pencil, Plus, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'

export interface Chat {
    id: string
    title: string
    created_at: string
    updated_at: string
}

interface ChatListProps {
    chats: Chat[]
    currentChatId: string | null
    loading: boolean
    onSelect: (chatId: string) => void
    onNew: () => void
    onRename: (chatId: string, title: string) => void
    onDelete: (chatId: string) => void
}

/** Buckets chats into familiar time ranges instead of one flat list. */
function groupChats(chats: Chat[]) {
    const now = Date.now()
    const day = 86_400_000
    const groups: { label: string; items: Chat[] }[] = [
        { label: 'Today', items: [] },
        { label: 'Yesterday', items: [] },
        { label: 'Previous 7 days', items: [] },
        { label: 'Older', items: [] },
    ]

    for (const chat of chats) {
        const age = now - new Date(chat.updated_at).getTime()
        if (age < day) groups[0].items.push(chat)
        else if (age < 2 * day) groups[1].items.push(chat)
        else if (age < 7 * day) groups[2].items.push(chat)
        else groups[3].items.push(chat)
    }

    return groups.filter(g => g.items.length > 0)
}

export function ChatList({
    chats,
    currentChatId,
    loading,
    onSelect,
    onNew,
    onRename,
    onDelete,
}: ChatListProps) {
    const [editingId, setEditingId] = useState<string | null>(null)
    const [draftTitle, setDraftTitle] = useState('')
    const [pendingDelete, setPendingDelete] = useState<Chat | null>(null)

    const startEditing = (chat: Chat) => {
        setEditingId(chat.id)
        setDraftTitle(chat.title)
    }

    const commit = (chatId: string) => {
        const trimmed = draftTitle.trim()
        if (trimmed) onRename(chatId, trimmed)
        setEditingId(null)
    }

    const groups = groupChats(chats)

    return (
        <div className="flex h-full flex-col">
            <div className="flex items-center justify-between gap-2 border-b border-border p-3">
                <span className="label-caps">Chats</span>
                <Button variant="outline" size="sm" onClick={onNew}>
                    <Plus />
                    New
                </Button>
            </div>

            <div className="scrollbar-subtle flex-1 overflow-y-auto">
                {loading ? (
                    <div className="space-y-2 p-3">
                        {[...Array(5)].map((_, i) => (
                            <Skeleton key={i} className="h-9 w-full" />
                        ))}
                    </div>
                ) : chats.length === 0 ? (
                    <div className="px-4 py-10 text-center">
                        <MessageSquare className="mx-auto mb-3 size-8 text-muted-foreground/50" />
                        <p className="text-sm text-muted-foreground">No chats yet</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Ask a question to start one.
                        </p>
                    </div>
                ) : (
                    <div className="p-2">
                        {groups.map(group => (
                            <div key={group.label} className="mb-3 last:mb-0">
                                <p className="label-caps px-2 py-1.5">{group.label}</p>

                                <ul className="space-y-0.5">
                                    {group.items.map(chat => {
                                        const active = currentChatId === chat.id
                                        const editing = editingId === chat.id

                                        if (editing) {
                                            return (
                                                <li key={chat.id} className="flex items-center gap-1 px-1">
                                                    <Input
                                                        value={draftTitle}
                                                        onChange={e => setDraftTitle(e.target.value)}
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault()
                                                                commit(chat.id)
                                                            } else if (e.key === 'Escape') {
                                                                setEditingId(null)
                                                            }
                                                        }}
                                                        autoFocus
                                                        className="h-8 text-sm"
                                                        aria-label="Chat title"
                                                    />
                                                    <Button
                                                        variant="ghost"
                                                        size="icon-sm"
                                                        onClick={() => commit(chat.id)}
                                                        aria-label="Save title"
                                                    >
                                                        <Check />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon-sm"
                                                        onClick={() => setEditingId(null)}
                                                        aria-label="Cancel rename"
                                                    >
                                                        <X />
                                                    </Button>
                                                </li>
                                            )
                                        }

                                        return (
                                            <li key={chat.id}>
                                                <div
                                                    className={cn(
                                                        'group flex items-center gap-1 rounded-md pr-1 transition-colors',
                                                        active
                                                            ? 'bg-secondary'
                                                            : 'hover:bg-secondary/60'
                                                    )}
                                                >
                                                    <button
                                                        type="button"
                                                        onClick={() => onSelect(chat.id)}
                                                        aria-current={active ? 'true' : undefined}
                                                        className="min-w-0 flex-1 cursor-pointer rounded-md px-2 py-2 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                                    >
                                                        <span
                                                            className={cn(
                                                                'block truncate text-sm',
                                                                active
                                                                    ? 'font-medium text-foreground'
                                                                    : 'text-muted-foreground'
                                                            )}
                                                            title={chat.title}
                                                        >
                                                            {chat.title}
                                                        </span>
                                                    </button>

                                                    <div className="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon-xs"
                                                            onClick={() => startEditing(chat)}
                                                            aria-label={`Rename ${chat.title}`}
                                                            className="text-muted-foreground"
                                                        >
                                                            <Pencil />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon-xs"
                                                            onClick={() => setPendingDelete(chat)}
                                                            aria-label={`Delete ${chat.title}`}
                                                            className="text-muted-foreground hover:text-destructive"
                                                        >
                                                            <Trash2 />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </li>
                                        )
                                    })}
                                </ul>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <AlertDialog
                open={pendingDelete !== null}
                onOpenChange={open => !open && setPendingDelete(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete this chat?</AlertDialogTitle>
                        <AlertDialogDescription>
                            &ldquo;{pendingDelete?.title}&rdquo; and all of its messages will
                            be permanently removed. Your documents are not affected.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (pendingDelete) onDelete(pendingDelete.id)
                                setPendingDelete(null)
                            }}
                            className="bg-destructive text-white hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
