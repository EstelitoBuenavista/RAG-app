'use client'

import { Children, isValidElement, type ReactNode } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'

export interface Source {
    number: number
    document_id: string
    filename: string
    content: string
    similarity: number
}

interface MarkdownMessageProps {
    content: string
    sources?: Source[]
    onCitationClick?: (source: Source) => void
    activeSourceNumber?: number | null
}

/** Inline `[n]` citation chip. */
function Citation({
    number,
    source,
    active,
    onClick,
}: {
    number: number
    source: Source
    active: boolean
    onClick?: (source: Source) => void
}) {
    return (
        <button
            type="button"
            onClick={() => onClick?.(source)}
            title={`View source: ${source.filename}`}
            aria-label={`View source ${number}: ${source.filename}`}
            className={cn(
                'mx-0.5 inline-flex size-[1.15em] translate-y-[-0.15em] cursor-pointer items-center justify-center rounded align-middle text-[0.7em] font-semibold tabular-nums transition-colors',
                active
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-muted-foreground/40'
            )}
        >
            {number}
        </button>
    )
}

/**
 * Code renderers are module-scope so the citation walker below can identify
 * them by reference and refuse to descend into code, where `[1]` is array
 * syntax rather than a citation.
 */
function InlineOrBlockCode({
    className,
    children,
    ...props
}: React.ComponentProps<'code'>) {
    const isBlock = Boolean(className)
    return isBlock ? (
        <code className={cn('block font-mono text-sm', className)} {...props}>
            {children}
        </code>
    ) : (
        <code
            className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[0.875em]"
            {...props}
        >
            {children}
        </code>
    )
}

function Pre({ children }: React.ComponentProps<'pre'>) {
    return (
        <pre className="scrollbar-subtle my-3 overflow-x-auto rounded-lg border border-border bg-secondary/50 p-4">
            {children}
        </pre>
    )
}

const CODE_TYPES = new Set<unknown>([InlineOrBlockCode, Pre, 'code', 'pre'])

/**
 * Recursively replaces `[n]` in rendered text with citation chips.
 *
 * Walking the whole subtree (rather than only direct string children) is what
 * makes citations work inside bold, italic, links, and list items.
 */
function withCitations(
    children: ReactNode,
    sources: Source[],
    onClick?: (source: Source) => void,
    activeNumber?: number | null
): ReactNode {
    if (sources.length === 0) return children

    const walk = (node: ReactNode, keyPrefix: string): ReactNode => {
        if (typeof node === 'string') {
            const parts = node.split(/(\[\d+\])/g)
            if (parts.length === 1) return node

            return parts.map((part, i) => {
                const match = part.match(/^\[(\d+)\]$/)
                if (match) {
                    const num = parseInt(match[1], 10)
                    const source = sources.find(s => s.number === num)
                    if (source) {
                        return (
                            <Citation
                                key={`${keyPrefix}-${i}`}
                                number={num}
                                source={source}
                                active={activeNumber === num}
                                onClick={onClick}
                            />
                        )
                    }
                }
                return part
            })
        }

        if (Array.isArray(node)) {
            return Children.map(node, (child, i) => walk(child, `${keyPrefix}-${i}`))
        }

        if (isValidElement(node)) {
            // Never rewrite inside code — `[0]` there is syntax, not a citation.
            if (CODE_TYPES.has(node.type)) return node

            const props = node.props as { children?: ReactNode }
            if (props?.children == null) return node

            return {
                ...node,
                props: { ...props, children: walk(props.children, keyPrefix) },
            }
        }

        return node
    }

    return walk(children, 'c')
}

export function MarkdownMessage({
    content,
    sources = [],
    onCitationClick,
    activeSourceNumber,
}: MarkdownMessageProps) {
    const cite = (children: ReactNode) =>
        withCitations(children, sources, onCitationClick, activeSourceNumber)

    const components: Components = {
        p: ({ children }) => <p className="mb-3 last:mb-0">{cite(children)}</p>,
        li: ({ children }) => <li className="pl-1">{cite(children)}</li>,
        td: ({ children }) => (
            <td className="border border-border px-3 py-2 align-top">
                {cite(children)}
            </td>
        ),
        code: InlineOrBlockCode,
        pre: Pre,
        h1: ({ children }) => (
            <h1 className="mt-5 mb-3 text-xl font-bold tracking-tight first:mt-0">
                {cite(children)}
            </h1>
        ),
        h2: ({ children }) => (
            <h2 className="mt-5 mb-2 text-lg font-bold tracking-tight first:mt-0">
                {cite(children)}
            </h2>
        ),
        h3: ({ children }) => (
            <h3 className="mt-4 mb-2 font-semibold first:mt-0">{cite(children)}</h3>
        ),
        ul: ({ children }) => (
            <ul className="mb-3 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>
        ),
        ol: ({ children }) => (
            <ol className="mb-3 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>
        ),
        blockquote: ({ children }) => (
            <blockquote className="my-3 border-l-2 border-border pl-4 text-muted-foreground italic">
                {children}
            </blockquote>
        ),
        a: ({ href, children }) => (
            <a
                href={href}
                className="font-medium underline underline-offset-4 hover:text-muted-foreground"
                target="_blank"
                rel="noopener noreferrer"
            >
                {children}
            </a>
        ),
        table: ({ children }) => (
            <div className="scrollbar-subtle my-3 overflow-x-auto rounded-lg border border-border">
                <table className="w-full border-collapse text-sm">{children}</table>
            </div>
        ),
        th: ({ children }) => (
            <th className="border border-border bg-secondary/60 px-3 py-2 text-left font-semibold">
                {children}
            </th>
        ),
        hr: () => <hr className="my-4 border-border" />,
        strong: ({ children }) => (
            <strong className="font-semibold">{children}</strong>
        ),
    }

    return (
        <div className="text-sm leading-relaxed">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
                {content}
            </ReactMarkdown>
        </div>
    )
}
