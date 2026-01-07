import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-sm z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white text-zinc-950 flex items-center justify-center font-bold text-xl">
              R
            </div>
            <span className="text-xl font-bold tracking-tight">RAG App</span>
          </div>
          <div className="flex items-center space-x-3">
            <Link href="/login">
              <Button variant="ghost" className="text-zinc-400 hover:text-white hover:bg-zinc-900">
                Sign In
              </Button>
            </Link>
            <Link href="/signup">
              <Button className="bg-white text-zinc-950 hover:bg-zinc-200 font-medium">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="container mx-auto px-6 pt-32 pb-20">
        <div className="max-w-4xl">
          {/* Badge */}
          <div className="inline-block mb-8 px-3 py-1 border border-zinc-700 text-zinc-400 text-sm font-mono">
            AI-POWERED
          </div>

          {/* Heading */}
          <h1 className="text-6xl md:text-8xl font-bold tracking-tight leading-none mb-8">
            Transform
            <br />
            Documents
            <br />
            <span className="text-zinc-500">Into Knowledge</span>
          </h1>

          {/* Description */}
          <p className="text-xl text-zinc-400 max-w-xl mb-12 leading-relaxed">
            Upload documents and get intelligent, context-aware answers using RAG technology.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap gap-4">
            <Link href="/signup">
              <Button
                size="lg"
                className="h-14 px-8 bg-white text-zinc-950 hover:bg-zinc-200 font-medium text-lg"
              >
                Start Free →
              </Button>
            </Link>
            <Link href="/login">
              <Button
                size="lg"
                variant="outline"
                className="h-14 px-8 border-zinc-700 text-white hover:bg-zinc-900 font-medium text-lg"
              >
                Sign In
              </Button>
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-zinc-800 mt-32 border border-zinc-800">
          <div className="bg-zinc-950 p-8">
            <div className="text-3xl mb-4">📄</div>
            <h3 className="text-lg font-bold mb-2">Document Upload</h3>
            <p className="text-zinc-500 text-sm">
              Upload PDFs, text files, and documents to build your knowledge base.
            </p>
          </div>
          <div className="bg-zinc-950 p-8">
            <div className="text-3xl mb-4">🔍</div>
            <h3 className="text-lg font-bold mb-2">Smart Search</h3>
            <p className="text-zinc-500 text-sm">
              Find relevant information with AI-powered semantic search.
            </p>
          </div>
          <div className="bg-zinc-950 p-8">
            <div className="text-3xl mb-4">💬</div>
            <h3 className="text-lg font-bold mb-2">RAG Queries</h3>
            <p className="text-zinc-500 text-sm">
              Ask questions and get answers grounded in your documents.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
