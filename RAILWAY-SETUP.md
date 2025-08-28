# 🚂 Railway Deployment Setup

## 🎯 Why Railway?

- **$5/month** - Much cheaper than Vercel Pro ($20/month)
- **No function limits** - Deploy as many endpoints as needed
- **Built-in PostgreSQL** - Can replace Supabase if desired
- **Better performance** - No cold starts, persistent containers
- **Automatic scaling** - Scales based on usage

## 🚀 Deployment Steps

### **1. Setup Railway Account**
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Connect your repository

### **2. Deploy Project**
1. Click **"Deploy from GitHub repo"**
2. Select: `bet-tracker-extension`
3. Railway will auto-detect Node.js and deploy

### **3. Add Environment Variables**

In Railway dashboard → Variables tab, add these:

```bash
# Security & Authentication
JWT_SECRET=S/2RWLs60V3wIzIhOVMCPQclzkOa67TixqC34/4mpQQ=
NODE_ENV=production

# Supabase Database  
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key

# Google Cloud APIs
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://your-app.up.railway.app/api/auth/google/callback
GEMINI_API_KEY=your-gemini-api-key

# Extension Security
CORS_ORIGINS=chrome-extension://your-extension-id
EXTENSION_URL=chrome-extension://your-extension-id
```

### **4. Update Google OAuth Redirect**

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to: APIs & Services → Credentials
3. Edit your OAuth client
4. Update **Authorized redirect URIs**:
   ```
   https://your-app.up.railway.app/api/auth/google/callback
   ```

### **5. Update Chrome Extension**

Update `background/background.js`:
```javascript
const API_BASE_URL = 'https://your-app.up.railway.app/api';
```

## 💰 Cost Comparison

| Service | Plan | Monthly Cost | Function Limit |
|---------|------|--------------|----------------|
| **Railway** | Hobby | **$5** | ❌ **Unlimited** |
| Vercel | Pro | $20 | ❌ **Unlimited** |
| Vercel | Hobby | Free | ✅ **12 functions** |
| Render | Starter | $7 | ❌ **Unlimited** |

## ✅ Railway Advantages

✅ **Cheapest option** - Only $5/month  
✅ **No function limits** - Deploy any number of endpoints  
✅ **Better performance** - No cold starts  
✅ **Built-in metrics** - CPU, memory, network monitoring  
✅ **Custom domains** - Free SSL certificates  
✅ **Git integration** - Auto-deploy on push  
✅ **Environment isolation** - Separate staging/production  

## 🔗 Useful Links

- **Railway Dashboard**: https://railway.app/dashboard
- **Railway Docs**: https://docs.railway.app
- **Your API Health Check**: `https://your-app.up.railway.app/api/health`

## 🧪 Testing Your Deployment

After deployment, test these endpoints:

```bash
# Health check
curl https://your-app.up.railway.app/api/health

# Should return:
{"success":true,"message":"Bet Tracker Pro API is running"}

# Google OAuth (will redirect)
curl -I https://your-app.up.railway.app/api/auth/google
```

## 🎉 You're Ready!

Once deployed:
1. ✅ Update Chrome extension with Railway URL
2. ✅ Test OAuth flow end-to-end  
3. ✅ Test bet processing
4. ✅ Deploy to Chrome Web Store

**Your SaaS backend is now running on Railway! 🚂**