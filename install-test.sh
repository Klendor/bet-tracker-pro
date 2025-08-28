#!/bin/bash

# Bet Tracker Pro - Installation & Testing Script

echo "🎯 Bet Tracker Pro - Extension Setup Validator"
echo "=============================================="
echo ""

# Check if we're in the right directory
if [ ! -f "manifest.json" ]; then
    echo "❌ Error: Please run this script from the bet-tracker-extension directory"
    exit 1
fi

echo "✅ Found manifest.json"

# Check required files
FILES=(
    "manifest.json"
    "popup/popup.html"
    "popup/popup.css" 
    "popup/popup.js"
    "content/content.js"
    "content/content.css"
    "background/background.js"
    "config/config-template.js"
    "welcome.html"
    "README.md"
)

echo ""
echo "🔍 Checking required files..."

missing_files=0
for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ Missing: $file"
        missing_files=$((missing_files + 1))
    fi
done

echo ""
if [ $missing_files -eq 0 ]; then
    echo "🎉 All required files present!"
else
    echo "⚠️  $missing_files files missing. Please check the installation."
fi

echo ""
echo "📋 Installation Instructions:"
echo "1. Copy config-template.js to config.js and add your Gemini API key"
echo "2. Add icon files (16x16, 32x32, 48x48, 128x128 PNG) to icons/ directory" 
echo "3. Open Chrome and go to chrome://extensions/"
echo "4. Enable 'Developer mode' (toggle in top right)"
echo "5. Click 'Load unpacked' and select this directory"
echo "6. Click the extension icon and follow the setup wizard"
echo ""

echo "🔧 Next Steps:"
echo "1. Get your Gemini API key from: https://aistudio.google.com/app/apikey"
echo "2. Test on a betting site by capturing a bet slip"
echo "3. Check the browser console for any errors"
echo ""

echo "💡 Troubleshooting:"
echo "- Ensure you have a valid Gemini API key"
echo "- Check browser console (F12) for error messages"
echo "- Make sure the betting site allows screenshots"
echo "- Try refreshing the page if capture doesn't work"
echo ""

# Check manifest.json syntax
echo "🔍 Validating manifest.json..."
if command -v python3 &> /dev/null; then
    python3 -m json.tool manifest.json > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "✅ manifest.json syntax is valid"
    else
        echo "❌ manifest.json has syntax errors"
    fi
else
    echo "⚠️  Python3 not found - skipping manifest validation"
fi

echo ""
echo "📊 Extension Statistics:"
echo "- Popup files: $(ls popup/ | wc -l | tr -d ' ') files"
echo "- Content files: $(ls content/ | wc -l | tr -d ' ') files" 
echo "- Background files: $(ls background/ | wc -l | tr -d ' ') files"
echo "- Total size: $(du -sh . | cut -f1)"

echo ""
echo "🚀 Ready to install! Follow the Chrome extension installation steps above."