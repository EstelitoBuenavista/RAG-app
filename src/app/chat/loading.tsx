import { Skeleton } from '@/components/ui/skeleton'

export default function ChatLoading() {
    return (
        <div className="h-screen bg-zinc-950 text-white flex flex-col overflow-hidden">
            {/* Header Skeleton */}
            <header className="border-b border-zinc-800 bg-zinc-950 sticky top-0 z-50">
                <div className="container mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center space-x-6">
                        <div className="flex items-center space-x-3">
                            <div className="w-9 h-9 bg-white text-zinc-950 flex items-center justify-center font-bold text-lg">
                                I
                            </div>
                            <span className="text-xl font-bold tracking-tight">Inkwell</span>
                        </div>
                        <nav className="flex items-center space-x-1">
                            <Skeleton className="w-24 h-9" />
                            <Skeleton className="w-16 h-9" />
                        </nav>
                    </div>
                    <div className="flex items-center space-x-4">
                        <Skeleton className="w-40 h-4" />
                        <Skeleton className="w-20 h-8" />
                    </div>
                </div>
            </header>

            {/* Chat Content Skeleton */}
            <main className="flex-1 min-h-0 flex overflow-hidden">
                {/* Chat Sidebar Skeleton */}
                <div className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col">
                    <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
                        <Skeleton className="h-4 w-16" />
                        <div className="flex items-center gap-1">
                            <Skeleton className="w-7 h-7" />
                            <Skeleton className="w-7 h-7" />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="p-3 border-b border-zinc-800">
                                <Skeleton className="h-4 w-full mb-2" />
                                <Skeleton className="h-3 w-20" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Main Chat Area Skeleton */}
                <div className="flex-1 flex flex-col">
                    {/* Empty state / messages area */}
                    <div className="flex-1 flex items-center justify-center p-6">
                        <div className="text-center max-w-md mx-auto space-y-4">
                            <Skeleton className="w-16 h-16 rounded-full mx-auto mb-4" />
                            <Skeleton className="h-8 w-56 mx-auto mb-2" />
                            <Skeleton className="h-4 w-72 mx-auto" />
                            <div className="pt-4 border border-zinc-800 p-4 space-y-2">
                                <Skeleton className="h-4 w-28 mb-3" />
                                <Skeleton className="h-3 w-full" />
                                <Skeleton className="h-3 w-full" />
                                <Skeleton className="h-3 w-3/4" />
                            </div>
                        </div>
                    </div>

                    {/* Input Skeleton */}
                    <div className="border-t border-zinc-800 p-4">
                        <div className="flex gap-4">
                            <Skeleton className="flex-1 h-12" />
                            <Skeleton className="w-20 h-12" />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
