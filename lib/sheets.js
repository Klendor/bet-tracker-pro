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
              gridProperties: { rowCount: 1000, columnCount: 20 }
            }
          },
          {
            properties: {
              title: 'Monthly Summary',
              gridProperties: { rowCount: 50, columnCount: 15 }
            }
          }
        ]
      }
    };
    
    const spreadsheet = await sheets.spreadsheets.create(createRequest);
    const spreadsheetId = spreadsheet.data.spreadsheetId;
    
    // Set up headers
    const betLogHeaders = [
      'Date', 'Teams/Event', 'Sport', 'League', 'Bet Type', 'Selection', 
      'Odds', 'Stake', 'Potential Return', 'Actual Return', 
      'Profit/Loss', 'ROI %', 'Bookmaker', 'Status', 'Notes', 'Confidence'
    ];
    
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Bet Log!A1:P1',
      valueInputOption: 'RAW',
      resource: { values: [betLogHeaders] }
    });
    
    const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
    
    return {
      success: true,
      spreadsheetId,
      spreadsheetUrl,
      message: 'Bet tracking template created successfully'
    };
    
  } catch (error) {
    console.error('Google Sheets template creation error:', error);
    return {
      success: false,
      error: error.message || 'Failed to create spreadsheet template'
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
    
    // Prepare bet data for sheets
    const rowData = [
      betData.date || new Date().toLocaleDateString(),
      betData.teams || '',
      betData.sport || '',
      betData.league || '',
      betData.bet_type || '',
      betData.selection || '',
      betData.odds || '',
      betData.stake || '',
      betData.potential_return || '',
      betData.actual_return || '',
      '', // Profit/Loss (calculated)
      '', // ROI % (calculated)
      betData.bookmaker || '',
      betData.status || 'pending',
      betData.notes || '',
      betData.confidence || ''
    ];
    
    console.log('📊 Prepared row data for sheets:', rowData);
    
    // Append to Bet Log sheet
    console.log('📊 Attempting to append data to spreadsheet...');
    const appendResult = await sheets.spreadsheets.values.append({
      spreadsheetId: user.spreadsheet_id,
      range: 'Bet Log!A:P',
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