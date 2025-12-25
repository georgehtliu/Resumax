# AI Resume Optimizer

An intelligent resume optimization system that helps software engineers tailor their resumes to specific job descriptions using AI-powered matching, rewriting, and analysis.

## 🎯 What Is This?

**AI Resume Optimizer** is a full-stack application that combines:

1. **Backend API** - FastAPI service with RAG (Retrieval-Augmented Generation) pipeline
2. **Chrome Extension** - React-based UI for managing resumes and optimizing bullet points

The system uses **hybrid search** (semantic + keyword matching) to find the most relevant resume bullets for a job description, then uses AI to rewrite and optimize them while identifying skill gaps.

## ✨ Key Features

### 🔍 Hybrid Search
- **Semantic Search**: Vector embeddings capture meaning and context
- **Keyword Matching**: Exact tech term matching (300+ technologies supported)
- **Combined Ranking**: 70% semantic + 30% keyword for optimal results

### 🤖 AI Optimization
- **Unified Optimizer**: Single LLM call for ranking, rewriting, and gap analysis
- **Cost Efficient**: 80-90% cost reduction vs. multiple agent workflows
- **Dual Modes**: 
  - **Strict**: Only optimize existing bullets
  - **Creative**: Suggest new bullets for missing skills

### 💰 Cost Optimization
- **Dev Mode**: `gpt-4o-mini` + `text-embedding-3-small` (~$0.01-0.02 per optimization)
- **Prod Mode**: `gpt-4-turbo` + `text-embedding-3-large` (~$0.05-0.15 per optimization)
- **Caching**: Embeddings and responses cached to reduce API calls

### 📱 Chrome Extension
- **3-Tab Interface**: Master Resume, Generate New Resume, Saved Resumes
- **Master Resume**: Unlimited bullet points per experience/education/project with personal info + skills editors
- **Generate New Resume**: Match best bullets to job descriptions with AI optimization; dynamic one-page caps keep Jake's template compliant
- **Saved Resumes**: Structured editing (sections → entries → bullets) with ability to add bullets from master resume
- **LaTeX Preview**: Side-by-side `.tex` and live PDF preview before export
- **Resume Sharing**: Generate permanent shareable links for any saved resume
- **Line-Specific Comments**: Comment on individual resume bullets with inline comment display
- **Public Resume View**: Beautiful, professional resume display with comment system
- Local storage for resume data
- One-click job description extraction
- LaTeX line count indicators for one-page enforcement

### 💾 Backend Enhancements
- `/api/v1/select`: bullet selection without rewriting
- `/api/v1/optimize`: selection plus AI rewriting
- `/api/v1/latex/render`: generate LaTeX/PDF for Jake’s template via `tectonic`

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│              Chrome Extension (React UI)                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ Experience   │  │ Job          │  │ Optimization │ │
│  │ Editor       │  │ Matcher      │  │ Panel        │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘ │
└─────────┼──────────────────┼──────────────────┼─────────┘
          │                  │                  │
          └──────────────────┴──────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│              Backend API (FastAPI)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ Hybrid       │  │ Unified      │  │ RAG          │ │
│  │ Search       │  │ Optimizer    │  │ Service       │ │
│  │ (Vector +    │  │ (LLM)        │  │ Pipeline      │ │
│  │  Keywords)   │  │              │  │               │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└──────────────────────┬───────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│              Data Layer                                 │
│  ┌──────────────┐  ┌──────────────┐                    │
│  │ ChromaDB     │  │ OpenAI API   │                    │
│  │ (Embeddings) │  │ (Embeddings  │                    │
│  │              │  │  + LLM)      │                    │
│  └──────────────┘  └──────────────┘                    │
└─────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- OpenAI API key

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up environment:**
   ```bash
   cp env.example .env
   # Edit .env and add your OPENAI_API_KEY
   ```

4. **Load resume points:**
   ```bash
   # Add your resume bullets to data/resume_points.txt
   ```

5. **Start the server:**
   ```bash
   uvicorn app.main:app --reload
   ```

6. **Test the API:**
   ```bash
   # Visit http://localhost:8000/docs for interactive API docs
   # Or run tests:
   pytest tests/ -v
   ```

### Chrome Extension Setup

1. **Navigate to extension directory:**
   ```bash
   cd chrome-extension
   ```

2. **Install dependencies:**
   ```bash
   cd popup
   npm install
   ```

3. **Build the React app:**
   ```bash
   npm run build
   ```

4. **Load in Chrome:**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `chrome-extension` directory

5. **Test the extension:**
   - Click the extension icon
   - Add some work experiences and bullet points
   - Paste a job description and click "Optimize"

For detailed setup instructions, see:
- [Backend README](backend/README.md)
- [Chrome Extension README](chrome-extension/README.md)

## 📁 Project Structure

```
Resumax/
├── backend/                    # FastAPI backend
│   ├── app/
│   │   ├── core/              # Core functionality
│   │   │   ├── embeddings.py  # OpenAI embedding generation
│   │   │   ├── search.py      # Hybrid search (vector + keywords)
│   │   │   └── keyword_patterns.py  # Tech keyword patterns
│   │   ├── services/          # Business logic
│   │   │   ├── rag_service.py      # RAG pipeline orchestration
│   │   │   ├── unified_optimizer.py # Single LLM call optimizer
│   │   │   └── llm_service.py      # OpenAI LLM wrapper
│   │   ├── api/               # FastAPI endpoints
│   │   │   └── rag.py        # RAG API routes
│   │   └── main.py           # FastAPI app
│   ├── tests/                 # Test suite
│   │   ├── test_hybrid_search.py    # Hybrid search tests
│   │   └── test_hybrid_integration.py # Integration tests
│   ├── data/                  # Sample data
│   │   └── resume_points.txt   # Resume bullets
│   └── requirements.txt       # Python dependencies
│
├── chrome-extension/          # Chrome extension
│   ├── popup/                 # React popup UI
│   │   ├── src/
│   │   │   ├── components/    # React components
│   │   │   │   ├── ExperienceEditor.jsx    # Edit work experiences
│   │   │   │   ├── EducationEditor.jsx     # Edit education
│   │   │   │   ├── ProjectEditor.jsx        # Edit projects
│   │   │   │   ├── CustomSectionEditor.jsx  # Edit custom sections
│   │   │   │   ├── JobMatcher.jsx           # Job description input
│   │   │   │   ├── OptimizationPanel.jsx     # Optimization results
│   │   │   │   ├── GenerateResume.jsx       # Tab 2: Generate new resume + LaTeX preview
│   │   │   │   ├── SavedResumes.jsx         # Tab 3: Saved resumes
│   │   │   │   ├── LatexPreviewModal.jsx    # LaTeX + PDF modal
│   │   │   │   └── Tabs.jsx                 # Tab navigation
│   │   │   ├── utils/         # Utilities
│   │   │   │   ├── latexLineCount.js       # LaTeX line estimation helpers
│   │   │   │   └── latexTemplate.js        # Jake template builder for previews
│   │   │   └── services/      # Chrome API wrappers
│   │   │       ├── storage.js                # Chrome Storage API
│   │   │       └── messaging.js              # Chrome Messaging API
│   │   └── vite.config.js     # Build config
│   ├── background/            # Background service worker
│   ├── content/               # Content scripts (job description extraction)
│   └── manifest.json          # Extension manifest
│
├── PROJECT_OVERVIEW.md        # Detailed architecture & roadmap
├── CHROME_EXTENSION_FLOW.md   # Extension user flow
└── README.md                  # This file
```

## 🛠️ Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **ChromaDB** - Local vector database for embeddings
- **OpenAI API** - Embeddings (`text-embedding-3-small/large`) and LLM (`gpt-4o-mini`, `gpt-4-turbo`)
- **NumPy** - Vector operations and similarity calculations
- **Pydantic** - Data validation and serialization

### Frontend (Chrome Extension)
- **React** - UI framework
- **Vite** - Build tool
- **Chrome Extensions API** - Storage, Messaging, Tabs
- **Chrome Debugger API** - Advanced page inspection

### Testing
- **Pytest** - Python testing framework
- **Unit Tests** - Hybrid search, keyword extraction, scoring
- **Integration Tests** - Full RAG pipeline

## 📚 Documentation

- **[PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md)** - Complete architecture, cost optimization, and roadmap
- **[Backend README](backend/README.md)** - Backend setup and usage
- **[Chrome Extension README](chrome-extension/README.md)** - Extension setup and development
- **[Backend Testing Guide](backend/TESTING_GUIDE.md)** - How to run and write tests
- **[Chrome Extension Flow](CHROME_EXTENSION_FLOW.md)** - User workflow and UI flow

## 🧪 Testing

### Backend Tests

```bash
cd backend
pytest tests/ -v
```

**Test Coverage:**
- Hybrid search (semantic + keyword matching)
- Keyword extraction (300+ tech patterns)
- Keyword scoring
- RAG pipeline integration

### Extension Tests

Manual testing via Chrome DevTools and extension popup.

## 💡 How It Works

### Master Resume (Tab 1)
1. **User adds personal info** → Name, phone, email, LinkedIn, GitHub
2. **User builds super resume** → Add unlimited bullet points to experiences, education, projects, and custom sections
3. **Format bullets** → Use **bold** text (markdown-style: `**text**`)
4. **Mark non-negotiable bullets** → Flag bullets that must be included in all optimized resumes
5. **Data stored locally** → Chrome extension local storage
6. **LaTeX line indicators** → Shows estimated line count for one-page constraint

### Generate New Resume (Tab 2)
1. **User extracts/pastes job description** → Content script extracts from job sites or manual input
2. **Match best bullets** → (Currently mock, will connect to backend) Selects top bullets from master resume
3. **AI optimization** → (Future) Backend processes with hybrid search + unified optimizer
   - Non-negotiable bullets always included
   - Respects one-page constraint
4. **Preview LaTeX** → Real-time preview of resume (future)
5. **Customize & save** → User edits bullets, then saves as named resume
6. **Export to PDF** → Generate LaTeX/PDF with one-page warning if exceeds limit

### Saved Resumes (Tab 3)
1. **View saved resumes** → List of all saved optimized resumes
2. **Edit structure** → Sections (Experiences/Education/Projects) → Entries → Bullets
3. **Add from master** → Select bullets from master resume to add to any entry
4. **Save as new** → Create variations of saved resumes
5. **Share resume** → Generate permanent shareable link for any saved resume
6. **Go to shared** → Open shared resume view (if already shared)

### Resume Sharing & Comments
1. **Generate share link** → Click "Share Resume" on any saved resume to create a permanent link
2. **Public view** → Anyone with the link can view the resume in a professional format
3. **Line-specific comments** → Click on any bullet point to add comments directly on that line
4. **Comment indicators** → Bullets with comments show a badge with comment count
5. **General comments** → Leave general comments on the entire resume
6. **Real-time updates** → Comments appear instantly via Supabase real-time subscriptions
7. **Anonymous or signed-in** → Comment as anonymous (with name) or as a signed-in user

### Backend Integration (Future)
1. **Backend receives request** → Hybrid search finds top matching bullets from master resume
2. **Unified optimizer processes** → Single LLM call:
   - Ranks bullets by relevance
   - Rewrites bullets for better match
   - Identifies skill gaps
3. **Results returned** → User reviews and customizes in extension
4. **Export** → (Future) Generate one-page LaTeX resume using Jake's template

## 🎓 Learning Goals

This project demonstrates:
- **RAG (Retrieval-Augmented Generation)** pipeline
- **Hybrid search** combining semantic and keyword matching
- **Cost optimization** strategies for AI APIs
- **Chrome Extensions** development (APIs, messaging, storage)
- **FastAPI** backend architecture
- **Vector databases** for similarity search
- **LLM prompt engineering** for structured outputs

## 📝 License

MIT License - See LICENSE file for details

## 🤝 Contributing

This is a learning project. Feel free to fork, modify, and experiment!

## 📧 Contact

For questions or suggestions, open an issue or contact the maintainer.

---

**Built with ❤️ for software engineers who want to optimize their resumes efficiently.**

## Latest Features

- **Dynamic One-Page Selection**: the extension now auto-adjusts bullets-per-section before calling `/api/v1/select`, ensuring the returned resume fits Jake's template while adapting to experience- or project-heavy profiles.
- **LaTeX + PDF Preview**: the Chrome popup exposes a LaTeX preview modal with copy/download options, real-time PDF rendering, and side-by-side comparison so users can inspect the generated `.tex` source before export.
- **Backend PDF Rendering**: new `/api/v1/latex/render` endpoint converts a structured resume into PDF (via `tectonic`), returning Base64 so the frontend can show inline previews or downloads.
- **Resume Sharing & Comments**: 
  - Generate permanent shareable links for any saved resume
  - Public resume view with professional formatting (Jake's template style)
  - **Line-specific comments**: Click on any resume bullet to add comments directly on that line
  - Comment indicators show which bullets have comments
  - Support for both general comments and bullet-specific comments
  - Real-time comment updates via Supabase subscriptions
  - Anonymous and authenticated commenting support

