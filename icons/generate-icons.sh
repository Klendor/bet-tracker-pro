#!/bin/bash

# Icon generation script for Bet Tracker Pro
# Converts SVG to PNG in required sizes

echo "🎨 Generating icons for Bet Tracker Pro..."
echo "=========================================="

# Check if we have the required tools
HAS_RSVG=false
HAS_CONVERT=false
HAS_INKSCAPE=false

if command -v rsvg-convert >/dev/null 2>&1; then
    HAS_RSVG=true
    echo "✅ Found rsvg-convert"
fi

if command -v convert >/dev/null 2>&1; then
    HAS_CONVERT=true
    echo "✅ Found ImageMagick convert"
fi

if command -v inkscape >/dev/null 2>&1; then
    HAS_INKSCAPE=true
    echo "✅ Found Inkscape"
fi

if ! $HAS_RSVG && ! $HAS_CONVERT && ! $HAS_INKSCAPE; then
    echo "❌ No SVG conversion tools found!"
    echo ""
    echo "Please install one of the following:"
    echo "  macOS: brew install librsvg imagemagick"
    echo "  Ubuntu: sudo apt install librsvg2-bin imagemagick"
    echo "  Windows: Download ImageMagick or Inkscape"
    echo ""
    echo "Alternative: Use online SVG to PNG converter:"
    echo "  1. Open icon.svg in any browser"
    echo "  2. Take screenshot at different zoom levels"
    echo "  3. Crop to square and resize to 16x16, 32x32, 48x48, 128x128"
    exit 1
fi

# Icon sizes needed for Chrome extension
SIZES=(16 32 48 128)

# Generate icons
for size in "${SIZES[@]}"; do
    echo "📐 Generating ${size}x${size} icon..."
    
    if $HAS_RSVG; then
        rsvg-convert -w $size -h $size icon.svg -o icon-${size}.png
    elif $HAS_INKSCAPE; then
        inkscape -w $size -h $size icon.svg -o icon-${size}.png
    elif $HAS_CONVERT; then
        convert -background transparent -resize ${size}x${size} icon.svg icon-${size}.png
    fi
    
    if [ -f "icon-${size}.png" ]; then
        echo "✅ Created icon-${size}.png"
    else
        echo "❌ Failed to create icon-${size}.png"
    fi
done

echo ""
echo "🎉 Icon generation complete!"
echo ""
echo "Generated files:"
ls -la *.png 2>/dev/null || echo "No PNG files found - check for errors above"

echo ""
echo "📝 Next steps:"
echo "1. Verify the PNG files look good"
echo "2. The extension should now load properly in Chrome"
echo "3. Test the icon appears in the browser toolbar"