# Bet Tracker Pro - Production Deployment Guide
## Vercel + Supabase + Google Cloud Stack

This guide will help you deploy Bet Tracker Pro to production using serverless architecture with no local dependencies.

## 🚀 Quick Start Checklist

1. ✅ **Supabase Database Setup** (15 minutes)
2. ✅ **Google Cloud Configuration** (10 minutes) 
3. ✅ **Vercel Deployment** (10 minutes)
4. ✅ **Chrome Extension Update** (5 minutes)
5. ✅ **Final Testing** (10 minutes)

**Total Time: ~50 minutes to production**

---

## 1. Supabase Database Setup

### Step 1.1: Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click **"New project"**
3. Choose organization and enter:
   - **Name**: `bet-tracker-pro`
   - **Database Password**: Generate strong password (save it!)
   - **Region**: Choose closest to your users
4. Click **"Create new project"** (takes ~2 minutes)

### Step 1.2: Set Up Database Schema
1. In your Supabase dashboard, go to **SQL Editor**
2. Copy the entire contents of `supabase-schema.sql` 
3. Paste it in the SQL Editor and click **"Run"**
4. Verify tables were created in **Database > Tables**

### Step 1.3: Get Database Credentials
1. Go to **Settings > API**
2. Copy these values (you'll need them for Vercel):
   - **Project URL**: `https://xxxxx.supabase.co`
   - **Project API keys > anon public**: `eyJhbGci...`
   - **Project API keys > service_role**: `eyJhbGci...` (keep secret!)

---

## 2. Google Cloud Configuration

### Step 2.1: Enable APIs
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project or select existing one
3. Enable these APIs:
   - **Google Sheets API**
   - **Google Drive API** 
   - **Google+ API** (for OAuth)

### Step 2.2: Create OAuth Credentials
1. Go to **APIs & Services > Credentials**
2. Click **"+ CREATE CREDENTIALS" > OAuth client ID**
3. Choose **Web application**
4. Configure:
   - **Name**: `Bet Tracker Pro`
   - **Authorized redirect URIs**: 
     - `http://localhost:3000/api/auth/google/callback` (for testing)
     - `https://your-app-name.vercel.app/api/auth/google/callback` (production)
5. Copy **Client ID** and **Client Secret**

### Step 2.3: Get Gemini API Key
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click **"Create API key"**
3. Copy the generated key

---

## 3. Vercel Deployment

### Step 3.1: Install Vercel CLI
```bash
npm i -g vercel
```

### Step 3.2: Deploy to Vercel
```bash
cd bet-tracker-extension
vercel
```

Follow the prompts:
- **Set up and deploy**: Yes
- **Link to existing project**: No
- **Project name**: bet-tracker-pro-api
- **Directory**: `./` (current directory)

### Step 3.3: Set Environment Variables
In Vercel Dashboard > Project > Settings > Environment Variables, add:

```bash
# Required Variables
JWT_SECRET=your-super-secure-jwt-secret-change-this-to-something-long-and-random
GEMINI_API_KEY=your-gemini-api-key-from-step-2.3
GOOGLE_CLIENT_ID=your-google-client-id-from-step-2.2
GOOGLE_CLIENT_SECRET=your-google-client-secret-from-step-2.2
SUPABASE_URL=your-supabase-project-url-from-step-1.3
SUPABASE_ANON_KEY=your-supabase-anon-key-from-step-1.3

# Update these with your actual values
GOOGLE_REDIRECT_URI=https://your-vercel-app.vercel.app/api/auth/google/callback
EXTENSION_URL=chrome-extension://your-extension-id-here
CORS_ORIGINS=chrome-extension://your-extension-id-here,https://your-domain.com
NODE_ENV=production
```

### Step 3.4: Deploy Production
```bash
vercel --prod
```

Your API will be live at: `https://your-app-name.vercel.app`

---

## 4. Update Chrome Extension

### Step 4.1: Update Background Script
In `background/background.js`, update the API URL:

```javascript
const API_BASE_URL = 'https://your-vercel-app.vercel.app/api';
```

### Step 4.2: Update Manifest OAuth
In `manifest.json`, update:

```json
{
  "oauth2": {
    "client_id": "your-actual-google-client-id.apps.googleusercontent.com",
    "scopes": [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive.file", 
      "profile",
      "email"
    ]
  }
}
```

### Step 4.3: Update Google Cloud Redirect URI
1. Go back to Google Cloud Console > Credentials
2. Edit your OAuth client
3. Add the correct redirect URI:
   - `https://your-vercel-app.vercel.app/api/auth/google/callback`

---

## 5. Final Testing

### Step 5.1: Test API Endpoints
```bash
# Health check
curl https://your-vercel-app.vercel.app/api/health

# Should return: {"success": true, "message": "Bet Tracker Pro API is running"}
```

### Step 5.2: Test Extension
1. Load unpacked extension in Chrome
2. Click extension icon
3. Try Google OAuth login
4. Process a test bet slip
5. Check Google Sheets sync

### Step 5.3: Verify Database
1. Check Supabase dashboard > Database > Tables
2. Verify user and bet records are created

---

## 🎉 Production Ready!

Your Bet Tracker Pro is now running on:
- ✅ **Vercel**: Serverless API with global CDN
- ✅ **Supabase**: PostgreSQL database with real-time capabilities  
- ✅ **Google Cloud**: OAuth + Sheets + Gemini AI
- ✅ **No servers to manage** - fully serverless!

## 📊 Monitoring & Scaling

### Vercel Analytics
- View function logs: Vercel Dashboard > Functions tab
- Monitor usage: Vercel Dashboard > Analytics

### Supabase Monitoring  
- Database metrics: Supabase Dashboard > Reports
- SQL queries: Database > SQL Editor

### Usage Limits (Free Tiers)
- **Vercel**: 100GB bandwidth, 1000 serverless function invocations
- **Supabase**: 500MB database, 50MB storage, 2 concurrent connections
- **Google Cloud**: Gemini API has usage quotas

## 🔧 Troubleshooting

### Common Issues

**1. CORS Errors**
- Verify `CORS_ORIGINS` environment variable includes your extension ID
- Check Vercel function headers in `api/lib/auth.js`

**2. OAuth Redirect Errors**
- Verify Google Cloud redirect URI matches your Vercel URL exactly
- Check `GOOGLE_REDIRECT_URI` environment variable

**3. Database Connection Issues**
- Verify Supabase credentials in Vercel environment variables
- Check Supabase project is active (not paused)

**4. Gemini API Errors**
- Verify API key is correct and has quota remaining
- Check Google AI Studio usage dashboard

### Support
- Vercel Issues: [vercel.com/docs](https://vercel.com/docs)
- Supabase Issues: [supabase.com/docs](https://supabase.com/docs)
- Extension Issues: Check browser developer console

---

## 🔄 Updates & Maintenance

### Deploying Updates
```bash
# Update code and deploy
vercel --prod
```

### Database Migrations
```bash
# Run new SQL in Supabase SQL Editor
# No downtime required for schema additions
```

### Environment Variables
- Update in Vercel Dashboard > Settings > Environment Variables
- Redeploy to apply changes

**🚀 You're now running a production-ready, scalable betting tracker with zero server maintenance!**