import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { signout } from '@/app/auth/actions'
import { AppHeader } from '@/components/app-header'
import { ChatInterface } from '@/components/chat/chat-interface'

export default async function ChatPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    return (
        <div className="flex h-dvh flex-col overflow-hidden">
            <AppHeader email={user.email || ''} signoutAction={signout} />
            <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <ChatInterface />
            </main>
        </div>
    )
}
