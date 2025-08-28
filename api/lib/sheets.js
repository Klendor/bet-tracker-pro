// Google Sheets utilities for serverless functions
import { google } from 'googleapis';

export const createGoogleSheetsTemplate = async (user) => {
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