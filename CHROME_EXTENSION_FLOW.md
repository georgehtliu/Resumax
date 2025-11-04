# Chrome Extension User Flow

## 🎯 Complete User Journey

### Scenario: User wants to apply for a Senior Software Engineer role at Google

---

## 🏗️ Extension Architecture (3 Tabs)

The extension is organized into 3 main tabs:

1. **Master Resume** - Build and maintain unlimited bullet points
2. **Generate New Resume** - Match bullets to job descriptions and optimize
3. **Saved Resumes** - View and edit previously saved optimized resumes

---

## Tab 1: Master Resume (One-Time Setup)

**User opens Chrome extension popup → Defaults to "Master Resume" tab**

```
┌─────────────────────────────────────────┐
│  AI Resume Optimizer                    │
│  [Master Resume] [Generate] [Saved]     │
│  ────────────────────────────────────   │
│                                          │
│  Master Resume                          │
│  Total Bullets: 51                      │
│                                          │
│  ┌─ Personal Information ──────────────┐ │
│  │  Name: John Doe                    │ │
│  │  Phone: +1 (555) 123-4567        │ │
│  │  Email: john.doe@example.com      │ │
│  │  LinkedIn: linkedin.com/in/johndoe│ │
│  │  GitHub: github.com/johndoe       │ │
│  └────────────────────────────────────┘ │
│                                          │
│  ┌─ Work Experience ─────────────────┐ │
│  │  ┌─ Google (Jun 2022-Present) ───┐ │ │
│  │  │ Software Engineer II          │ │ │
│  │  │                               │ │ │
│  │  │ Bullets (8):                 │ │ │
│  │  │ • **Developed** microservices│ │ │
│  │  │   1 line [Bold]              │ │ │
│  │  │ • Optimized database...      │ │ │
│  │  │   1 line [Non-Negotiable ⭐] │ │ │
│  │  │ • Led team of 3 engineers... │ │ │
│  │  │   1 line                     │ │ │
│  │  │ ... (5 more)                 │ │ │
│  │  │                               │ │ │
│  │  │ [+ Add Bullet]               │ │ │
│  │  └──────────────────────────────┘ │ │
│  │                                   │ │
│  │  ┌─ Meta (Jun 2021-Aug 2021) ───┐ │ │
│  │  │ Software Engineering Intern   │ │ │
│  │  │ Bullets (5): ...              │ │ │
│  │  └──────────────────────────────┘ │ │
│  │                                   │ │
│  │  [+ Add Experience]              │ │
│  └───────────────────────────────────┘ │
│                                          │
│  ┌─ Education ────────────────────────┐ │
│  │  ┌─ Stanford University ──────────┐ │ │
│  │  │ B.S. Computer Science          │ │ │
│  │  │ Bullets (4): ...               │ │ │
│  │  └──────────────────────────────┘ │ │
│  │  [+ Add Education]                │ │
│  └───────────────────────────────────┘ │
│                                          │
│  ┌─ Projects ─────────────────────────┐ │
│  │  ┌─ Distributed Task Scheduler ───┐ │ │
│  │  │ Go, Kubernetes, Redis...        │ │ │
│  │  │ Bullets (4): ...                │ │ │
│  │  └──────────────────────────────┘ │ │
│  │  [+ Add Project]                  │ │
│  └───────────────────────────────────┘ │
│                                          │
│  ┌─ Custom Sections ───────────────────┐ │
│  │  ┌─ Technical Skills ─────────────┐ │ │
│  │  │ Bullets (7): ...                │ │ │
│  │  └──────────────────────────────┘ │ │
│  │  [+ Add Custom Section]           │ │
│  └───────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**Key Features:**
- ✅ Personal information section (name, phone, email, LinkedIn, GitHub)
- ✅ Unlimited bullet points per experience/education/project
- ✅ **Bold text** formatting (markdown-style: `**text**`)
- ✅ Non-negotiable bullets (must-include flag with ⭐ indicator)
- ✅ LaTeX line count indicator (1 line, 2 lines, or ⚠️ overflow)
- ✅ All sections editable (Experiences, Education, Projects, Custom)
- ✅ Data auto-saves to Chrome local storage
- ✅ Total bullet count displayed

**User Actions:**
- Add/edit/delete experiences, education, projects, custom sections
- Add unlimited bullets to any entry
- See line count warnings for one-page constraint

---

## Tab 2: Generate New Resume

**User clicks "Generate New Resume" tab**

```
┌─────────────────────────────────────────┐
│  AI Resume Optimizer                    │
│  [Master] [Generate New Resume] [Saved] │
│  ────────────────────────────────────   │
│                                          │
│  Match to Job Description               │
│  Extract or paste a job description,    │
│  then select the best resume points.    │
│                                          │
│  ┌─────────────────────────────────┐   │
│  │ Job Description:                │   │
│  │ [Extract from Page] [Paste]    │   │
│  │                                  │   │
│  │ ┌─ Job Description Preview ────┐ │   │
│  │ │ At Raytheon, the foundation...│ │   │
│  │ │ [Show More ▼]                │ │   │
│  │ └──────────────────────────────┘ │   │
│  │                                  │   │
│  │ [Select Best Points]  ← CLICK    │   │
│  └─────────────────────────────────┘   │
│                                          │
│  Processing... (2 seconds)              │
│                                          │
│  ┌─ Optimized Resume ────────────────┐ │
│  │ Selected: 12 bullets              │ │
│  │                                    │ │
│  │ BEFORE → AFTER                    │ │
│  │ ─────────────────────────────      │ │
│  │                                    │ │
│  │ "Developed microservices..."       │ │
│  │     ↓                              │ │
│  │ "Architected scalable              │ │
│  │  microservices using Python..."    │ │
│  │                                    │ │
│  │  Relevance: 0.92                  │ │
│  │  [✓ Use] [Edit] [Swap]            │ │
│  │                                    │ │
│  │  ... (11 more bullets)             │ │
│  │                                    │ │
│  │  Gaps Found:                       │ │
│  │  • Cloud infrastructure           │ │
│  │  • System design                  │ │
│  │                                    │ │
│  │  [👁️ Preview LaTeX] [💾 Save]     │ │
│  │  [📄 Export to PDF]               │ │
│  └───────────────────────────────────┘ │
│                                          │
│  ┌─ LaTeX Preview (when opened) ─────┐ │
│  │  ┌─────────────────────────────┐ │ │
│  │  │  John Doe                   │ │ │
│  │  │  +1 (555) 123-4567          │ │ │
│  │  │  john.doe@example.com       │ │ │
│  │  │                              │ │ │
│  │  │  EXPERIENCE                  │ │ │
│  │  │  Google | Software Engineer  │ │ │
│  │  │  • **Developed** microservices│ │ │
│  │  │  • Optimized database...     │ │ │
│  │  │  ...                         │ │ │
│  │  └─────────────────────────────┘ │ │
│  │  Page: 1/1 ✓ (12 bullets)        │ │
│  └───────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**User Flow:**
1. **Extract or paste job description** → Click "Extract from Page" or paste manually
2. **Click "Select Best Points"** → (Currently mock, will connect to backend)
   - Non-negotiable bullets automatically included
3. **Review optimized bullets** → See before/after, relevance scores, gaps
   - Non-negotiable bullets highlighted with ⭐
4. **Preview LaTeX** → Click "Preview LaTeX" to see rendered output
5. **Customize bullets** → Edit text (with **bold** support), swap bullets, accept/reject
6. **Export to PDF** → Click "Export to PDF"
   - If exceeds 1 page: Warning dialog with auto-trim option
   - Non-negotiable bullets protected from removal
7. **Save resume** → Click "Save Resume", enter name (e.g., "Google SWE - Backend")

**What Happens:**
- Extension collects all bullets from master resume
- (Mock) Selects top 12 most relevant bullets
- (Future) Backend does hybrid search + unified optimization
- User can customize before saving
- Saved resume appears in "Saved Resumes" tab

---

## Tab 3: Saved Resumes

**User clicks "Saved Resumes" tab**

```
┌─────────────────────────────────────────┐
│  AI Resume Optimizer                    │
│  [Master] [Generate] [Saved Resumes]   │
│  ────────────────────────────────────   │
│                                          │
│  Saved Resumes (3)                      │
│  Click on a resume to view it.          │
│                                          │
│  ┌─ Resume List ─────────────────────┐ │
│  │  ┌─ Google SWE - Backend ───────┐ │ │
│  │  │ 2 days ago • 4 bullets  [🗑️] │ │ │
│  │  └──────────────────────────────┘ │ │
│  │                                     │ │
│  │  ┌─ Meta - Frontend Engineer ────┐ │ │
│  │  │ 5 days ago • 3 bullets  [🗑️]   │ │ │
│  │  └──────────────────────────────┘ │ │
│  │                                     │ │
│  │  ┌─ Amazon - Full Stack SWE ─────┐ │ │
│  │  │ 10 days ago • 3 bullets [🗑️] │ │ │
│  │  └──────────────────────────────┘ │ │
│  └─────────────────────────────────────┘ │
│                                          │
│  ┌─ Selected: Google SWE - Backend ───┐ │
│  │  Created: 2 days ago               │ │
│  │                                    │ │
│  │  [💾 Save As New Resume] [Close]  │ │
│  │                                    │ │
│  │  ┌─ Work Experience ─────────────┐ │ │
│  │  │  ┌─ Google ─────────────────┐ │ │
│  │  │  │ Software Engineer II      │ │ │
│  │  │  │                           │ │ │
│  │  │  │ Bullets (4):              │ │ │
│  │  │  │ • Developed microservices │ │ │
│  │  │  │ • Optimized database...   │ │ │
│  │  │  │ • Implemented CI/CD...    │ │ │
│  │  │  │ • Designed REST APIs...   │ │ │
│  │  │  │                           │ │ │
│  │  │  │ [+ From Master] [+ Add]   │ │ │
│  │  │  └───────────────────────────┘ │ │
│  │  │                               │ │
│  │  │  [+ Add Experience]           │ │
│  │  └───────────────────────────────┘ │
│  │                                    │
│  │  ┌─ Education ───────────────────┐ │
│  │  │  ┌─ Stanford University ─────┐ │ │
│  │  │  │ B.S. Computer Science    │ │ │
│  │  │  │ Bullets (2): ...          │ │ │
│  │  │  │ [+ From Master] [+ Add]  │ │ │
│  │  │  └──────────────────────────┘ │ │
│  │  │  [+ Add Education]             │ │
│  │  └───────────────────────────────┘ │
│  │                                    │
│  │  ┌─ Projects ─────────────────────┐ │
│  │  │  ┌─ Distributed Task Scheduler│ │ │
│  │  │  │ Bullets (2): ...           │ │ │
│  │  │  │ [+ From Master] [+ Add]   │ │ │
│  │  │  └───────────────────────────┘ │ │
│  │  │  [+ Add Project]               │ │
│  │  └───────────────────────────────┘ │
│  │                                    │
│  │  ┌─ Custom Sections ───────────────┐ │
│  │  │  ┌─ Technical Skills ────────┐ │ │
│  │  │  │ Bullets (4): ...           │ │ │
│  │  │  │ [+ From Master] [+ Add]   │ │ │
│  │  │  └───────────────────────────┘ │ │
│  │  │  [+ Add Custom Section]        │ │
│  │  └───────────────────────────────┘ │
│  └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**Key Features:**
- ✅ View all saved resumes (sorted by newest first)
- ✅ Click resume to view/edit
- ✅ Edit structure: Sections → Entries → Bullets
- ✅ Add bullets from master resume ("+ From Master" button)
- ✅ Add new entries to sections
- ✅ Save as new resume (create variations)

**User Actions:**
1. **View saved resume** → Click on resume name
2. **Edit sections** → Add new entries to Experiences, Education, Projects, etc.
3. **Edit entries** → Modify company, dates, role, etc.
4. **Add bullets from master** → Click "+ From Master" → Select bullet from master resume
5. **Add new bullets** → Click "+ Add Bullet" → Type manually
6. **Save as new** → Click "Save As New Resume" → Enter name → Creates new saved resume

**Structure:**
- **Sections**: Work Experience, Education, Projects, Custom Sections
- **Entries**: Individual experiences, education items, projects (e.g., "Google", "Stanford")
- **Bullets**: Resume points within each entry

---

## Complete Workflow Example

### Scenario: Apply for Google Backend Engineer Role

**Step 1: Build Master Resume (Tab 1)**
- User adds 3 work experiences with 50+ total bullets
- Adds education, projects, custom sections
- All stored locally

**Step 2: Find Job (External)**
- User navigates to Google job posting on LinkedIn
- Clicks extension icon

**Step 3: Generate Optimized Resume (Tab 2)**
- Extension extracts job description
- User clicks "Select Best Points"
- (Mock) Extension selects top 12 bullets
- (Future) Backend does hybrid search + optimization
- User reviews and customizes bullets
- User clicks "Save Resume" → Names it "Google SWE - Backend"

**Step 4: Edit Saved Resume (Tab 3)**
- User goes to "Saved Resumes" tab
- Clicks "Google SWE - Backend"
- User wants to add more backend-specific bullets
- Clicks "+ From Master" on Google experience entry
- Selects bullet: "Built distributed systems using Go and Kubernetes"
- Bullet is added to saved resume
- User clicks "Save As New Resume" → Names it "Google SWE - Backend v2"

**Step 5: Preview & Export**
- User clicks "Preview LaTeX" → See rendered resume preview
- User clicks "Export to PDF"
  - Extension checks one-page constraint
  - If exceeds: Shows warning with auto-trim option
  - Non-negotiable bullets always included (even if exceeds page)
  - Generates LaTeX using Jake's template
  - Compiles to PDF with personal info and formatted bullets
  - User downloads PDF

---

## Data Flow

### Master Resume → Saved Resume

```
Master Resume (Tab 1)
├── Experiences (3)
│   ├── Google (8 bullets)
│   ├── Meta (5 bullets)
│   └── AWS (4 bullets)
├── Education (1)
│   └── Stanford (4 bullets)
├── Projects (4)
│   └── Task Scheduler (4 bullets)
└── Custom Sections (3)
    └── Skills (7 bullets)
         ↓
    [Generate New Resume Tab]
         ↓
    [Select Best Points]
         ↓
    [Backend Hybrid Search]
         ↓
Saved Resume (Tab 3)
├── Experiences (2)
│   ├── Google (4 bullets) ← Selected from master
│   └── AWS (2 bullets)    ← Selected from master
├── Education (1)
│   └── Stanford (2 bullets) ← Selected from master
└── Projects (1)
    └── Task Scheduler (2 bullets) ← Selected from master
```

### Editing Saved Resumes

```
Saved Resume
├── Experiences
│   └── Google Entry
│       ├── Bullet 1 (from master)
│       ├── Bullet 2 (from master)
│       ├── [+ From Master] → Opens dialog
│       │   └── Shows all bullets from master resume
│       │       └── User selects: "Built CI/CD..."
│       │           └── Bullet added to entry
│       └── [+ Add Bullet] → Create new bullet manually
```

---

## Key Differences from Old Flow

### Old Flow (Single View)
- Single interface with experiences and optimization
- Saved resumes were flat bullet lists
- No structured editing

### New Flow (3 Tabs)
- **Tab 1**: Master resume with unlimited bullets
- **Tab 2**: Generate optimized resume from job description
- **Tab 3**: Structured saved resumes (sections → entries → bullets)
- Can add bullets from master resume to saved resumes
- Better organization and editing capabilities

---

## Technical Implementation

### Tab Structure
```
App.jsx
├── Tabs Component
│   ├── Tab 1: Master Resume
│   │   └── ExperienceEditor, EducationEditor, etc.
│   ├── Tab 2: Generate New Resume
│   │   └── GenerateResume Component
│   │       ├── JobMatcher
│   │       └── OptimizationPanel
│   └── Tab 3: Saved Resumes
│       └── SavedResumes Component
│           ├── Resume List
│           └── Resume Editor (with ExperienceEditor, etc.)
```

### Data Storage
```
Chrome Local Storage
├── resume (Master Resume)
│   ├── experiences: [...]
│   ├── education: [...]
│   ├── projects: [...]
│   └── customSections: [...]
└── savedResumes: [
    {
      id: "resume-1",
      name: "Google SWE - Backend",
      createdAt: timestamp,
      data: {
        experiences: [...],
        education: [...],
        projects: [...],
        customSections: [...]
      }
    }
  ]
```

---

## Future Enhancements

### Backend Integration
- Connect Generate New Resume tab to backend API
- Real hybrid search + unified optimization
- Authentication and user accounts

### LaTeX Integration
- Real-time LaTeX compilation
- One-page constraint enforcement
- PDF export

### Enhanced Editing
- Drag-and-drop reordering
- Bulk operations
- Search/filter bullets in master resume

---

**This flow represents the current implementation with the 3-tab structure!** 🎉
