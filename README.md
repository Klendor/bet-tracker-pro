# Bet Tracker Pro - Complete SaaS System

🎯 **Automatically extract and track betting slips with AI vision technology**

A complete SaaS solution with Chrome extension frontend and Node.js backend that uses Google's Gemini AI to automatically extract bet details from screenshots and manage user subscriptions.

## 🚀 Quick Start

```bash
# 1. Run the setup script
./setup.sh

# 2. Install the Chrome extension
# - Go to chrome://extensions/
# - Enable Developer mode
# - Click "Load unpacked" and select this directory

# 3. Test with demo account
# - Click extension icon
# - Sign in with: demo@bettracker.com / demo123
# - Go to any betting site and capture a bet slip
```

## 🏗️ Architecture

```
🌐 Chrome Extension (Frontend)
    │
    │ REST API calls
    ↓
🚀 Node.js Backend (API Server)
    │
    ├── 🤖 Gemini AI API (Image Processing)
    ├── 💾 SQLite Database (User Data)
    ├── 🔐 JWT Authentication
    └── 💳 Subscription Management
```

### Components

- **Chrome Extension**: User interface and screenshot capture
- **Backend API**: Handles authentication, AI processing, and data storage
- **Database**: SQLite for development, easily upgradeable to PostgreSQL
- **AI Processing**: Google Gemini Vision API for bet slip extraction
- **Authentication**: JWT-based with bcrypt password hashing

## 🚀 Features

### SaaS Business Model
- **No API Keys Required**: Users don't need to configure anything
- **Freemium Plans**: 30/1000/10000 monthly bet limits
- **Professional Service**: You handle all AI costs and provide reliable service
- **Easy Monetization**: Built-in subscription management

### Technical Features

- **AI-Powered Extraction**: Uses Gemini Vision AI to read bet slips from any betting site
- **Smart Selection Tool**: Click and drag to select bet slip areas with precision
- **Freemium Model**: 30 free bets/month, Pro (1,000), Pro Plus (10,000)
- **Universal Compatibility**: Works on any betting website layout
- **Local Data Storage**: Bet history stored securely in your browser
- **Usage Tracking**: Built-in quota management and upgrade prompts
- **Privacy First**: Screenshots processed securely, no data stored on servers

## 📋 What It Extracts

The AI automatically identifies and extracts:
- **Teams/Players**: Match participants
- **Sport**: Football, basketball, tennis, etc.
- **Bet Type**: Moneyline, spread, total, etc.
- **Selection**: Your specific bet choice
- **Odds**: Betting odds in any format
- **Stake**: Your bet amount
- **Potential Return**: Expected payout
- **Bookmaker**: Betting site name
- **Date**: When the bet was placed

## 🛠️ Installation

### 1. Download the Extension
Clone or download this repository to your computer.

### 2. Get Gemini API Key
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated key

### 3. Install in Chrome
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `bet-tracker-extension` folder
5. The extension will appear in your toolbar

### 4. Configure API Key
1. Click the extension icon
2. Follow the setup wizard to enter your Gemini API key
3. The welcome page will guide you through the process

## 💰 Pricing & Plans

| Plan | Price | Monthly Bets | Best For |
|------|-------|--------------|----------|
| **Free** | $0 | 30 bets | Casual bettors |
| **Pro** | $9.99 | 1,000 bets | Regular bettors |
| **Pro Plus** | $29.99 | 10,000 bets | Professional bettors |

**API Costs**: ~$0.001-0.002 per bet slip (covered in your plan pricing)

## 📱 How to Use

### Step 1: Navigate to Any Betting Site
Open any sportsbook or betting website in your browser.

### Step 2: Click Extension Icon
Click the Bet Tracker Pro icon in your Chrome toolbar.

### Step 3: Capture Bet Slip
1. Click "📸 Capture Bet Slip" button
2. Your screen will dim with selection overlay
3. Click and drag to select the bet slip area
4. Click "Capture" to confirm

### Step 4: AI Processing
The AI will automatically extract all bet details from your selection.

### Step 5: Review & Save
Extracted data is automatically saved to your bet history.

## 🏗️ Technical Architecture

```
Browser Extension
├── Popup UI (React-like vanilla JS)
├── Content Script (Screenshot capture)
├── Background Service Worker
├── Gemini Vision API Integration
└── Local Storage System
```

### Key Components

- **Manifest V3**: Modern Chrome extension architecture
- **Content Scripts**: Injected for screenshot capture
- **Service Worker**: Handles API communication
- **Local Storage**: Bet history and user preferences
- **Gemini AI**: Google's vision model for text extraction

## 🔧 Configuration

### API Keys Setup
Copy `config/config-template.js` to `config/config.js` and add your keys:

```javascript
const CONFIG = {
  GEMINI_API_KEY: 'your-gemini-api-key-here',
  // ... other settings
};
```

### Supported Betting Sites
The extension works on any betting site, including:
- Bet365
- DraftKings  
- FanDuel
- Caesars
- BetMGM
- PointsBet
- Unibet
- William Hill
- And many more...

## 📊 Data Format

Extracted bet data follows this structure:

```json
{
  "teams": "Lakers vs Warriors",
  "sport": "basketball",
  "bet_type": "moneyline",
  "selection": "Lakers to win",
  "odds": "+150",
  "stake": "$50",
  "potential_return": "$125",
  "bookmaker": "DraftKings",
  "date": "2024-01-15",
  "confidence": "high",
  "processed_at": "2024-01-15T10:30:00Z"
}
```

## 🔒 Privacy & Security

- **No Data Uploads**: Screenshots processed locally or via secure API
- **Local Storage**: All bet history stored in your browser
- **API Security**: Gemini API calls use HTTPS encryption
- **No Tracking**: No user analytics or tracking scripts
- **Optional Sync**: Google Sheets integration is completely optional

## 🚨 Troubleshooting

### Common Issues

**Extension not loading bets:**
- Check API key is correctly entered
- Verify you have remaining monthly quota
- Ensure betting site allows screenshots

**Selection tool not working:**
- Try refreshing the page
- Check browser permissions
- Disable other screenshot extensions

**AI extraction errors:**
- Ensure bet slip is clearly visible
- Try selecting a smaller, focused area
- Check internet connection for API calls

### Error Messages

| Error | Solution |
|-------|----------|
| "API key not configured" | Add Gemini API key in settings |
| "Usage limit exceeded" | Upgrade plan or wait for monthly reset |
| "Failed to capture" | Refresh page and try again |
| "Invalid selection" | Select a larger area with clear text |

## 🔄 Updates & Roadmap

### Current Version: 1.0.0
- ✅ Core AI extraction functionality
- ✅ Freemium usage tracking
- ✅ Local data storage
- ✅ Multi-site compatibility

### Planned Features
- 🔄 Google Sheets auto-sync
- 🔄 Payment processing (Stripe)
- 🔄 Enhanced user authentication
- 🔄 Bet analysis dashboard
- 🔄 Export functionality (CSV, PDF)
- 🔄 Mobile app companion

## 💡 Tips for Best Results

1. **Clear Screenshots**: Ensure bet slips are clearly visible and not cut off
2. **Minimal Selection**: Select just the bet slip area, avoid extra content
3. **Good Lighting**: Screenshots work better with good contrast
4. **Stable Internet**: API calls need reliable connection
5. **Updated Browser**: Use latest Chrome version for best compatibility

## 🤝 Contributing

This is a commercial product, but feedback and suggestions are welcome!

### Bug Reports
Please include:
- Browser version
- Extension version
- Steps to reproduce
- Screenshots if applicable

### Feature Requests
Open an issue with:
- Detailed description
- Use case explanation
- Expected behavior

## 📄 License

Copyright © 2024 Bet Tracker Pro. All rights reserved.

This software is proprietary. Unauthorized copying, distribution, or modification is prohibited.

## 📞 Support

- **Email**: support@bettrackerpro.com
- **Documentation**: [Coming Soon]
- **FAQ**: [Coming Soon]

## 🏆 Why Choose Bet Tracker Pro?

✅ **Accuracy**: AI vision beats manual entry every time  
✅ **Speed**: Process bets in seconds, not minutes  
✅ **Universal**: Works on any betting site  
✅ **Privacy**: Your data stays private  
✅ **Affordable**: Plans start at free  
✅ **Reliable**: Built with modern web technologies  

---

**Ready to revolutionize your bet tracking?** Install Bet Tracker Pro today and never manually enter bet details again! 🎯