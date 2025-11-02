#!/bin/bash

# Build script for Chrome Extension
# Builds React app and prepares extension for loading

echo "🔨 Building React app..."
cd popup
npm run build
cd ..

echo "✅ Build complete!"
echo ""
echo "📦 Next steps:"
echo "1. Go to chrome://extensions/"
echo "2. Enable Developer mode"
echo "3. Click 'Load unpacked'"
echo "4. Select this directory (chrome-extension/)"
echo ""
echo "Note: Update manifest.json 'default_popup' to 'popup-build/index.html' after first build"



