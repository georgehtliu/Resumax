# Extension Icons

This directory contains the extension icons for Resumax.

## Files

- `icon.svg` - Source SVG icon
- `icon16.png` - 16x16 icon (toolbar)
- `icon48.png` - 48x48 icon (extension management)
- `icon128.png` - 128x128 icon (Chrome Web Store)

## Generating PNG Icons

### Option 1: Using HTML Exporter (Easiest - No dependencies!)

1. Open `export-icons.html` in your web browser
2. Click the download buttons to save each icon size
3. Save files as `icon16.png`, `icon48.png`, and `icon128.png` in this directory
4. Done! 🎉

### Option 2: Using Python (if you have Python installed)

1. Install cairosvg:
```bash
pip install cairosvg
```

2. Run the generator script:
```bash
python3 generate-icons.py
```

### Option 3: Using Node.js

1. Install sharp package:
```bash
npm install sharp --save-dev
```

2. Run the generator script:
```bash
node generate-icons.js
```

### Option 4: Using Online Converter

1. Open `icon.svg` in a vector editor (Inkscape, Illustrator, Figma)
2. Export as PNG at three sizes:
   - 16x16 pixels → `icon16.png`
   - 48x48 pixels → `icon48.png`
   - 128x128 pixels → `icon128.png`

Recommended online converters:
- https://convertio.co/svg-png/
- https://cloudconvert.com/svg-to-png

### Option 5: Using ImageMagick

```bash
convert -background none -resize 16x16 icon.svg icon16.png
convert -background none -resize 48x48 icon.svg icon48.png
convert -background none -resize 128x128 icon.svg icon128.png
```

## Icon Design

The icon features:
- Gradient background (indigo to purple) matching the app's color scheme
- White document/resume icon in the center
- Sparkle elements representing AI optimization
- Clean, professional design suitable for a SaaS product

