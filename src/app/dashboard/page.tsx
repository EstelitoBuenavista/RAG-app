import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRight, Database, FileText, MessagesSquare } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { signout } from '@/app/auth/actions'
import { AppHeader } from '@/components/app-header'
import { DocumentUpload } from '@/components/document-upload'
import { DocumentList } from '@/components/document-list'
import { Button } from '@/components/ui/button'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'

interface StatProps {
    label: string
    value: number
    hint: string
    icon: typeof FileText
}

function Stat({ label, value, hint, icon: Icon }: StatProps) {
    return (
        <div className="flex flex-col gap-1 p-5">
            <div className="flex items-center gap-2 text-muted-foreground">
                <Icon className="size-4" />
                <span className="text-xs font-medium tracking-wide uppercase">
                    {label}
                </span>
            </div>
            <p className="text-3xl font-bold tabular-nums">
                {value.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
    )
}

export default async function DashboardPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { count: documentCount } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

    const { data: userDocIds } = await supabase
        .from('documents')
        .select('id')
        .eq('user_id', user.id)

    let embeddingCount = 0
    if (userDocIds && userDocIds.length > 0) {
        const { count } = await supabase
            .from('embeddings')
            .select('*', { count: 'exact', head: true })
            .in('document_id', userDocIds.map(d => d.id))
        embeddingCount = count ?? 0
    }

    const { data: userChats } = await supabase
        .from('chats')
        .select('id')
        .eq('user_id', user.id)

    let queryCount = 0
    if (userChats && userChats.length > 0) {
        const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .in('chat_id', userChats.map(c => c.id))
            .eq('role', 'user')
        queryCount = count ?? 0
    }

    return (
        <div className="min-h-dvh">
            <AppHeader email={user.email || ''} signoutAction={signout} />

            <main className="app-container py-8 sm:py-12">
                <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                            Dashboard
                        </h1>
                        <p className="mt-1 text-muted-foreground">
                            Upload documents and manage your knowledge base.
                        </p>
                    </div>

                    <Button asChild variant="outline">
                        <Link href="/chat">
                            <MessagesSquare />
                            Go to chat
                            <ArrowRight />
                        </Link>
                    </Button>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                    <DocumentUpload />

                    <Card className="flex flex-col">
                        <CardHeader className="border-b [.border-b]:pb-6">
                            <CardTitle>Knowledge base</CardTitle>
                            <CardDescription>
                                What Inkwell can currently draw on when answering.
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="flex-1 px-0">
                            <div className="grid h-full grid-cols-1 divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                                <Stat
                                    label="Documents"
                                    value={documentCount ?? 0}
                                    hint="Files uploaded"
                                    icon={FileText}
                                />
                                <Stat
                                    label="Chunks"
                                    value={embeddingCount}
                                    hint="Indexed passages"
                                    icon={Database}
                                />
                                <Stat
                                    label="Questions"
                                    value={queryCount}
                                    hint="Asked so far"
                                    icon={MessagesSquare}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="mt-6">
                    <DocumentList />
                </div>
            </main>
        </div>
    )
}
