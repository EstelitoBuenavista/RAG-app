import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { signout } from '@/app/auth/actions'
import { DocumentUpload } from '@/components/document-upload'
import { DocumentList } from '@/components/document-list'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default async function DashboardPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Fetch document count for this user
    const { count: documentCount } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

    // Fetch embedding count for this user's documents
    const { data: userDocIds } = await supabase
        .from('documents')
        .select('id')
        .eq('user_id', user.id)

    let embeddingCount = 0
    if (userDocIds && userDocIds.length > 0) {
        const docIds = userDocIds.map(d => d.id)
        const { count } = await supabase
            .from('embeddings')
            .select('*', { count: 'exact', head: true })
            .in('document_id', docIds)
        embeddingCount = count ?? 0
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-white">
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
                                <Button variant="ghost" className="text-white bg-zinc-900 rounded-none">
                                    Dashboard
                                </Button>
                            </Link>
                            <Link href="/chat">
                                <Button variant="ghost" className="text-zinc-500 hover:text-white hover:bg-zinc-900 rounded-none">
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

            {/* Main Content */}
            <main className="container mx-auto px-6 py-12">
                <div className="mb-12">
                    <h1 className="text-4xl font-bold tracking-tight mb-2">Dashboard</h1>
                    <p className="text-zinc-500">Upload and manage your documents for RAG processing</p>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                    {/* Document Upload */}
                    <DocumentUpload />

                    {/* Quick Stats */}
                    <div className="border border-zinc-800">
                        <div className="border-b border-zinc-800 p-6">
                            <h2 className="text-lg font-bold">Quick Stats</h2>
                            <p className="text-zinc-500 text-sm mt-1">Overview of your RAG application</p>
                        </div>
                        <div className="grid grid-cols-2 gap-px bg-zinc-800">
                            <div className="bg-zinc-950 p-6">
                                <p className="text-3xl font-bold">{documentCount ?? 0}</p>
                                <p className="text-sm text-zinc-500 mt-1">Documents</p>
                            </div>
                            <div className="bg-zinc-950 p-6">
                                <p className="text-3xl font-bold">{embeddingCount}</p>
                                <p className="text-sm text-zinc-500 mt-1">Embeddings</p>
                            </div>
                            <div className="bg-zinc-950 p-6">
                                <p className="text-3xl font-bold">—</p>
                                <p className="text-sm text-zinc-500 mt-1">Queries</p>
                            </div>
                            <div className="bg-zinc-950 p-6">
                                <p className="text-3xl font-bold text-green-500">●</p>
                                <p className="text-sm text-zinc-500 mt-1">Active</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Document List */}
                <div className="mt-8">
                    <DocumentList />
                </div>
            </main>
        </div>
    )
}
