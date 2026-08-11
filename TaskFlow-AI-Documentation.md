# TaskFlow AI — Complete Build Documentation
### Multi-Tenant SaaS Project Management Platform (with AI/RAG Layer)

This is your A–Z, phase-wise build guide. Follow it in order — do not skip phases. Each phase builds on the previous one and should be a separate Git branch/milestone.

---

## 0. Project Overview

**What you're building:** A Jira/Trello-style multi-tenant SaaS project management tool, first as a solid production-grade backend+frontend system (Phase 1), then enhanced with real AI features including a RAG-powered knowledge base (Phase 2).

**Final Tech Stack**

| Layer | Technology |
|---|---|
| Frontend | React (Vite) + TailwindCSS |
| Backend | FastAPI (Python) |
| Database | PostgreSQL + pgvector extension |
| Cache | Redis |
| Background Jobs | Celery + Redis (broker) |
| Realtime | WebSockets (FastAPI native) |
| Auth | JWT (access + refresh tokens) |
| AI Orchestration | LangChain |
| LLM Provider | OpenAI / Gemini / Claude (pick one to start) |
| Containerization | Docker + Docker Compose |
| CI/CD | GitHub Actions |
| Deployment | Render / Railway / AWS (EC2 or ECS) |

**Timeline**

- Month 1 → Core backend + auth + CRUD (Phase 1a)
- Month 2 → Redis, Celery, WebSockets, Docker (Phase 1b)
- Month 3 → LangChain, RAG, AI features (Phase 2)

---

## 1. High-Level Architecture

```
                        React (Vite)
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                     │
     Dashboard             Boards               AI Chat
        │                    │                     │
        └────────────────────┼─────────────────────┘
                             │
                         FastAPI (REST + WS)
                             │
      ┌───────────┬──────────┼───────────┬─────────────┐
      │           │          │           │             │
  PostgreSQL    Redis     WebSocket    Celery      LangChain
      │                                              │
   pgvector ─────────────────────────────────────────┘
                                                       │
                                          OpenAI / Gemini / Claude
```

---

# PHASE 1 — Core SaaS Application (No AI)

Goal: a fully working, deployable multi-tenant project management SaaS. This alone is CV-worthy.

## Phase 1, Step 1 — Project Setup & Repo Structure

Create two repos (or a monorepo with `/backend` and `/frontend`).

```
taskflow-ai/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── core/          # config, security, dependencies
│   │   ├── db/             # session, base, migrations (alembic)
│   │   ├── models/         # SQLAlchemy models
│   │   ├── schemas/        # Pydantic schemas
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── auth.py
│   │   │       ├── users.py
│   │   │       ├── companies.py
│   │   │       ├── projects.py
│   │   │       ├── boards.py
│   │   │       ├── tasks.py
│   │   │       ├── comments.py
│   │   │       ├── attachments.py
│   │   │       ├── notifications.py
│   │   │       └── search.py
│   │   ├── services/       # business logic layer
│   │   ├── workers/        # celery tasks
│   │   ├── websocket/      # ws connection manager
│   │   └── utils/
│   ├── alembic/
│   ├── tests/
│   ├── requirements.txt
│   ├── Dockerfile
│   └── docker-compose.yml
└── frontend/
    ├── src/
    │   ├── pages/
    │   ├── components/
    │   ├── features/       # redux/zustand slices per domain
    │   ├── api/             # axios clients
    │   ├── hooks/
    │   └── routes/
    ├── package.json
    └── Dockerfile
```

**Backend base dependencies**
```
fastapi
uvicorn[standard]
sqlalchemy
alembic
psycopg2-binary
pydantic
pydantic-settings
python-jose[cryptography]
passlib[bcrypt]
python-multipart
redis
celery
websockets
```

**Action items:**
1. Init FastAPI app with `app/main.py`, health check route `/health`.
2. Set up PostgreSQL locally (or via Docker) + create `.env` for `DATABASE_URL`, `SECRET_KEY`, `REDIS_URL`.
3. Configure Alembic for migrations.
4. Init React app with routing (`react-router-dom`) and Tailwind.

---

## Phase 1, Step 2 — Database Schema Design

Core entities and relationships (multi-tenant: everything scoped by `company_id`):

- **users** — id, email, hashed_password, full_name, role, company_id, created_at
- **companies** — id, name, plan, created_at
- **company_members** — user_id, company_id, role (owner/admin/member) — for RBAC
- **projects** — id, company_id, name, description, created_by, created_at
- **boards** — id, project_id, name, order
- **task_columns** (board statuses) — id, board_id, name, order (e.g. Todo/In Progress/Done)
- **tasks** — id, board_id, column_id, title, description, assignee_id, priority, due_date, status, created_by, created_at
- **comments** — id, task_id, user_id, content, created_at
- **attachments** — id, task_id, file_url, uploaded_by, created_at
- **notifications** — id, user_id, message, is_read, created_at

**Action items:**
1. Write SQLAlchemy models for each table with proper foreign keys and `company_id` scoping.
2. Generate first Alembic migration and apply it.
3. Add indexes on frequently filtered columns (`company_id`, `assignee_id`, `status`, `due_date`).

---

## Phase 1, Step 3 — Authentication (JWT)

**Flow:**
1. `POST /auth/register` — creates user + company (or joins existing company via invite).
2. `POST /auth/login` — validates credentials, returns `access_token` (short-lived, ~15 min) + `refresh_token` (long-lived, ~7 days).
3. `POST /auth/refresh` — exchanges refresh token for new access token.
4. `POST /auth/logout` — invalidates refresh token (store denylist in Redis).

**Security details to implement:**
- Passwords hashed with bcrypt (via `passlib`).
- JWT signed with `HS256` and a strong `SECRET_KEY` from env.
- `get_current_user` dependency that decodes token and loads user from DB.
- Refresh tokens stored (hashed) in DB or Redis so they can be revoked.

---

## Phase 1, Step 4 — RBAC (Role-Based Access Control)

Roles: **Owner**, **Admin**, **Manager**, **Member**.

**Implementation approach:**
- Store role in `company_members` table (per company, since a user could theoretically belong to multiple companies later).
- Build a `require_role(*allowed_roles)` FastAPI dependency that checks the current user's role for the company in the request context and raises `403` if not allowed.
- Apply this dependency to sensitive routes: creating/deleting projects → Admin+, deleting company → Owner only, assigning tasks → Manager+, viewing/commenting → all members.

---

## Phase 1, Step 5 — Core CRUD APIs

Build REST endpoints for each entity, all scoped to the authenticated user's company:

- `companies` — get current company, update settings, invite members
- `projects` — CRUD + list with pagination
- `boards` — CRUD, reorder columns
- `tasks` — CRUD, assign, change status/priority, move between columns
- `comments` — add/list/delete (only own comments or Admin)
- `attachments` — upload (to S3 or local storage in dev), list, delete
- `notifications` — list, mark as read

**Standards to follow:**
- Consistent response schemas via Pydantic (`schemas/`).
- Pagination: `limit` + `offset` (or cursor-based) on all list endpoints.
- Filtering: query params like `?status=open&priority=high&assignee_id=...`
- Full-text search: use PostgreSQL `tsvector`/`tsquery` on task title+description for `GET /search?q=`.

---

## Phase 1, Step 6 — Notifications, Search, Filters, Pagination

- When a task is assigned or commented on, create a `notifications` row for the relevant user.
- Add `GET /notifications` (paginated, unread count endpoint too).
- Add advanced filtering combinators on `/tasks` (status + assignee + due date range + priority).
- Add sorting (`?sort=due_date&order=asc`).

---

## Phase 1, Step 7 — Redis + Celery (Background Jobs)

**Setup:**
- Redis as Celery broker + result backend.
- `celery_app.py` config in `app/workers/`.

**Background jobs to implement:**
1. Send email when a user is assigned a task (use `smtp` or a service like Mailgun/SendGrid in sandbox mode).
2. Daily digest job (Celery beat / cron) — "tasks due today" email.
3. Overdue task checker — runs hourly, flags overdue tasks and notifies assignees.

**Action items:**
- `celery -A app.workers.celery_app worker --loglevel=info`
- `celery -A app.workers.celery_app beat` for scheduled jobs

---

## Phase 1, Step 8 — WebSockets (Realtime)

- Build a `ConnectionManager` class that tracks active WebSocket connections per company/board.
- On task create/update/delete, broadcast the change to all connected clients viewing that board.
- Frontend: connect via `WebSocket` API on board mount, update local state (Zustand/Redux) on incoming messages — this gives you live Trello-style board updates.

---

## Phase 1, Step 9 — Frontend (React)

**Pages/screens:**
- Login / Register
- Dashboard (summary cards: my tasks, overdue, recent activity)
- Projects list
- Board view (Kanban drag-and-drop — use `dnd-kit` or `react-beautiful-dnd`)
- Task detail modal (comments, attachments, assignee, due date)
- Notifications dropdown
- Company settings / member management (Admin only)

**State management:** Zustand or Redux Toolkit. **Data fetching:** React Query (`@tanstack/react-query`) for caching + auto-refetch.

---

## Phase 1, Step 10 — Docker & Deployment

**docker-compose.yml services:** `backend`, `frontend`, `postgres`, `redis`, `celery_worker`, `celery_beat`.

**Action items:**
1. Write Dockerfiles for backend (Python slim image) and frontend (multi-stage build → Nginx serve).
2. `docker-compose up --build` should bring up the entire stack locally.
3. Set up GitHub Actions: on push to `main`, run tests → build images → push to registry (Docker Hub/GHCR).
4. Deploy to Render/Railway (easiest) or AWS ECS (more impressive on CV) — separate services for backend, frontend, worker, Postgres (managed), Redis (managed).

**✅ Phase 1 checklist before moving on:**
- [ ] Auth + RBAC working end-to-end
- [ ] All CRUD entities with pagination/filtering/search
- [ ] Notifications working
- [ ] Celery background jobs running
- [ ] WebSocket realtime board updates working
- [ ] Fully dockerized, deployed, and publicly accessible URL

---

# PHASE 2 — AI Layer

Only start this after Phase 1 is deployed and stable. Add AI features one at a time, each as its own PR/milestone.

## Phase 2, Step 1 — LangChain + LLM Setup

- Add `langchain`, `langchain-openai` (or `langchain-google-genai` / `langchain-anthropic`) to backend.
- Create `app/services/ai/llm_client.py` — a single wrapped client so you can swap providers easily.
- Store API key in `.env`, never commit it.

## Phase 2, Step 2 — AI Task Generator

- Endpoint: `POST /ai/generate-tasks` — input: a project description (e.g. "Build E-commerce Website").
- Prompt the LLM to return a structured breakdown (use structured output / JSON mode: frontend tasks, backend tasks, subtasks with estimated hours).
- Parse the JSON response and let the user review/edit before bulk-creating actual `tasks` rows.

## Phase 2, Step 3 — Task Estimation Assistant

- Endpoint: `POST /ai/estimate-task` — input: task title (e.g. "Need Login API").
- LLM returns estimated hours + a checklist of technical requirements (JWT, refresh token, password hashing, etc).

## Phase 2, Step 4 — Task Description Generator

- Endpoint: `POST /ai/generate-description` — manager types a short title ("Payment Module"), LLM expands it into a full professional task description with requirements/acceptance criteria.

## Phase 2, Step 5 — AI Sprint Planning

- Endpoint: `POST /ai/plan-sprint` — input: list of available developers + list of pending tasks (with estimates).
- LLM (or a simple constraint-based algorithm assisted by LLM reasoning) allocates tasks per developer for the sprint, balancing load.

## Phase 2, Step 6 — Meeting Summary (Voice → Tasks)

- Manager uploads audio file.
- Use Whisper API (or open-source whisper.cpp) to transcribe.
- Pass transcript to LLM → extract summary + action items → optionally auto-create tasks from action items.
- Run this as a Celery background job since transcription can be slow.

## Phase 2, Step 7 — Comment Summarizer

- Endpoint: `POST /ai/summarize-comments/{task_id}` — fetch all comments on a task, send to LLM, return: main issue, proposed solution, current status.

## Phase 2, Step 8 — Natural Language Search

- Endpoint: `POST /ai/nl-search` — input: `"Show me high priority tasks assigned to Awais due this week"`.
- LLM converts this into structured filter params (status, assignee, priority, date range), then you run it against your existing `/tasks` filter logic.

## Phase 2, Step 9 — AI Chat Sidebar

- Endpoint: `POST /ai/chat` — conversational endpoint with access to a few "tools" (function calling): get_delayed_tasks, get_my_tasks, get_project_status.
- This is a lightweight agent: LLM decides which tool to call based on the question, tool queries your DB, LLM formats the final answer.

## Phase 2, Step 10 — Daily Report Generator

- Endpoint: `POST /ai/daily-report` — pulls yesterday's activity (tasks completed, delayed, new bugs, overall progress %) from DB, feeds to LLM to produce a readable summary report. Can be scheduled via Celery beat to auto-generate every morning.

## Phase 2, Step 11 — AI Code Review (optional/stretch)

- Developer uploads a code file/zip as an attachment.
- Backend extracts the code, sends relevant snippets to the LLM with a code-review prompt, returns suggestions.
- Keep this scoped (e.g. single file review) — full repo review is a much bigger project.

## Phase 2, Step 12 — Risk Prediction (optional/stretch)

- A simple rules+LLM hybrid: compute stats (pending tasks count, overdue count, developer overload) in Python, pass the stats to the LLM to generate a human-readable risk assessment ("This sprint is likely to miss deadline — 2 developers overloaded, 8 tasks pending").

## Phase 2, Step 13 — RAG Knowledge Base (the centerpiece feature)

This is the most technically impressive part — build it carefully.

**Setup:**
1. Enable `pgvector` extension in PostgreSQL: `CREATE EXTENSION vector;`
2. Add a `document_chunks` table: id, document_id, content, embedding (`vector` type), metadata (jsonb).

**Ingestion flow:**
```
Upload PDF/DOCX
     │
FastAPI receives file
     │
Document Loader (LangChain: PyPDFLoader, Docx2txtLoader)
     │
Text Splitter (chunk size ~500-1000 tokens, overlap ~100)
     │
Embedding Model (OpenAI text-embedding-3-small, or open-source alternative)
     │
Store chunks + embeddings in pgvector
```

**Query flow:**
```
User asks: "How does our leave policy work?"
     │
Embed the question
     │
Similarity search in pgvector (top-k relevant chunks)
     │
Pass chunks + question to LLM as context (RAG prompt)
     │
LLM generates grounded answer
     │
Return answer + source document references
```

**Endpoints:**
- `POST /knowledge-base/upload` — upload + ingest a document (run as Celery background job)
- `POST /knowledge-base/ask` — ask a question, get RAG answer

**Action items:**
1. Implement chunking + embedding pipeline as a Celery task (uploads can be large).
2. Implement similarity search query using `pgvector`'s `<=>` cosine distance operator.
3. Build a LangChain `RetrievalQA` chain (or write the retrieval logic manually for more control/learning).
4. Frontend: simple chat UI in the AI sidebar, plus a "Knowledge Base" page to upload/manage documents.

**✅ Phase 2 checklist:**
- [ ] LangChain + LLM client wired up
- [ ] At least 4-5 AI features implemented (task generator, description generator, NL search, AI chat, daily report are good picks)
- [ ] RAG knowledge base fully working (upload → ingest → ask → grounded answer)
- [ ] All AI endpoints have proper error handling (LLM timeouts, rate limits)
- [ ] AI feature usage doesn't block the main request thread (use Celery/background where the call is slow)

---

## 3. Suggested Build Order (Week-by-Week)

| Week | Focus |
|---|---|
| 1 | Project setup, DB schema, Alembic, Auth |
| 2 | RBAC + Companies/Projects/Boards CRUD |
| 3 | Tasks/Comments/Attachments CRUD + Search/Filter/Pagination |
| 4 | Notifications + Frontend core pages (Login, Dashboard, Board) |
| 5 | Redis + Celery background jobs |
| 6 | WebSockets realtime + Frontend polish |
| 7 | Docker + CI/CD + Deploy Phase 1 live |
| 8 | LangChain setup + AI Task Generator + Description Generator |
| 9 | NL Search + AI Chat (function calling) + Daily Report |
| 10 | RAG pipeline: ingestion + pgvector + retrieval |
| 11 | RAG polish + Knowledge Base UI + Meeting Summary (Whisper) |
| 12 | Final testing, docs, README, deploy Phase 2, record demo video |

---

## 4. How to Write This on Your CV

> **TaskFlow AI — Multi-Tenant SaaS Project Management Platform**
> Built a full-stack project management platform using React, FastAPI, PostgreSQL, Redis, WebSockets, and Docker, featuring JWT authentication, role-based access control, real-time collaborative boards, and background job processing. Extended the platform with AI-powered capabilities using LangChain and a RAG pipeline (pgvector) for a company knowledge-base chatbot, plus AI task generation, sprint planning, natural language search, and automated daily reporting.

**Also prepare for interviews:**
- Be ready to explain *why* you chose JWT refresh tokens, why RBAC is per-company, why pgvector vs a dedicated vector DB, and trade-offs of Celery vs simple background threads.
- Have a short demo video/GIF ready (recruiters rarely run projects locally).
- Push clean commit history — one messy "final commit" repo looks worse than 50 small meaningful commits.

---

## 5. Suggested README Structure (for your GitHub repo)

1. Project banner/screenshot + short description
2. Live demo link
3. Architecture diagram
4. Features list (Phase 1 + Phase 2 clearly separated)
5. Tech stack badges
6. Local setup instructions (`docker-compose up`)
7. API documentation link (FastAPI auto-generates at `/docs`)
8. Folder structure
9. Roadmap / future improvements
10. License
