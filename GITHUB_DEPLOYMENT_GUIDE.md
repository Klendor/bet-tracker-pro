# 🚀 GitHub + Vercel + Chrome Extension Deployment Guide

This guide covers the complete CI/CD pipeline setup for Bet Tracker Pro, including GitHub integration, automatic deployments, and Chrome extension auto-updates.

## 📋 Table of Contents

1. [GitHub Repository Setup](#github-repository-setup)
2. [Vercel Integration](#vercel-integration)
3. [GitHub Actions Configuration](#github-actions-configuration)
4. [Chrome Extension Auto-Updates](#chrome-extension-auto-updates)
5. [Environment Management](#environment-management)
6. [Testing Workflow](#testing-workflow)
7. [Production Deployment](#production-deployment)

---

## 🗂️ GitHub Repository Setup

### Step 1: Create GitHub Repository

```bash
# Create new repository on GitHub
# Repository name: bet-tracker-pro
# Description: AI-powered Chrome extension for bet tracking with Google Sheets integration

# Initialize and push your code
cd bet-tracker-extension
git init
git add .
git commit -m "Initial commit: Complete serverless Chrome extension with auto-update"
git branch -M main
git remote add origin https://github.com/yourusername/bet-tracker-pro.git
git push -u origin main
```

### Step 2: Set Up Branch Protection

1. Go to **Settings > Branches**
2. Add rule for `main` branch:
   - ✅ Require pull request reviews before merging
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging
   - ✅ Include administrators

### Step 3: Configure Repository Settings

1. **Secrets** (Settings > Secrets and variables > Actions):
   ```
   VERCEL_TOKEN=your-vercel-token
   VERCEL_ORG_ID=your-vercel-org-id
   VERCEL_PROJECT_ID=your-vercel-project-id
   ```

2. **Variables** (Settings > Secrets and variables > Actions):
   ```
   GITHUB_REPOSITORY=yourusername/bet-tracker-pro
   ```

---

## 🚀 Vercel Integration

### Step 1: Connect GitHub to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New..." > Project**
3. **Import Git Repository** > Select your GitHub repo
4. Configure:
   - **Framework Preset**: Other
   - **Root Directory**: `./` (project root)
   - **Build Command**: Leave empty (serverless functions)
   - **Output Directory**: Leave empty

### Step 2: Environment Variables in Vercel

Set these in **Project Settings > Environment Variables**:

```bash
# Required for all environments
JWT_SECRET=your-super-secure-jwt-secret
GEMINI_API_KEY=your-gemini-api-key
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
NODE_ENV=production

# Production-specific
GOOGLE_REDIRECT_URI=https://your-vercel-app.vercel.app/api/auth/google/callback
EXTENSION_URL=chrome-extension://your-extension-id
CORS_ORIGINS=chrome-extension://your-extension-id
```

### Step 3: Set Up Staging Environment

1. Create **Preview** deployment for staging
2. Set staging-specific environment variables:
   ```
   GOOGLE_REDIRECT_URI=https://your-vercel-app-git-develop-yourusername.vercel.app/api/auth/google/callback
   ```

---

## ⚙️ GitHub Actions Configuration

The CI/CD pipeline automatically:
- ✅ Validates extension structure and manifest
- ✅ Builds extension for staging and production
- ✅ Deploys API to Vercel
- ✅ Creates GitHub releases
- ✅ Packages extension for Chrome Web Store

### Workflow Triggers

- **Push to `main`**: Production deployment + release
- **Push to `develop`**: Staging deployment
- **Pull requests**: Validation and testing

---

## 🔄 Chrome Extension Auto-Updates

### How It Works

1. **Background script** checks GitHub releases every 24 hours
2. **Compares versions** using semantic versioning
3. **Shows notification** when update is available
4. **Users click** to download from GitHub releases

### User Experience

```
📦 Notification: "Bet Tracker Pro Update Available"
   "Version 2.1.0 is now available. Click to download."
   
   [Download Update] [Remind Later]
```

### Testing Auto-Updates

```bash
# 1. Build and test staging version
./build-extension.sh staging

# 2. Load unpacked extension in Chrome
# 3. Check console for update checks
# 4. Manually trigger update check from popup

# 5. Create test release on GitHub
# 6. Verify notification appears
```

---

## 🌍 Environment Management

### Three Environments

| Environment | API URL | Auto-Updates | Debug Logs | Purpose |
|-------------|---------|--------------|------------|---------|
| **Development** | `localhost:3000` | ❌ | ✅ | Local testing |
| **Staging** | `*-staging.vercel.app` | ✅ | ✅ | Pre-production testing |
| **Production** | `*.vercel.app` | ✅ | ❌ | Live users |

### Environment Detection

Extension automatically detects environment from:
- ✅ **Version suffix**: `-dev` = staging
- ✅ **Extension name**: "(Staging)" = staging
- ✅ **Manifest version_name**: staging/production

### Build Commands

```bash
# Development (local testing)
./build-extension.sh development

# Staging (testing with live backend)
./build-extension.sh staging

# Production (ready for Chrome Web Store)
./build-extension.sh production 2.1.0
```

---

## 🧪 Testing Workflow

### 1. Local Development

```bash
# Start local backend (if testing locally)
cd backend && npm run dev

# Build development extension
./build-extension.sh development

# Load unpacked extension in Chrome
# Test all features locally
```

### 2. Staging Testing

```bash
# Create feature branch
git checkout -b feature/new-feature

# Make changes and test locally
# Push to feature branch
git push origin feature/new-feature

# Create pull request to develop
# GitHub Actions will validate automatically

# Merge to develop for staging deployment
git checkout develop
git merge feature/new-feature
git push origin develop
```

### 3. Production Release

```bash
# Merge develop to main
git checkout main
git merge develop

# Tag release
git tag v2.1.0
git push origin main --tags

# GitHub Actions will:
# 1. Deploy API to production
# 2. Build production extension
# 3. Create GitHub release
# 4. Notify existing users of update
```

---

## 📦 Production Deployment

### Complete Deployment Checklist

#### 1. Pre-Deployment
- [ ] All tests pass in staging
- [ ] API endpoints tested with staging environment
- [ ] Google OAuth configured for production domain
- [ ] Supabase database configured and seeded
- [ ] Environment variables set in Vercel

#### 2. Chrome Web Store Submission
```bash
# 1. Build production extension
./build-extension.sh production 2.1.0

# 2. Upload dist/bet-tracker-pro-production-v2.1.0.zip to Chrome Web Store
# 3. Fill out store listing:
#    - Screenshots
#    - Description
#    - Privacy policy
#    - Permissions justification

# 4. Submit for review (7-14 days)
```

#### 3. Post-Deployment
- [ ] Monitor error logs in Vercel
- [ ] Check Supabase database usage
- [ ] Verify Google Sheets integration works
- [ ] Test auto-update mechanism
- [ ] Monitor user feedback

---

## 🔧 Useful Commands

### GitHub Operations
```bash
# Create and switch to new branch
git checkout -b feature/new-feature

# Push feature branch
git push -u origin feature/new-feature

# Create pull request (use GitHub UI or CLI)
gh pr create --title "Add new feature" --body "Description"

# Merge and clean up
git checkout main
git pull origin main
git branch -d feature/new-feature
```

### Extension Development
```bash
# Quick development build
./build-extension.sh development

# Test production build locally
./build-extension.sh production

# Validate extension structure
./validate-deployment.sh

# Check for updates manually
# (Open extension popup and check console)
```

### Vercel Operations
```bash
# Deploy manually
vercel --prod

# Check deployment status
vercel list

# View logs
vercel logs your-deployment-url

# Set environment variable
vercel env add VARIABLE_NAME
```

---

## 🚨 Troubleshooting

### Common Issues

**1. Extension not updating API URL**
```bash
# Check environment detection in background script
# Verify API URL in build output
# Clear extension storage: chrome://extensions > Developer mode > Clear storage
```

**2. GitHub Actions failing**
```bash
# Check repository secrets are set correctly
# Verify workflow permissions in Settings > Actions
# Check Vercel token has correct permissions
```

**3. Auto-updates not working**
```bash
# Verify GitHub repository name in environment.js
# Check notification permissions in manifest.json
# Test with staging environment first
```

**4. Chrome Web Store rejection**
```bash
# Common reasons:
# - Missing privacy policy
# - Insufficient permission justification
# - Screenshots not matching functionality
# - Manifest errors
```

---

## 📊 Monitoring & Analytics

### Key Metrics to Monitor

1. **Vercel Function Metrics**
   - Invocation count
   - Duration
   - Error rate
   - Cold starts

2. **Supabase Metrics**
   - Database connections
   - Query performance
   - Storage usage
   - Auth success rate

3. **Extension Metrics**
   - Install/uninstall rate
   - Active users
   - Feature usage
   - Error reports

### Monitoring Setup

```bash
# 1. Enable Vercel Analytics
# Dashboard > Analytics tab

# 2. Set up Supabase monitoring
# Dashboard > Reports tab

# 3. Add error tracking to extension
# Consider integrating with Sentry or similar
```

---

## 🎉 Success! You Now Have:

✅ **Complete CI/CD Pipeline** with GitHub Actions  
✅ **Automatic Vercel Deployments** on git push  
✅ **Staging and Production Environments**  
✅ **Chrome Extension Auto-Updates** from GitHub releases  
✅ **Professional Build Scripts** for all environments  
✅ **Comprehensive Testing Workflow**  
✅ **Production-Ready Chrome Web Store Package**  

**Your extension will automatically update itself for all users when you release new versions! 🚀**