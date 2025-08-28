// Configuration file for Bet Tracker Pro
// Copy this file to config.js and add your API keys

const CONFIG = {
  // Gemini API Configuration
  GEMINI_API_KEY: 'AIzaSyBCfWV_yRqkKcwVonUXDGV4S7D3YtId7yo', // Get from https://aistudio.google.com/app/apikey
  GEMINI_MODEL: 'gemini-1.5-flash',
  
  // Google Sheets API Configuration (Optional - for direct integration)
  GOOGLE_SHEETS_API_KEY: 'YOUR_GOOGLE_SHEETS_API_KEY_HERE',
  GOOGLE_CLIENT_ID: 'YOUR_GOOGLE_CLIENT_ID_HERE',
  GOOGLE_CLIENT_SECRET: 'YOUR_GOOGLE_CLIENT_SECRET_HERE',
  
  // Default Settings
  DEFAULT_PLAN: 'free',
  PLAN_LIMITS: {
    free: 30,
    pro: 1000,
    proplus: 10000
  },
  
  // Processing Settings
  IMAGE_QUALITY: 0.8,
  MAX_IMAGE_SIZE: 2 * 1024 * 1024, // 2MB
  TIMEOUT_MS: 30000, // 30 seconds
  
  // UI Settings
  THEME: 'light',
  NOTIFICATIONS: true,
  AUTO_CLOSE_POPUP: true,
  
  // Supported Betting Sites (for enhanced recognition)
  SUPPORTED_SITES: [
    'bet365.com',
    'draftkings.com',
    'fanduel.com',
    'caesars.com',
    'betmgm.com',
    'pointsbet.com',
    'unibet.com',
    'williamhill.com'
  ],
  
  // Data Fields for Extraction
  EXTRACTION_FIELDS: {
    required: ['teams', 'odds', 'stake'],
    optional: ['sport', 'bet_type', 'selection', 'potential_return', 'bookmaker', 'date'],
    confidence_threshold: 0.7
  }
};

// Setup Instructions
const SETUP_INSTRUCTIONS = {
  gemini_api: {
    title: "Setup Gemini API Key",
    steps: [
      "1. Go to https://aistudio.google.com/app/apikey",
      "2. Sign in with your Google account",
      "3. Click 'Create API Key'",
      "4. Copy the generated API key",
      "5. Replace 'YOUR_GEMINI_API_KEY_HERE' in config.js with your key"
    ],
    cost: "~$0.001-0.002 per bet slip"
  },
  
  google_sheets: {
    title: "Setup Google Sheets Integration (Optional)",
    steps: [
      "1. Go to https://console.developers.google.com/",
      "2. Create a new project or select existing",
      "3. Enable Google Sheets API",
      "4. Create credentials (OAuth 2.0)",
      "5. Add your domain to authorized origins",
      "6. Copy client ID and secret to config.js"
    ],
    note: "Basic logging works without this - data saved locally"
  },
  
  installation: {
    title: "Install Extension",
    steps: [
      "1. Open Chrome and go to chrome://extensions/",
      "2. Enable 'Developer mode' in top right",
      "3. Click 'Load unpacked'",
      "4. Select the bet-tracker-extension folder",
      "5. Extension should appear in your toolbar"
    ]
  }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CONFIG, SETUP_INSTRUCTIONS };
}