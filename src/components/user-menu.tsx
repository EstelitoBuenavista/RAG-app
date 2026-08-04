'use client'

import { LogOut, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface UserMenuProps {
    email: string
    signoutAction: () => void
}

export function UserMenu({ email, signoutAction }: UserMenuProps) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Account menu for ${email}`}
                >
                    <User className="size-4" />
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel className="font-normal">
                    <span className="block text-xs text-muted-foreground">
                        Signed in as
                    </span>
                    <span className="block truncate text-sm font-medium" title={email}>
                        {email}
                    </span>
                </DropdownMenuLabel>

                <DropdownMenuSeparator />

                <form action={signoutAction}>
                    <DropdownMenuItem asChild variant="destructive">
                        <button type="submit" className="w-full cursor-pointer">
                            <LogOut className="size-4" />
                            Sign out
                        </button>
                    </DropdownMenuItem>
                </form>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
