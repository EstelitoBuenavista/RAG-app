import Link from 'next/link'
import { cn } from '@/lib/utils'

interface BrandProps {
    className?: string
    /** Renders as a link to the dashboard when true. */
    href?: string
    size?: 'sm' | 'md' | 'lg'
}

const markSize = {
    sm: 'size-8 text-base',
    md: 'size-9 text-lg',
    lg: 'size-10 text-xl',
}

const wordSize = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-xl',
}

/** The Inkwell mark + wordmark. */
export function Brand({ className, href, size = 'md' }: BrandProps) {
    const content = (
        <span className={cn('flex items-center gap-3', className)}>
            <span
                className={cn(
                    'flex items-center justify-center rounded-md bg-primary font-bold text-primary-foreground',
                    markSize[size]
                )}
                aria-hidden="true"
            >
                I
            </span>
            <span className={cn('font-bold tracking-tight', wordSize[size])}>
                Inkwell
            </span>
        </span>
    )

    if (href) {
        return (
            <Link
                href={href}
                className="rounded-md outline-none transition-opacity hover:opacity-80 focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
                {content}
            </Link>
        )
    }

    return content
}
