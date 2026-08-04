import { Brand } from '@/components/brand'
import { Skeleton } from '@/components/ui/skeleton'

export default function SignupLoading() {
    return (
        <div className="flex min-h-dvh items-center justify-center p-6">
            <div className="w-full max-w-md">
                <div className="mb-10">
                    <Brand />
                </div>

                <Skeleton className="h-9 w-56" />
                <Skeleton className="mt-3 mb-8 h-5 w-80" />

                <div className="space-y-5">
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-14" />
                        <Skeleton className="h-11 w-full rounded-md" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-11 w-full rounded-md" />
                    </div>
                    <Skeleton className="h-11 w-full rounded-md" />
                </div>

                <Skeleton className="mx-auto mt-8 h-4 w-52" />
            </div>
        </div>
    )
}
