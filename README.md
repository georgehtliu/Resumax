# Resume Master - AI Resume Optimizer

An intelligent resume optimization system that helps software engineers tailor their resumes to specific job descriptions using AI-powered matching, rewriting, and analysis. Built as a Chrome extension with a full-stack backend API.

## Overview

Resume Master combines a **Chrome extension** (React-based UI) with a **FastAPI backend** to provide:

- **Master Resume Management**: Build and maintain unlimited bullet points across all resume sections
- **AI-Powered Optimization**: Match and rewrite bullets for specific job descriptions using hybrid search (semantic + keyword matching)
- **Resume Coaching**: Get feedback from AI Coach or connect with human reviewers for personalized critiques
- **Real-Time Collaboration**: WebSocket-based live collaboration with queue-based matching, live chat, highlighting, and commenting
- **One-Page Resume Generation**: Automatically select bullets that fit within one page using Jake's LaTeX template
- **Resume Sharing & Collaboration**: Generate shareable links with interactive PDF viewer and comment system
- **Real-Time PDF Preview**: View LaTeX-generated PDFs with visual markers linking comments to specific bullets
- **Community Features**: Connect with other software engineers, share tips, and browse shared resumes

## Key Features

### Hybrid Search Engine
- **Semantic Search**: Vector embeddings capture meaning and context using OpenAI's `text-embedding-3-small/large`
- **Keyword Matching**: Exact tech term matching across 300+ technology patterns
- **Combined Ranking**: 70% semantic similarity + 30% keyword matching for optimal results

### AI Optimization
- **Unified Optimizer**: Single LLM call for ranking, rewriting, and gap analysis (80-90% cost reduction vs. multi-agent workflows)
- **Dual Modes**:
  - **Strict Mode**: Only rewrites existing bullets, identifies gaps but doesn't fill them
  - **Creative Mode**: Rewrites existing bullets and suggests new bullets for identified gaps
- **Cost Efficient**: Dev mode (~$0.01-0.02) vs. Prod mode (~$0.05-0.15) per optimization

### Chrome Extension

**Two Views:**

1. **Popup View** (3-Tab Interface):
   - **Master Resume**: Build unlimited bullet points with personal info, skills, experiences, education, projects, and custom sections
   - **Generate New Resume**: Match bullets to job descriptions with AI optimization using carousel editor
   - **Saved Resumes**: View and edit saved resumes with carousel editor, LaTeX preview, and sharing

2. **Manager View** (Full-Screen Web App):
   - Side navigation with multiple views (About, Profile, Generate Resume, Saved Resumes, Community, Resume Coaching)
   - Accessible via "Open Manager" button in popup
   - Full-screen experience for comprehensive resume management

**Core Features:**
- **Carousel Editor** (`SelectedResumeEditor`): Modern carousel-style editor for navigating through resume sections with smooth scrolling
- **LaTeX Preview**: Side-by-side `.tex` source and live PDF preview with real-time rendering
- **Resume Sharing**: Generate permanent shareable links for any saved resume
- **Interactive PDF Viewer**: PDF.js-powered viewer with zoom, page navigation, and visual markers
- **Comment System**: Line-specific comments with visual arrows linking to PDF bullet locations
- **Browse All Bullets**: Side panel showing all resume bullets with comment counts and quick navigation
- **One-Page Enforcement**: Dynamic bullet selection that adapts to fit Jake's LaTeX template

### Resume Coaching

**AI Coach:**
- **Roast My Bullets**: Get brutally honest feedback on your resume bullets with:
  - TLDR summary with overall score and key statistics
  - Comprehensive bullet-by-bullet analysis
  - Color-coded feedback (strengths, issues, suggestions)
  - Actionable improvement suggestions with specific examples
  - Visual indicators (✓ for strengths, ✗ for issues, 💡 for suggestions)
- **Interview Question Prep**: Prepare for interviews based on your resume:
  - Select any experience or project from your resume
  - Generate personalized interview questions
  - STAR-method answer frameworks
  - Behavioral and technical question preparation
- Instant AI-powered feedback on resume bullet points
- Intelligent suggestions for improvement
- Gap analysis to identify missing skills or experiences

**Human Critique:**
- Queue-based matching system connecting reviewers with reviewees
- Real-time collaboration through WebSocket connections
- Live chat for instant communication
- Interactive highlighting on resume sections
- Contextual comments linked to specific bullet points
- Anonymous review system for privacy
- See [WebSocket Collaboration Documentation](./WEBSOCKET_COLLABORATION.md) for implementation details

### Real-Time Collaboration Features

**WebSocket-Based System:**
- **Queue Matching**: Automatic pairing of reviewers and reviewees
- **Live Chat**: Real-time messaging during review sessions
- **Interactive Highlighting**: Select and highlight text that both parties see instantly
- **Synchronized Comments**: Comments appear in real-time for both participants
- **Session Management**: Handle connections, disconnections, and reconnections gracefully

### Community Features

- Browse shared resumes from the community
- Share your own resumes for feedback
- Access resume tips and best practices
- Learn from others' experiences

### Backend API

**REST Endpoints:**
- `POST /api/v1/select`: Fast bullet selection without rewriting (vector search only)
- `POST /api/v1/optimize`: Selection plus AI rewriting with gap analysis
- `POST /api/v1/latex/render`: Generate LaTeX/PDF for Jake's template via `tectonic`
- `POST /api/v1/keywords/scan`: Extract and match keywords from job descriptions

**WebSocket Endpoints (Coming Soon):**
- `WS /ws/{user_id}`: WebSocket connection for real-time collaboration
  - Queue joining and matching
  - Real-time chat messaging
  - Highlight synchronization
  - Comment synchronization
  - See [WebSocket Collaboration Documentation](./WEBSOCKET_COLLABORATION.md) for details

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Chrome Extension (React)                     │
│                                                                 │
│  ┌──────────────────────┐  ┌──────────────────────┐          │
│  │   Popup View         │  │   Manager View        │          │
│  │   (3-Tab Interface)  │  │   (Full-Screen App)   │          │
│  │                      │  │                       │          │
│  │  • Master Resume     │  │  • Side Navigation    │          │
│  │  • Generate Resume   │  │  • Profile            │          │
│  │  • Saved Resumes     │  │  • Generate Resume    │          │
│  │                      │  │  • Saved Resumes      │          │
│  │                      │  │  • Resume Coaching    │          │
│  │                      │  │  • Community          │          │
│  └──────────┬──────────┘  └──────────┬───────────┘          │
│             │                          │                       │
│             └──────────┬───────────────┘                       │
│                        │                                       │
│  ┌─────────────────────┼──────────────────────┐              │
│  │  Shared Components                          │              │
│  │  • SelectedResumeEditor (Carousel)          │              │
│  │  • LatexPreviewModal                        │              │
│  │  • SharedResumeView                         │              │
│  │  • PdfViewerWithMarkers                     │              │
│  │  • ReviewerView / RevieweeView              │              │
│  │  • QueueMatching Component                  │              │
│  │  • useWebSocket Hook                        │              │
│  └─────────────────────┼──────────────────────┘              │
└────────────┬───────────┼───────────────┬──────────────────────┘
             │           │               │
             │           │               │
    ┌────────▼──────┐   │        ┌──────▼──────────────┐
    │  HTTP REST    │   │        │  WebSocket          │
    │  API Calls    │   │        │  Connections        │
    └────────┬──────┘   │        └──────┬──────────────┘
             │          │               │
             │          │               │
             └──────────┼───────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Backend API (FastAPI)                       │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  REST API Endpoints                                      │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │ │
│  │  │   Selection  │  │ Optimization │  │  LaTeX       │ │ │
│  │  │   Service    │  │   Service    │  │  Renderer    │ │ │
│  │  │              │  │              │  │              │ │ │
│  │  │ • Vector     │  │ • LLM        │  │ • Template   │ │ │
│  │  │   Search     │  │   Rewriting  │  │   Builder    │ │ │
│  │  │ • Keyword    │  │ • Gap        │  │ • PDF        │ │ │
│  │  │   Matching   │  │   Analysis   │  │   Compiler   │ │ │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘ │ │
│  │         │                 │                  │         │ │
│  │         └─────────────────┴──────────────────┘         │ │
│  │                          │                             │ │
│  │  ┌───────────────────────┼───────────────────────┐     │ │
│  │  │         Core Services                        │     │ │
│  │  │  • RAG Service (Orchestration)              │     │ │
│  │  │  • Keyword Scanner                           │     │ │
│  │  │  • LLM Service (OpenAI wrapper)             │     │ │
│  │  │  • Unified Optimizer                        │     │ │
│  │  └───────────────────────┼───────────────────────┘     │ │
│  └──────────────────────────┼─────────────────────────────┘ │
│                              │                               │
│  ┌───────────────────────────▼─────────────────────────────┐ │
│  │  WebSocket API Endpoints (Coming Soon)                 │ │
│  │  ┌──────────────────┐  ┌──────────────────┐           │ │
│  │  │  Queue Service   │  │  Room Service    │           │ │
│  │  │                  │  │                  │           │ │
│  │  │ • Reviewer Queue │  │ • Room Mgmt      │           │ │
│  │  │ • Reviewee Queue │  │ • Connection     │           │ │
│  │  │ • Matching Logic │  │   Tracking       │           │ │
│  │  │ • Pair Creation  │  │ • Broadcast      │           │ │
│  │  └──────────────────┘  └──────────────────┘           │ │
│  │                                                       │ │
│  │  WebSocket Handler:                                   │ │
│  │  • Queue joining/matching                            │ │
│  │  • Real-time chat messaging                          │ │
│  │  • Highlight synchronization                         │ │
│  │  • Comment synchronization                           │ │
│  └───────────────────────────────────────────────────────┘ │
└───────────────────────────┬───────────────────────────────────┘
                            │
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌───────────────┐  ┌──────────────┐  ┌──────────────┐
│   OpenAI      │  │   Supabase   │  │   ChromaDB   │
│   API         │  │   (Database) │  │   (Vector    │
│               │  │              │  │    Store)    │
│ • Embeddings  │  │ • Resumes    │  │              │
│ • LLM         │  │ • Comments   │  │ • Resume     │
│ • GPT-4o-mini │  │ • Shares     │  │   Points     │
│ • GPT-4-turbo │  │ • Users      │  │ • Embeddings │
│               │  │ • Real-time  │  │ • Semantic   │
│               │  │   Subscriptions│ │   Search    │
└───────────────┘  └──────────────┘  └──────────────┘
        │
        │
        ▼
┌──────────────┐
│   Tectonic   │
│   (LaTeX     │
│   Compiler)  │
│              │
│ • PDF        │
│   Generation │
└──────────────┘
     │
     │ (Optional for production)
     │
     ▼
┌──────────────┐
│   Redis      │
│   (Optional) │
│              │
│ • Queue      │
│   Management │
│ • Pub/Sub    │
│   (Multi-    │
│   server)    │
└──────────────┘
```

## Quick Start

### Prerequisites

- **Python 3.11+**
- **Node.js 18+**
- **OpenAI API Key** (for embeddings and LLM)
- **Supabase Account** (for resume storage and comments)
- **Tectonic** (for LaTeX PDF compilation) - Optional, only needed for PDF rendering

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
   # Edit .env and add:
   # - OPENAI_API_KEY=your_key_here
   # - SUPABASE_URL=your_supabase_url
   # - SUPABASE_KEY=your_supabase_key
   ```

4. **Start the server:**
   ```bash
   uvicorn app.main:app --reload
   ```

5. **Test the API:**
   - Visit `http://localhost:8000/docs` for interactive API docs
   - Or run tests: `pytest tests/ -v`

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

4. **Configure Supabase:**
   - Create `chrome-extension/popup/src/config/supabase.js` with your Supabase credentials

5. **Load in Chrome:**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `chrome-extension` directory

6. **Test the extension:**
   - Click the extension icon
   - Sign in or use test account (123@test.com / 123@)
   - Add work experiences and bullet points
   - Generate a resume from a job description


## Project Structure

```
ResumeMaster/
├── backend/                          # FastAPI backend
│   ├── app/
│   │   ├── api/
│   │   │   └── rag.py               # API endpoints (select, optimize, latex/render)
│   │   ├── core/
│   │   │   ├── embeddings.py        # OpenAI embedding generation
│   │   │   ├── search.py            # Hybrid search (vector + keywords)
│   │   │   └── keyword_patterns.py # Tech keyword patterns (300+)
│   │   ├── services/
│   │   │   ├── rag_service.py       # RAG pipeline orchestration
│   │   │   ├── selection_service.py # Bullet selection (no LLM)
│   │   │   ├── optimization_service.py # Bullet optimization (with LLM)
│   │   │   ├── keyword_scanner.py  # Keyword extraction
│   │   │   └── llm_service.py       # OpenAI LLM wrapper
│   │   ├── schemas/
│   │   │   └── rag.py              # Pydantic models for API
│   │   ├── utils/
│   │   │   └── latex.py            # LaTeX template builder + PDF renderer
│   │   └── main.py                 # FastAPI app entry point
│   ├── tests/                       # Test suite
│   └── requirements.txt             # Python dependencies
│
├── chrome-extension/                 # Chrome extension
│   ├── popup/                       # React popup UI
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── GenerateResume.jsx      # Generate new resume tab
│   │   │   │   ├── SavedResumes.jsx        # Saved resumes tab
│   │   │   │   ├── SelectedResumeEditor.jsx # Carousel editor component
│   │   │   │   ├── LatexPreviewModal.jsx  # LaTeX + PDF preview modal
│   │   │   │   ├── SharedResumeView.jsx   # Public resume view
│   │   │   │   ├── PdfViewerWithMarkers.jsx # PDF.js viewer with markers
│   │   │   │   ├── Profile.jsx            # Master resume editor
│   │   │   │   ├── SideNav.jsx            # Manager view navigation
│   │   │   │   ├── ExperienceEditor.jsx   # Work experience editor
│   │   │   │   ├── EducationEditor.jsx    # Education editor
│   │   │   │   ├── ProjectEditor.jsx      # Projects editor
│   │   │   │   ├── coaching/
│   │   │   │   │   ├── RoastMyBullets.jsx      # AI Coach: Roast feature
│   │   │   │   │   ├── InterviewQuestionPrep.jsx # AI Coach: Interview prep
│   │   │   │   │   ├── HumanCritiqueSelection.jsx
│   │   │   │   │   ├── ReviewResume.jsx
│   │   │   │   │   └── HaveResumeReviewed.jsx
│   │   │   │   └── ...                    # Other components
│   │   │   ├── services/
│   │   │   │   ├── api.js                  # Backend API client
│   │   │   │   └── storage.js              # Chrome Storage API wrapper
│   │   │   ├── config/
│   │   │   │   └── supabase.js             # Supabase configuration
│   │   │   └── App.jsx                     # Main React app
│   │   └── vite.config.js          # Build configuration
│   ├── background/
│   │   └── service-worker.js       # Background service worker
│   ├── content/
│   │   ├── content-script.js       # Job description extraction
│   │   └── content-style.css       # Content script styles
│   └── manifest.json               # Extension manifest
│
└── README.md                        # This file
```

## Tech Stack

### Backend
- **FastAPI** - Modern Python web framework with automatic API docs
- **OpenAI API** - Embeddings (`text-embedding-3-small/large`) and LLM (`gpt-4o-mini`, `gpt-4-turbo`)
- **NumPy** - Vector operations and similarity calculations
- **Pydantic** - Data validation and serialization
- **Tectonic** - LaTeX to PDF compilation
- **WebSockets** - Real-time communication for collaboration features (coming soon)
- **Redis** - Queue management and distributed state (optional, for production)

### Frontend (Chrome Extension)
- **React** - UI framework
- **Vite** - Build tool and dev server
- **PDF.js** - PDF rendering and interaction
- **Chrome Extensions API** - Storage, Messaging, Tabs, Debugger
- **Supabase** - Database and real-time subscriptions for comments

### Data Storage
- **Chrome Storage API** - Local storage for master resume and saved resumes
- **Supabase** - Cloud database for shared resumes and comments

### Testing
- **Pytest** - Python testing framework
- **Unit Tests** - Hybrid search, keyword extraction, scoring
- **Integration Tests** - Full RAG pipeline

## How It Works

### 1. Master Resume (Profile Tab)

Users build a comprehensive "super resume" with unlimited bullet points:

- **Personal Information**: Name, phone, email, LinkedIn, GitHub
- **Skills**: List of technical skills
- **Work Experience**: Multiple experiences, each with unlimited bullets
- **Education**: Education entries with bullets
- **Projects**: Project entries with bullets
- **Custom Sections**: Additional sections (certifications, awards, etc.)

**Features:**
- Bold text formatting using markdown (`**text**`)
- Non-negotiable bullets (must-include flag)
- LaTeX line count indicators for one-page constraint
- Auto-save to Chrome local storage

### 2. Resume Coaching

Get feedback on your resume through two channels:

**AI Coach:**

**Roast My Bullets:**
1. Navigate to AI Coach → Roast My Bullets
2. Click "Roast My Bullets" to begin analysis
3. Receive comprehensive feedback including:
   - **TLDR Summary**: Overall score (out of 10), total bullets analyzed, issues found, and strengths identified
   - **General Issues**: High-level patterns and recommendations across your entire resume
   - **Detailed Feedback**: Bullet-by-bullet analysis with:
     - Color-coded feedback cards (green for strengths, red for issues, yellow for improvements, blue for suggestions)
     - Specific issues identified for each bullet
     - Actionable suggestions with example rewrites
     - Visual indicators (✓ checkmarks, ✗ warnings, 💡 suggestions)
4. Use the feedback to improve your resume bullets with specific, actionable guidance

**Interview Question Prep:**
1. Navigate to AI Coach → Interview Question Prep
2. Select an experience or project from your resume
3. View the selected item with all bullet points
4. Generate personalized interview questions based on your bullets
5. Prepare using STAR-method frameworks (Situation, Task, Action, Result)
6. Get both behavioral and technical questions tailored to your specific experiences

**Human Critique:**
1. Choose "Have My Resume Reviewed" or "Review Resume"
2. Join the matching queue (reviewer or reviewee)
3. Get automatically matched with a partner
4. Collaborate in real-time with:
   - Live chat messaging
   - Interactive text highlighting
   - Contextual comments on bullet points
   - Synchronized viewing experience

See [WebSocket Collaboration Documentation](./WEBSOCKET_COLLABORATION.md) for technical details.

### 3. Generate New Resume

Users create tailored resumes for specific job descriptions:

1. **Extract/Paste Job Description**: Content script extracts from job sites or manual input
2. **Select Best Bullets**: Backend `/api/v1/select` endpoint uses hybrid search to find top matching bullets
3. **AI Optimization** (optional): Backend `/api/v1/optimize` endpoint rewrites bullets and identifies gaps
4. **Carousel Editor**: Navigate through sections (Personal Info, Skills, Experiences, etc.) using arrow buttons
5. **Customize**: Edit bullets, reorder, add/remove
6. **LaTeX Preview**: View LaTeX source and rendered PDF side-by-side
7. **Save**: Save as named resume for future editing

**Dynamic One-Page Selection:**
- Backend automatically adjusts bullets-per-section to fit Jake's LaTeX template
- Adapts to experience-heavy or project-heavy profiles
- Ensures one-page compliance

### 4. Saved Resumes

Users manage and edit previously saved resumes:

- **Resume List**: Card-based UI showing all saved resumes (newest first)
- **Carousel Editor**: Same carousel interface as Generate Resume for consistent UX
- **Edit Structure**: Modify sections, entries, and bullets
- **Add from Master**: Select bullets from master resume to add to any entry
- **LaTeX Preview**: Preview LaTeX source and PDF before export
- **Share Resume**: Generate permanent shareable link

### 5. Resume Sharing & Comments

Public resume view with interactive comment system:

1. **Generate Share Link**: Click "Share Resume" to create permanent link
2. **Public View**: Anyone with link can view LaTeX-generated PDF
3. **PDF.js Viewer**: Interactive viewer with zoom and page navigation
4. **Visual Markers**: Comments show orange curved arrows and yellow highlights on PDF
5. **Browse All Bullets**: Side panel listing all bullets with comment counts
6. **Line-Specific Comments**: Click any bullet to add comments directly on that line
7. **General Comments**: Separate section for overall resume feedback
8. **Real-Time Updates**: Comments appear instantly via Supabase subscriptions
9. **PDF Bullet Detection**: Automatically finds bullet positions in PDF and draws visual connections

## Documentation

For detailed documentation, see the inline code comments and API documentation at `http://localhost:8000/docs` when the backend is running.

### Feature Documentation

- **[WebSocket Real-Time Collaboration](./WEBSOCKET_COLLABORATION.md)** - Implementation plan for connecting Reviewer Mode and Reviewee Mode through WebSocket connections, including queue-based matching and real-time collaboration features.

## Testing

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
- API endpoints

### Extension Tests

Manual testing via Chrome DevTools and extension popup. Test flows:
- Master resume creation and editing
- Resume generation from job descriptions
- Saved resume management
- Resume sharing and comments

## Learning Goals

This project demonstrates:

- **RAG (Retrieval-Augmented Generation)** pipeline implementation
- **Hybrid search** combining semantic and keyword matching
- **Cost optimization** strategies for AI APIs (80-90% reduction)
- **Chrome Extensions** development (APIs, messaging, storage, content scripts)
- **FastAPI** backend architecture with Pydantic validation
- **Vector similarity search** for semantic matching
- **LLM prompt engineering** for structured outputs
- **PDF.js** integration for interactive PDF viewing
- **Real-time updates** using Supabase subscriptions

## License

MIT License - See LICENSE file for details

## Contributing

This is a learning project. Feel free to fork, modify, and experiment!

## Contact

For questions or suggestions, open an issue or contact the maintainer.

---

**Built for software engineers who want to optimize their resumes efficiently.**
