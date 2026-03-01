# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Backend
```bash
cd backend
pip install -r requirements.txt
cp env.example .env  # Add OPENAI_API_KEY
uvicorn app.main:app --reload  # Runs on http://localhost:8000
```

API docs: `http://localhost:8000/docs`

### Chrome Extension
```bash
cd chrome-extension/popup
cp .env.example .env  # Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm install
npm run build  # Outputs to popup-build/
# Load the chrome-extension/ directory (not popup/) in Chrome via chrome://extensions/ → Load unpacked
```

### Tests
```bash
cd backend
pytest                                          # All tests
pytest tests/test_api_endpoints.py             # API endpoint tests
pytest tests/test_selection_service.py         # Selection service tests
pytest -m "not slow"                           # Skip slow tests
```

## Architecture

### Two-Part System
- **`backend/`** — FastAPI REST + WebSocket server (Python 3.11+)
- **`chrome-extension/`** — Chrome Extension UI (React + Vite)
  - `popup/` — React source code
  - `popup-build/` — Compiled output loaded by Chrome (referenced by `manifest.json`)
  - `background/` — Service worker
  - `content/` — Content scripts injected into job listing pages

### Backend Layout
```
backend/app/
├── main.py           # FastAPI app, startup (loads resume_points.txt into ChromaDB)
├── api/
│   ├── rag.py        # All REST endpoints under /api/v1
│   └── websocket.py  # WebSocket endpoint for real-time collaboration
├── services/         # Business logic layer
│   ├── selection_service.py     # 4-phase bullet selection algorithm (one-page constraint)
│   ├── optimization_service.py  # Orchestrates selection + LLM rewriting
│   ├── unified_optimizer.py     # Single LLM call: rank + rewrite + gap analysis
│   ├── rag_service.py           # Legacy RAG pipeline
│   ├── roast_service.py         # Resume feedback analysis
│   ├── interview_question_service.py
│   ├── resume_parser_service.py # PDF/DOCX to structured resume
│   ├── keyword_scanner.py       # JD keyword matching
│   ├── queue_service.py         # WebSocket reviewer queue
│   └── room_service.py          # WebSocket collaboration rooms
├── core/
│   ├── search.py          # ChromaDB hybrid vector search
│   ├── embeddings.py      # OpenAI text-embedding-3-small
│   ├── keyword_patterns.py
│   └── tech_dictionary.py
├── schemas/               # Pydantic request/response models (StructuredResume, etc.)
└── utils/
    └── latex.py           # LaTeX template builder + tectonic PDF renderer
```

### Key API Endpoints
| Endpoint | Description |
|---|---|
| `POST /api/v1/select` | Select bullets via vector search only (fast, no LLM) |
| `POST /api/v1/optimize` | Select + rewrite bullets with LLM (slow) |
| `POST /api/v1/latex/render` | Compile resume to PDF via tectonic |
| `POST /api/v1/latex/render-html` | Compile to PDF then convert with pdf2htmlEX |
| `POST /api/v1/coaching/roast` | AI feedback on all resume bullets |
| `POST /api/v1/coaching/interview-questions` | Generate STAR-format interview questions |
| `POST /api/v1/parse-resume` | Parse PDF/DOCX → StructuredResume |
| `POST /api/v1/keywords/scan` | Check JD keyword coverage |
| `WS /ws` | Real-time reviewer collaboration |

### Frontend Data Flow
`storageService` (Supabase) → `buildStructuredResume()` in `services/api.js` → API call → response rendered in React

`buildStructuredResume()` is the canonical function that normalizes frontend resume state into the `StructuredResume` schema the backend expects.

### Core Design Patterns

**Unified Optimizer** (`services/unified_optimizer.py`): A single GPT-4o-mini call returns bullet rankings + rewrites + gap analysis together — avoids 3 separate LLM round-trips.

**Hybrid Search** (`core/search.py`): ChromaDB semantic search results are re-ranked by boosting exact tech keyword matches (1.5x score multiplier). Catches both conceptual and exact-term matches.

**Profile-Based Adaptive Selection** (`services/selection_service.py`): The 4-phase algorithm (Prepare → Fill → Squeeze → Revive) enforces a ~50-line one-page constraint by detecting resume density and allocating lines per section dynamically. "Must-have" entries (most recent, highest prestige) are locked before selection.

**Dynamic Token Limits**: LLM `max_tokens = min(6000, max(2000, bullet_count * 150))` scales cost/speed to resume size.

### External Dependencies
- **OpenAI** — `gpt-4o-mini` for all LLM tasks; `text-embedding-3-small` for embeddings
- **ChromaDB** — Local vector store, persisted at `backend/chroma_db/`
- **Supabase** — PostgreSQL (resume/user data) + Auth (JWT). See `DATABASE_SCHEMA.md` for full schema.
- **tectonic** — Must be installed locally (`brew install tectonic`) for LaTeX → PDF rendering
- **pdf2htmlEX** — Optional; used for high-fidelity HTML rendering (Docker-based, see `DOCKER_SETUP_GUIDE.md`)

### Environment Variables
**Backend** (`backend/.env`):
- `OPENAI_API_KEY` — required
- `CHROMA_DB_PATH` — optional, defaults to `./chroma_db`
- `PDF2HTMLEX_USE_DOCKER` — set `true` if pdf2htmlEX not installed locally

**Frontend** (`chrome-extension/popup/.env`):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_RESUME_MASTER_API_URL` — optional, defaults to `http://localhost:8000/api/v1`
