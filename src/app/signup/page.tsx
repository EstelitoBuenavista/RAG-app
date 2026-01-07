import Link from 'next/link'
import { signup } from '@/app/auth/actions'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

export default async function SignupPage({
    searchParams,
}: {
    searchParams: Promise<{ error?: string }>
}) {
    const params = await searchParams
    const error = params.error

    return (
        <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-6">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="flex items-center space-x-3 mb-12">
                    <div className="w-10 h-10 bg-white text-zinc-950 flex items-center justify-center font-bold text-xl">
                        R
                    </div>
                    <span className="text-xl font-bold tracking-tight">RAG App</span>
                </div>

                {/* Title */}
                <h1 className="text-4xl font-bold tracking-tight mb-2">Create account</h1>
                <p className="text-zinc-500 mb-8">Enter your email and password to get started</p>

                {/* Alerts */}
                {error && (
                    <div className="mb-6 p-4 border border-red-500/50 bg-red-500/10 text-red-400 text-sm">
                        {error}
                    </div>
                )}

                {/* Form */}
                <form className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="email" className="text-zinc-400 text-sm font-medium">
                            EMAIL
                        </Label>
                        <Input
                            id="email"
                            name="email"
                            type="email"
                            placeholder="you@example.com"
                            required
                            className="h-12 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-zinc-600 focus:ring-0 rounded-none"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password" className="text-zinc-400 text-sm font-medium">
                            PASSWORD
                        </Label>
                        <Input
                            id="password"
                            name="password"
                            type="password"
                            placeholder="••••••••"
                            required
                            minLength={6}
                            className="h-12 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-zinc-600 focus:ring-0 rounded-none"
                        />
                    </div>
                    <Button
                        formAction={signup}
                        className="w-full h-12 bg-white text-zinc-950 hover:bg-zinc-200 font-medium rounded-none"
                    >
                        Create Account
                    </Button>
                </form>

                {/* Footer */}
                <div className="mt-8 text-center text-sm text-zinc-500">
                    Already have an account?{' '}
                    <Link href="/login" className="text-white hover:underline">
                        Sign in
                    </Link>
                </div>
            </div>
        </div>
    )
}
