# Quick Guide: Generate Extension Icons

## Problem
The extension needs PNG icon files but they haven't been generated yet from the SVG source.

## Solution: Use the HTML Exporter (Easiest!)

1. **Open the HTML file:**
   - Navigate to: `chrome-extension/assets/icons/export-icons.html`
   - Double-click it to open in your browser
   - OR right-click → "Open With" → choose your browser

2. **Download the icons:**
   - Click the "Download All Icons" button
   - Or download each size individually: 16x16, 48x48, 128x128

3. **Save the files:**
   - Make sure the downloaded files are named:
     - `icon16.png`
     - `icon48.png`
     - `icon128.png`
   - Save them in the `chrome-extension/assets/icons/` directory

4. **Update manifest.json:**
   - Uncomment the icon references in `manifest.json`:
   ```json
   "icons": {
     "16": "assets/icons/icon16.png",
     "48": "assets/icons/icon48.png",
     "128": "assets/icons/icon128.png"
   },
   "action": {
     "default_popup": "popup-build/index.html",
     "default_title": "AI Resume Optimizer",
     "default_icon": {
       "16": "assets/icons/icon16.png",
       "48": "assets/icons/icon48.png",
       "128": "assets/icons/icon128.png"
     }
   },
   ```

5. **Reload your extension:**
   - Go to `chrome://extensions/`
   - Click the reload button on your extension
   - The new icon should appear!

## Alternative: Quick Placeholder

If you just want to test the extension quickly, you can:
1. Create 3 simple colored square PNGs (any color)
2. Name them `icon16.png`, `icon48.png`, `icon128.png`
3. Place them in `assets/icons/`
4. Uncomment the icon references in manifest.json

But I recommend using the HTML exporter to get the nice branded icons! 🎨

