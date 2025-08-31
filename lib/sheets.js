// Google Sheets utilities for Express.js application
import { google } from 'googleapis';

export const createGoogleSheetsTemplate = async (user) => {
  try {
    console.log('📊 Creating Google Sheets template for user:', user.email);
    
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    
    auth.setCredentials({
      access_token: user.google_access_token,
      refresh_token: user.google_refresh_token
    });
    
    // Set up token refresh handler
    auth.on('tokens', (tokens) => {
      console.log('📊 Google tokens refreshed in template creation:', !!tokens.access_token);
    });
    
    const sheets = google.sheets({ version: 'v4', auth });
    
    // Create a new spreadsheet from scratch
    console.log('📊 Creating new spreadsheet...');
    const createResponse = await sheets.spreadsheets.create({
      resource: {
        properties: {
          title: `Bet Tracker Pro - ${user.name || user.email}`,
          locale: 'en_US',
          timeZone: 'America/New_York'
        },
        sheets: [
          {
            properties: {
              sheetId: 0,
              title: 'Bet Tracker',
              gridProperties: {
                rowCount: 1000,
                columnCount: 21
              }
            }
          },
          {
            properties: {
              sheetId: 1,
              title: 'Dashboard',
              gridProperties: {
                rowCount: 100,
                columnCount: 10
              }
            }
          },
          {
            properties: {
              sheetId: 2,
              title: 'Settings',
              gridProperties: {
                rowCount: 50,
                columnCount: 5
              }
            }
          }
        ]
      }
    });
    
    const spreadsheetId = createResponse.data.spreadsheetId;
    console.log('📊 Spreadsheet created successfully. ID:', spreadsheetId);
    
    // Set up the header row in Bet Tracker sheet
    const headers = [
      'ID', 'Status', 'Match DateTime', 'Sport', 'Teams/Event', 'Market', 'Selection',
      'Odds', 'Stake', 'Potential Return', 'Return', 'P/L', 'Bookmaker', 'Type',
      'Added', 'Days Pending', 'Delete', 'Bet URL', 'Original Data', 'Last Modified', 'Duplicate Check'
    ];
    
    // Add headers and initial formatting
    const requests = [
      // Add headers
      {
        updateCells: {
          range: {
            sheetId: 0,
            startRowIndex: 0,
            endRowIndex: 1,
            startColumnIndex: 0,
            endColumnIndex: headers.length
          },
          rows: [{
            values: headers.map(header => ({
              userEnteredValue: { stringValue: header },
              userEnteredFormat: {
                backgroundColor: { red: 0.2, green: 0.2, blue: 0.2 },
                textFormat: {
                  foregroundColor: { red: 1, green: 1, blue: 1 },
                  fontSize: 10,
                  bold: true
                },
                horizontalAlignment: 'CENTER',
                verticalAlignment: 'MIDDLE'
              }
            }))
          }],
          fields: 'userEnteredValue,userEnteredFormat'
        }
      },
      // Freeze header row
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
      },
      // Set column widths
      {
        updateDimensionProperties: {
          range: {
            sheetId: 0,
            dimension: 'COLUMNS',
            startIndex: 0,
            endIndex: headers.length
          },
          properties: {
            pixelSize: 120
          },
          fields: 'pixelSize'
        }
      },
      // Set specific column widths for important columns
      {
        updateDimensionProperties: {
          range: {
            sheetId: 0,
            dimension: 'COLUMNS',
            startIndex: 0, // ID column
            endIndex: 1
          },
          properties: {
            pixelSize: 60
          },
          fields: 'pixelSize'
        }
      },
      {
        updateDimensionProperties: {
          range: {
            sheetId: 0,
            dimension: 'COLUMNS',
            startIndex: 4, // Teams/Event column
            endIndex: 5
          },
          properties: {
            pixelSize: 200
          },
          fields: 'pixelSize'
        }
      }
    ];
    
    // Apply the formatting
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: { requests }
    });
    
    console.log('📊 Spreadsheet formatted successfully');
    
    const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
    
    return {
      success: true,
      spreadsheetId,
      spreadsheetUrl,
      message: 'Bet tracking spreadsheet created successfully'
    };
    
  } catch (error) {
    console.error('Google Sheets creation error:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to create spreadsheet';
    
    if (error.code === 403) {
      errorMessage = 'Permission denied. Please ensure Google Sheets API is enabled.';
    } else if (error.code === 401) {
      errorMessage = 'Authentication failed. Please reconnect your Google account.';
    } else if (error.message?.includes('UNAUTHENTICATED')) {
      errorMessage = 'Google authentication expired. Please sign in again.';
    }
    
    return {
      success: false,
      error: errorMessage,
      details: error.message
    };
  }
};

export const syncBetToSheets = async (user, betData) => {
  try {
    // Validate required data
    if (!user.spreadsheet_id) {
      throw new Error('No spreadsheet connected. Please set up Google Sheets integration first.');
    }
    
    if (!user.google_access_token || !user.google_refresh_token) {
      throw new Error('Google authentication required. Please reconnect your Google account.');
    }
    
    console.log('📊 Starting Google Sheets sync for user:', user.email);
    console.log('📊 Spreadsheet ID:', user.spreadsheet_id);
    console.log('📊 Bet data to sync:', betData);
    
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    
    auth.setCredentials({
      access_token: user.google_access_token,
      refresh_token: user.google_refresh_token
    });
    
    // Set up token refresh handler
    auth.on('tokens', (tokens) => {
      console.log('📊 Google tokens refreshed:', !!tokens.access_token);
      // Note: In a real implementation, you'd update the database with new tokens
    });
    
    const sheets = google.sheets({ version: 'v4', auth });
    
    // Prepare bet data for sheets matching the new template structure
    // Columns: ID, Status, Match DateTime, Sport, Teams/Event, Market, Selection, 
    // Odds, Stake, Potential Return, Return, P/L, Bookmaker, Type, Added, Days Pending, Delete,
    // Bet URL, Original Data, Last Modified, Duplicate Check
    
    const now = new Date();
    const matchDateTime = betData.match_datetime || betData.date || now.toLocaleString();
    
    const rowData = [
      '', // ID (auto-generated by formula)
      betData.status?.toUpperCase() || 'PENDING', // Status
      matchDateTime, // Match DateTime
      betData.sport || '', // Sport
      betData.teams || betData.event || '', // Teams/Event
      betData.market || betData.bet_type || 'Other', // Market
      betData.selection || '', // Selection
      betData.odds || '', // Odds
      betData.stake || '', // Stake
      '', // Potential Return (calculated by formula)
      betData.actual_return || '', // Return (for cash outs)
      '', // P/L (calculated by formula)
      betData.bookmaker || '', // Bookmaker
      betData.is_live ? 'LIVE' : 'PRE-MATCH', // Type
      now.toLocaleString(), // Added
      '', // Days Pending (calculated by formula)
      false, // Delete
      betData.bet_url || '', // Bet URL
      JSON.stringify(betData), // Original Data
      now.toLocaleString(), // Last Modified
      '' // Duplicate Check (calculated by formula)
    ];
    
    console.log('📊 Prepared row data for sheets:', rowData);
    
    // Append to Bet Tracker sheet (main sheet name in your template)
    console.log('📊 Attempting to append data to spreadsheet...');
    const appendResult = await sheets.spreadsheets.values.append({
      spreadsheetId: user.spreadsheet_id,
      range: 'Bet Tracker!A:U', // Updated to match all 21 columns
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      resource: { values: [rowData] }
    });
    
    console.log('📊 Google Sheets append successful:', appendResult.data);
    
    return {
      success: true,
      message: 'Bet synced to Google Sheets successfully',
      appendedRange: appendResult.data.updates?.updatedRange
    };
    
  } catch (error) {
    console.error('🚫 Google Sheets sync error details:', {
      message: error.message,
      code: error.code,
      status: error.status,
      statusText: error.statusText,
      response: error.response?.data
    });
    
    // Provide specific error messages based on error type
    let userFriendlyError = 'Failed to sync bet to sheets';
    
    if (error.code === 401 || error.message.includes('unauthorized') || error.message.includes('invalid_grant')) {
      userFriendlyError = 'Google authentication expired. Please reconnect your Google account.';
    } else if (error.code === 403) {
      userFriendlyError = 'Permission denied. Please check spreadsheet sharing settings.';
    } else if (error.code === 404) {
      userFriendlyError = 'Spreadsheet not found. It may have been deleted or moved.';
    } else if (error.message.includes('spreadsheet_id')) {
      userFriendlyError = 'Invalid spreadsheet configuration. Please reconnect Google Sheets.';
    }
    
    return {
      success: false,
      error: userFriendlyError,
      details: error.message
    };
  }
};