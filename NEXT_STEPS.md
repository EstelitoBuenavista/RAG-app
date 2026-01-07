# RAG Application - Next Steps Implementation Plan

A roadmap for completing your RAG application with document processing, embeddings, and AI-powered question answering.

---

## Phase 1: Supabase Setup

> **IMPORTANT:** This phase is required before authentication and storage will work.

### 1.1 Create Supabase Project
- [ ] Go to [supabase.com](https://supabase.com) and create a new project
- [ ] Copy your project URL and anon key from Settings → API

### 1.2 Configure Environment
- [ ] Copy `env.template` to `.env.local`
- [ ] Add your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 1.3 Enable Authentication
- [ ] Go to Authentication → Providers → Email
- [ ] Enable email confirmations (or disable for faster testing)

### 1.4 Create Storage Bucket
- [ ] Go to Storage → Create new bucket named `documents`
- [ ] Set bucket to public or configure RLS policies

---

## Phase 2: Database Schema

### 2.1 Enable pgvector Extension
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 2.2 Create Documents Table
```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  status TEXT DEFAULT 'pending', -- pending, processing, ready, error
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policy: Users can only see their own documents
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own documents" ON documents
  FOR ALL USING (auth.uid() = user_id);
```

### 2.3 Create Embeddings Table
```sql
CREATE TABLE embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding VECTOR(1536), -- For OpenAI embeddings
  chunk_index INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: Users can access embeddings for their documents
ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own embeddings" ON embeddings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM documents 
      WHERE documents.id = embeddings.document_id 
      AND documents.user_id = auth.uid()
    )
  );
```

### 2.4 Create Chats Table
```sql
CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT DEFAULT 'New Chat',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: Users can only see their own chats
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own chats" ON chats
  FOR ALL USING (auth.uid() = user_id);
```

### 2.5 Create Messages Table
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  sources JSONB, -- Array of document references used for this response
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: Users can access messages in their chats
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage messages in own chats" ON messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM chats 
      WHERE chats.id = messages.chat_id 
      AND chats.user_id = auth.uid()
    )
  );
```

### 2.6 Create Document Jobs Table (Future-Proofing)
```sql
CREATE TABLE document_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  total_chunks INTEGER DEFAULT 0,
  processed_chunks INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: Users can view jobs for their documents
ALTER TABLE document_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own document jobs" ON document_jobs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM documents 
      WHERE documents.id = document_jobs.document_id 
      AND documents.user_id = auth.uid()
    )
  );
```

### 2.7 Create Document Chunk Jobs Table (Future-Proofing)
```sql
CREATE TABLE document_chunk_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES document_jobs(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: Users can view chunk jobs for their documents
ALTER TABLE document_chunk_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own chunk jobs" ON document_chunk_jobs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM document_jobs 
      JOIN documents ON documents.id = document_jobs.document_id
      WHERE document_jobs.id = document_chunk_jobs.job_id 
      AND documents.user_id = auth.uid()
    )
  );
```

---

## Phase 3: Document Processing

### 3.1 Install Dependencies
```bash
npm install pdf-parse openai
```

### 3.2 Create Processing Pipeline

| File | Purpose |
|------|---------|
| `src/lib/processing/parse.ts` | Extract text from PDFs, DOCX, TXT |
| `src/lib/processing/chunk.ts` | Split text into overlapping chunks |
| `src/lib/processing/embed.ts` | Generate embeddings via OpenAI API |

### 3.3 Add Environment Variables
```env
OPENAI_API_KEY=sk-your-openai-key
```

### 3.4 Implement Background Processing
- [ ] Create API route `/api/process-document` to handle async processing
- [ ] Update document status as it progresses through pipeline
- [ ] Store embeddings in database

---

## Phase 4: RAG Query Interface

### 4.1 Create Chat Page

| File | Purpose |
|------|---------|
| `src/app/chat/page.tsx` | Chat interface for asking questions |
| `src/components/chat-input.tsx` | Message input component |
| `src/components/chat-message.tsx` | Display messages with citations |

### 4.2 Implement RAG Logic
```
User Question
     ↓
Generate embedding for question
     ↓
Vector similarity search in Supabase
     ↓
Retrieve top-k relevant chunks
     ↓
Send to LLM with context
     ↓
Return answer with source citations
```

### 4.3 Create API Routes

| Route | Purpose |
|-------|---------|
| `/api/query` | Handle RAG queries |
| `/api/embed` | Generate embeddings |

---

## Phase 5: Polish & Deploy

### 5.1 UI Improvements
- [ ] Add loading spinners and skeleton states
- [ ] Show document processing status in dashboard
- [ ] Add document deletion with confirmation
- [ ] Create user settings page

### 5.2 Error Handling
- [ ] Add toast notifications for success/error states
- [ ] Handle API rate limits gracefully
- [ ] Add retry logic for failed operations

### 5.3 Production Deployment
- [ ] Set all environment variables in Vercel
- [ ] Configure Supabase for production
- [ ] Enable Supabase email templates
- [ ] Set up custom domain (optional)

---

## Priority Order

| Phase | Effort | Priority |
|-------|--------|----------|
| 1. Supabase Setup | ~30 min | 🔴 Critical |
| 2. Database Schema | ~1 hour | 🔴 Critical |
| 3. Document Processing | ~3 hours | 🟡 High |
| 4. RAG Query Interface | ~4 hours | 🟡 High |
| 5. Polish & Deploy | ~2 hours | 🟢 Medium |

---

## Quick Start

**Start with Phase 1 today** to get authentication working, then Phase 2 to set up your database. This will let you test the login/signup flow and document uploads immediately.
