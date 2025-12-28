#!/usr/bin/env python3
"""
Generate PNG icons from SVG for Chrome extension
Requires: pip install cairosvg pillow

Usage: python3 generate-icons.py
"""

import os
import sys

try:
    import cairosvg
except ImportError:
    print("Error: cairosvg is required. Install it with:")
    print("  pip install cairosvg")
    print("\nAlternatively, use the HTML exporter (export-icons.html)")
    print("or an online converter like https://convertio.co/svg-png/")
    sys.exit(1)

def generate_icons():
    svg_path = os.path.join(os.path.dirname(__file__), 'icon.svg')
    sizes = [16, 48, 128]
    
    if not os.path.exists(svg_path):
        print(f"Error: {svg_path} not found")
        sys.exit(1)
    
    for size in sizes:
        output_path = os.path.join(os.path.dirname(__file__), f'icon{size}.png')
        
        try:
            cairosvg.svg2png(
                url=svg_path,
                write_to=output_path,
                output_width=size,
                output_height=size
            )
            print(f"✅ Generated icon{size}.png ({size}x{size})")
        except Exception as e:
            print(f"❌ Error generating icon{size}.png: {e}")
            sys.exit(1)
    
    print("\n✅ All icons generated successfully!")

if __name__ == '__main__':
    generate_icons()



