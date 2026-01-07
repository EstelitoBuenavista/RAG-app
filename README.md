# Inkwell

AI-powered document intelligence. Upload documents and get context-aware answers using RAG (Retrieval-Augmented Generation) technology.

## Features

- 📄 **Document Upload** - Upload PDF, DOCX, TXT, and Markdown files
- 🔍 **Smart Search** - AI-powered semantic search across your documents
- 💬 **RAG Queries** - Ask questions and get answers grounded in your documents
- 🔐 **Authentication** - Secure login with Supabase Auth

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI**: shadcn/ui + Tailwind CSS
- **Database**: Supabase (PostgreSQL + pgvector)
- **AI**: Google Gemini (embeddings + chat)
- **Auth**: Supabase Auth

## Getting Started

1. **Clone and install**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp env.template .env.local
   ```
   Fill in your Supabase and Gemini API credentials.

3. **Set up Supabase database**
   Run the SQL in `NEXT_STEPS.md` to create tables and functions.

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open** [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── chat/           # RAG query endpoint
│   │   └── process-document/ # Document processing
│   ├── auth/               # Auth actions
│   ├── chat/               # Chat page
│   ├── dashboard/          # Dashboard page
│   ├── login/              # Login page
│   └── signup/             # Signup page
├── components/
│   ├── chat-interface.tsx  # Chat UI
│   ├── document-upload.tsx # Upload UI
│   └── ui/                 # shadcn components
└── lib/
    ├── processing/         # Document processing
    │   ├── chunk.ts        # Text chunking
    │   ├── embed.ts        # Gemini embeddings
    │   └── parse.ts        # PDF/DOCX parsing
    └── supabase/           # Supabase clients
```

## License

MIT
