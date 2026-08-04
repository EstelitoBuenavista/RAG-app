# Inkwell

AI-powered document intelligence. Upload documents and get context-aware answers using RAG (Retrieval-Augmented Generation), with every claim traced back to the passage it came from.

## Features

- 📄 **Document Upload** - PDF, DOCX, TXT, and Markdown
- 🔍 **Semantic Search** - Asymmetric embeddings tuned separately for passages and questions
- 💬 **Grounded Answers** - Responses come only from your documents, with clickable inline citations
- 🔐 **Authentication** - Secure login with Supabase Auth

## Tech Stack

- **Framework**: Next.js 16 (App Router, React 19)
- **UI**: shadcn/ui (new-york) + Tailwind CSS v4
- **Database**: Supabase (PostgreSQL + pgvector)
- **AI**: Google Gemini via `@google/genai`
  - Chat: `gemini-3.6-flash`
  - Embeddings: `gemini-embedding-2` @ 1536 dimensions
- **Auth**: Supabase Auth

## Getting Started

1. **Install**

   ```bash
   npm install
   ```

2. **Configure environment**

   ```bash
   cp env.template .env.local
   ```

   Fill in your Supabase and Gemini credentials. Model and retrieval settings are
   optional overrides — see `src/lib/ai/config.ts` for the defaults.

3. **Set up the database**

   Run the SQL in `supabase/migrations/` in the Supabase SQL Editor, in order.

4. **Run**

   ```bash
   npm run dev
   ```

5. **Open** [http://localhost:3000](http://localhost:3000)

## Upgrading an existing install

The embedding model changed from `text-embedding-004` (768d) to
`gemini-embedding-2` (1536d). Embedding spaces are not compatible across models,
so old vectors cannot be converted — they must be regenerated.

1. Apply `supabase/migrations/20260804000000_gemini_embedding_2_1536.sql`
   (`supabase db push`, or paste it into the SQL Editor). It resizes the
   vector column, rebuilds the index and search function, clears stale vectors,
   and marks every document `pending`.
2. Open the Dashboard and click **Reprocess**. Your uploaded files and chat
   history are untouched; only the vector index is rebuilt.

## How retrieval works

Passages and questions are embedded with *different* task prefixes, which is what
`gemini-embedding-2` expects for asymmetric retrieval:

| Stage      | Input format                              |
| ---------- | ----------------------------------------- |
| Indexing   | `title: {filename} \| text: {chunk}`      |
| Querying   | `task: question answering \| query: {q}`  |

Because the prefixes differ, document and query vectors are only comparable when
both were produced by `src/lib/processing/embed.ts`. Changing a prefix, the
model, or the dimensionality invalidates the index and requires a re-embed.

`RAG_MATCH_THRESHOLD` (default `0.6`) is calibrated for this model — its
similarity floor sits much higher than the previous model's, so a lower
threshold admits large amounts of unrelated text.

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── chat/             # RAG query endpoint (SSE streaming)
│   │   ├── chats/            # Chat CRUD
│   │   ├── documents/        # Document list + delete
│   │   └── process-document/ # Parse → chunk → embed → store
│   ├── auth/                 # Auth actions
│   ├── chat/                 # Chat page
│   ├── dashboard/            # Dashboard page
│   ├── login/  signup/       # Auth pages
│   └── globals.css           # Design tokens (light + dark)
├── components/
│   ├── chat/                 # Chat interface, list, markdown, source panel
│   ├── ui/                   # shadcn primitives
│   ├── app-header.tsx        # Shared header
│   ├── document-list.tsx     # Document management
│   └── document-upload.tsx   # Upload UI
└── lib/
    ├── ai/
    │   ├── client.ts         # Shared Gemini client
    │   ├── config.ts         # Model IDs + retrieval tuning
    │   └── prompts.ts        # System instruction + prompt builders
    ├── processing/
    │   ├── chunk.ts          # Text chunking
    │   ├── embed.ts          # Embeddings (task prefixes, batching, retry)
    │   ├── parse.ts          # PDF/DOCX/text parsing
    │   └── unstructured.ts   # Optional structure-aware chunking
    └── supabase/             # Supabase clients

supabase/migrations/          # Database schema changes
```

## License

MIT
