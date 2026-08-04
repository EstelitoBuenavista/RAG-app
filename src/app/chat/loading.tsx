import { AppHeaderSkeleton } from '@/components/app-header-skeleton'
import { Skeleton } from '@/components/ui/skeleton'

export default function ChatLoading() {
    return (
        <div className="flex h-dvh flex-col overflow-hidden">
            <AppHeaderSkeleton />

            <main className="flex min-h-0 flex-1 overflow-hidden">
                <aside className="hidden w-72 shrink-0 border-r border-border bg-sidebar md:block">
                    <div className="flex items-center justify-between border-b border-border p-3">
                        <Skeleton className="h-4 w-14" />
                        <Skeleton className="h-8 w-16 rounded-md" />
                    </div>
                    <div className="space-y-2 p-3">
                        {[...Array(6)].map((_, i) => (
                            <Skeleton key={i} className="h-9 w-full rounded-md" />
                        ))}
                    </div>
                </aside>

                <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3">
                        <Skeleton className="size-8 rounded-md" />
                        <Skeleton className="h-4 w-40" />
                    </div>

                    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6">
                        <Skeleton className="size-12 rounded-xl" />
                        <Skeleton className="h-8 w-64" />
                        <Skeleton className="h-4 w-96 max-w-full" />
                        <div className="mt-4 w-full max-w-2xl space-y-2">
                            {[...Array(3)].map((_, i) => (
                                <Skeleton key={i} className="h-12 w-full rounded-lg" />
                            ))}
                        </div>
                    </div>

                    <div className="shrink-0 border-t border-border px-4 py-3 sm:px-6">
                        <div className="mx-auto flex max-w-3xl gap-2">
                            <Skeleton className="h-11 flex-1 rounded-md" />
                            <Skeleton className="size-10 rounded-md" />
                        </div>
                    </div>
                </div>

                {/* Docked source column, mirrors SourceDock's breakpoint. */}
                <aside className="hidden w-[380px] shrink-0 flex-col items-center justify-center gap-3 border-l border-border bg-sidebar px-8 xl:flex 2xl:w-[440px]">
                    <Skeleton className="size-11 rounded-lg" />
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-52" />
                </aside>
            </main>
        </div>
    )
}
