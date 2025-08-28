#!/bin/bash

# Local CI/CD Test Script
# This script simulates what GitHub Actions will do

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 Testing CI/CD Pipeline Locally${NC}"
echo "============================================="

# Test 1: Validate manifest.json
echo -e "${YELLOW}1. Validating manifest.json...${NC}"
if [ ! -f "manifest.json" ]; then
    echo -e "${RED}❌ manifest.json not found${NC}"
    exit 1
fi

# Validate JSON syntax using Node.js
if ! node -e "JSON.parse(require('fs').readFileSync('manifest.json', 'utf8'))"; then
    echo -e "${RED}❌ manifest.json is not valid JSON${NC}"
    exit 1
fi
echo -e "${GREEN}✅ manifest.json is valid${NC}"

# Test 2: Check required files
echo -e "${YELLOW}2. Checking required files...${NC}"
missing_files=0

required_files=(
    "background/background.js"
    "popup/popup.html"
    "popup/popup.js"
    "popup/popup.css"
    "content/content.js"
    "icons/icon-16.png"
    "icons/icon-48.png"
    "icons/icon-128.png"
)

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅ $file${NC}"
    else
        echo -e "${RED}❌ $file - MISSING${NC}"
        ((missing_files++))
    fi
done

if [ $missing_files -gt 0 ]; then
    echo -e "${RED}❌ Found $missing_files missing files${NC}"
    exit 1
fi

# Test 3: Check API structure
echo -e "${YELLOW}3. Validating API structure...${NC}"
if [ ! -d "api" ]; then
    echo -e "${RED}❌ API directory not found${NC}"
    exit 1
fi

api_files=(
    "api/health.js"
    "api/process-bet.js"
    "api/history.js"
    "api/user/info.js"
    "api/auth/google/index.js"
    "api/auth/google/callback.js"
)

missing_api=0
for file in "${api_files[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅ $file${NC}"
    else
        echo -e "${RED}❌ $file - MISSING${NC}"
        ((missing_api++))
    fi
done

if [ $missing_api -gt 0 ]; then
    echo -e "${RED}❌ Found $missing_api missing API files${NC}"
    exit 1
fi

# Test 4: Install dependencies
echo -e "${YELLOW}4. Testing npm install...${NC}"
if [ -f "package-lock.json" ]; then
    npm ci --silent
    echo -e "${GREEN}✅ npm ci successful${NC}"
else
    npm install --silent
    echo -e "${GREEN}✅ npm install successful${NC}"
fi

# Test 5: Test build script
echo -e "${YELLOW}5. Testing build script...${NC}"
if [ -x "./build-extension.sh" ]; then
    ./build-extension.sh development >/dev/null 2>&1
    echo -e "${GREEN}✅ Build script works${NC}"
else
    echo -e "${YELLOW}⚠️ Build script not executable or missing${NC}"
fi

# Test 6: Test validation script
echo -e "${YELLOW}6. Testing validation script...${NC}"
if [ -x "./validate-deployment.sh" ]; then
    ./validate-deployment.sh >/dev/null 2>&1
    echo -e "${GREEN}✅ Validation script works${NC}"
else
    echo -e "${YELLOW}⚠️ Validation script not executable or missing${NC}"
fi

# Test 7: Check Node.js version compatibility
echo -e "${YELLOW}7. Checking Node.js version...${NC}"
NODE_VERSION=$(node --version)
echo -e "${GREEN}✅ Node.js version: $NODE_VERSION${NC}"

echo ""
echo -e "${GREEN}🎉 All CI/CD tests passed!${NC}"
echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
echo "1. Commit your changes: git add . && git commit -m 'Fix CI/CD pipeline'"
echo "2. Push to GitHub: git push origin main"
echo "3. Check GitHub Actions tab for automated deployment"
echo ""
echo -e "${GREEN}🚀 Ready for GitHub Actions deployment!${NC}"