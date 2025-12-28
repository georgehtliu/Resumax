/**
 * Script to generate PNG icons from SVG for Chrome extension
 * Requires: sharp package (npm install sharp --save-dev)
 * 
 * Run: node generate-icons.js
 */

const fs = require('fs');
const path = require('path');

// Check if sharp is available
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.error('Error: sharp package is required. Install it with:');
  console.error('  npm install sharp --save-dev');
  console.error('\nOr use an online SVG to PNG converter like:');
  console.error('  https://convertio.co/svg-png/');
  console.error('  https://cloudconvert.com/svg-to-png');
  console.error('\nGenerate PNGs at: 16x16, 48x48, and 128x128 pixels');
  process.exit(1);
}

const svgPath = path.join(__dirname, 'icon.svg');
const sizes = [16, 48, 128];

async function generateIcons() {
  try {
    const svgBuffer = fs.readFileSync(svgPath);
    
    for (const size of sizes) {
      const outputPath = path.join(__dirname, `icon${size}.png`);
      
      await sharp(svgBuffer)
        .resize(size, size, {
          kernel: sharp.kernel.lanczos3
        })
        .png()
        .toFile(outputPath);
      
      console.log(`✅ Generated icon${size}.png (${size}x${size})`);
    }
    
    console.log('\n✅ All icons generated successfully!');
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons();



