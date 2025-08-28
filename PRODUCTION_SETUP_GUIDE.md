# 🚀 Bet Tracker Pro - Production Setup Guide

## 📋 Prerequisites

Before setting up Bet Tracker Pro for real users, you'll need:

1. **Google Cloud Project** for OAuth and Google Sheets API
2. **Gemini AI API Key** for bet slip processing
3. **Domain/Server** for hosting the backend
4. **SSL Certificate** for HTTPS (required for Chrome extensions)
5. **Stripe Account** (optional - for payments)

## 🔧 Step 1: Google Cloud Console Setup

### 1.1 Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project: \"Bet Tracker Pro\"
3. Enable the following APIs:
   - Google Sheets API
   - Google Drive API
   - Google Identity API

### 1.2 Configure OAuth Consent Screen
1. Go to **APIs & Services** > **OAuth consent screen**
2. Choose **External** user type
3. Fill in application details:
   - **App name**: Bet Tracker Pro
   - **User support email**: your-email@domain.com
   - **App logo**: Upload your extension icon
   - **Developer contact**: your-email@domain.com
4. Add scopes:
   - `https://www.googleapis.com/auth/spreadsheets`
   - `https://www.googleapis.com/auth/drive.file`
   - `profile`
   - `email`
5. Add test users (for testing phase)

### 1.3 Create OAuth Credentials
1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth 2.0 Client ID**
3. Application type: **Web application**
4. Name: \"Bet Tracker Pro Backend\"
5. **Authorized redirect URIs**:
   - `https://yourdomain.com/auth/google/callback`
   - `http://localhost:3000/auth/google/callback` (for testing)
6. Save the **Client ID** and **Client Secret**

## 🧠 Step 2: Gemini AI API Setup

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click **Create API Key**
4. Copy the generated API key
5. **Important**: Keep this key secure and never expose it in client-side code

## 🏗️ Step 3: Backend Deployment

### 3.1 Environment Configuration

1. Copy the environment template:
```bash
cp backend/.env.example backend/.env
```

2. Edit `backend/.env` with your values:
```env
# Server Configuration
PORT=3000
NODE_ENV=production

# Security
JWT_SECRET=your-super-secret-jwt-key-change-this-to-something-very-secure
SESSION_SECRET=your-session-secret-key-for-oauth-flow

# Gemini AI API Key
GEMINI_API_KEY=your-gemini-api-key-from-google-ai-studio

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://yourdomain.com/auth/google/callback

# Database Configuration
DB_PATH=./bet_tracker.db

# CORS Origins (Update with your extension ID and domain)
CORS_ORIGINS=chrome-extension://your-extension-id,https://yourdomain.com

# Frontend URLs
FRONTEND_URL=https://yourdomain.com
EXTENSION_URL=chrome-extension://your-extension-id

# Production Security
SECURE_COOKIES=true
HTTPS_ONLY=true
```

### 3.2 Deploy to Production Server

#### Option A: Traditional VPS/Server
```bash
# On your server
git clone your-repo-url
cd bet-tracker-extension/backend
npm install --production
npm start
```

#### Option B: Docker Deployment
```dockerfile
# Create Dockerfile in backend/
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD [\"npm\", \"start\"]
```

#### Option C: Cloud Platforms
- **Railway**: Connect GitHub repo, auto-deploy
- **Render**: Connect GitHub repo, add environment variables
- **Heroku**: Use heroku CLI to deploy
- **DigitalOcean App Platform**: Connect GitHub repo

### 3.3 SSL/HTTPS Setup

**Required for Chrome extensions in production!**

```bash
# Using Let's Encrypt with Certbot
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

## 🔌 Step 4: Chrome Extension Configuration

### 4.1 Get Extension ID
1. Load the extension in Chrome (Developer mode)
2. Copy the extension ID from `chrome://extensions/`
3. This ID will be consistent if you use a `key` in manifest.json

### 4.2 Update Manifest.json
```json
{
  \"oauth2\": {
    \"client_id\": \"YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com\",
    \"scopes\": [
      \"https://www.googleapis.com/auth/spreadsheets\",
      \"https://www.googleapis.com/auth/drive.file\",
      \"profile\",
      \"email\"
    ]
  },
  \"key\": \"YOUR_EXTENSION_KEY_FOR_CONSISTENT_ID\"
}
```

### 4.3 Update Backend Configuration
Edit `config/backend-config.js`:
```javascript
const BACKEND_CONFIG = {
  PRODUCTION: {
    BASE_URL: 'https://api.yourdomain.com',
    // ... other config
  },
  ENVIRONMENT: 'PRODUCTION' // Change from DEVELOPMENT
};
```

### 4.4 Update Google Cloud Console
1. Add your extension ID to **Authorized JavaScript origins**:
   `chrome-extension://your-extension-id`
2. Update OAuth consent screen with production domain

## 🧪 Step 5: Testing the Setup

### 5.1 Backend Health Check
```bash
curl https://api.yourdomain.com/health
# Should return: {\"success\":true,\"message\":\"Bet Tracker Pro API is running\"}
```

### 5.2 OAuth Flow Test
1. Load extension in Chrome
2. Click \"Sign In\" button
3. Should redirect to Google OAuth
4. After authorization, should return to extension
5. Check Google Sheets mandatory setup flow

### 5.3 Bet Processing Test
1. Sign in to extension
2. Complete Google Sheets setup
3. Capture a test bet slip image
4. Verify data extraction and Google Sheets sync

## 📊 Step 6: Monitoring and Analytics

### 6.1 Backend Logging
```javascript
// Add to server.js
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

### 6.2 Usage Analytics
- Track user registrations
- Monitor API usage by plan
- Track bet processing success rates
- Monitor Google Sheets sync failures

### 6.3 Error Monitoring
- Set up error alerting (email/Slack)
- Monitor Gemini API quota usage
- Track authentication failures

## 💳 Step 7: Payment Integration (Optional)

### 7.1 Stripe Setup
1. Create Stripe account
2. Get publishable and secret keys
3. Set up webhook endpoints
4. Configure subscription plans

### 7.2 Add to Backend
```javascript
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Subscription creation endpoint
app.post('/create-subscription', authenticateToken, async (req, res) => {
  // Stripe subscription logic
});
```

## 🚀 Step 8: Chrome Web Store Submission

### 8.1 Prepare for Submission
1. Update manifest version
2. Create store listing screenshots
3. Write compelling description
4. Add privacy policy link
5. Complete store listing form

### 8.2 Store Listing Requirements
- **Privacy Policy**: Required for extensions with user data
- **Screenshots**: Show the extension in action
- **Description**: Highlight key features and benefits
- **Categories**: Productivity, Developer Tools
- **Permissions Justification**: Explain why each permission is needed

## 🔒 Step 9: Security Considerations

### 9.1 Backend Security
- Use HTTPS everywhere
- Implement rate limiting
- Validate all user inputs
- Use environment variables for secrets
- Regular security updates

### 9.2 Extension Security
- Minimize permissions
- Content Security Policy
- No inline scripts
- Secure API communications

### 9.3 Data Privacy
- GDPR compliance (if applicable)
- Clear privacy policy
- User data deletion capabilities
- Secure data transmission

## 📋 Step 10: Go-Live Checklist

### Backend
- [ ] Environment variables configured
- [ ] SSL certificate installed
- [ ] Database backups configured
- [ ] Error monitoring setup
- [ ] Health checks working
- [ ] Google OAuth tested
- [ ] Gemini API quota sufficient

### Extension
- [ ] Production backend URL configured
- [ ] Google Client ID updated
- [ ] Manifest permissions minimal
- [ ] Testing completed
- [ ] Screenshots taken
- [ ] Store listing prepared

### Legal/Compliance
- [ ] Privacy policy created
- [ ] Terms of service created
- [ ] GDPR compliance (if applicable)
- [ ] Payment processing setup (if applicable)

## 🎯 Success Metrics

### Technical KPIs
- API response time < 2 seconds
- Bet processing accuracy > 95%
- Google Sheets sync success > 98%
- Authentication success rate > 99%

### Business KPIs
- User conversion rate (free to paid)
- Monthly active users
- Average bets per user
- Customer satisfaction score

## 🆘 Troubleshooting

### Common Issues

1. **OAuth Redirect Mismatch**
   - Check redirect URIs in Google Cloud Console
   - Ensure HTTPS in production

2. **Extension ID Changes**
   - Use `key` field in manifest.json
   - Update Google Cloud Console with new ID

3. **CORS Errors**
   - Add extension ID to CORS_ORIGINS
   - Check protocol (http vs https)

4. **Gemini API Quota**
   - Monitor usage in Google AI Studio
   - Implement caching for common patterns

5. **Google Sheets Permissions**
   - Check OAuth scopes
   - Verify API is enabled

## 📞 Support

For production deployment support:
- Create detailed error logs
- Include environment configuration
- Provide steps to reproduce issues
- Check browser console for errors

---

**🎉 Congratulations!** Your Bet Tracker Pro extension is now ready for real users with:
- ✅ Professional Google OAuth integration
- ✅ Real Google Sheets API connectivity
- ✅ Secure backend with Gemini AI processing
- ✅ Mandatory Google Sheets onboarding
- ✅ Production-ready architecture

Your users will now get a truly professional betting tracking experience with standardized spreadsheet templates and seamless data synchronization!