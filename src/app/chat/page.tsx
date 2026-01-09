import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { signout } from '@/app/auth/actions'
import { ChatInterface } from '@/components/chat-interface'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default async function ChatPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    return (
        <div className="h-screen bg-zinc-950 text-white flex flex-col overflow-hidden">
            {/* Header */}
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
                            <Link href="/dashboard">
                                <Button variant="ghost" className="text-zinc-500 hover:text-white hover:bg-zinc-900 rounded-none">
                                    Dashboard
                                </Button>
                            </Link>
                            <Link href="/chat">
                                <Button variant="ghost" className="text-white bg-zinc-900 rounded-none">
                                    Chat
                                </Button>
                            </Link>
                        </nav>
                    </div>
                    <div className="flex items-center space-x-4">
                        <span className="text-sm text-zinc-500 font-mono">{user.email}</span>
                        <form>
                            <Button
                                formAction={signout}
                                variant="outline"
                                size="sm"
                                className="border-zinc-700 text-zinc-400 hover:bg-zinc-900 hover:text-white rounded-none"
                            >
                                Sign Out
                            </Button>
                        </form>
                    </div>
                </div>
            </header>

            {/* Chat Content */}
            <main className="flex-1 flex flex-col">
                <ChatInterface />
            </main>
        </div>
    )
}
