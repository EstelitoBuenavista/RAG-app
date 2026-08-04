import { Brand } from '@/components/brand'
import { Skeleton } from '@/components/ui/skeleton'

/** Header placeholder matching AppHeader's dimensions to avoid layout shift. */
export function AppHeaderSkeleton() {
    return (
        <header className="sticky top-0 z-50 border-b border-border bg-background">
            <div className="app-container flex h-16 items-center justify-between gap-4">
                <div className="flex items-center gap-4 sm:gap-8">
                    <Brand size="sm" />
                    <nav className="flex items-center gap-1">
                        <Skeleton className="h-9 w-28 rounded-md" />
                        <Skeleton className="h-9 w-20 rounded-md" />
                    </nav>
                </div>
                <Skeleton className="size-9 rounded-md" />
            </div>
        </header>
    )
}
