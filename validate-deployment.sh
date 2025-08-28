#!/bin/bash

echo "🚀 Bet Tracker Pro - Serverless API Validation"
echo "============================================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "vercel.json" ]; then
    echo -e "${RED}❌ Error: Please run this from the bet-tracker-extension directory${NC}"
    exit 1
fi

echo -e "${YELLOW}📋 Checking serverless function structure...${NC}"

# Check required API files
api_files=(
    "api/health.js"
    "api/process-bet.js"
    "api/history.js"
    "api/user/info.js"
    "api/auth/google/index.js"
    "api/auth/google/callback.js"
    "api/sheets/status.js"
    "api/sheets/create-template.js"
    "api/sheets/sync-bet.js"
    "api/lib/database.js"
    "api/lib/auth.js"
    "api/lib/gemini.js"
    "api/lib/sheets.js"
)

missing_files=0
for file in "${api_files[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅ $file${NC}"
    else
        echo -e "${RED}❌ $file - MISSING${NC}"
        ((missing_files++))
    fi
done

# Check configuration files
config_files=(
    "vercel.json"
    "package.json"
    "supabase-schema.sql"
    ".env.vercel.example"
)

echo -e "\n${YELLOW}🔧 Checking configuration files...${NC}"
for file in "${config_files[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅ $file${NC}"
    else
        echo -e "${RED}❌ $file - MISSING${NC}"
        ((missing_files++))
    fi
done

# Check if Node.js and npm are installed
echo -e "\n${YELLOW}🔍 Checking prerequisites...${NC}"
if command -v node &> /dev/null; then
    node_version=$(node --version)
    echo -e "${GREEN}✅ Node.js: $node_version${NC}"
else
    echo -e "${RED}❌ Node.js not found - Please install Node.js 18+${NC}"
    ((missing_files++))
fi

if command -v npm &> /dev/null; then
    npm_version=$(npm --version)
    echo -e "${GREEN}✅ npm: $npm_version${NC}"
else
    echo -e "${RED}❌ npm not found${NC}"
    ((missing_files++))
fi

# Check if Vercel CLI is available
if command -v vercel &> /dev/null; then
    vercel_version=$(vercel --version)
    echo -e "${GREEN}✅ Vercel CLI: $vercel_version${NC}"
else
    echo -e "${YELLOW}⚠️ Vercel CLI not found - Install with: npm i -g vercel${NC}"
fi

# Check package.json dependencies
echo -e "\n${YELLOW}📦 Checking package.json...${NC}"
if [ -f "package.json" ]; then
    if grep -q '"@supabase/supabase-js"' package.json; then
        echo -e "${GREEN}✅ Supabase client dependency${NC}"
    else
        echo -e "${RED}❌ Missing @supabase/supabase-js dependency${NC}"
        ((missing_files++))
    fi
    
    if grep -q '"googleapis"' package.json; then
        echo -e "${GREEN}✅ Google APIs dependency${NC}"
    else
        echo -e "${RED}❌ Missing googleapis dependency${NC}"
        ((missing_files++))
    fi
    
    if grep -q '"jsonwebtoken"' package.json; then
        echo -e "${GREEN}✅ JWT dependency${NC}"
    else
        echo -e "${RED}❌ Missing jsonwebtoken dependency${NC}"
        ((missing_files++))
    fi
fi

# Summary
echo -e "\n${YELLOW}📊 Validation Summary${NC}"
echo "==================="

if [ $missing_files -eq 0 ]; then
    echo -e "${GREEN}🎉 SUCCESS! All files and dependencies are ready for deployment.${NC}"
    echo ""
    echo -e "${YELLOW}Next Steps:${NC}"
    echo "1. Set up Supabase database (run supabase-schema.sql)"
    echo "2. Configure Google Cloud OAuth credentials"
    echo "3. Deploy to Vercel: vercel --prod"
    echo "4. Set environment variables in Vercel dashboard"
    echo "5. Update Chrome extension API URL"
    echo ""
    echo -e "${GREEN}🚀 Ready for production deployment!${NC}"
else
    echo -e "${RED}❌ Found $missing_files issues that need to be resolved.${NC}"
    echo "Please fix the missing files/dependencies before deploying."
    exit 1
fi

echo ""
echo -e "${YELLOW}📖 For detailed deployment instructions, see:${NC}"
echo "   - PRODUCTION_READY.md"
echo "   - VERCEL_DEPLOYMENT_GUIDE.md"