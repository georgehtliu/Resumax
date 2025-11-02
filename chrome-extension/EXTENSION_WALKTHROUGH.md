# Complete Chrome Extension Walkthrough

## 🎯 Overview

This document walks you through the entire Chrome extension architecture, explaining how each piece works and how they interact.

---

## 📐 Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    CHROME BROWSER                        │
│                                                           │
│  ┌────────────────────────────────────────────────────┐ │
│  │           WEB PAGE (LinkedIn, Indeed)              │ │
│  │  ┌──────────────────────────────────────────────┐  │ │
│  │  │  Content Script (content-script.js)          │  │ │
│  │  │  - Injected into page                        │  │ │
│  │  │  - Extracts job description from DOM          │  │ │
│  │  │  - Injects UI button                          │  │ │
│  │  └───────────────────┬──────────────────────────┘  │ │
│  └──────────────────────┼──────────────────────────────┘ │
│                         │                                 │
│  ┌──────────────────────┼──────────────────────────────┐ │
│  │      EXTENSION POPUP (React UI)                     │ │
│  │  ┌──────────────────┼────────────────────────────┐ │ │
│  │  │  App.jsx                                       │ │ │
│  │  │  - Experience Editor                            │ │ │
│  │  │  - Job Matcher                                  │ │ │
│  │  │  - Optimization Panel                           │ │ │
│  │  └──────────────────┬────────────────────────────┘ │ │
│  └──────────────────────┼──────────────────────────────┘ │
│                         │                                 │
│  ┌──────────────────────┼──────────────────────────────┐ │
│  │  Background Service Worker                           │ │
│  │  ┌──────────────────────────────────────────────┐   │ │
│  │  │  service-worker.js                           │   │ │
│  │  │  - Message routing                           │   │ │
│  │  │  - Chrome Debugger API                       │   │ │
│  │  │  - Chrome Storage API                        │   │ │
│  │  │  - Coordinates all communication              │   │ │
│  │  └──────────────────────────────────────────────┘   │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow

### Scenario 1: User Adds Resume Data

```
1. User types in popup UI (React)
   ↓
2. App.jsx calls storageService.saveResume()
   ↓
3. storage.js wraps chrome.storage.local.set()
   ↓
4. Chrome Storage API saves to browser storage
   ↓
5. Data persists locally (no backend yet)
```

### Scenario 2: Extract Job Description from Page

```
1. User clicks "Extract Job Description" in popup
   ↓
2. App.jsx sends message via chrome.runtime.sendMessage()
   ↓
3. Background service-worker.js receives message
   ↓
4. Background tries content script extraction first
   ↓
   - Sends message to content script in active tab
   ↓
5. Content script extracts from DOM
   ↓
6. Content script sends back job description
   ↓
7. Background forwards to popup
   ↓
8. Popup displays job description
```

### Scenario 3: Extract with Debugger API (Fallback)

```
1. Content script extraction fails
   ↓
2. Background uses Chrome Debugger API
   ↓
   - chrome.debugger.attach({ tabId }, '1.0')
   ↓
   - chrome.debugger.sendCommand({ tabId }, 'Runtime.evaluate', {...})
   ↓
   - Executes JS in page context
   ↓
3. Gets job description from page
   ↓
4. chrome.debugger.detach({ tabId })
   ↓
5. Returns result to popup
```

---

## 📁 File-by-File Breakdown

### 1. `manifest.json`

**Purpose:** Extension configuration file

**Key Sections:**

```json
{
  "permissions": [
    "storage",      // For Chrome Storage API
    "debugger",    // For Chrome Debugger API
    "tabs",        // For accessing tab information
    "scripting"    // For injecting content scripts
  ],
  
  "background": {
    "service_worker": "background/service-worker.js"
    // Runs in background, handles all Chrome API calls
  },
  
  "content_scripts": [{
    "matches": ["https://www.linkedin.com/jobs/*", ...]
    // Auto-inject into job posting pages
  }],
  
  "action": {
    "default_popup": "popup/index.html"
    // Popup UI when user clicks extension icon
  }
}
```

**Key Points:**
- Defines what the extension can do
- Lists required permissions
- Configures which pages get content scripts
- Points to popup HTML

---

### 2. `background/service-worker.js`

**Purpose:** Central coordinator for all extension operations

**Key Functions:**

#### A. Message Routing
```javascript
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'EXTRACT_JOB_DESCRIPTION':
      handleExtractJobDescription(...);
      break;
    // ... other cases
  }
});
```
- Routes messages between popup, content scripts
- Handles async operations

#### B. Chrome Debugger API
```javascript
async function extractWithDebugger(tabId, sendResponse) {
  await chrome.debugger.attach({ tabId }, '1.0');
  chrome.debugger.sendCommand(
    { tabId },
    'Runtime.evaluate',
    { expression: 'document.body.innerText' }
  );
  // ... process result
  await chrome.debugger.detach({ tabId });
}
```
- Advanced page inspection
- Executes JS in page context
- More powerful than content scripts

#### C. Storage Management
```javascript
async function handleSaveResumeData(data, sendResponse) {
  await chrome.storage.local.set({ resume: data });
  sendResponse({ success: true });
}
```
- Wraps Chrome Storage API
- Persists data locally

**Key Points:**
- Runs continuously in background
- Has access to all Chrome APIs
- Coordinates between components

---

### 3. `content/content-script.js`

**Purpose:** Interacts with web pages (job postings)

**Key Functions:**

#### A. Job Description Extraction
```javascript
function extractJobDescription() {
  if (hostname.includes('linkedin.com')) {
    return extractFromLinkedIn();
  }
  // ... other sites
}
```
- Site-specific extraction logic
- Uses DOM selectors
- Fallback to generic extraction

#### B. UI Injection
```javascript
function injectExtractionButton() {
  const button = document.createElement('button');
  button.textContent = '📄 Extract Job Description';
  button.addEventListener('click', handleExtract);
  document.body.appendChild(button);
}
```
- Adds UI to web pages
- Provides user interaction

#### C. Message Handling
```javascript
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'EXTRACT_JD') {
    const jd = extractJobDescription();
    sendResponse({ success: true, jobDescription: jd });
  }
});
```
- Listens for messages from background
- Extracts and returns data

**Key Points:**
- Runs in page context (can access DOM)
- Can't access extension APIs directly
- Communicates via messaging

---

### 4. `popup/src/App.jsx`

**Purpose:** Main React application (popup UI)

**Key Components:**

#### A. State Management
```javascript
const [resume, setResume] = useState({ experiences: [], totalBullets: 0 });
const [currentJob, setCurrentJob] = useState(null);
```
- Manages extension state
- React hooks for UI updates

#### B. Data Loading
```javascript
useEffect(() => {
  loadResumeData();
}, []);

async function loadResumeData() {
  const data = await storageService.getResume();
  setResume(data);
}
```
- Loads data on mount
- Syncs with Chrome storage

#### C. Job Extraction
```javascript
async function handleExtractJobDescription() {
  const result = await chrome.runtime.sendMessage({
    type: 'EXTRACT_JOB_DESCRIPTION'
  });
  setCurrentJob(result);
}
```
- Triggers extraction
- Updates UI with results

**Key Points:**
- React-based UI
- Interacts with Chrome APIs via services
- State-driven rendering

---

### 5. `popup/src/services/storage.js`

**Purpose:** Wrapper for Chrome Storage API

**Functions:**
```javascript
export async function saveResume(resumeData) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ resume: resumeData }, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}
```
- Promisifies Chrome Storage API
- Handles errors
- Clean interface for React components

---

### 6. `popup/src/services/messaging.js`

**Purpose:** Wrapper for Chrome Messaging API

**Functions:**
```javascript
export async function sendMessage(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response);
      }
    });
  });
}
```
- Promisifies messaging
- Error handling
- Clean API for components

---

## 🔑 Chrome APIs Used

### 1. Chrome Storage API
**Where:** `services/storage.js`, `background/service-worker.js`
**Purpose:** Persist resume data locally
**Usage:**
```javascript
chrome.storage.local.set({ key: value });
chrome.storage.local.get(['key'], callback);
```

### 2. Chrome Messaging API
**Where:** All files
**Purpose:** Communication between components
**Usage:**
```javascript
chrome.runtime.sendMessage({ type: 'MESSAGE', data: ... });
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {...});
```

### 3. Chrome Debugger API
**Where:** `background/service-worker.js`
**Purpose:** Advanced page inspection
**Usage:**
```javascript
chrome.debugger.attach({ tabId }, '1.0');
chrome.debugger.sendCommand({ tabId }, 'Runtime.evaluate', {...});
chrome.debugger.detach({ tabId });
```

### 4. Chrome Tabs API
**Where:** `background/service-worker.js`
**Purpose:** Access active tabs
**Usage:**
```javascript
chrome.tabs.query({ active: true, currentWindow: true }, callback);
chrome.tabs.sendMessage(tabId, message);
```

### 5. Content Scripts
**Where:** `content/content-script.js`
**Purpose:** DOM manipulation, page interaction
**Usage:** Automatic injection into matching pages

---

## 🎓 Key Concepts

### 1. Service Worker (Background)
- Runs independently
- Handles Chrome API calls
- Coordinates messages
- Persists across page loads

### 2. Content Scripts
- Injected into web pages
- Can access page DOM
- Can't access extension APIs directly
- Communicate via messaging

### 3. Popup
- Opens when extension icon clicked
- React-based UI
- Accesses Chrome APIs via services
- Temporary (closes when focus lost)

### 4. Message Passing
- Popup ↔ Background ↔ Content Script
- Asynchronous
- JSON-serializable data only
- Use callbacks or Promises

### 5. Storage
- `chrome.storage.local` - Local to browser
- `chrome.storage.sync` - Syncs across devices (if logged in)
- Async API (use callbacks or Promises)

---

## 🚀 Next Steps

1. **Test Extension**
   - Load in Chrome
   - Test each feature
   - Check console for errors

2. **Debug Issues**
   - Popup: Right-click icon → Inspect popup
   - Background: chrome://extensions → Service worker link
   - Content: Page DevTools → Console

3. **Connect Backend** (Later)
   - Create `api.js` service
   - Replace mock optimization
   - Add authentication

4. **Enhance Features**
   - Drag-and-drop reordering
   - LaTeX preview
   - Export functionality

---

This walkthrough covers the entire extension architecture! 🎉

