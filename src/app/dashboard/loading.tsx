import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardLoading() {
    return (
        <div className="min-h-screen bg-zinc-950 text-white">
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

            {/* Main Content Skeleton */}
            <main className="container mx-auto px-6 py-12">
                <div className="mb-12">
                    <Skeleton className="h-10 w-48 mb-2" />
                    <Skeleton className="h-5 w-80" />
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                    {/* Document Upload Skeleton */}
                    <div className="border border-zinc-800">
                        <div className="border-b border-zinc-800 p-6">
                            <Skeleton className="h-6 w-32 mb-2" />
                            <Skeleton className="h-4 w-64" />
                        </div>
                        <div className="p-6">
                            <div className="border-2 border-dashed border-zinc-700 p-12 flex flex-col items-center justify-center">
                                <Skeleton className="w-16 h-16 rounded-full mb-4" />
                                <Skeleton className="h-4 w-48 mb-2" />
                                <Skeleton className="h-3 w-32" />
                            </div>
                        </div>
                    </div>

                    {/* Quick Stats Skeleton */}
                    <div className="border border-zinc-800">
                        <div className="border-b border-zinc-800 p-6">
                            <Skeleton className="h-6 w-28 mb-2" />
                            <Skeleton className="h-4 w-52" />
                        </div>
                        <div className="grid grid-cols-2 gap-px bg-zinc-800">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="bg-zinc-950 p-6">
                                    <Skeleton className="h-8 w-12 mb-2" />
                                    <Skeleton className="h-4 w-20" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Document List Skeleton */}
                <div className="mt-8 border border-zinc-800">
                    <div className="border-b border-zinc-800 p-6">
                        <Skeleton className="h-6 w-36 mb-2" />
                        <Skeleton className="h-4 w-48" />
                    </div>
                    <div className="divide-y divide-zinc-800">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="p-4 flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                    <Skeleton className="w-10 h-10" />
                                    <div>
                                        <Skeleton className="h-4 w-48 mb-2" />
                                        <Skeleton className="h-3 w-32" />
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Skeleton className="w-16 h-6" />
                                    <Skeleton className="w-8 h-8" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    )
}
