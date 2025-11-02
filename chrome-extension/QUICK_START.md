# 🚀 Quick Start - Get Running in 5 Minutes

## Step 1: Install Dependencies

```bash
cd chrome-extension/popup
npm install
```

## Step 2: Build React App

```bash
npm run build
```

This creates the `popup-build/` directory.

## Step 3: Update Manifest (One-Time)

After building, update `manifest.json`:

**Change this line:**
```json
"default_popup": "popup/index.html"
```

**To:**
```json
"default_popup": "popup-build/index.html"
```

## Step 4: Create Placeholder Icons

You need 3 icon files (or use any square PNGs):

```bash
# Option 1: Create simple placeholders (you can use any PNG images)
# Just make sure they're named:
# - assets/icons/icon16.png (16x16 pixels)
# - assets/icons/icon48.png (48x48 pixels)  
# - assets/icons/icon128.png (128x128 pixels)

# Option 2: For now, you can temporarily remove icon references from manifest.json
```

## Step 5: Load Extension

1. Open Chrome → Go to `chrome://extensions/`
2. Enable **Developer mode** (toggle top-right)
3. Click **Load unpacked**
4. Select the `chrome-extension` folder
5. ✅ Extension loaded!

## Step 6: Test It

1. Click the extension icon in Chrome toolbar
2. Popup should open with React UI
3. Try adding an experience and bullets
4. Navigate to a job posting (LinkedIn, Indeed)
5. Click "Extract Job Description"

## 🐛 Troubleshooting

**Extension won't load?**
- Check `chrome://extensions/` console for errors
- Ensure `popup-build/index.html` exists (run `npm run build`)
- Check manifest.json syntax

**Popup is blank?**
- Right-click extension icon → Inspect popup
- Check console for errors
- Ensure React app built successfully

**Icons missing?**
- Temporarily remove icon references from manifest.json
- Or create placeholder PNG files

## 📚 Next Steps

- Read `EXTENSION_WALKTHROUGH.md` for detailed architecture
- Read `README.md` for full documentation
- Read `SETUP.md` for development workflow

---

**You're ready to go!** 🎉

