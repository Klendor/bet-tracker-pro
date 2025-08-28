#!/bin/bash

# Chrome Extension Build and Deployment Script
# Usage: ./build-extension.sh [staging|production] [version]

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"
BUILD_DIR="$PROJECT_ROOT/extension-build"
DIST_DIR="$PROJECT_ROOT/dist"

# Parse arguments
ENVIRONMENT=${1:-production}
VERSION=${2:-$(jq -r '.version' manifest.json)}

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(staging|production|development)$ ]]; then
    echo -e "${RED}❌ Invalid environment: $ENVIRONMENT${NC}"
    echo "Usage: $0 [staging|production|development] [version]"
    exit 1
fi

echo -e "${BLUE}🚀 Building Bet Tracker Pro Extension${NC}"
echo -e "${BLUE}Environment: $ENVIRONMENT${NC}"
echo -e "${BLUE}Version: $VERSION${NC}"
echo "============================================="

# Clean previous builds
echo -e "${YELLOW}🧹 Cleaning previous builds...${NC}"
rm -rf "$BUILD_DIR/$ENVIRONMENT"
rm -rf "$DIST_DIR"
mkdir -p "$BUILD_DIR/$ENVIRONMENT"
mkdir -p "$DIST_DIR"

# Copy extension files
echo -e "${YELLOW}📦 Copying extension files...${NC}"
cp -r background/ "$BUILD_DIR/$ENVIRONMENT/"
cp -r popup/ "$BUILD_DIR/$ENVIRONMENT/"
cp -r content/ "$BUILD_DIR/$ENVIRONMENT/"
cp -r icons/ "$BUILD_DIR/$ENVIRONMENT/"
cp -r config/ "$BUILD_DIR/$ENVIRONMENT/"
cp auth-success.html "$BUILD_DIR/$ENVIRONMENT/"
cp welcome.html "$BUILD_DIR/$ENVIRONMENT/"
cp welcome.js "$BUILD_DIR/$ENVIRONMENT/"

# Set API URLs based on environment
echo -e "${YELLOW}⚙️ Configuring environment...${NC}"
case $ENVIRONMENT in
    development)
        API_URL="http://localhost:3000"
        VERSION_SUFFIX=""
        NAME_SUFFIX=""
        ;;
    staging)
        API_URL="https://bet-tracker-pro-api-staging.vercel.app/api"
        VERSION_SUFFIX="-dev"
        NAME_SUFFIX=" (Staging)"
        ;;
    production)
        API_URL="https://bet-tracker-pro-api.vercel.app/api"
        VERSION_SUFFIX=""
        NAME_SUFFIX=""
        ;;
esac

# Update environment configuration
echo -e "${YELLOW}🔧 Updating configuration files...${NC}"

# Update manifest.json
jq --arg env "$ENVIRONMENT" \
   --arg version "$VERSION$VERSION_SUFFIX" \
   --arg name_suffix "$NAME_SUFFIX" \
   --arg api_url "$API_URL" '
  .version = $version |
  .name = (.name + $name_suffix) |
  .version_name = $env
' manifest.json > "$BUILD_DIR/$ENVIRONMENT/manifest.json"

# Update background script API URL (if needed for legacy support)
if [ -f "$BUILD_DIR/$ENVIRONMENT/background/background.js" ]; then
    # Use a more specific replacement to avoid conflicts
    sed -i.bak "s|https://bet-tracker-pro-api.vercel.app/api|$API_URL|g" "$BUILD_DIR/$ENVIRONMENT/background/background.js"
    rm "$BUILD_DIR/$ENVIRONMENT/background/background.js.bak" 2>/dev/null || true
fi

# Update environment config
if [ -f "$BUILD_DIR/$ENVIRONMENT/config/environment.js" ]; then
    sed -i.bak "s|'yourusername/bet-tracker-pro'|'$GITHUB_REPOSITORY'|g" "$BUILD_DIR/$ENVIRONMENT/config/environment.js" 2>/dev/null || true
    rm "$BUILD_DIR/$ENVIRONMENT/config/environment.js.bak" 2>/dev/null || true
fi

# Validate manifest
echo -e "${YELLOW}✅ Validating manifest...${NC}"
if ! jq empty "$BUILD_DIR/$ENVIRONMENT/manifest.json"; then
    echo -e "${RED}❌ Invalid manifest.json${NC}"
    exit 1
fi

# Create ZIP package
echo -e "${YELLOW}📦 Creating extension package...${NC}"
cd "$BUILD_DIR/$ENVIRONMENT"
ZIP_NAME="bet-tracker-pro-$ENVIRONMENT-v$VERSION.zip"
zip -r "../../dist/$ZIP_NAME" . -x "*.DS_Store" "*.git*" "node_modules/*"
cd "$PROJECT_ROOT"

# Generate checksums
echo -e "${YELLOW}🔐 Generating checksums...${NC}"
cd "$DIST_DIR"
sha256sum "$ZIP_NAME" > "$ZIP_NAME.sha256"
cd "$PROJECT_ROOT"

# Display results
echo ""
echo -e "${GREEN}✅ Build completed successfully!${NC}"
echo -e "${GREEN}📦 Package: $DIST_DIR/$ZIP_NAME${NC}"
echo -e "${GREEN}🔐 Checksum: $DIST_DIR/$ZIP_NAME.sha256${NC}"

# Display file info
if [ -f "$DIST_DIR/$ZIP_NAME" ]; then
    SIZE=$(du -h "$DIST_DIR/$ZIP_NAME" | cut -f1)
    echo -e "${GREEN}📊 Size: $SIZE${NC}"
fi

echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
case $ENVIRONMENT in
    development)
        echo "1. Load unpacked extension from: $BUILD_DIR/$ENVIRONMENT"
        echo "2. Test locally with development backend"
        ;;
    staging)
        echo "1. Test with staging environment"
        echo "2. Upload to Chrome Web Store Developer Dashboard (staging)"
        echo "3. Publish to test group"
        ;;
    production)
        echo "1. Upload to Chrome Web Store Developer Dashboard"
        echo "2. Submit for review"
        echo "3. Publish to public"
        echo "4. Create GitHub release with $ZIP_NAME"
        ;;
esac

echo ""
echo -e "${BLUE}🔗 Useful Links:${NC}"
echo "• Chrome Web Store Developer Dashboard: https://chrome.google.com/webstore/devconsole"
echo "• Extension Testing Guide: https://developer.chrome.com/docs/extensions/mv3/getstarted/"
echo "• Publishing Guide: https://developer.chrome.com/docs/webstore/publish/"

# Optional: Auto-open build directory
if command -v open &> /dev/null && [ "$ENVIRONMENT" = "development" ]; then
    echo ""
    echo -e "${YELLOW}Opening build directory...${NC}"
    open "$BUILD_DIR/$ENVIRONMENT"
fi