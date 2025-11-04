# Chrome Extension - AI Resume Optimizer

Complete guide for setting up, developing, and testing the Chrome extension.

## 📁 Project Structure

```
chrome-extension/
├── manifest.json              # Extension configuration
├── background/
│   └── service-worker.js      # Background service worker (Chrome Extensions API + Debugger API)
├── content/
│   ├── content-script.js      # Injected into job posting pages
│   └── content-style.css      # Styles for injected UI
├── popup/
│   ├── index.html            # Popup HTML
│   ├── package.json          # React app dependencies
│   ├── vite.config.js        # Vite build configuration
│   ├── src/
│   │   ├── App.jsx          # Main React app
│   │   ├── App.css
│   │   ├── main.jsx         # React entry point
│   │   ├── components/      # React components
│   │   │   ├── ExperienceEditor.jsx
│   │   │   ├── JobMatcher.jsx
│   │   │   └── OptimizationPanel.jsx
│   │   └── services/        # Chrome API wrappers
│   │       ├── storage.js    # Chrome Storage API
│   │       └── messaging.js # Chrome Messaging API
│   └── popup-build/         # Built files (generated)
├── assets/
│   └── icons/               # Extension icons
└── utils/
    └── playwright-extractor.js  # Playwright utility (for backend, not extension)
```

## 🛠️ Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- Google Chrome browser
- Basic knowledge of React and Chrome Extensions

### Step 1: Install Dependencies

```bash
cd chrome-extension/popup
npm install
```

### Step 2: Build React App

```bash
cd chrome-extension/popup
npm run build
```

This creates `popup-build/` directory with compiled React app.

### Step 3: Create Extension Icons

Create placeholder icons or use real icons:

```bash
# Create simple placeholder icons (or use real icons)
cd chrome-extension/assets/icons
# You need: icon16.png, icon48.png, icon128.png
```

For now, you can use any 16x16, 48x48, and 128x128 PNG images.

### Step 4: Load Extension in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right)
3. Click **Load unpacked**
4. Select the `chrome-extension` directory
5. Extension should appear in your extensions list

### Step 5: Test Extension

1. Click the extension icon in Chrome toolbar
2. Popup should open with the React UI
3. Try adding an experience and bullet points
4. Navigate to a job posting (LinkedIn, Indeed) and test extraction

## 🔧 Development Workflow

### Development Mode (Hot Reload)

For React development with hot reload:

```bash
cd chrome-extension/popup
npm run dev
```

This starts Vite dev server. However, **Chrome extensions don't support direct hot reload** from Vite.

**Workflow:**
1. Make changes to React code
2. Run `npm run build` after changes
3. Go to `chrome://extensions/`
4. Click **Reload** button on your extension
5. Test changes

### File Structure Notes

- **manifest.json**: Extension configuration (permissions, scripts, etc.)
- **background/service-worker.js**: Runs in background, handles messaging, Chrome APIs
- **content/content-script.js**: Injected into web pages, extracts job descriptions
- **popup/src/**: React app code (components, services)

## 🚀 Chrome Extensions API Usage

### 1. Chrome Storage API

Used in: `popup/src/services/storage.js`

```javascript
// Save data
chrome.storage.local.set({ key: value });

// Get data
chrome.storage.local.get(['key'], (result) => {
  console.log(result.key);
});
```

### 2. Chrome Messaging API

Used in: `popup/src/services/messaging.js`, `background/service-worker.js`

```javascript
// Send message to background
chrome.runtime.sendMessage({ type: 'MESSAGE_TYPE', data: ... });

// Listen in background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle message
});
```

### 3. Chrome Debugger API

Used in: `background/service-worker.js`

```javascript
// Attach debugger to tab
chrome.debugger.attach({ tabId }, '1.0');

// Execute JavaScript in page context
chrome.debugger.sendCommand(
  { tabId },
  'Runtime.evaluate',
  { expression: 'document.body.innerText' }
);

// Detach when done
chrome.debugger.detach({ tabId });
```

**Note:** Debugger API requires `"debugger"` permission in manifest.json.

### 4. Chrome Tabs API

Used in: `background/service-worker.js`

```javascript
// Get active tab
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const tab = tabs[0];
});

// Send message to tab's content script
chrome.tabs.sendMessage(tabId, { type: 'MESSAGE' });
```

### 5. Content Scripts

Used in: `content/content-script.js`

- Automatically injected into pages matching `matches` in manifest.json
- Has access to page DOM
- Can communicate with background via `chrome.runtime.sendMessage()`

## 🎯 Key Features

### 1. 3-Tab Interface

**Tab 1: Master Resume**
- Unlimited bullet points per experience/education/project
- All sections editable (Experiences, Education, Projects, Custom Sections)
- LaTeX line count indicators (1 line, 2 lines, ⚠️ overflow)
- Auto-saves to Chrome local storage

**Tab 2: Generate New Resume**
- Extract or paste job description
- Match best bullets from master resume
- (Currently mock, will connect to backend)
- Customize and save optimized resumes

**Tab 3: Saved Resumes**
- View all saved resumes (sorted by newest)
- Structured editing: Sections → Entries → Bullets
- Add bullets from master resume ("+ From Master" button)
- Edit sections, entries, and bullets
- Save as new resume (create variations)

### 2. Job Description Extraction

**Three methods:**

1. **Content Script Extraction** (Primary)
   - Enhanced AI-free extraction with noise filtering
   - Site-specific selectors (LinkedIn, Indeed, etc.)
   - Generic fallback with scoring and cleaning
   - No user permission needed

2. **Chrome Debugger API** (Fallback)
   - More powerful, can execute JS in page context
   - Requires debugger permission
   - Used when content script fails

3. **Manual Input** (Always available)
   - User can paste job description manually
   - Collapsible preview (shortened/expanded view)

### 3. Resume Data Storage

- Uses Chrome Storage API (`chrome.storage.local`)
- Stores master resume and saved resumes separately
- Master resume: Full structure with unlimited bullets
- Saved resumes: Structured format (sections → entries → bullets)
- Data persists across sessions

### 4. React UI Components

- **ExperienceEditor**: Edit work experiences with unlimited bullets
- **EducationEditor**: Edit education entries
- **ProjectEditor**: Edit projects
- **CustomSectionEditor**: Edit custom sections
- **GenerateResume**: Job matching and optimization interface
- **SavedResumes**: View and edit saved resumes
- **Tabs**: Tab navigation component
- **JobMatcher**: Job description input with extraction
- **OptimizationPanel**: Display optimization results

## 🧪 Testing

### Manual Testing Checklist

1. **Extension Loads**
   - [ ] Extension appears in Chrome toolbar
   - [ ] Popup opens when clicked
   - [ ] No console errors

2. **Master Resume (Tab 1)**
   - [ ] Can add new experiences, education, projects, custom sections
   - [ ] Can add unlimited bullet points to any entry
   - [ ] LaTeX line count indicators show correctly
   - [ ] Data persists after closing popup
   - [ ] Can edit/delete entries and bullets

3. **Generate New Resume (Tab 2)**
   - [ ] Extract button works on job posting pages
   - [ ] Extraction works (with cleaning)
   - [ ] Manual paste works
   - [ ] "Select Best Points" button works (mock)
   - [ ] Results display correctly
   - [ ] Can customize bullets before saving
   - [ ] Can save with name

4. **Saved Resumes (Tab 3)**
   - [ ] Saved resumes list shows correctly
   - [ ] Can click to view/edit resume
   - [ ] Can add entries to sections
   - [ ] Can edit entry metadata (company, dates, etc.)
   - [ ] Can add bullets from master resume ("+ From Master")
   - [ ] Can add new bullets manually
   - [ ] Can save as new resume
   - [ ] Can delete saved resumes

### Debugging

**Chrome DevTools:**
- **Popup**: Right-click extension icon → Inspect popup
- **Background**: Go to `chrome://extensions/` → Click "service worker" link
- **Content Script**: Open DevTools on page → Console shows content script logs

**Console Logs:**
- All files have `console.log()` statements for debugging
- Check browser console for errors

## 🔗 Integration Points (For Future)

### Backend Connection (Phase 8)

When ready to connect to backend:

1. **API Service**: Create `popup/src/services/api.js`
2. **Update App.jsx**: Replace mock optimization with real API calls
3. **Authentication**: Add JWT token storage
4. **Error Handling**: Add retry logic, offline support

### Current State

- ✅ Extension foundation complete
- ✅ 3-tab interface implemented
- ✅ Master Resume tab (unlimited bullets)
- ✅ Generate New Resume tab (job matching UI)
- ✅ Saved Resumes tab (structured editing)
- ✅ Chrome APIs integrated
- ✅ Local storage working
- ✅ LaTeX line count indicators
- ✅ Bullet selection from master resume
- ⏳ Backend connection (not yet)
- ⏳ Real optimization (mock data only)
- ⏳ LaTeX preview/export (not yet)

## 📚 Resources

- [Chrome Extensions Docs](https://developer.chrome.com/docs/extensions/)
- [Chrome Extensions API Reference](https://developer.chrome.com/docs/extensions/reference/)
- [Manifest V3 Guide](https://developer.chrome.com/docs/extensions/mv3/intro/)
- [Chrome Debugger Protocol](https://chromedevtools.github.io/devtools-protocol/)

## 🐛 Common Issues

### Issue: Extension doesn't load

**Solution:**
- Check `manifest.json` syntax (no trailing commas)
- Ensure all referenced files exist
- Check Chrome console for errors

### Issue: Content script doesn't inject

**Solution:**
- Check `matches` in manifest.json
- Ensure URL matches pattern
- Check content script console logs

### Issue: Debugger API permission denied

**Solution:**
- User must grant debugger permission
- Check `permissions` in manifest.json includes `"debugger"`
- Some pages (chrome://) can't be debugged

### Issue: Storage API not working

**Solution:**
- Check `permissions` includes `"storage"`
- Use `chrome.storage.local` (not `chrome.storage.sync` unless needed)
- Check background service worker console for errors

## 🎓 Learning Objectives

After completing this extension, you'll understand:

1. ✅ Chrome Extensions API (Storage, Messaging, Tabs)
2. ✅ Chrome Debugger API (for advanced page inspection)
3. ✅ Content Scripts (DOM manipulation, page injection)
4. ✅ React in Chrome Extensions
5. ✅ Background Service Workers
6. ✅ Extension Architecture (popup, background, content)

## 🚧 Next Steps

1. **Test extension** on real job postings
2. **Polish UI** and add more features
3. **Connect to backend** (Phase 8) when ready
4. **Add LaTeX preview** and export functionality
5. **Add drag-and-drop** for bullet reordering

---

**Ready to build!** 🚀



