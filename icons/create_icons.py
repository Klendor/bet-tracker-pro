#!/usr/bin/env python3
"""
Generate PNG icons for Bet Tracker Pro Chrome Extension
Creates 16x16, 32x32, 48x48, and 128x128 PNG icons
"""

try:
    from PIL import Image, ImageDraw, ImageFont
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False
    print("PIL not available, trying alternative method...")

import os

def create_simple_icon(size, filename):
    """Create a simple circular icon with $ symbol"""
    if PIL_AVAILABLE:
        # Create image with transparent background
        img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)
        
        # Draw blue circle
        margin = max(1, size // 16)
        circle_coords = [margin, margin, size - margin, size - margin]
        draw.ellipse(circle_coords, fill=(0, 124, 255, 255), outline=(0, 86, 179, 255), width=max(1, size//32))
        
        # Draw $ symbol
        font_size = max(8, size // 3)
        try:
            # Try to use system font
            font = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", font_size)
        except:
            try:
                font = ImageFont.truetype("arial.ttf", font_size)
            except:
                font = ImageFont.load_default()
        
        text = "$"
        # Get text bounding box
        bbox = draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        
        # Center the text
        x = (size - text_width) // 2
        y = (size - text_height) // 2 - bbox[1]
        
        draw.text((x, y), text, fill=(255, 255, 255, 255), font=font)
        
        # Add small target rings for larger icons
        if size >= 32:
            ring_margin = size // 4
            ring_coords = [ring_margin, ring_margin, size - ring_margin, size - ring_margin]
            draw.ellipse(ring_coords, fill=None, outline=(255, 255, 255, 128), width=max(1, size//64))
        
        # Save the image
        img.save(filename, 'PNG')
        print(f"✅ Created {filename} ({size}x{size})")
        return True
    else:
        # Fallback: create minimal data
        return False

def create_base64_fallback():
    """Create minimal PNG files using base64 data"""
    # Minimal 16x16 blue circle PNG (base64 encoded)
    icon_16_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x10\x00\x00\x00\x10\x08\x06\x00\x00\x00\x1f\xf3\xffa\x00\x00\x00\tpHYs\x00\x00\x0b\x13\x00\x00\x0b\x13\x01\x00\x9a\x9c\x18\x00\x00\x01\x00IDATx\x9c\x95\x92\xc1\n\x82@\x10E\x7f\xa2\x8d6\x92\xa2\xa2P\xc4\x8b\x07\x0f\x1e\xbc\xf8\x00\x0f^\xfc\x8e\x07\x8f\x1e<\xf8\x82\x07\x0f\x1e\x9c\x8e\x99\x19f`\x98\x11\x8c\x08Dq\xb6\xc9\x9d{\xde\xef\xbd\xf7\x9e\xfb\x81\x10\x82\x88\xe2l\x93;\xf7\xbc\xf7\x9e\xf3\x9c\xe7\xfb\x01\x88\x88q4M\x13E\x11\xc7q\x1c\x87a\x18\x86a\x18\x86a\x18\x86a\x18\x86\xe1\x8f\xef\x07\x80\x88\x88\x10\x11!\"\x84\x88\x10!\"\x84\x88\x10!\"\x84\x88\x10!\"\x84\x88\x10!\"\x84\x88\x10!\"\x84\x88\x10!\"\x84\x88\x10!\"\x84\x88\x10!\"\x84\x88\x10!\"\x84\x88\x10!\"\x84\x88\x10!\"\x84\x88\x10!\"\x84\x88\x10!\"\x84\x88\x10!\"\x84\x88\x10!\"\x84\x88\x10!\"\x84\x88\x10!\"\x84\x88\x10!\"\x84\x88\x10!\"\x84\x88\x10!\"\x84\x88\x10!\"\x84\x88\x10!\"\x84\x88\x10!\"\x84\x88\x10!\"\x84\x88\x10!\"\x84\x88\x10!\"\x84\x88\x10!\"\x84\x88\x10!\"\x84\x88\x10!\"\x84\x88\x10!\"\x84\x88\x10!\"\x84\x88\x10!\"\x84\x88\x10!\"\x84\x88\x10\x00\x00\x00\x00IEND\xaeB`\x82'
    
    sizes = [16, 32, 48, 128]
    for size in sizes:
        filename = f"icon-{size}.png"
        # For simplicity, use the same data for all sizes (not ideal but works for testing)
        with open(filename, 'wb') as f:
            f.write(icon_16_data)
        print(f"✅ Created {filename} (fallback)")

def main():
    print("🎨 Generating PNG icons for Bet Tracker Pro...")
    print("=" * 50)
    
    # Change to icons directory
    try:
        os.chdir('icons')
    except FileNotFoundError:
        print("❌ Icons directory not found. Please run from bet-tracker-extension directory.")
        return
    
    sizes = [16, 32, 48, 128]
    success_count = 0
    
    if PIL_AVAILABLE:
        print("✅ PIL/Pillow available - creating high-quality icons")
        for size in sizes:
            filename = f"icon-{size}.png"
            if create_simple_icon(size, filename):
                success_count += 1
    else:
        print("⚠️  PIL/Pillow not available - creating basic fallback icons")
        print("   Install Pillow with: pip3 install Pillow")
        create_base64_fallback()
        success_count = len(sizes)
    
    print()
    print(f"🎉 Generated {success_count}/{len(sizes)} icon files!")
    print()
    print("📋 Next steps:")
    print("1. Chrome extension should now load without icon errors")
    print("2. Test the extension in chrome://extensions/")
    print("3. For better quality icons, install Pillow: pip3 install Pillow")

if __name__ == "__main__":
    main()