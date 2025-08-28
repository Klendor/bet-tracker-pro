# 🚀 Bet Tracker Pro - Complete Setup Guide

## 📋 Overview

This guide will help you deploy **Bet Tracker Pro** using our modern serverless architecture:
- **Vercel** - Serverless API hosting with auto-scaling
- **Supabase** - PostgreSQL database with real-time features
- **Google Cloud** - OAuth, Sheets API, and Gemini AI

**Total setup time: ~20 minutes**

---

## 🛠️ Prerequisites

- Google account (for Google Cloud Console)
- GitHub account (for Vercel deployment)
- Chrome browser (for extension testing)

---

## 🔧 Step 1: Supabase Database Setup (5 minutes)

### 1.1 Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Click **"Start your project"** → **"New project"**
3. Choose organization and project name: `bet-tracker-pro`
4. Set a strong database password
5. Select region closest to your users
6. Click **"Create new project"**

### 1.2 Setup Database Schema
1. Wait for project initialization (2-3 minutes)
2. Go to **SQL Editor** in left sidebar
3. Copy entire contents of `supabase-schema.sql` from this repository
4. Paste into SQL Editor and click **"Run"**
5. Verify tables created: `users`, `bets`, `sheets_sync_log`

### 1.3 Get Database Credentials
1. Go to **Settings** → **API**
2. Copy these values (save for later):
   ```
   Project URL: https://your-project.supabase.co
   Anon public key: eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
   Service role key: eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
   ```

---

## ☁️ Step 2: Google Cloud Setup (8 minutes)

### 2.1 Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click project dropdown → **"New Project"**
3. Project name: `bet-tracker-pro`
4. Click **"Create"**

### 2.2 Enable Required APIs
1. Go to **APIs & Services** → **Library**
2. Enable these APIs (search and enable each):
   - **Google Sheets API**
   - **Google Drive API**  
   - **Google+ API** (for OAuth)
   - **Generative Language API** (for Gemini)

### 2.3 Setup OAuth Credentials
1. Go to **APIs & Services** → **Credentials**
2. Click **"+ CREATE CREDENTIALS"** → **"OAuth client ID"**
3. Application type: **"Web application"**
4. Name: `Bet Tracker Pro`
5. **Authorized redirect URIs** - Add both:
   ```
   http://localhost:3000/api/auth/google/callback
   https://YOUR-VERCEL-APP.vercel.app/api/auth/google/callback
   ```
   *(Replace YOUR-VERCEL-APP with your actual Vercel app name)*
6. Click **"Create"**
7. Copy **Client ID** and **Client Secret** (save for later)

### 2.4 Get Gemini API Key
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click **"Create API Key"**
3. Select your project: `bet-tracker-pro`
4. Copy the API key (save for later)

---

## 🚀 Step 3: Vercel Deployment (5 minutes)

### 3.1 Fork or Upload Repository
**Option A: Fork from GitHub**
1. Fork this repository to your GitHub account
2. Go to [vercel.com](https://vercel.com)
3. Sign in with GitHub
4. Click **"Import Project"**
5. Select your forked repository

**Option B: Upload Folder**
1. Go to [vercel.com](https://vercel.com)
2. Click **"Deploy"** → **"Browse"**
3. Select the `bet-tracker-extension` folder
4. Click **"Upload"**

### 3.2 Configure Environment Variables
1. During import, click **"Environment Variables"**
2. Add all variables from the table below:

| Variable | Value | Where to find |
|----------|-------|---------------|
| `JWT_SECRET` | Generate a random 32-char string | Use: `openssl rand -base64 32` |
| `SUPABASE_URL` | Your Supabase Project URL | Supabase → Settings → API |
| `SUPABASE_ANON_KEY` | Your Supabase Anon Key | Supabase → Settings → API |
| `GOOGLE_CLIENT_ID` | Your OAuth Client ID | Google Cloud → Credentials |
| `GOOGLE_CLIENT_SECRET` | Your OAuth Client Secret | Google Cloud → Credentials |
| `GOOGLE_REDIRECT_URI` | `https://YOUR-APP.vercel.app/api/auth/google/callback` | Use your Vercel URL |
| `GEMINI_API_KEY` | Your Gemini API Key | Google AI Studio |
| `NODE_ENV` | `production` | Fixed value |

### 3.3 Deploy
1. Click **"Deploy"**
2. Wait 2-3 minutes for deployment
3. Note your Vercel URL: `https://your-app-name.vercel.app`

### 3.4 Update OAuth Redirect URI
1. Go back to Google Cloud Console → Credentials
2. Edit your OAuth client
3. Update redirect URI with your actual Vercel URL:
   ```
   https://your-actual-vercel-app.vercel.app/api/auth/google/callback
   ```

---

## 🔧 Step 4: Chrome Extension Setup (2 minutes)

### 4.1 Update Extension Configuration
1. Open `background/background.js`
2. Find line ~10 and update the API URL:
   ```javascript
   const API_BASE_URL = 'https://your-actual-vercel-app.vercel.app/api';
   ```

### 4.2 Install Extension
1. Open Chrome → `chrome://extensions/`
2. Enable **"Developer mode"** (top right)
3. Click **"Load unpacked"**
4. Select the `bet-tracker-extension` folder
5. Extension appears in toolbar

---

## ✅ Step 5: Testing & Verification

### 5.1 Test API Health
```bash
curl https://your-vercel-app.vercel.app/api/health
```
Should return: `{"success": true, "message": "Bet Tracker Pro API is running"}`

### 5.2 Test Extension
1. Click extension icon in Chrome toolbar
2. Click **"Sign In with Google"**
3. Complete OAuth flow
4. Go to any webpage and click **"📸 Capture Bet Slip"**
5. Test image processing

### 5.3 Test Google Sheets Integration
1. After signing in, complete Google Sheets setup
2. Process a test bet slip
3. Verify data appears in your Google Sheet

---

## 🎯 Cost Breakdown

### Free Tier Limits (Perfect for MVP)
- **Vercel**: 100GB bandwidth, 1000 function invocations/month
- **Supabase**: 500MB database, 50MB file storage, 2GB bandwidth
- **Google Cloud**: 300 free API calls/day for most services
- **Gemini API**: 1500 requests/day free

### Estimated Monthly Costs (1000+ users)
- **Vercel Pro**: $20/month (unlimited bandwidth)
- **Supabase Pro**: $25/month (8GB database, 100GB bandwidth)
- **Google Cloud**: $5-15/month (depending on usage)

**Total: ~$50-60/month for professional tier**

---

## 🐛 Troubleshooting

### Common Issues

**1. "Backend configuration not available"**
- Check API URL in `background/background.js`
- Verify Vercel deployment is successful

**2. "Authentication failed"**
- Verify Google OAuth redirect URIs match exactly
- Check environment variables in Vercel dashboard

**3. "Database connection failed"**
- Verify Supabase credentials in Vercel environment variables
- Check if `supabase-schema.sql` was executed successfully

**4. "Google Sheets not syncing"**
- Ensure Google Sheets API is enabled
- Verify OAuth scopes include Sheets access

### Debug Commands
```bash
# Test API endpoints
curl https://your-app.vercel.app/api/health
curl https://your-app.vercel.app/api/user/info -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Check Vercel logs
vercel logs YOUR-DEPLOYMENT-URL
```

---

## 🔒 Security Checklist

- ✅ Environment variables stored securely in Vercel
- ✅ JWT tokens for stateless authentication
- ✅ CORS configured for extension-only access
- ✅ Row Level Security enabled in Supabase
- ✅ Google OAuth with limited scopes
- ✅ No image storage (privacy-first processing)

---

## 📈 Scaling Considerations

### For 10,000+ Users
1. **Upgrade to Vercel Pro** - Better performance and analytics
2. **Supabase Pro** - More database storage and connections
3. **Google Cloud billing** - Set up billing alerts
4. **CDN for static assets** - Consider Cloudflare for extension files
5. **Monitoring** - Set up error tracking with Sentry

### Performance Optimization
1. **Caching** - Enable Vercel edge caching
2. **Database indexing** - Monitor slow queries in Supabase
3. **Rate limiting** - Implement per-user API limits
4. **Image optimization** - Compress images before processing

---

## 🎉 Deployment Complete!

Your Bet Tracker Pro is now running on a professional serverless architecture with:

✅ **Zero server maintenance** - Everything is managed  
✅ **Global CDN** - Fast worldwide response times  
✅ **Auto-scaling** - Handles traffic spikes automatically  
✅ **99.99% uptime** - Enterprise-grade reliability  
✅ **Professional authentication** - Google OAuth integration  
✅ **Real-time database** - Supabase with live updates  
✅ **AI-powered processing** - Gemini for bet slip extraction  

**Ready to launch to the Chrome Web Store! 🚀**

---

## 📞 Support

If you encounter any issues:
1. Check the troubleshooting section above
2. Verify all environment variables are set correctly
3. Test each service independently
4. Check Vercel function logs for errors

**Your Bet Tracker Pro is production-ready!**