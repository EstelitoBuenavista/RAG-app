'use client'

import { FileText, Quote, X } from 'lucide-react'
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import type { Source } from '@/components/chat/markdown-message'

interface SourceViewProps {
    source: Source | null
    open: boolean
    onOpenChange: (open: boolean) => void
}

/** Relevance meter + the passage itself. Shared by the sheet and the dock. */
function SourceBody({ source }: { source: Source }) {
    const relevance = Math.round(source.similarity * 100)

    return (
        <div className="scrollbar-subtle flex-1 space-y-4 overflow-y-auto p-4">
            <div className="rounded-lg border border-border bg-secondary/40 p-4">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Relevance</span>
                    <span className="font-medium tabular-nums">{relevance}% match</span>
                </div>
                <div
                    className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary"
                    role="progressbar"
                    aria-valuenow={relevance}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Similarity to your question"
                >
                    <div
                        className="h-full rounded-full bg-primary transition-[width] duration-300"
                        style={{ width: `${relevance}%` }}
                    />
                </div>
            </div>

            <div>
                <p className="label-caps mb-2">Source text</p>
                <div className="rounded-lg border border-border bg-secondary/40 p-4 text-sm leading-relaxed whitespace-pre-wrap">
                    {source.content}
                </div>
            </div>
        </div>
    )
}

/**
 * Overlay variant, used below the dock breakpoint.
 *
 * Non-modal on purpose: comparing an answer against its source is the point, so
 * the conversation stays readable and other citations stay clickable.
 */
export function SourceSheet({ source, open, onOpenChange }: SourceViewProps) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
            <SheetContent
                side="right"
                className="w-full gap-0 p-0 sm:max-w-md"
                onInteractOutside={e => e.preventDefault()}
            >
                {source && (
                    <>
                        <SheetHeader className="border-b border-border">
                            <SheetDescription className="label-caps">
                                Source [{source.number}]
                            </SheetDescription>
                            <SheetTitle className="flex items-center gap-2 text-base">
                                <FileText className="size-4 shrink-0 text-muted-foreground" />
                                <span className="truncate" title={source.filename}>
                                    {source.filename}
                                </span>
                            </SheetTitle>
                        </SheetHeader>
                        <SourceBody source={source} />
                    </>
                )}
            </SheetContent>
        </Sheet>
    )
}

/**
 * Docked variant for wide screens.
 *
 * Permanently occupies the space that would otherwise be empty gutter, and
 * lets the answer and the passage it cites be read side by side — which is the
 * whole point of citations. Keeps its empty state rather than collapsing, so
 * the column doesn't shift the conversation around as sources open and close.
 */
export function SourceDock({ source, open, onOpenChange }: SourceViewProps) {
    const showing = open && source

    return (
        <aside
            className="flex w-[380px] shrink-0 flex-col border-l border-border bg-sidebar 2xl:w-[440px]"
            aria-label="Cited source"
        >
            {showing ? (
                <>
                    <div className="flex items-start justify-between gap-2 border-b border-border p-4">
                        <div className="min-w-0">
                            <p className="label-caps">Source [{source.number}]</p>
                            <p className="mt-1 flex items-center gap-2 font-medium">
                                <FileText className="size-4 shrink-0 text-muted-foreground" />
                                <span className="truncate" title={source.filename}>
                                    {source.filename}
                                </span>
                            </p>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => onOpenChange(false)}
                            aria-label="Close source"
                            className="shrink-0 text-muted-foreground"
                        >
                            <X />
                        </Button>
                    </div>
                    <SourceBody source={source} />
                </>
            ) : (
                <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
                    <div className="mb-4 flex size-11 items-center justify-center rounded-lg bg-secondary">
                        <Quote className="size-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium">Sources appear here</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        Click any numbered citation in an answer to read the exact
                        passage it came from.
                    </p>
                </div>
            )}
        </aside>
    )
}
