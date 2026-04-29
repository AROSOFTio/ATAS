# AI Timetable Advisory System

A working MVP for uploading examination timetables and answering natural language questions with:

- PDF, CSV, and TXT upload
- Supabase Storage + PostgreSQL persistence
- pgvector similarity search for RAG
- CAG using structured timetable entries and issues
- CRAG-style relevance checks before answer generation
- Rule-based timetable issue detection
- Gemini-powered advisory answers

## Tech Stack

- Frontend: React + TypeScript + Tailwind CSS + Vite
- Backend: Node.js + Express + TypeScript
- Data: Supabase PostgreSQL, Storage, pgvector
- AI: Gemini embeddings + chat completions

## Project Structure

```text
backend/
  src/
    app.ts
    index.ts
    lib/
    routes/
    services/
frontend/
  src/
supabase-schema.sql
.env.example
```

## 1. Create Supabase Project

1. Create a new Supabase project.
2. In Supabase SQL Editor, run [supabase-schema.sql](/d:/websites/atas/supabase-schema.sql).
3. Create a storage bucket named `timetable-documents`.
4. Copy:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

## 2. Configure Environment

Copy [.env.example](/d:/websites/atas/.env.example) to `.env` in the project root and set:

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
GEMINI_API_KEY=your_gemini_api_key
PORT=4000
```

Frontend uses `http://localhost:4000` by default. If needed, set `VITE_API_BASE_URL` before starting the frontend.

## 3. Install Dependencies

From the project root:

```bash
npm run install:all
```

Or install each app separately:

```bash
cd backend && npm install
cd frontend && npm install
```

## 4. Run the Backend

```bash
cd backend
npm run dev
```

Backend endpoints:

- `POST /api/upload`
- `POST /api/analyze/:documentId`
- `GET /api/analyze/:documentId/issues`
- `POST /api/rag/retrieve`
- `POST /api/ai/query`
- `GET /api/health`

## 5. Run the Frontend

```bash
cd frontend
npm run dev
```

Open the Vite URL shown in the terminal, usually `http://localhost:5173`.

## 5B. Run With Docker

If you want both apps running locally in containers:

1. Create `.env` in the project root from [.env.example](/d:/websites/atas/.env.example:1)
2. Make sure your Supabase project already has the SQL schema applied and a storage bucket named `timetable-documents`
3. Start the stack:

```bash
docker compose up --build
```

Then open:

- Frontend: `http://localhost:5173`
- Backend health check: `http://localhost:4000/api/health`

## 5C. Deploy On aaPanel / Hosting Panel

For a server panel like the one in your screenshot, use Docker deployment instead of the PHP project wizard.

Recommended setup:

- Domain: `atas.arsoft.io`
- Frontend container: exposed only on `127.0.0.1:8080`
- Backend container: exposed only on `127.0.0.1:4000`
- Reverse proxy:
  - `/` -> `http://127.0.0.1:8080`
  - `/api` -> `http://127.0.0.1:4000/api`

Use [docker-compose.prod.yml](/d:/websites/atas/docker-compose.prod.yml:1) for production.

Suggested server steps:

1. Point the domain A record to your server IP.
2. Clone the repo on the server:

```bash
git clone https://github.com/AROSOFTio/ATAS.git
cd ATAS
```

3. Create `.env` with your real Supabase and Gemini keys.
4. Start the app:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

5. In the hosting panel:
   - create the site `atas.arsoft.io`
   - keep SSL enabled
   - do not use PHP for the app runtime
   - add reverse proxy `/` -> `127.0.0.1:8080`
   - add reverse proxy `/api` -> `127.0.0.1:4000/api`

6. Test:
   - `https://atas.arsoft.io`
   - `https://atas.arsoft.io/api/health`

## 6. Upload a Timetable

Frontend flow:

1. Open `Upload Timetable`
2. Upload a PDF, CSV, or TXT timetable
3. Copy the returned `document_id`
4. Open `Analysis Results` and run analysis
5. Open `Ask Timetable AI` and ask questions

You can also upload directly with `curl`:

```bash
curl -X POST http://localhost:4000/api/upload \
  -F "title=Semester Timetable" \
  -F "file=@your-timetable.csv"
```

## 7. Example Questions

- `When does BIT 3:2 Weekend start exams?`
- `What is the first paper for BIT 3:2?`
- `Show all BIT 3:2 Weekend exams.`
- `When is IT Audit?`
- `Which room is ITE3101?`
- `Who is invigilating Social Issues in Computing?`
- `Do BIT 3:2 students have a clash?`
- `What exams are on May 23?`
- `Which exams have missing rooms?`
- `Which session is overloaded?`

## 8. How the MVP Works

### Upload Pipeline

1. File metadata is saved in `timetable_documents`
2. File content is uploaded to Supabase Storage
3. PDF/TXT text is extracted, or CSV rows are parsed
4. Parsed rows are inserted into `timetable_entries`
5. Extracted text is chunked and embedded with Gemini
6. Embeddings are stored in `timetable_chunks`

### Rule-Based Analysis

The analyzer flags:

- missing room
- missing invigilator
- missing exam time
- duplicate course entry
- same invigilator in multiple exams at the same time
- overloaded session
- student count above 50

### RAG, CAG, and CRAG

- `RAG`: vector search over `timetable_chunks`
- `CAG`: injects parsed entries, related issues, and retrieved chunks into the AI prompt
- `CRAG`: blocks weak-context answers with a safe fallback response

## 9. Notes

- This MVP uses real Gemini and Supabase integrations.
- API keys are never hardcoded.
- The timetable parser is heuristic by design and aims for useful extraction rather than perfect OCR-grade parsing.
- For production, add authentication, background jobs, better timetable normalization, and stricter JSON validation for AI responses.
