#!/bin/bash

# GitHub Repository Setup Script for Bet Tracker Pro
# This script helps you set up the complete CI/CD pipeline

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Bet Tracker Pro - GitHub Setup${NC}"
echo -e "${BLUE}Setting up complete CI/CD pipeline...${NC}"
echo "============================================="

# Check prerequisites
echo -e "${YELLOW}🔍 Checking prerequisites...${NC}"

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo -e "${RED}❌ Git is not installed. Please install git first.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Git${NC}"

# Check if GitHub CLI is installed (optional)
if command -v gh &> /dev/null; then
    echo -e "${GREEN}✅ GitHub CLI${NC}"
    HAS_GH_CLI=true
else
    echo -e "${YELLOW}⚠️ GitHub CLI not found (optional)${NC}"
    HAS_GH_CLI=false
fi

# Check if we're in the right directory
if [ ! -f "manifest.json" ]; then
    echo -e "${RED}❌ Please run this script from the bet-tracker-extension directory${NC}"
    exit 1
fi

# Get repository information
echo ""
echo -e "${BLUE}📝 Repository Configuration${NC}"
read -p "Enter your GitHub username: " GITHUB_USERNAME
read -p "Enter repository name (default: bet-tracker-pro): " REPO_NAME
REPO_NAME=${REPO_NAME:-bet-tracker-pro}

REPO_URL="https://github.com/$GITHUB_USERNAME/$REPO_NAME.git"

echo ""
echo -e "${YELLOW}🔧 Configuring repository...${NC}"

# Update environment.js with correct repository
if [ -f "config/environment.js" ]; then
    sed -i.bak "s|'yourusername/bet-tracker-pro'|'$GITHUB_USERNAME/$REPO_NAME'|g" config/environment.js
    rm config/environment.js.bak 2>/dev/null || true
    echo -e "${GREEN}✅ Updated environment.js${NC}"
fi

# Update GitHub Actions workflow
if [ -f ".github/workflows/ci-cd.yml" ]; then
    sed -i.bak "s/yourusername\/bet-tracker-pro/$GITHUB_USERNAME\/$REPO_NAME/g" .github/workflows/ci-cd.yml
    rm .github/workflows/ci-cd.yml.bak 2>/dev/null || true
    echo -e "${GREEN}✅ Updated GitHub Actions workflow${NC}"
fi

# Initialize git repository if not already initialized
if [ ! -d ".git" ]; then
    echo -e "${YELLOW}📁 Initializing git repository...${NC}"
    git init
    git branch -M main
fi

# Add all files
echo -e "${YELLOW}📋 Adding files to git...${NC}"
git add .

# Create initial commit
if [ -z "$(git log --oneline 2>/dev/null)" ]; then
    git commit -m "Initial commit: Complete Chrome extension with CI/CD pipeline

- Serverless API with Vercel deployment
- Chrome extension with auto-update mechanism  
- GitHub Actions for automated testing and deployment
- Multi-environment support (dev/staging/production)
- Complete documentation and setup scripts"
    echo -e "${GREEN}✅ Created initial commit${NC}"
else
    echo -e "${GREEN}✅ Repository already has commits${NC}"
fi

# Set remote origin
if ! git remote get-url origin &> /dev/null; then
    git remote add origin "$REPO_URL"
    echo -e "${GREEN}✅ Added remote origin${NC}"
else
    echo -e "${GREEN}✅ Remote origin already configured${NC}"
fi

# Create GitHub repository if CLI is available
if [ "$HAS_GH_CLI" = true ]; then
    echo ""
    read -p "Create GitHub repository automatically? (y/N): " CREATE_REPO
    if [[ "$CREATE_REPO" =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}🌐 Creating GitHub repository...${NC}"
        
        gh repo create "$REPO_NAME" \
            --description "AI-powered Chrome extension for bet tracking with Google Sheets integration" \
            --public \
            --source=. \
            --remote=origin \
            --push || echo -e "${YELLOW}⚠️ Repository might already exist${NC}"
    fi
else
    echo ""
    echo -e "${YELLOW}📋 Manual Repository Setup Required:${NC}"
    echo "1. Go to https://github.com/new"
    echo "2. Repository name: $REPO_NAME"
    echo "3. Description: AI-powered Chrome extension for bet tracking"
    echo "4. Make it public"
    echo "5. Don't initialize with README (we already have files)"
    echo "6. Create repository"
    echo ""
    read -p "Press Enter when repository is created..."
fi

# Push to GitHub
echo -e "${YELLOW}📤 Pushing to GitHub...${NC}"
git push -u origin main || echo -e "${YELLOW}⚠️ Push failed - repository might not exist yet${NC}"

# Display next steps
echo ""
echo -e "${GREEN}🎉 Setup Complete!${NC}"
echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
echo "============================================="
echo ""
echo -e "${YELLOW}1. Set up Vercel Integration:${NC}"
echo "   • Go to https://vercel.com/dashboard"
echo "   • Import Git Repository > Select your repo"
echo "   • Configure environment variables"
echo ""
echo -e "${YELLOW}2. Configure GitHub Secrets:${NC}"
echo "   • Go to $REPO_URL/settings/secrets/actions"
echo "   • Add VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID"
echo ""
echo -e "${YELLOW}3. Set up Google Cloud:${NC}"
echo "   • Enable Google Sheets API, Drive API, Google+ API"
echo "   • Create OAuth credentials"
echo "   • Get Gemini API key"
echo ""
echo -e "${YELLOW}4. Set up Supabase:${NC}"
echo "   • Create new project"
echo "   • Run supabase-schema.sql"
echo "   • Get connection details"
echo ""
echo -e "${YELLOW}5. Test the pipeline:${NC}"
echo "   • Make a small change and push to main"
echo "   • Check GitHub Actions tab for automated deployment"
echo ""
echo -e "${GREEN}📖 Detailed guides available:${NC}"
echo "   • GITHUB_DEPLOYMENT_GUIDE.md"
echo "   • VERCEL_DEPLOYMENT_GUIDE.md"
echo "   • PRODUCTION_READY.md"
echo ""
echo -e "${GREEN}🔧 Useful commands:${NC}"
echo "   • Build extension: ./build-extension.sh production"
echo "   • Validate setup: ./validate-deployment.sh"
echo "   • Test extension: Load unpacked from extension-build/"
echo ""
echo -e "${BLUE}🚀 Your Chrome extension is ready for professional deployment!${NC}"