import { Suspense } from 'react'
import { signup } from '@/app/auth/actions'
import { AuthForm } from '@/components/auth-form'
import { Skeleton } from '@/components/ui/skeleton'

function AuthFallback() {
    return (
        <div className="w-full max-w-md space-y-6">
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
        </div>
    )
}

export default function SignupPage() {
    return (
        <div className="flex min-h-dvh items-center justify-center p-6">
            <Suspense fallback={<AuthFallback />}>
                <AuthForm mode="signup" action={signup} />
            </Suspense>
        </div>
    )
}
