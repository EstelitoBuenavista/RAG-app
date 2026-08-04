'use client'

import Link from 'next/link'
import { ArrowRight, FileText, Quote, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Brand } from '@/components/brand'
import { motion, useReducedMotion } from '@/lib/motion'

const features = [
  {
    icon: FileText,
    title: 'Bring your documents',
    body: 'PDFs, Word files, Markdown, and plain text are parsed, split, and indexed automatically.',
  },
  {
    icon: Search,
    title: 'Semantic retrieval',
    body: 'Questions are matched against meaning rather than keywords, so the right passage surfaces even when the wording differs.',
  },
  {
    icon: Quote,
    title: 'Answers you can verify',
    body: 'Every claim carries a numbered citation. Click it to read the exact passage the answer came from.',
  },
]

export default function Home() {
  const reduceMotion = useReducedMotion()

  // Explicit props rather than named variants: a missing variant silently
  // leaves elements stuck at their initial (invisible) state.
  const rise = (delay: number) =>
    reduceMotion
      ? {}
      : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.4, delay, ease: 'easeOut' as const },
      }

  return (
    <div className="min-h-dvh">
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="app-container flex h-16 items-center justify-between">
          <Brand size="sm" />
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">Get started</Link>
            </Button>
          </div>
        </div>
      </nav>

      <main className="app-container pt-32 pb-24 sm:pt-40">
        <motion.p
          {...rise(0)}
          className="mb-6 inline-block rounded-full border border-border px-3 py-1 font-mono text-xs tracking-wider text-muted-foreground uppercase"
        >
          Retrieval-augmented AI
        </motion.p>

        <motion.h1
          {...rise(0.05)}
          className="max-w-4xl text-5xl font-bold tracking-tight sm:text-7xl lg:text-8xl"
        >
          Transform documents
          <br />
          <span className="text-muted-foreground">into knowledge</span>
        </motion.h1>

        <motion.p
          {...rise(0.1)}
          className="mt-8 max-w-xl text-lg leading-relaxed text-muted-foreground"
        >
          Upload your files and ask questions in plain language. Inkwell answers
          only from what you gave it — and shows you exactly where each answer
          came from.
        </motion.p>

        <motion.div {...rise(0.15)} className="mt-10 flex flex-wrap gap-3">
          <Button asChild size="lg" className="h-12 px-7 text-base">
            <Link href="/signup">
              Start free
              <ArrowRight />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="h-12 px-7 text-base">
            <Link href="/login">Sign in</Link>
          </Button>
        </motion.div>

        <motion.div
          {...rise(0.25)}
          className="mt-28 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:mt-36 md:grid-cols-3"
        >
          {features.map(({ icon: Icon, title, body }) => (
            <div key={title} className="bg-background p-8">
              <div className="mb-4 flex size-10 items-center justify-center rounded-lg bg-secondary">
                <Icon className="size-5" />
              </div>
              <h3 className="mb-2 font-bold">{title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
            </div>
          ))}
        </motion.div>
      </main>

      <footer className="border-t border-border">
        <div className="app-container flex flex-wrap items-center justify-between gap-4 py-8 text-sm text-muted-foreground">
          <Brand size="sm" />
          <p>Answers grounded in your own documents.</p>
        </div>
      </footer>
    </div>
  )
}
