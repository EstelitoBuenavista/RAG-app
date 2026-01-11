import { Skeleton } from '@/components/ui/skeleton'

export default function SignupLoading() {
    return (
        <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
            <div className="w-full max-w-md p-8">
                {/* Logo */}
                <div className="flex items-center justify-center space-x-3 mb-8">
                    <div className="w-10 h-10 bg-white text-zinc-950 flex items-center justify-center font-bold text-xl">
                        I
                    </div>
                    <span className="text-2xl font-bold tracking-tight">Inkwell</span>
                </div>

                {/* Card Skeleton */}
                <div className="border border-zinc-800 p-8">
                    <div className="text-center mb-6">
                        <Skeleton className="h-7 w-40 mx-auto mb-2" />
                        <Skeleton className="h-4 w-64 mx-auto" />
                    </div>

                    <div className="space-y-4">
                        <div>
                            <Skeleton className="h-4 w-12 mb-2" />
                            <Skeleton className="h-12 w-full" />
                        </div>
                        <div>
                            <Skeleton className="h-4 w-16 mb-2" />
                            <Skeleton className="h-12 w-full" />
                        </div>
                        <div>
                            <Skeleton className="h-4 w-32 mb-2" />
                            <Skeleton className="h-12 w-full" />
                        </div>
                        <Skeleton className="h-12 w-full mt-6" />
                    </div>

                    <div className="mt-6 text-center">
                        <Skeleton className="h-4 w-52 mx-auto" />
                    </div>
                </div>
            </div>
        </div>
    )
}
