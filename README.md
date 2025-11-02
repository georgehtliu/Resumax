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
- React-based popup UI
- Local storage for resume data
- One-click job description extraction
- Instant matching and optimization

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
│   │   │   │   ├── ExperienceEditor.jsx
│   │   │   │   ├── JobMatcher.jsx
│   │   │   │   └── OptimizationPanel.jsx
│   │   │   └── services/      # Chrome API wrappers
│   │   └── vite.config.js     # Build config
│   ├── background/            # Background service worker
│   ├── content/               # Content scripts
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

1. **User adds resume bullets** → Stored locally in Chrome extension
2. **User pastes job description** → Extracted by content script or manually
3. **Backend receives request** → Hybrid search finds top matching bullets
4. **Unified optimizer processes** → Single LLM call:
   - Ranks bullets by relevance
   - Rewrites bullets for better match
   - Identifies skill gaps
5. **Results returned** → User reviews and customizes
6. **Export** → (Future) Generate one-page LaTeX resume

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

