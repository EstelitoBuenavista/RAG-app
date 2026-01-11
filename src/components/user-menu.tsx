'use client'

import { useState, useRef, useEffect } from 'react'
import { User } from 'lucide-react'

interface UserMenuProps {
    email: string
    signoutAction: () => void
}

export function UserMenu({ email, signoutAction }: UserMenuProps) {
    const [isOpen, setIsOpen] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                title={email}
            >
                <User className="w-5 h-5" />
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-zinc-900 border border-zinc-800 shadow-lg z-50">
                    <div className="px-4 py-3 border-b border-zinc-800">
                        <p className="text-xs text-zinc-500">Signed in as</p>
                        <p className="text-sm text-zinc-300 truncate">{email}</p>
                    </div>
                    <form action={signoutAction}>
                        <button
                            type="submit"
                            className="w-full px-4 py-2 text-left text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                        >
                            Sign Out
                        </button>
                    </form>
                </div>
            )}
        </div>
    )
}
