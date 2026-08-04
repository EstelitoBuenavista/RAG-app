import { AppHeaderSkeleton } from '@/components/app-header-skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardLoading() {
    return (
        <div className="min-h-dvh">
            <AppHeaderSkeleton />

            <main className="app-container py-8 sm:py-12">
                <div className="mb-8 space-y-2">
                    <Skeleton className="h-10 w-56" />
                    <Skeleton className="h-5 w-80" />
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                    <Card>
                        <CardHeader className="border-b [.border-b]:pb-6">
                            <Skeleton className="h-6 w-44" />
                            <Skeleton className="h-4 w-64" />
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Skeleton className="h-48 w-full rounded-lg" />
                            <Skeleton className="h-10 w-full rounded-md" />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="border-b [.border-b]:pb-6">
                            <Skeleton className="h-6 w-40" />
                            <Skeleton className="h-4 w-56" />
                        </CardHeader>
                        <CardContent className="px-0">
                            <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                                {[...Array(3)].map((_, i) => (
                                    <div key={i} className="space-y-2 p-5">
                                        <Skeleton className="h-4 w-24" />
                                        <Skeleton className="h-8 w-16" />
                                        <Skeleton className="h-3 w-20" />
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card className="mt-6">
                    <CardHeader className="border-b [.border-b]:pb-6">
                        <Skeleton className="h-6 w-40" />
                        <Skeleton className="h-4 w-56" />
                    </CardHeader>
                    <CardContent className="px-0">
                        <div className="divide-y divide-border">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="flex items-center gap-4 px-6 py-4">
                                    <Skeleton className="size-10 rounded-md" />
                                    <div className="flex-1 space-y-2">
                                        <Skeleton className="h-4 w-48" />
                                        <Skeleton className="h-3 w-64" />
                                    </div>
                                    <Skeleton className="h-6 w-20 rounded-full" />
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </main>
        </div>
    )
}
