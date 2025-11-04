# UI Enhancements Plan

## 🎯 Overview

This document outlines the planned UI enhancements for the Chrome Extension, including personal information, formatting, non-negotiable points, and LaTeX integration.

---

## 📋 Feature List

### 1. Personal Information Section
**Priority:** Medium  
**Estimated Time:** 1-2 days

**What:**
- Add personal information fields to Master Resume tab
- Fields: Name, Phone, Email, LinkedIn, GitHub
- Validation and formatting
- Display in saved resumes and LaTeX export

**Components:**
- `PersonalInfo.jsx` - Form component
- `PersonalInfo.css` - Styling

**Data Structure:**
```javascript
{
  personalInfo: {
    name: "John Doe",
    phone: "+1 (555) 123-4567",
    email: "john.doe@example.com",
    linkedin: "linkedin.com/in/johndoe",
    github: "github.com/johndoe"
  }
}
```

---

### 2. Bolding Support
**Priority:** Medium  
**Estimated Time:** 1-2 days

**What:**
- Add rich text formatting for bullets
- Support **bold** text using markdown syntax (`**text**`)
- Convert to LaTeX `\textbf{}` when exporting
- Inline editor with formatting buttons

**Components:**
- `BulletEditor.jsx` - Rich text editor component
- `textFormatter.js` - Markdown ↔ LaTeX conversion utilities

**UI:**
- Formatting toolbar: [B] Bold button
- Preview shows formatted text
- Store both plain text and formatted text

**LaTeX Conversion:**
```javascript
// Markdown: "**Developed** microservices..."
// LaTeX: "\\textbf{Developed} microservices..."
```

---

### 3. Non-Negotiable Points
**Priority:** Medium  
**Estimated Time:** 2-3 days

**What:**
- Add "Non-Negotiable" flag to bullets
- Visual indicator (⭐ icon or badge)
- Always include in optimized resumes
- Show warning if non-negotiable bullets exceed one-page limit

**UI:**
- Checkbox or toggle in bullet editor
- Visual indicator: ⭐ icon or "Non-Negotiable" badge
- Filter/search by non-negotiable status

**Enforcement:**
- Optimization always includes non-negotiable bullets
- One-page warning shows if non-negotiable + selected bullets exceed limit
- Auto-trim respects non-negotiable (never removes them)

**Data Structure:**
```javascript
{
  id: 'bullet-1',
  text: 'Developed microservices...',
  nonNegotiable: true,  // NEW field
  boldedText: '**Developed** microservices...'
}
```

---

### 4. LaTeX Preview
**Priority:** Medium  
**Estimated Time:** 3-4 days

**What:**
- Real-time preview of resume in LaTeX format
- Show rendered output
- Update as user edits bullets
- Page count indicator

**Components:**
- `LaTeXPreview.jsx` - Preview component
- `latexRenderer.js` - Convert data to LaTeX format

**Features:**
- Real-time rendering (using LaTeX.js or backend API)
- Page count: "1/1 ✓" or "1.2/1 ⚠️"
- Character/bullet count
- Toggle preview on/off

**Implementation Options:**
1. **Client-side**: Use `latex.js` library (faster, no API calls)
2. **Backend API**: More accurate rendering, requires API

---

### 5. LaTeX Generation & One-Page Enforcement
**Priority:** High  
**Estimated Time:** 4-5 days

**What:**
- Integrate Jake's Resume LaTeX template
- Generate .tex file
- Compile to PDF
- Enforce one-page constraint with warnings

**Components:**
- `latexCompiler.js` - LaTeX generation logic
- `jakeTemplate.js` - Jake's template structure
- `LaTeXExport.jsx` - Export dialog component

**One-Page Warning Flow:**
```
User clicks "Export to PDF"
  ↓
Check total content length
  ↓
If exceeds 1 page:
  ┌─────────────────────────────────────┐
  │ ⚠️ Resume Exceeds One Page           │
  │                                     │
  │ Resume is 1.2 pages (12 bullets)    │
  │ Remove 2 bullets to fit 1 page.      │
  │                                     │
  │ Non-Negotiable Bullets (2):         │
  │ • Led team... ⭐                    │
  │ • Optimized database... ⭐          │
  │                                     │
  │ Suggested Removals:                 │
  │ • Implemented CI/CD...              │
  │ • Built REST APIs...                │
  │                                     │
  │ [Auto-Trim] [Cancel] [Export Anyway]│
  └─────────────────────────────────────┘
```

**Auto-Trim Logic:**
1. Always keep non-negotiable bullets
2. Remove lowest priority bullets first
3. Show updated preview
4. Confirm before final export

**LaTeX Template Integration:**
```latex
% Jake's Resume Template
\documentclass[letterpaper,11pt]{article}
% ... template code ...
\begin{document}
% Personal Info
\name{John Doe}
\contact{+1 (555) 123-4567}{john.doe@example.com}
\contact{LinkedIn}{linkedin.com/in/johndoe}
\contact{GitHub}{github.com/johndoe}

% Experience Section
\section{Experience}
\experience{Google}{Software Engineer II}{Jun 2022 - Present}
\begin{itemize}
  \item \textbf{Developed} and maintained microservices...
  \item Optimized database queries...
\end{itemize}
% ... more sections ...
\end{document}
```

---

## 📐 Implementation Details

### Data Structure Updates

**Master Resume:**
```javascript
{
  personalInfo: {
    name: string,
    phone: string,
    email: string,
    linkedin: string,
    github: string
  },
  experiences: [
    {
      id: string,
      company: string,
      role: string,
      startDate: string,
      endDate: string,
      bullets: [
        {
          id: string,
          text: string,              // Plain text
          boldedText: string,         // Markdown formatted
          nonNegotiable: boolean     // Must-include flag
        }
      ]
    }
  ],
  // ... education, projects, customSections
}
```

### Component Updates

**ExperienceEditor.jsx:**
- Add non-negotiable checkbox to each bullet
- Use BulletEditor component for rich text
- Show ⭐ icon for non-negotiable bullets

**GenerateResume.jsx:**
- Add "Preview LaTeX" button
- Add "Export to PDF" button
- Show one-page warning dialog
- Enforce non-negotiable bullets in optimization

**SavedResumes.jsx:**
- Show personal info in saved resumes
- Add "Preview LaTeX" button
- Add "Export to PDF" button

---

## 🎨 UI Mockups

### Personal Info Section
```
┌─ Personal Information ────────────────┐
│ Name:     [John Doe              ]   │
│ Phone:    [+1 (555) 123-4567    ]   │
│ Email:    [john.doe@example.com  ]   │
│ LinkedIn: [linkedin.com/in/john ]   │
│ GitHub:   [github.com/johndoe    ]   │
└──────────────────────────────────────┘
```

### Bullet Editor with Formatting
```
┌─ Bullet Point ───────────────────────┐
│ [B] [I] [U] (formatting toolbar)     │
│                                       │
│ [ ] Non-Negotiable ⭐                │
│                                       │
│ ┌─────────────────────────────────┐ │
│ │ **Developed** microservices... │ │ │
│ └─────────────────────────────────┘ │ │
│                                       │
│ Preview: Developed microservices...  │ │
│ (Bold text rendered)                 │ │
│                                       │
│ LaTeX: 1 line                        │
└───────────────────────────────────────┘
```

### One-Page Warning Dialog
```
┌─ ⚠️ Resume Exceeds One Page ─────────┐
│                                       │
│ Resume is 1.2 pages (14 bullets)     │
│ Remove 2 bullets to fit 1 page.      │
│                                       │
│ Non-Negotiable Bullets (2):          │
│ ⭐ Led team of 3 engineers...         │
│ ⭐ Optimized database queries...      │
│                                       │
│ Suggested Removals:                   │
│ • Implemented CI/CD pipelines...      │
│ • Built REST APIs...                  │
│                                       │
│ [Auto-Trim] [Cancel] [Export Anyway] │
└───────────────────────────────────────┘
```

---

## 🚀 Implementation Order

### Week 1: Personal Info & Formatting
1. Personal information component (1-2 days)
2. Bolding support (1-2 days)

### Week 2: Non-Negotiable Points
3. Non-negotiable flag and UI (2-3 days)

### Week 3-4: LaTeX Integration
4. LaTeX preview component (3-4 days)
5. LaTeX generation and export (4-5 days)

---

## 📝 Testing Checklist

### Personal Info
- [ ] Can add/edit personal information
- [ ] Email validation works
- [ ] URLs formatted correctly
- [ ] Personal info appears in saved resumes
- [ ] Personal info included in LaTeX export

### Bolding
- [ ] Can bold text in bullets
- [ ] Bold preview shows correctly
- [ ] Bold text converted to LaTeX `\textbf{}`
- [ ] Bold preserved in saved resumes

### Non-Negotiable Points
- [ ] Can mark bullets as non-negotiable
- [ ] Non-negotiable indicator shows (⭐)
- [ ] Non-negotiable bullets always included in optimization
- [ ] Warning shows if non-negotiable exceeds page limit
- [ ] Auto-trim respects non-negotiable flag

### LaTeX Preview
- [ ] Preview renders correctly
- [ ] Updates in real-time as user edits
- [ ] Page count accurate
- [ ] Character count accurate

### LaTeX Export
- [ ] Generates correct LaTeX file
- [ ] Compiles to PDF successfully
- [ ] One-page warning shows when needed
- [ ] Auto-trim works correctly
- [ ] Non-negotiable bullets preserved
- [ ] Bold formatting preserved in PDF

---

## 🔗 Related Files

**New Files to Create:**
- `chrome-extension/popup/src/components/PersonalInfo.jsx`
- `chrome-extension/popup/src/components/PersonalInfo.css`
- `chrome-extension/popup/src/components/BulletEditor.jsx`
- `chrome-extension/popup/src/components/BulletEditor.css`
- `chrome-extension/popup/src/components/LaTeXPreview.jsx`
- `chrome-extension/popup/src/components/LaTeXPreview.css`
- `chrome-extension/popup/src/components/LaTeXExport.jsx`
- `chrome-extension/popup/src/utils/textFormatter.js`
- `chrome-extension/popup/src/utils/latexCompiler.js`
- `chrome-extension/popup/src/utils/latexRenderer.js`
- `chrome-extension/popup/src/utils/jakeTemplate.js`

**Files to Modify:**
- `chrome-extension/popup/src/App.jsx` (add personalInfo state)
- `chrome-extension/popup/src/services/storage.js` (update data structure)
- `chrome-extension/popup/src/components/ExperienceEditor.jsx` (add formatting, non-negotiable)
- `chrome-extension/popup/src/components/EducationEditor.jsx` (add formatting, non-negotiable)
- `chrome-extension/popup/src/components/ProjectEditor.jsx` (add formatting, non-negotiable)
- `chrome-extension/popup/src/components/CustomSectionEditor.jsx` (add formatting, non-negotiable)
- `chrome-extension/popup/src/components/GenerateResume.jsx` (add preview, export, non-negotiable enforcement)
- `chrome-extension/popup/src/components/SavedResumes.jsx` (add preview, export)
- `chrome-extension/popup/src/utils/latexLineCount.js` (enhance with accurate counting)

---

## 📚 Resources

- **Jake's Resume Template**: https://github.com/jakegut/resume
- **LaTeX.js**: https://github.com/michael-brade/LaTeX.js
- **Markdown to LaTeX**: Custom conversion utility
- **Chrome Extensions File Download**: https://developer.chrome.com/docs/extensions/reference/downloads/

---

**Ready to implement!** 🚀

