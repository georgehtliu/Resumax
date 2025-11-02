# Quick Setup Guide

## 🚀 Step-by-Step Setup (5 minutes)

### Step 1: Install Dependencies

```bash
cd chrome-extension/popup
npm install
```

### Step 2: Build React App

```bash
npm run build
```

This creates `popup-build/` directory with compiled files.

### Step 3: Update Manifest (After Build)

**Important:** The manifest.json currently points to `popup/index.html`, but after building, you need to point to `popup-build/index.html`.

**Option A: Update manifest manually**
```json
"action": {
  "default_popup": "popup-build/index.html",
  ...
}
```

**Option B: Use build script** (recommended)
We'll create a script that updates this automatically.

### Step 4: Create Placeholder Icons

You need icon files. For quick testing, create simple PNGs or use any icons:

```bash
cd chrome-extension/assets/icons
# Create or copy icon16.png, icon48.png, icon128.png
```

**Quick placeholder:** You can use any square PNG images (16x16, 48x48, 128x128).

### Step 5: Load Extension in Chrome

1. Open Chrome → `chrome://extensions/`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `chrome-extension` folder
5. Extension appears in toolbar!

### Step 6: Test

1. Click extension icon → Popup opens
2. Add an experience and bullets
3. Go to a job posting (LinkedIn/Indeed)
4. Click "Extract Job Description"

## 🔧 Development Workflow

### Making Changes to React Code

1. Edit files in `popup/src/`
2. Run `npm run build` in `popup/` directory
3. Go to `chrome://extensions/`
4. Click **Reload** on your extension
5. Test changes

### Making Changes to Background/Content Scripts

1. Edit `background/service-worker.js` or `content/content-script.js`
2. Go to `chrome://extensions/`
3. Click **Reload** on your extension
4. Test changes (may need to refresh target page for content scripts)

## 📝 Notes

- **No hot reload** - Chrome extensions don't support direct Vite HMR
- **Build required** - Always build React app before testing
- **Service Worker** - Background scripts reload automatically when extension reloads
- **Content Scripts** - May need to refresh the page they're injected into

## 🐛 Troubleshooting

### Extension won't load
- Check browser console at `chrome://extensions/`
- Ensure all files in manifest.json exist
- Check for syntax errors in manifest.json

### Popup is blank
- Ensure `popup-build/index.html` exists (run `npm run build`)
- Check popup console: Right-click extension icon → Inspect popup
- Check for JavaScript errors in console

### Content script not injecting
- Check URL matches patterns in manifest.json
- Refresh the target page
- Check content script console (DevTools on the page)

## ✅ You're Ready!

The extension is now set up and ready for development. See `README.md` for more detailed documentation.



