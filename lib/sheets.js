// Google Sheets utilities for Express.js application
import { google } from 'googleapis';

export const createGoogleSheetsTemplate = async (user) => {
  try {
    console.log('📊 Creating spreadsheet for user:', user.email);
    
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
    });
    
    const sheets = google.sheets({ version: 'v4', auth });
    const TEMPLATE_ID = '1xsvxK5uYVQRupUarXxF_s44h-j_l7yndWMN0rbZIOck';
    
    let spreadsheetId;
    let method = 'template';
    
    try {
      // Method 1: Try to copy using Drive API first
      const drive = google.drive({ version: 'v3', auth });
      console.log('📊 Attempting Drive API copy of template:', TEMPLATE_ID);
      
      const copyRequest = {
        fileId: TEMPLATE_ID,
        requestBody: {
          name: `Bet Tracker Pro - ${user.name || user.email}`,
          parents: []
        },
        supportsAllDrives: true
      };
      
      const copiedFile = await drive.files.copy(copyRequest);
      spreadsheetId = copiedFile.data.id;
      console.log('📊 Template copied successfully via Drive API. New spreadsheet ID:', spreadsheetId);
      
    } catch (driveError) {
      console.log('📊 Drive API copy failed:', driveError.message);
      console.log('📊 Attempting alternative method using Sheets API...');
      
      try {
        // Method 2: Create new spreadsheet and copy content from template using Sheets API
        // First, create a new spreadsheet
        const createResponse = await sheets.spreadsheets.create({
          resource: {
            properties: {
              title: `Bet Tracker Pro - ${user.name || user.email}`,
              locale: 'en_US',
              timeZone: 'America/New_York'
            }
          }
        });
        
        spreadsheetId = createResponse.data.spreadsheetId;
        console.log('📊 New spreadsheet created. ID:', spreadsheetId);
        
        // Try to get the template spreadsheet data
        console.log('📊 Attempting to read template structure...');
        const templateData = await sheets.spreadsheets.get({
          spreadsheetId: TEMPLATE_ID,
          includeGridData: false
        });
        
        console.log('📊 Template accessed successfully! Copying structure...');
        
        // Get all sheets from template
        const templateSheets = templateData.data.sheets || [];
        const requests = [];
        
        // First, add all sheets from template
        templateSheets.forEach((sheet, index) => {
          requests.push({
            addSheet: {
              properties: {
                sheetId: index + 1,
                title: sheet.properties.title,
                index: index,
                sheetType: sheet.properties.sheetType || 'GRID',
                gridProperties: sheet.properties.gridProperties
              }
            }
          });
        });
        
        // Then delete the default Sheet1 (only if we have other sheets)
        if (templateSheets.length > 0) {
          requests.push({
            deleteSheet: {
              sheetId: 0
            }
          });
        }
        
        // Apply the structure
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          resource: { requests }
        });
        
        console.log('📊 Template structure copied successfully!');
        
        // Copy data from each sheet
        for (const sheet of templateSheets) {
          const sheetName = sheet.properties.title;
          console.log(`📊 Copying data from sheet: ${sheetName}`);
          
          try {
            // Get all data from template sheet
            const range = `${sheetName}!A:ZZ`; // Get all columns
            const templateValues = await sheets.spreadsheets.values.get({
              spreadsheetId: TEMPLATE_ID,
              range: range,
              valueRenderOption: 'FORMULA', // Get formulas, not calculated values
              dateTimeRenderOption: 'FORMATTED_STRING'
            });
            
            if (templateValues.data.values && templateValues.data.values.length > 0) {
              // Write data to new spreadsheet
              await sheets.spreadsheets.values.update({
                spreadsheetId,
                range: range,
                valueInputOption: 'USER_ENTERED',
                resource: {
                  values: templateValues.data.values
                }
              });
              console.log(`✅ Data copied for sheet: ${sheetName}`);
            }
          } catch (copyErr) {
            console.log(`⚠️ Could not copy data for sheet ${sheetName}:`, copyErr.message);
          }
        }
        
        // Copy comprehensive formatting
        console.log('📊 Attempting to copy formatting and design...');
        try {
          // Get complete template with all formatting
          const fullTemplate = await sheets.spreadsheets.get({
            spreadsheetId: TEMPLATE_ID,
            includeGridData: true
          });
          
          const formatRequests = [];
          
          // Process each sheet for formatting
          for (let sheetIndex = 0; sheetIndex < fullTemplate.data.sheets.length; sheetIndex++) {
            const templateSheet = fullTemplate.data.sheets[sheetIndex];
            const newSheetId = sheetIndex + 1; // Our new sheet IDs
            
            // Copy column widths
            if (templateSheet.properties.gridProperties) {
              const colCount = templateSheet.properties.gridProperties.columnCount;
              
              // Get column metadata if available
              if (templateSheet.data && templateSheet.data[0] && templateSheet.data[0].columnMetadata) {
                templateSheet.data[0].columnMetadata.forEach((col, index) => {
                  if (col.pixelSize) {
                    formatRequests.push({
                      updateDimensionProperties: {
                        range: {
                          sheetId: newSheetId,
                          dimension: 'COLUMNS',
                          startIndex: index,
                          endIndex: index + 1
                        },
                        properties: {
                          pixelSize: col.pixelSize
                        },
                        fields: 'pixelSize'
                      }
                    });
                  }
                });
              }
              
              // Copy row heights
              if (templateSheet.data && templateSheet.data[0] && templateSheet.data[0].rowMetadata) {
                templateSheet.data[0].rowMetadata.forEach((row, index) => {
                  if (row.pixelSize && row.pixelSize !== 21) { // 21 is default
                    formatRequests.push({
                      updateDimensionProperties: {
                        range: {
                          sheetId: newSheetId,
                          dimension: 'ROWS',
                          startIndex: index,
                          endIndex: index + 1
                        },
                        properties: {
                          pixelSize: row.pixelSize
                        },
                        fields: 'pixelSize'
                      }
                    });
                  }
                });
              }
            }
            
            // Copy cell formatting
            if (templateSheet.data && templateSheet.data[0] && templateSheet.data[0].rowData) {
              const rowData = templateSheet.data[0].rowData;
              
              // Batch cell format updates
              rowData.forEach((row, rowIndex) => {
                if (row.values) {
                  row.values.forEach((cell, colIndex) => {
                    if (cell.userEnteredFormat || cell.effectiveFormat) {
                      const format = cell.userEnteredFormat || cell.effectiveFormat;
                      formatRequests.push({
                        repeatCell: {
                          range: {
                            sheetId: newSheetId,
                            startRowIndex: rowIndex,
                            endRowIndex: rowIndex + 1,
                            startColumnIndex: colIndex,
                            endColumnIndex: colIndex + 1
                          },
                          cell: {
                            userEnteredFormat: format
                          },
                          fields: 'userEnteredFormat'
                        }
                      });
                    }
                  });
                }
              });
            }
            
            // Copy merges
            if (templateSheet.merges) {
              templateSheet.merges.forEach(merge => {
                formatRequests.push({
                  mergeCells: {
                    range: {
                      sheetId: newSheetId,
                      startRowIndex: merge.startRowIndex,
                      endRowIndex: merge.endRowIndex,
                      startColumnIndex: merge.startColumnIndex,
                      endColumnIndex: merge.endColumnIndex
                    },
                    mergeType: 'MERGE_ALL'
                  }
                });
              });
            }
            
            // Copy conditional formatting
            if (templateSheet.conditionalFormats) {
              templateSheet.conditionalFormats.forEach(cf => {
                const newCf = JSON.parse(JSON.stringify(cf)); // Deep copy
                // Update sheet ID in ranges
                newCf.ranges = newCf.ranges.map(range => ({
                  ...range,
                  sheetId: newSheetId
                }));
                
                formatRequests.push({
                  addConditionalFormatRule: {
                    rule: newCf
                  }
                });
              });
            }
            
            // Copy sheet properties (frozen rows/columns, tab color)
            if (templateSheet.properties) {
              const updateProps = {};
              
              if (templateSheet.properties.gridProperties) {
                if (templateSheet.properties.gridProperties.frozenRowCount) {
                  updateProps.gridProperties = updateProps.gridProperties || {};
                  updateProps.gridProperties.frozenRowCount = templateSheet.properties.gridProperties.frozenRowCount;
                }
                if (templateSheet.properties.gridProperties.frozenColumnCount) {
                  updateProps.gridProperties = updateProps.gridProperties || {};
                  updateProps.gridProperties.frozenColumnCount = templateSheet.properties.gridProperties.frozenColumnCount;
                }
              }
              
              if (templateSheet.properties.tabColor) {
                updateProps.tabColor = templateSheet.properties.tabColor;
              }
              
              if (Object.keys(updateProps).length > 0) {
                formatRequests.push({
                  updateSheetProperties: {
                    properties: {
                      sheetId: newSheetId,
                      ...updateProps
                    },
                    fields: Object.keys(updateProps).map(key => {
                      if (key === 'gridProperties') {
                        return 'gridProperties.frozenRowCount,gridProperties.frozenColumnCount';
                      }
                      return key;
                    }).join(',')
                  }
                });
              }
            }
          }
          
          // Apply all formatting in batches to avoid quota issues
          if (formatRequests.length > 0) {
            console.log(`📊 Applying ${formatRequests.length} formatting requests...`);
            
            // Split into batches of 100 requests
            const batchSize = 100;
            for (let i = 0; i < formatRequests.length; i += batchSize) {
              const batch = formatRequests.slice(i, Math.min(i + batchSize, formatRequests.length));
              
              try {
                await sheets.spreadsheets.batchUpdate({
                  spreadsheetId,
                  resource: { requests: batch }
                });
                console.log(`✅ Applied batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(formatRequests.length/batchSize)}`);
              } catch (batchErr) {
                console.log(`⚠️ Batch ${Math.floor(i/batchSize) + 1} partially failed:`, batchErr.message);
              }
            }
            
            console.log('✅ Formatting and design copied successfully!');
          }
        } catch (formatErr) {
          console.log('⚠️ Could not copy all formatting:', formatErr.message);
        }
        
        method = 'copied from template';
        console.log('📊 Template copying complete!');
        
      } catch (sheetsError) {
        console.log('📊 Sheets API copy also failed:', sheetsError.message);
        console.log('📊 Creating basic spreadsheet as fallback...');
        method = 'created';
        
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
                  columnCount: 17 // Adjusted to match your template columns
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
                title: 'Bankroll',
                gridProperties: {
                  rowCount: 100,
                  columnCount: 10
                }
              }
            },
            {
              properties: {
                sheetId: 3,
                title: 'Settings',
                gridProperties: {
                  rowCount: 50,
                  columnCount: 5
                }
              }
            },
            {
              properties: {
                sheetId: 4,
                title: 'Mobile view',
                gridProperties: {
                  rowCount: 1000,
                  columnCount: 10
                }
              }
            }
          ]
        }
      });
      
      spreadsheetId = createResponse.data.spreadsheetId;
      console.log('📊 Spreadsheet created from scratch. ID:', spreadsheetId);
      
      // Set up the header row in Bet Tracker sheet to match your template
      const headers = [
        'ID', 'Status', 'Match DateTime', 'Sport', 'Teams/Event', 'Market', 'Selection',
        'Odds', 'Stake', 'To Win', 'Return', 'P/L', 'Bookmaker', 'Type',
        'Added', 'Days Pending', 'Delete'
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
        // Set specific column widths
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
      }
    }
    
    const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
    
    return {
      success: true,
      spreadsheetId,
      spreadsheetUrl,
      message: `Bet tracking spreadsheet ${method} successfully`
    };
    
  } catch (error) {
    console.error('Google Sheets template copying error:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to copy spreadsheet template';
    
    if (error.code === 404) {
      errorMessage = 'Template not found. Please ensure the template is shared with "Anyone with the link".';
    } else if (error.code === 403) {
      errorMessage = 'Permission denied. Please ensure the template is shared and Drive API is enabled.';
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
    
    // Prepare bet data for sheets matching your template structure
    // Columns: ID, Status, Match DateTime, Sport, Teams/Event, Market, Selection, 
    // Odds, Stake, To Win, Return, P/L, Bookmaker, Type, Added, Days Pending, Delete
    
    const now = new Date();
    const matchDateTime = betData.match_datetime || betData.date || now.toLocaleString();
    
    // Calculate potential win amount
    const odds = parseFloat(betData.odds) || 0;
    const stake = parseFloat(betData.stake) || 0;
    const toWin = odds > 0 ? (stake * odds - stake).toFixed(2) : '';
    
    const rowData = [
      '', // ID (will be auto-generated if you have formulas)
      betData.status?.toUpperCase() || 'PENDING', // Status
      matchDateTime, // Match DateTime
      betData.sport || '', // Sport
      betData.teams || betData.event || '', // Teams/Event
      betData.market || betData.bet_type || '', // Market
      betData.selection || '', // Selection
      betData.odds || '', // Odds
      betData.stake || '', // Stake
      toWin, // To Win
      betData.actual_return || '', // Return (for settled bets)
      '', // P/L (calculated by formula in sheet)
      betData.bookmaker || '', // Bookmaker
      betData.is_live ? 'LIVE' : 'PRE-MATCH', // Type
      now.toLocaleString(), // Added
      '', // Days Pending (calculated by formula)
      false // Delete
    ];
    
    console.log('📊 Prepared row data for sheets:', rowData);
    
    // Append to Bet Tracker sheet (main sheet name in your template)
    console.log('📊 Attempting to append data to spreadsheet...');
    const appendResult = await sheets.spreadsheets.values.append({
      spreadsheetId: user.spreadsheet_id,
      range: 'Bet Tracker!A:Q', // Columns A through Q (17 columns to match template)
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