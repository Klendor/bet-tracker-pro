const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const { RateLimiterMemory } = require('rate-limiter-flexible');
const fetch = require('node-fetch');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { google } = require('googleapis');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'your-gemini-api-key-here';
const SESSION_SECRET = process.env.SESSION_SECRET || 'your-session-secret-key';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const EXTENSION_URL = process.env.EXTENSION_URL;

// Middleware
app.use(helmet());
app.use(cors({
  origin: ['chrome-extension://*', 'http://localhost:*', FRONTEND_URL, EXTENSION_URL].filter(Boolean),
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Session configuration for OAuth
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Passport configuration
app.use(passport.initialize());
app.use(passport.session());

// Configure Google OAuth strategy
if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: GOOGLE_REDIRECT_URI
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user exists
      db.get('SELECT * FROM users WHERE google_id = ? OR email = ?', 
        [profile.id, profile.emails[0].value], async (err, existingUser) => {
        if (err) return done(err);
        
        if (existingUser) {
          // Update existing user with Google credentials
          db.run(
            'UPDATE users SET google_id = ?, google_access_token = ?, google_refresh_token = ? WHERE id = ?',
            [profile.id, accessToken, refreshToken, existingUser.id],
            (err) => {
              if (err) return done(err);
              return done(null, { ...existingUser, google_id: profile.id });
            }
          );
        } else {
          // Create new user
          const resetDate = new Date();
          resetDate.setMonth(resetDate.getMonth() + 1, 1);
          
          db.run(
            `INSERT INTO users (email, name, google_id, google_access_token, google_refresh_token, usage_reset_date) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              profile.emails[0].value,
              profile.displayName,
              profile.id,
              accessToken,
              refreshToken,
              resetDate.toISOString()
            ],
            function(err) {
              if (err) return done(err);
              
              const newUser = {
                id: this.lastID,
                email: profile.emails[0].value,
                name: profile.displayName,
                google_id: profile.id,
                plan: 'free',
                usage_count: 0,
                usage_reset_date: resetDate.toISOString()
              };
              
              return done(null, newUser);
            }
          );
        }
      });
    } catch (error) {
      return done(error);
    }
  }));
}

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  db.get('SELECT * FROM users WHERE id = ?', [id], (err, user) => {
    done(err, user);
  });
});

// Rate limiting
const rateLimiter = new RateLimiterMemory({
  keyGenerator: (req) => req.ip,
  points: 100, // Number of requests
  duration: 3600, // Per hour
});

const authLimiter = new RateLimiterMemory({
  keyGenerator: (req) => req.ip,
  points: 10, // Number of auth requests
  duration: 600, // Per 10 minutes
});

// Database setup
const db = new sqlite3.Database('./bet_tracker.db');

// Initialize database tables
db.serialize(() => {
  // Users table with Google OAuth and Sheets integration
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    name TEXT,
    google_id TEXT UNIQUE,
    google_access_token TEXT,
    google_refresh_token TEXT,
    sheets_connected BOOLEAN DEFAULT 0,
    spreadsheet_id TEXT,
    spreadsheet_url TEXT,
    plan TEXT DEFAULT 'free',
    usage_count INTEGER DEFAULT 0,
    usage_reset_date TEXT,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Bets table with enhanced tracking
  db.run(`CREATE TABLE IF NOT EXISTS bets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    teams TEXT,
    sport TEXT,
    bet_type TEXT,
    selection TEXT,
    odds TEXT,
    stake TEXT,
    potential_return TEXT,
    actual_return TEXT,
    profit_loss TEXT,
    roi_percentage TEXT,
    bookmaker TEXT,
    status TEXT DEFAULT 'pending',
    date TEXT,
    settlement_date TEXT,
    confidence TEXT,
    notes TEXT,
    image_hash TEXT,
    synced_to_sheets BOOLEAN DEFAULT 0,
    processed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);

  // Google Sheets sync log
  db.run(`CREATE TABLE IF NOT EXISTS sheets_sync_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    bet_id INTEGER,
    sync_status TEXT,
    error_message TEXT,
    synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (bet_id) REFERENCES bets (id)
  )`);

  // Create demo user for testing (only if no users exist)
  db.get('SELECT COUNT(*) as count FROM users', (err, result) => {
    if (!err && result.count === 0) {
      const hashedPassword = bcrypt.hashSync('demo123', 10);
      const resetDate = new Date();
      resetDate.setMonth(resetDate.getMonth() + 1, 1);
      
      db.run(`INSERT INTO users (email, password_hash, name, plan, usage_count, usage_reset_date) 
              VALUES (?, ?, ?, ?, ?, ?)`, 
        ['demo@bettracker.com', hashedPassword, 'Demo User', 'free', 5, resetDate.toISOString()]);
    }
  });
});

// Middleware for authentication
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Utility functions
const getUserById = (userId) => {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM users WHERE id = ?', [userId], (err, user) => {
      if (err) reject(err);
      else resolve(user);
    });
  });
};

const checkUsageLimit = (user) => {
  const limits = { free: 30, pro: 1000, proplus: 10000 };
  const limit = limits[user.plan] || limits.free;
  return user.usage_count < limit;
};

const resetUsageIfNeeded = (user) => {
  const now = new Date();
  const resetDate = new Date(user.usage_reset_date);
  
  if (now >= resetDate) {
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return {
      ...user,
      usage_count: 0,
      usage_reset_date: nextMonth.toISOString()
    };
  }
  return user;
};

// Google Sheets helper functions
const createGoogleSheetsTemplate = async (user) => {
  try {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({
      access_token: user.google_access_token,
      refresh_token: user.google_refresh_token
    });
    
    const sheets = google.sheets({ version: 'v4', auth });
    const drive = google.drive({ version: 'v3', auth });
    
    // Create new spreadsheet
    const createRequest = {
      resource: {
        properties: {
          title: `Bet Tracker Pro - ${user.name || user.email}`,
          locale: 'en_US',
          timeZone: 'UTC'
        },
        sheets: [
          {
            properties: {
              title: 'Bet Log',
              gridProperties: {
                rowCount: 1000,
                columnCount: 20
              }
            }
          },
          {
            properties: {
              title: 'Monthly Summary',
              gridProperties: {
                rowCount: 50,
                columnCount: 15
              }
            }
          },
          {
            properties: {
              title: 'Analytics Dashboard',
              gridProperties: {
                rowCount: 100,
                columnCount: 10
              }
            }
          },
          {
            properties: {
              title: 'Bankroll Management',
              gridProperties: {
                rowCount: 100,
                columnCount: 10
              }
            }
          },
          {
            properties: {
              title: 'Settings',
              gridProperties: {
                rowCount: 50,
                columnCount: 5
              }
            }
          }
        ]
      }
    };
    
    const spreadsheet = await sheets.spreadsheets.create(createRequest);
    const spreadsheetId = spreadsheet.data.spreadsheetId;
    
    // Set up Bet Log sheet with headers and formulas
    const betLogHeaders = [
      'Date', 'Time', 'Teams/Event', 'Sport', 'League', 'Bet Type', 'Selection', 
      'Odds Format', 'Odds', 'Stake', 'Potential Return', 'Actual Return', 
      'Profit/Loss', 'ROI %', 'Bookmaker', 'Status', 'Settlement Date', 'Notes', 'Confidence'
    ];
    
    const headerRequest = {
      spreadsheetId,
      range: 'Bet Log!A1:S1',
      valueInputOption: 'RAW',
      resource: {
        values: [betLogHeaders]
      }
    };
    
    await sheets.spreadsheets.values.update(headerRequest);
    
    // Add formulas for calculations
    const formulaRequests = {
      spreadsheetId,
      range: 'Bet Log!K2:N2',
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[
          '=IF(J2="","",J2*(I2-1))', // Potential Return
          '', // Actual Return (manual entry)
          '=IF(L2="","",L2-J2)', // Profit/Loss
          '=IF(J2=0,"",M2/J2*100)' // ROI %
        ]]
      }
    };
    
    await sheets.spreadsheets.values.update(formulaRequests);
    
    // Format headers
    const formatRequest = {
      spreadsheetId,
      resource: {
        requests: [
          {
            repeatCell: {
              range: {
                sheetId: 0,
                startRowIndex: 0,
                endRowIndex: 1,
                startColumnIndex: 0,
                endColumnIndex: 19
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.1, green: 0.45, blue: 0.91 },
                  textFormat: {
                    foregroundColor: { red: 1, green: 1, blue: 1 },
                    bold: true
                  }
                }
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat)'
            }
          },
          {
            updateSheetProperties: {
              properties: {
                sheetId: 0,
                gridProperties: {
                  frozenRowCount: 1
                }
              },
              fields: 'gridProperties.frozenRowCount'
            }
          }
        ]
      }
    };
    
    await sheets.spreadsheets.batchUpdate(formatRequest);
    
    // Setup Monthly Summary sheet
    const monthlySummaryData = [
      ['Monthly Performance Overview'],
      [''],
      ['Month', 'Total Bets', 'Bets Won', 'Bets Lost', 'Win Rate %', 'Total Staked', 'Total Returns', 'Net Profit/Loss', 'ROI %'],
      ['=TEXT(TODAY(),"MMM YYYY")', '=COUNTIFS(\'Bet Log\'.A:A,">="&DATE(YEAR(TODAY()),MONTH(TODAY()),1),\'Bet Log\'.A:A,"<"&DATE(YEAR(TODAY()),MONTH(TODAY())+1,1))', '', '', '', '', '', '', '']
    ];
    
    const monthlyRequest = {
      spreadsheetId,
      range: 'Monthly Summary!A1:I4',
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: monthlySummaryData
      }
    };
    
    await sheets.spreadsheets.values.update(monthlyRequest);
    
    // Setup Settings sheet
    const settingsData = [
      ['Bet Tracker Pro Settings'],
      [''],
      ['Setting', 'Value', 'Description'],
      ['Currency', 'USD', 'Default currency for calculations'],
      ['Date Format', 'MM/DD/YYYY', 'Date format preference'],
      ['Timezone', 'UTC', 'Timezone for bet timestamps'],
      ['Auto-sync', 'Enabled', 'Automatic bet synchronization']
    ];
    
    const settingsRequest = {
      spreadsheetId,
      range: 'Settings!A1:C7',
      valueInputOption: 'RAW',
      resource: {
        values: settingsData
      }
    };
    
    await sheets.spreadsheets.values.update(settingsRequest);
    
    const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
    
    return {
      success: true,
      spreadsheetId,
      spreadsheetUrl,
      message: 'Professional bet tracking template created successfully'
    };
    
  } catch (error) {
    console.error('Google Sheets template creation error:', error);
    return {
      success: false,
      error: error.message || 'Failed to create spreadsheet template'
    };
  }
};

const syncBetToSheets = async (user, betData) => {
  try {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({
      access_token: user.google_access_token,
      refresh_token: user.google_refresh_token
    });
    
    const sheets = google.sheets({ version: 'v4', auth });
    
    // Prepare bet data for sheets
    const rowData = [
      betData.date || new Date().toLocaleDateString(),
      betData.time || new Date().toLocaleTimeString(),
      betData.teams || '',
      betData.sport || '',
      betData.league || '',
      betData.bet_type || '',
      betData.selection || '',
      'Decimal', // Default odds format
      betData.odds || '',
      betData.stake || '',
      '', // Potential Return (calculated by formula)
      betData.actual_return || '',
      '', // Profit/Loss (calculated by formula)
      '', // ROI % (calculated by formula)
      betData.bookmaker || '',
      betData.status || 'pending',
      betData.settlement_date || '',
      betData.notes || '',
      betData.confidence || ''
    ];
    
    // Append to Bet Log sheet
    const appendRequest = {
      spreadsheetId: user.spreadsheet_id,
      range: 'Bet Log!A:S',
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      resource: {
        values: [rowData]
      }
    };
    
    await sheets.spreadsheets.values.append(appendRequest);
    
    return {
      success: true,
      message: 'Bet synced to Google Sheets successfully'
    };
    
  } catch (error) {
    console.error('Google Sheets sync error:', error);
    return {
      success: false,
      error: error.message || 'Failed to sync bet to sheets'
    };
  }
};

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ success: true, message: 'Bet Tracker Pro API is running' });
});

// Google OAuth routes
app.get('/auth/google',
  passport.authenticate('google', { scope: [
    'profile', 
    'email',
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive.file'
  ] })
);

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/auth/error' }),
  (req, res) => {
    // Generate JWT token for the user
    const token = jwt.sign(
      { userId: req.user.id, email: req.user.email },
      JWT_SECRET,
      { expiresIn: '30d' }
    );
    
    // Redirect back to extension with token
    if (EXTENSION_URL) {
      res.redirect(`${EXTENSION_URL}/auth-success.html?token=${token}`);
    } else {
      res.json({
        success: true,
        token,
        user: {
          id: req.user.id,
          email: req.user.email,
          name: req.user.name,
          plan: req.user.plan,
          usage_count: req.user.usage_count,
          usage_reset_date: req.user.usage_reset_date,
          sheets_connected: req.user.sheets_connected
        }
      });
    }
  }
);

app.get('/auth/error', (req, res) => {
  res.status(401).json({ success: false, error: 'Authentication failed' });
});

// Google Sheets integration endpoints
app.post('/sheets/authenticate', authenticateToken, async (req, res) => {
  try {
    const user = await getUserById(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    if (user.google_access_token) {
      // User already has Google OAuth tokens
      db.run(
        'UPDATE users SET sheets_connected = 1 WHERE id = ?',
        [user.id],
        (err) => {
          if (err) {
            return res.status(500).json({ success: false, error: 'Failed to update user' });
          }
          res.json({ success: true, message: 'Google Sheets authentication successful' });
        }
      );
    } else {
      // Redirect to Google OAuth
      res.json({ 
        success: false, 
        error: 'Google OAuth required',
        redirect: '/auth/google'
      });
    }
  } catch (error) {
    console.error('Sheets auth error:', error);
    res.status(500).json({ success: false, error: 'Authentication failed' });
  }
});

app.post('/sheets/create-template', authenticateToken, async (req, res) => {
  try {
    const user = await getUserById(req.user.userId);
    if (!user || !user.google_access_token) {
      return res.status(401).json({ success: false, error: 'Google authentication required' });
    }
    
    const result = await createGoogleSheetsTemplate(user);
    
    if (result.success) {
      // Update user with spreadsheet info
      db.run(
        'UPDATE users SET spreadsheet_id = ?, spreadsheet_url = ?, sheets_connected = 1 WHERE id = ?',
        [result.spreadsheetId, result.spreadsheetUrl, user.id],
        (err) => {
          if (err) {
            console.error('Database update error:', err);
            return res.status(500).json({ success: false, error: 'Failed to save spreadsheet info' });
          }
          res.json(result);
        }
      );
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Template creation error:', error);
    res.status(500).json({ success: false, error: 'Template creation failed' });
  }
});

app.get('/sheets/status', authenticateToken, async (req, res) => {
  try {
    const user = await getUserById(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    res.json({
      success: true,
      isAuthenticated: !!user.google_access_token,
      hasSpreadsheet: !!user.spreadsheet_id,
      spreadsheetUrl: user.spreadsheet_url,
      isSetupComplete: !!user.google_access_token && !!user.spreadsheet_id
    });
  } catch (error) {
    console.error('Sheets status error:', error);
    res.status(500).json({ success: false, error: 'Failed to get status' });
  }
});

app.post('/sheets/sync-bet', authenticateToken, async (req, res) => {
  try {
    const { betData } = req.body;
    const user = await getUserById(req.user.userId);
    
    if (!user || !user.spreadsheet_id) {
      return res.status(400).json({ success: false, error: 'Spreadsheet not configured' });
    }
    
    const result = await syncBetToSheets(user, betData);
    res.json(result);
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ success: false, error: 'Sync failed' });
  }
});

app.post('/sheets/disconnect', authenticateToken, (req, res) => {
  db.run(
    'UPDATE users SET sheets_connected = 0, spreadsheet_id = NULL, spreadsheet_url = NULL WHERE id = ?',
    [req.user.userId],
    (err) => {
      if (err) {
        return res.status(500).json({ success: false, error: 'Disconnect failed' });
      }
      res.json({ success: true, message: 'Disconnected from Google Sheets' });
    }
  );
});

// Authentication endpoints
app.post('/auth/register', async (req, res) => {
  try {
    await authLimiter.consume(req.ip);
    
    const { email, password, name } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password required' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const resetDate = new Date();
    resetDate.setMonth(resetDate.getMonth() + 1, 1);

    db.run(
      `INSERT INTO users (email, password_hash, name, usage_reset_date) VALUES (?, ?, ?, ?)`,
      [email, hashedPassword, name || '', resetDate.toISOString()],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ success: false, error: 'Email already registered' });
          }
          return res.status(500).json({ success: false, error: 'Registration failed' });
        }

        const user = {
          id: this.lastID,
          email,
          name: name || '',
          plan: 'free',
          usage_count: 0,
          usage_reset_date: resetDate.toISOString()
        };

        res.json({
          success: true,
          message: 'Account created successfully',
          user
        });
      }
    );
  } catch (error) {
    if (error.remainingPoints === 0) {
      return res.status(429).json({ success: false, error: 'Too many registration attempts' });
    }
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    await authLimiter.consume(req.ip);
    
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password required' });
    }

    db.get(
      'SELECT * FROM users WHERE email = ?',
      [email],
      async (err, user) => {
        if (err || !user) {
          return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
          return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }

        // Reset usage if needed
        const updatedUser = resetUsageIfNeeded(user);
        if (updatedUser.usage_count !== user.usage_count) {
          db.run(
            'UPDATE users SET usage_count = ?, usage_reset_date = ? WHERE id = ?',
            [updatedUser.usage_count, updatedUser.usage_reset_date, user.id]
          );
        }

        const token = jwt.sign(
          { userId: user.id, email: user.email },
          JWT_SECRET,
          { expiresIn: '30d' }
        );

        res.json({
          success: true,
          token,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            plan: user.plan,
            usage_count: updatedUser.usage_count,
            usage_reset_date: updatedUser.usage_reset_date
          }
        });
      }
    );
  } catch (error) {
    if (error.remainingPoints === 0) {
      return res.status(429).json({ success: false, error: 'Too many login attempts' });
    }
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// User info endpoint
app.get('/user/info', authenticateToken, (req, res) => {
  db.get(
    'SELECT * FROM users WHERE id = ?',
    [req.user.userId],
    (err, user) => {
      if (err || !user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      // Reset usage if needed
      const updatedUser = resetUsageIfNeeded(user);
      if (updatedUser.usage_count !== user.usage_count) {
        db.run(
          'UPDATE users SET usage_count = ?, usage_reset_date = ? WHERE id = ?',
          [updatedUser.usage_count, updatedUser.usage_reset_date, user.id]
        );
      }

      const limits = { free: 30, pro: 1000, proplus: 10000 };
      
      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          plan: user.plan,
          usage_count: updatedUser.usage_count,
          usage_limit: limits[user.plan] || limits.free,
          usage_reset_date: updatedUser.usage_reset_date
        }
      });
    }
  );
});

// Bet processing endpoint
app.post('/process-bet', authenticateToken, async (req, res) => {
  try {
    await rateLimiter.consume(req.ip);
    
    const { imageData, selection } = req.body;

    if (!imageData) {
      return res.status(400).json({ success: false, error: 'Image data required' });
    }

    // Get user and check limits
    db.get(
      'SELECT * FROM users WHERE id = ?',
      [req.user.userId],
      async (err, user) => {
        if (err || !user) {
          return res.status(404).json({ success: false, error: 'User not found' });
        }

        // Reset usage if needed
        const updatedUser = resetUsageIfNeeded(user);
        
        // Check usage limit
        if (!checkUsageLimit(updatedUser)) {
          return res.status(402).json({ 
            success: false, 
            error: 'Usage limit exceeded. Please upgrade your plan.',
            code: 'USAGE_LIMIT_EXCEEDED'
          });
        }

        try {
          // Process with Gemini API
          const extractedData = await processWithGemini(imageData);
          
          // Increment usage count
          const newUsageCount = updatedUser.usage_count + 1;
          db.run(
            'UPDATE users SET usage_count = ?, usage_reset_date = ? WHERE id = ?',
            [newUsageCount, updatedUser.usage_reset_date, user.id]
          );

          // Save bet to database
          db.run(
            `INSERT INTO bets (user_id, teams, sport, bet_type, selection, odds, stake, potential_return, bookmaker, date, confidence)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              user.id,
              extractedData.teams,
              extractedData.sport,
              extractedData.bet_type,
              extractedData.selection,
              extractedData.odds,
              extractedData.stake,
              extractedData.potential_return,
              extractedData.bookmaker,
              extractedData.date,
              extractedData.confidence
            ],
            function(err) {
              if (!err) {
                extractedData.id = this.lastID;
              }
            }
          );

          const limits = { free: 30, pro: 1000, proplus: 10000 };
          const limit = limits[user.plan] || limits.free;

          res.json({
            success: true,
            data: extractedData,
            usage: {
              count: newUsageCount,
              limit: limit,
              remaining: limit - newUsageCount
            }
          });

        } catch (error) {
          console.error('Gemini API error:', error);
          res.status(500).json({ 
            success: false, 
            error: 'Failed to process bet slip. Please try again.' 
          });
        }
      }
    );

  } catch (error) {
    if (error.remainingPoints === 0) {
      return res.status(429).json({ success: false, error: 'Rate limit exceeded' });
    }
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Bet history endpoint
app.get('/history', authenticateToken, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const offset = (page - 1) * limit;

  const countQuery = 'SELECT COUNT(*) as total FROM bets WHERE user_id = ?';
  const dataQuery = `SELECT * FROM bets WHERE user_id = ? ORDER BY processed_at DESC LIMIT ? OFFSET ?`;

  db.get(countQuery, [req.user.userId], (err, countResult) => {
    if (err) {
      return res.status(500).json({ success: false, error: 'Database error' });
    }

    db.all(dataQuery, [req.user.userId, limit, offset], (err, bets) => {
      if (err) {
        return res.status(500).json({ success: false, error: 'Database error' });
      }

      const total = countResult.total;
      const pages = Math.ceil(total / limit);

      res.json({
        success: true,
        data: bets,
        pagination: {
          page,
          limit,
          total,
          pages
        }
      });
    });
  });
});

// Upgrade endpoint (placeholder)
app.post('/upgrade', authenticateToken, (req, res) => {
  const { plan } = req.body;
  
  if (!['pro', 'proplus'].includes(plan)) {
    return res.status(400).json({ success: false, error: 'Invalid plan' });
  }

  // In a real implementation, this would integrate with Stripe
  db.run(
    'UPDATE users SET plan = ? WHERE id = ?',
    [plan, req.user.userId],
    function(err) {
      if (err) {
        return res.status(500).json({ success: false, error: 'Upgrade failed' });
      }

      res.json({
        success: true,
        message: 'Plan upgraded successfully',
        subscription: {
          plan: plan,
          status: 'active'
        }
      });
    }
  );
});

// Gemini API integration
async function processWithGemini(imageData) {
  console.log('Processing with Gemini API...');
  console.log('Image data length:', imageData?.length || 'undefined');
  
  if (!GEMINI_API_KEY || GEMINI_API_KEY === 'your-gemini-api-key-here') {
    console.log('Using mock data - no API key configured');
    // Return mock data for development
    return {
      teams: "Lakers vs Warriors",
      sport: "basketball",
      bet_type: "moneyline",
      selection: "Lakers to win",
      odds: "+150",
      stake: "$50",
      potential_return: "$125",
      bookmaker: "DraftKings",
      date: new Date().toISOString().split('T')[0],
      confidence: "high",
      processed_at: new Date().toISOString(),
      processor: "mock-data"
    };
  }

  const base64Image = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
  console.log('Base64 image length after cleanup:', base64Image.length);
  
  const requestBody = {
    contents: [{
      parts: [
        {
          text: `You are an expert at reading betting slips. Analyze this betting slip image and extract the information.

Look for:
- Team names, player names, or event participants
- The sport (football, basketball, tennis, soccer, etc.)
- Type of bet (moneyline, point spread, over/under, props, etc.)
- What exactly is being bet on (team to win, score over/under, etc.)
- Odds in any format (+150, -110, 2.50, etc.)
- Stake/bet amount with currency symbol
- Potential payout/return amount
- Bookmaker/sportsbook name
- Date of game or bet placement

Return ONLY valid JSON with these exact field names:
{
  "teams": "Team A vs Team B or Player vs Player",
  "sport": "basketball/football/tennis/soccer/etc",
  "bet_type": "moneyline/spread/total/prop/etc",
  "selection": "exactly what is being bet on",
  "odds": "odds in original format",
  "stake": "bet amount with currency",
  "potential_return": "payout amount with currency",
  "bookmaker": "betting site name",
  "date": "YYYY-MM-DD format",
  "confidence": "high/medium/low"
}

If you cannot clearly read any field from the image, set it to "unknown". Do not guess or make up information. Return ONLY the JSON object, no other text or explanation.`
        },
        {
          inline_data: {
            mime_type: "image/png",
            data: base64Image
          }
        }
      ]
    }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 800,
      topP: 0.95
    }
  };

  console.log('Sending request to Gemini API...');
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('Gemini API error:', response.status, errorData);
    throw new Error(`Gemini API error: ${errorData.error?.message || response.statusText}`);
  }

  const data = await response.json();
  console.log('Gemini API response received:', JSON.stringify(data, null, 2));
  
  if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
    console.error('Invalid Gemini response structure:', data);
    throw new Error('Invalid response from Gemini API');
  }

  const text = data.candidates[0].content.parts[0].text;
  console.log('Gemini response text:', text);
  
  // Parse JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error('No JSON found in Gemini response:', text);
    throw new Error('No JSON found in response');
  }

  let extractedData;
  try {
    extractedData = JSON.parse(jsonMatch[0]);
    console.log('Parsed extracted data:', extractedData);
  } catch (parseError) {
    console.error('JSON parse error:', parseError, 'Text:', jsonMatch[0]);
    throw new Error('Invalid JSON in response');
  }
  
  // Add metadata
  extractedData.processed_at = new Date().toISOString();
  extractedData.processor = 'gemini-1.5-flash';

  return extractedData;
}

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Bet Tracker Pro API running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔑 Demo credentials: demo@bettracker.com / demo123`);
});

module.exports = app;