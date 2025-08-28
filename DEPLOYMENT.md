# 🚢 Deployment Guide - Bet Tracker Pro

## 📋 Deployment Overview

This guide covers deploying your Bet Tracker Pro to production using our serverless architecture. The deployment process is streamlined and requires minimal ongoing maintenance.

**Architecture**: Chrome Extension → Vercel Serverless → Supabase PostgreSQL → Google Cloud APIs

---

## 🎯 Pre-Deployment Checklist

### ✅ **Required Accounts**
- [ ] Google Cloud Console account (for APIs)
- [ ] Supabase account (for database)
- [ ] Vercel account (for hosting)
- [ ] GitHub account (for code repository)

### ✅ **Required Information**
- [ ] Gemini API key from Google AI Studio
- [ ] Google OAuth credentials (Client ID + Secret)
- [ ] Supabase database URL and keys
- [ ] JWT secret for authentication

---

## 🔧 Environment Variables Configuration

### **Required Variables in Vercel**

```bash
# Authentication & Security
JWT_SECRET=your-super-secure-jwt-secret-32-chars
NODE_ENV=production

# Supabase Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...

# Google Cloud APIs
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://your-app.vercel.app/api/auth/google/callback
GEMINI_API_KEY=your-gemini-api-key

# Extension Security
EXTENSION_URL=chrome-extension://your-extension-id
CORS_ORIGINS=chrome-extension://your-extension-id
```

### **Generate JWT Secret**
```bash
# Generate a secure JWT secret
openssl rand -base64 32
```

---

## 🚀 Step-by-Step Deployment

### **1. Database Deployment (Supabase)**

```sql
-- 1. Go to Supabase Dashboard
-- 2. Create new project: bet-tracker-pro
-- 3. Copy supabase-schema.sql into SQL Editor
-- 4. Execute the schema to create tables and policies
-- 5. Note down your Project URL and API keys
```

**Verify Database Setup:**
```bash
# Check if tables exist
curl -X GET 'https://your-project.supabase.co/rest/v1/users' \
  -H "apikey: your-anon-key" \
  -H "Authorization: Bearer your-anon-key"
```

### **2. API Deployment (Vercel)**

```bash
# Option A: Deploy from GitHub
# 1. Push code to GitHub repository
# 2. Connect GitHub repo to Vercel
# 3. Add environment variables in Vercel dashboard
# 4. Deploy

# Option B: Direct deployment
cd bet-tracker-extension
vercel --prod
```

**Verify API Deployment:**
```bash
# Test health endpoint
curl https://your-app.vercel.app/api/health

# Expected response:
# {"success": true, "message": "Bet Tracker Pro API is running"}
```

### **3. Chrome Extension Configuration**

Update the extension configuration:

```javascript
// In background/background.js, update line ~10:
const API_BASE_URL = 'https://your-actual-app.vercel.app/api';

// In manifest.json, update the host_permissions if needed:
"host_permissions": [
  "https://your-actual-app.vercel.app/*"
]
```

### **4. Google OAuth Configuration**

Update OAuth settings in Google Cloud Console:

```bash
# Authorized redirect URIs should include:
https://your-actual-app.vercel.app/api/auth/google/callback

# Authorized JavaScript origins:
https://your-actual-app.vercel.app
```

---

## 🧪 Production Testing

### **1. API Endpoint Tests**

```bash
# Health check
curl https://your-app.vercel.app/api/health

# User info (requires auth token)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     https://your-app.vercel.app/api/user/info

# Bet processing test
curl -X POST https://your-app.vercel.app/api/process-bet \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -d '{"imageData": "data:image/png;base64,..."}'
```

### **2. Extension Integration Test**

1. **Load Extension**
   - Go to `chrome://extensions/`
   - Load unpacked extension
   - Verify no console errors

2. **Authentication Test**
   - Click extension icon
   - Click "Sign In with Google"
   - Complete OAuth flow
   - Verify user info loads

3. **Capture Test**
   - Go to any betting site
   - Click "📸 Capture Bet Slip"
   - Capture a test area
   - Verify processing completes

4. **Google Sheets Test**
   - Complete Sheets setup flow
   - Process a bet slip
   - Verify data syncs to sheet

### **3. Load Testing**

```bash
# Simple load test with curl
for i in {1..10}; do
  curl -s https://your-app.vercel.app/api/health &
done
wait

# Use wrk for more comprehensive testing
wrk -t12 -c400 -d30s https://your-app.vercel.app/api/health
```

---

## 📊 Monitoring & Observability

### **Vercel Analytics**

1. **Enable Analytics**
   - Go to Vercel dashboard
   - Select your project
   - Enable Web Analytics
   - Add analytics script to extension if needed

2. **Function Metrics**
   - Monitor function execution time
   - Track error rates
   - Monitor memory usage

### **Supabase Monitoring**

1. **Database Performance**
   - Monitor query performance
   - Track connection pool usage
   - Set up alerts for slow queries

2. **Usage Tracking**
   ```sql
   -- Monitor daily active users
   SELECT DATE(created_at), COUNT(*) 
   FROM bets 
   WHERE created_at >= NOW() - INTERVAL '7 days'
   GROUP BY DATE(created_at);
   ```

### **Error Tracking**

```javascript
// Add error tracking to your API functions
export default async function handler(req, res) {
  try {
    // Your function logic
  } catch (error) {
    console.error('API Error:', error);
    
    // Optional: Send to error tracking service
    // await errorTracker.captureException(error);
    
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
}
```

---

## 🔄 CI/CD Pipeline (Optional)

### **GitHub Actions Workflow**

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    
    - name: Deploy to Vercel
      uses: amondnet/vercel-action@v20
      with:
        vercel-token: ${{ secrets.VERCEL_TOKEN }}
        vercel-org-id: ${{ secrets.ORG_ID }}
        vercel-project-id: ${{ secrets.PROJECT_ID }}
        vercel-args: '--prod'
```

### **Environment Management**

```bash
# Development environment
vercel env add DEVELOPMENT

# Staging environment  
vercel env add PREVIEW

# Production environment
vercel env add PRODUCTION
```

---

## 🚨 Troubleshooting

### **Common Deployment Issues**

**1. Environment Variables Not Set**
```bash
# Check Vercel environment variables
vercel env ls

# Add missing variables
vercel env add GEMINI_API_KEY
```

**2. CORS Issues**
```javascript
// Verify CORS configuration in api functions
res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGINS);
res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
```

**3. Database Connection Issues**
```bash
# Test Supabase connection
curl -X GET 'https://your-project.supabase.co/rest/v1/' \
  -H "apikey: your-anon-key"
```

**4. OAuth Redirect Issues**
- Verify redirect URIs in Google Cloud Console
- Check that URLs match exactly (no trailing slashes)
- Ensure HTTPS in production

### **Debug Commands**

```bash
# Check Vercel logs
vercel logs https://your-app.vercel.app

# Test specific API endpoint
curl -v https://your-app.vercel.app/api/health

# Check extension console
# Open Chrome DevTools in extension popup
# Look for network and console errors
```

---

## 🔐 Security Hardening

### **Production Security Checklist**

- [ ] **Environment Variables**: All secrets stored in Vercel environment
- [ ] **JWT Secret**: 32+ character random string
- [ ] **HTTPS Only**: All API calls use HTTPS
- [ ] **CORS Configured**: Restricted to extension origin only
- [ ] **RLS Enabled**: Supabase Row Level Security active
- [ ] **OAuth Scopes**: Minimal required Google API scopes
- [ ] **Error Handling**: No sensitive data in error responses

### **Security Headers**

```javascript
// Add security headers to API responses
export default function handler(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000');
  
  // Your API logic here
}
```

---

## 📈 Scaling Considerations

### **Traffic Growth Planning**

| Users | Vercel Plan | Supabase Plan | Monthly Cost |
|-------|-------------|---------------|--------------|
| 0-1K | Free | Free | $0 |
| 1K-10K | Pro ($20) | Pro ($25) | $45 |
| 10K-100K | Pro ($20) | Pro ($25) + Add-ons | $75 |
| 100K+ | Enterprise | Team/Enterprise | $200+ |

### **Performance Optimization**

1. **API Optimization**
   - Enable edge caching for static responses
   - Optimize database queries with proper indexing
   - Implement request/response compression

2. **Database Optimization**
   - Monitor and optimize slow queries
   - Set up read replicas for high-traffic scenarios
   - Implement connection pooling

3. **Extension Optimization**
   - Minimize API calls where possible
   - Implement client-side caching
   - Optimize image compression before sending

---

## ✅ Post-Deployment Checklist

- [ ] **API Health Check**: All endpoints responding correctly
- [ ] **Database Access**: Tables accessible and RLS working
- [ ] **Authentication Flow**: Google OAuth working end-to-end  
- [ ] **Extension Functions**: Capture and processing working
- [ ] **Google Sheets Sync**: Data syncing to spreadsheets
- [ ] **Error Monitoring**: Proper error logging in place
- [ ] **Performance Testing**: API responding within acceptable limits
- [ ] **Security Audit**: All security measures implemented
- [ ] **Documentation Updated**: All URLs and configs updated

---

## 🎉 Deployment Complete!

Your Bet Tracker Pro is now live on a production-grade serverless architecture:

✅ **Zero server maintenance required**  
✅ **Auto-scaling for any traffic level**  
✅ **Global CDN distribution**  
✅ **Enterprise-grade security**  
✅ **99.99% uptime SLA**  

**Ready for users! 🚀**

---

## 📞 Support & Maintenance

### **Regular Maintenance Tasks**
- Monitor API usage and costs
- Review error logs weekly
- Update dependencies monthly
- Backup database (Supabase handles automatically)
- Review security settings quarterly

### **Scaling Triggers**
- **API Response Time > 2s**: Consider caching or optimization
- **Database CPU > 80%**: Upgrade Supabase plan
- **Monthly Costs > Budget**: Review usage and optimize
- **Error Rate > 1%**: Investigation and fixes needed

**Your serverless architecture scales automatically, but monitoring ensures optimal performance!**