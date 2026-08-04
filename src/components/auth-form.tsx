'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import { useSearchParams } from 'next/navigation'
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Brand } from '@/components/brand'
import { motion, useReducedMotion } from '@/lib/motion'

interface AuthFormProps {
    mode: 'login' | 'signup'
    action: (formData: FormData) => void
}

const copy = {
    login: {
        title: 'Welcome back',
        subtitle: 'Sign in to your account to continue',
        submit: 'Sign in',
        footer: "Don't have an account?",
        footerLink: 'Sign up',
        footerHref: '/signup',
        autoComplete: 'current-password',
    },
    signup: {
        title: 'Create account',
        subtitle: 'Enter your email and password to get started',
        submit: 'Create account',
        footer: 'Already have an account?',
        footerLink: 'Sign in',
        footerHref: '/login',
        autoComplete: 'new-password',
    },
} as const

function SubmitButton({ label }: { label: string }) {
    const { pending } = useFormStatus()

    return (
        <Button type="submit" size="lg" className="h-11 w-full" disabled={pending}>
            {pending ? (
                <>
                    <Loader2 className="animate-spin" />
                    Please wait
                </>
            ) : (
                label
            )}
        </Button>
    )
}

export function AuthForm({ mode, action }: AuthFormProps) {
    const searchParams = useSearchParams()
    const error = searchParams.get('error')
    const message = searchParams.get('message')
    const [showPassword, setShowPassword] = useState(false)
    const reduceMotion = useReducedMotion()
    const text = copy[mode]

    const animation = reduceMotion
        ? {}
        : {
            initial: { opacity: 0, y: 12 },
            animate: { opacity: 1, y: 0 },
            transition: { duration: 0.35, ease: 'easeOut' as const },
        }

    return (
        <motion.div {...animation} className="w-full max-w-md">
            <div className="mb-10">
                <Brand href="/" />
            </div>

            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                {text.title}
            </h1>
            <p className="mt-2 mb-8 text-muted-foreground">{text.subtitle}</p>

            {error && (
                <Alert variant="destructive" className="mb-6">
                    <AlertCircle />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {message && (
                <Alert className="mb-6 border-success/30 bg-success/10 text-success">
                    <CheckCircle2 />
                    <AlertDescription className="text-success">
                        {message}
                    </AlertDescription>
                </Alert>
            )}

            <form action={action} className="space-y-5">
                <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="you@example.com"
                        autoComplete="email"
                        required
                        className="h-11"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                        <Input
                            id="password"
                            name="password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            autoComplete={text.autoComplete}
                            required
                            minLength={mode === 'signup' ? 6 : undefined}
                            className="h-11 pr-11"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(v => !v)}
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                            className="absolute inset-y-0 right-0 flex w-11 cursor-pointer items-center justify-center rounded-r-md text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
                        >
                            {showPassword ? (
                                <EyeOff className="size-4" />
                            ) : (
                                <Eye className="size-4" />
                            )}
                        </button>
                    </div>
                    {mode === 'signup' && (
                        <p className="text-xs text-muted-foreground">
                            At least 6 characters.
                        </p>
                    )}
                </div>

                <SubmitButton label={text.submit} />
            </form>

            <p className="mt-8 text-center text-sm text-muted-foreground">
                {text.footer}{' '}
                <Link
                    href={text.footerHref}
                    className="font-medium text-foreground underline-offset-4 hover:underline"
                >
                    {text.footerLink}
                </Link>
            </p>
        </motion.div>
    )
}
