# Chrome Extension User Flow

## 🎯 Complete User Journey

### Scenario: User wants to apply for a Senior Software Engineer role at Google

---

## Step 1: Build Super Resume (One-Time Setup)

**User opens Chrome extension popup**

```
┌─────────────────────────────────────────┐
│  AI Resume Optimizer                    │
│  ┌─────────────────────────────────┐   │
│  │  EXPERIENCES                     │   │
│  │                                  │   │
│  │  ┌─ Google (2020-2023) ─────┐   │   │
│  │  │ Software Engineer         │   │   │
│  │  │                           │   │   │
│  │  │ Bullets (45):            │   │   │
│  │  │ ☑ Led microservices...  │   │   │
│  │  │ ☑ Built REST APIs...    │   │   │
│  │  │ ☑ Implemented CI/CD...   │   │   │
│  │  │ ... (42 more)            │   │   │
│  │  │                           │   │   │
│  │  │ [+ Add Bullet]           │   │   │
│  │  └──────────────────────────┘   │   │
│  │                                  │   │
│  │  ┌─ Amazon (2018-2020) ─────┐   │   │
│  │  │ Software Engineer         │   │   │
│  │  │ Bullets (30): ...         │   │   │
│  │  └──────────────────────────┘   │   │
│  │                                  │   │
│  │  [+ Add Experience]             │   │
│  └─────────────────────────────────┘   │
│                                          │
│  Total Bullets: 75                      │
└─────────────────────────────────────────┘
```

**User has:**
- 3 work experiences
- 75 total bullet points (super resume)
- All stored locally in Chrome extension

---

## Step 2: Find Job & Extract Description

**User navigates to LinkedIn job posting**

```
┌─────────────────────────────────────────┐
│  LinkedIn - Google Jobs                 │
│                                          │
│  Senior Software Engineer               │
│  📍 Mountain View, CA                   │
│                                          │
│  [Extension icon appears in toolbar]    │
│  ┌─────────────────────────────────┐ │
│  │ 🔍 AI Resume Optimizer            │ │
│  │ "Extract Job Description"         │ │
│  └─────────────────────────────────┘ │
│                                          │
│  We're looking for a Senior Software... │
│  • Experience with microservices        │
│  • Python, REST APIs, CI/CD             │
│  • Team leadership                       │
└─────────────────────────────────────────┘
```

**User clicks extension icon → Job description extracted**

---

## Step 3: One-Click Optimization

**Extension shows optimization panel**

```
┌─────────────────────────────────────────┐
│  Match Resume to Job                    │
│  ┌─────────────────────────────────┐   │
│  │ Job Description:                │   │
│  │ Senior Software Engineer...      │   │
│  │                                  │   │
│  │ Selected: 45 bullets from       │   │
│  │           Google experience      │   │
│  │                                  │   │
│  │ [Match Best Bullets]  ← CLICK    │   │
│  └─────────────────────────────────┘   │
│                                          │
│  Processing... (3 seconds)              │
└─────────────────────────────────────────┘
```

**Backend processes:**
1. Vector search: Finds top 15 bullets by similarity
2. Unified optimizer: Ranks, rewrites, identifies gaps
3. One-page selector: Picks top 12 that fit one page
4. Returns optimized selection

---

## Step 4: See Optimization Results

**Extension shows before/after comparison**

```
┌─────────────────────────────────────────┐
│  Optimization Results                   │
│  ┌─────────────────────────────────┐   │
│  │ Selected: 12/12 bullets         │   │
│  │ Page: 1/1 ✓                      │   │
│  │                                  │   │
│  │ BEFORE → AFTER                   │   │
│  │ ──────────────────────────       │   │
│  │                                  │   │
│  │ "Led microservices"              │   │
│  │     ↓                            │   │
│  │ "Architected scalable            │   │
│  │  microservices using Python,     │   │
│  │  reducing latency by 40%"        │   │
│  │                                  │   │
│  │  Relevance: 0.87                │   │
│  │  Reasoning: Added keywords...   │   │
│  │                                  │   │
│  │  [✓ Use]  [Edit]  [Swap]        │   │
│  │                                  │   │
│  │  ... (11 more bullets)          │   │
│  │                                  │   │
│  │  Gaps Found:                    │   │
│  │  • Cloud deployment (AWS)       │   │
│  │  • Machine learning experience  │   │
│  │                                  │   │
│  │  [Customize] [Export Resume]    │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

**User can:**
- See all optimized bullets
- Click "Edit" to modify text
- Click "Swap" to choose different bullets
- See what gaps were identified

---

## Step 5: Customize (Optional)

**User clicks "Customize"**

```
┌─────────────────────────────────────────┐
│  Customize Resume                       │
│  ┌─────────────────────────────────┐   │
│  │ Selected Bullets (12):          │   │
│  │                                  │   │
│  │  [Drag to reorder]              │   │
│  │  ☑ Bullet 1 (selected)          │   │
│  │  ☐ Bullet 2 (from super resume) │   │
│  │  ☑ Bullet 3 (selected)          │   │
│  │  ...                             │   │
│  │                                  │   │
│  │  Available Bullets (63 others):  │   │
│  │  ☐ "Optimized database queries" │   │
│  │  ☐ "Built ML models"             │   │
│  │  ...                             │   │
│  │                                  │   │
│  │  [Add Selected] [Remove]         │   │
│  │                                  │   │
│  │  Preview:                        │   │
│  │  ┌───────────────────────────┐  │   │
│  │  │ Jake's Resume Template    │  │   │
│  │  │                           │  │   │
│  │  │ [LaTeX Preview]           │  │   │
│  │  │                           │  │   │
│  │  │ Page: 1/1 ✓               │  │   │
│  │  └───────────────────────────┘  │   │
│  │                                  │   │
│  │  [Save] [Export PDF]            │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

**User can:**
- Reorder bullets (drag and drop)
- Swap selected bullets with others
- Add/remove bullets
- See live preview
- Ensure one-page constraint

---

## Step 6: Export Resume

**User clicks "Export PDF"**

```
┌─────────────────────────────────────────┐
│  Export Options                         │
│  ┌─────────────────────────────────┐   │
│  │  Resume: "Google Senior SWE"    │   │
│  │  Format: LaTeX (Jake's Template)│   │
│  │  Pages: 1/1 ✓                   │   │
│  │                                  │   │
│  │  Download Options:              │   │
│  │  ☑ PDF (.pdf)                   │   │
│  │  ☐ LaTeX Source (.tex)          │   │
│  │  ☐ Markdown (.md)               │   │
│  │                                  │   │
│  │  [Download PDF]                 │   │
│  │                                  │   │
│  │  ✓ Resume downloaded!           │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

**Result:**
- Clean one-page PDF resume
- Optimized for the specific job
- Professional LaTeX formatting
- Ready to submit

---

## 🔄 Alternative Flow: Manual Job Description

**User doesn't have extension on job site**

```
┌─────────────────────────────────────────┐
│  Add Job Description                    │
│  ┌─────────────────────────────────┐   │
│  │  Paste Job Description:          │   │
│  │  ┌───────────────────────────┐   │   │
│  │  │ We're looking for...      │   │   │
│  │  │ [paste here]              │   │   │
│  │  └───────────────────────────┘   │   │
│  │                                  │   │
│  │  OR                              │   │
│  │                                  │   │
│  │  Enter Job URL:                  │   │
│  │  [https://...]                   │   │
│  │  [Extract]                       │   │
│  │                                  │   │
│  │  [Match Resume]                  │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

**Same optimization flow continues...**

---

## 💾 Data Persistence

### Local Storage (Chrome Extension)

```javascript
// Super Resume (user's master resume)
chrome.storage.local.set({
  resume: {
    experiences: [...],
    totalBullets: 75
  }
});

// Saved Optimizations
chrome.storage.local.set({
  optimizations: [
    {
      jobDescription: "...",
      selectedBullets: [...],
      timestamp: "2024-01-15"
    }
  ]
});
```

### Backend Storage

```
POST /api/v1/resumes
→ Saves super resume to database

POST /api/v1/optimize
→ Saves optimization result
→ Links to job description
→ Stores selected bullets
```

---

## 🎨 UI/UX Principles

### Design Goals

1. **Simplicity**: One-click optimization
2. **Flexibility**: Full customization control
3. **Transparency**: Show why bullets were selected
4. **Feedback**: Real-time preview
5. **Trust**: User always in control

### Key Interactions

- **Drag & Drop**: Reorder bullets
- **Checkboxes**: Select/deselect bullets
- **Inline Edit**: Quick text modifications
- **Live Preview**: See changes instantly
- **One-Page Indicator**: Always visible

---

## 📊 State Management

### Extension State

```javascript
{
  resume: {
    experiences: [
      {
        id: "exp-1",
        company: "Google",
        bullets: [
          { id: "b1", text: "...", selected: true },
          { id: "b2", text: "...", selected: false },
          // ... 45 total
        ]
      }
    ]
  },
  currentJob: {
    description: "...",
    extractedKeywords: [...]
  },
  optimization: {
    status: "completed", // loading, completed, error
    selectedBullets: [...],
    optimizedBullets: [...],
    gaps: [...]
  },
  export: {
    format: "pdf",
    preview: "..."
  }
}
```

---

This flow provides a seamless experience from building a super resume to exporting a perfectly optimized one-page resume! 🚀
