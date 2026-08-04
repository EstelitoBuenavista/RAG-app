'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FileText, MessagesSquare } from 'lucide-react'
import { Brand } from '@/components/brand'
import { UserMenu } from '@/components/user-menu'
import { cn } from '@/lib/utils'

interface AppHeaderProps {
    email: string
    signoutAction: () => void
}

const links = [
    { href: '/dashboard', label: 'Dashboard', icon: FileText },
    { href: '/chat', label: 'Chat', icon: MessagesSquare },
]

/**
 * Shared application header.
 *
 * Active state derives from the current route rather than being hardcoded per
 * page, which is what previously let the two copies drift apart.
 */
export function AppHeader({ email, signoutAction }: AppHeaderProps) {
    const pathname = usePathname()

    return (
        <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
            <div className="app-container flex h-16 items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-4 sm:gap-8">
                    <Brand href="/dashboard" size="sm" />

                    <nav className="flex items-center gap-1">
                        {links.map(({ href, label, icon: Icon }) => {
                            const active = pathname === href
                            return (
                                <Link
                                    key={href}
                                    href={href}
                                    aria-current={active ? 'page' : undefined}
                                    className={cn(
                                        'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                                        active
                                            ? 'bg-secondary text-foreground'
                                            : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                                    )}
                                >
                                    <Icon className="size-4" />
                                    <span className="hidden sm:inline">{label}</span>
                                </Link>
                            )
                        })}
                    </nav>
                </div>

                <UserMenu email={email} signoutAction={signoutAction} />
            </div>
        </header>
    )
}
