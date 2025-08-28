// Google Sheets utilities for Express.js application
import { google } from 'googleapis';

export const createGoogleSheetsTemplate = async (user) => {
  try {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({
      access_token: user.google_access_token,
      refresh_token: user.google_refresh_token
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
    const auth = new google.auth.OAuth2();
    auth.setCredentials({
      access_token: user.google_access_token,
      refresh_token: user.google_refresh_token
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
    
    // Append to Bet Log sheet
    await sheets.spreadsheets.values.append({
      spreadsheetId: user.spreadsheet_id,
      range: 'Bet Log!A:P',
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      resource: { values: [rowData] }
    });
    
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