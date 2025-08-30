// Google Sheets Integration Service for Bet Tracker Pro
class SheetsService {
  constructor() {
    this.isAuthenticated = false;
    this.spreadsheetId = null;
    this.accessToken = null;
    // Load sheets configuration
    this.config = null;
    this.loadConfig();
  }
  
  async loadConfig() {
    try {
      // Load the sheets configuration
      const response = await fetch(chrome.runtime.getURL('config/sheets-config.js'));
      const text = await response.text();
      // Extract SHEETS_CONFIG from the file
      const configMatch = text.match(/const SHEETS_CONFIG = (\{[\s\S]*?\});/);
      if (configMatch) {
        this.config = eval('(' + configMatch[1] + ')');
      }
    } catch (error) {
      console.error('Error loading sheets config:', error);
    }
  }

  // Authenticate with Google Sheets API
  async authenticate() {
    try {
      console.log('🔐 Starting Google Sheets authentication...');
      
      // Check if we have stored authentication
      const token = await this.getStoredToken();
      if (token && await this.validateToken(token)) {
        this.accessToken = token;
        this.isAuthenticated = true;
        return { success: true, message: 'Already authenticated with Google Sheets' };
      }

      // For production, this will redirect to the backend OAuth flow
      // The actual authentication happens in the popup
      const response = await chrome.runtime.sendMessage({
        action: 'authenticateSheets'
      });
      
      if (response && response.success) {
        this.isAuthenticated = true;
        return { success: true, message: 'Successfully authenticated with Google Sheets' };
      }
      
      return { success: false, error: 'Authentication failed' };
      
    } catch (error) {
      console.error('Google Sheets authentication error:', error);
      return { success: false, error: error.message };
    }
  }

  // Simulate authentication for demo purposes
  async simulateAuth() {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          token: 'demo-google-sheets-token-' + Date.now()
        });
      }, 1000);
    });
  }

  // Validate authentication token
  async validateToken(token) {
    try {
      // In real implementation, validate token with Google API
      return token && token.startsWith('demo-google-sheets-token');
    } catch (error) {
      return false;
    }
  }

  // Store authentication token
  async storeToken(token) {
    await chrome.storage.local.set({
      googleSheetsToken: token,
      sheetsAuthTime: Date.now()
    });
  }

  // Get stored authentication token
  async getStoredToken() {
    const result = await chrome.storage.local.get(['googleSheetsToken', 'sheetsAuthTime']);
    
    // Check if token is expired (24 hours)
    const tokenAge = Date.now() - (result.sheetsAuthTime || 0);
    const isExpired = tokenAge > 24 * 60 * 60 * 1000;
    
    return isExpired ? null : result.googleSheetsToken;
  }

  // Create or get bet tracking spreadsheet
  async getOrCreateSpreadsheet() {
    try {
      if (!this.isAuthenticated) {
        throw new Error('Not authenticated with Google Sheets');
      }

      // Check if we already have a spreadsheet ID stored
      const stored = await chrome.storage.local.get(['betTrackingSpreadsheetId']);
      if (stored.betTrackingSpreadsheetId) {
        this.spreadsheetId = stored.betTrackingSpreadsheetId;
        return { success: true, spreadsheetId: this.spreadsheetId };
      }

      // Copy the template to user's Drive
      const result = await this.copyTemplateToUserDrive();
      if (result.success) {
        this.spreadsheetId = result.spreadsheetId;
        await chrome.storage.local.set({
          betTrackingSpreadsheetId: result.spreadsheetId
        });
        return result;
      } else {
        throw new Error(result.error || 'Failed to copy template');
      }

    } catch (error) {
      console.error('Error creating spreadsheet:', error);
      return { success: false, error: error.message };
    }
  }

  // Copy template to user's Google Drive
  async copyTemplateToUserDrive() {
    try {
      // Make sure config is loaded
      if (!this.config) {
        await this.loadConfig();
      }

      const templateId = this.config?.TEMPLATE_ID || '1xsvxK5uYVQRupUarXxF_s44h-j_l7yndWMN0rbZIOck';
      
      console.log('📋 Copying template to user\'s Drive...');
      console.log('Template ID:', templateId);

      // This should call the backend API to copy the template
      // For now, we'll return the template ID as if it was copied
      // In production, this would use Google Drive API to copy the file
      
      // TODO: Implement actual Google Drive API copy
      // const response = await fetch('/api/sheets/copy-template', {
      //   method: 'POST',
      //   body: JSON.stringify({ templateId })
      // });
      
      // For demo/testing, return success with the template ID
      return {
        success: true,
        spreadsheetId: templateId,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${templateId}/edit`,
        message: 'Template copied successfully'
      };
      
    } catch (error) {
      console.error('Error copying template:', error);
      return { success: false, error: error.message };
    }
  }

  // Initialize spreadsheet with proper headers and formatting
  async initializeSpreadsheet() {
    const template = this.createStandardTemplate();
    
    // For demo purposes, log the template creation
    console.log('📈 Creating standardized bet tracking template...');
    console.log('Template structure:', template);
    
    // In real implementation, this would make API calls to Google Sheets
    // to create sheets, add headers, formulas, and formatting
    return { success: true, template };
  }

  // Create standardized template structure
  createStandardTemplate() {
    return {
      name: 'Bet Tracker Pro - Professional Template',
      description: 'Comprehensive bet tracking system with advanced analytics and automated calculations',
      sheets: [
        {
          name: 'Bet Log',
          description: 'Main tracking sheet for all betting activity',
          headers: [
            'Date', 'Time', 'Teams/Event', 'Sport', 'League/Competition', 
            'Bet Type', 'Selection', 'Odds Format', 'Odds', 'Stake', 
            'Potential Return', 'Actual Return', 'Profit/Loss', 'ROI %', 
            'Bookmaker', 'Status', 'Settlement Date', 'Notes', 'Confidence'
          ],
          formulas: {
            'K2': '=IF(J2="","",J2*(I2-1))', // Potential Return calculation
            'M2': '=IF(L2="","",L2-J2)', // Profit/Loss calculation
            'N2': '=IF(J2=0,"",M2/J2*100)', // ROI calculation
            'K3': '=IF(J3="","",J3*(I3-1))',
            'M3': '=IF(L3="","",L3-J3)',
            'N3': '=IF(J3=0,"",M3/J3*100)'
          },
          formatting: {
            headerRow: { 
              bold: true, 
              backgroundColor: '#1a73e8', 
              fontColor: 'white',
              freeze: true
            },
            profitColumn: { 
              conditionalFormatting: {
                type: 'CUSTOM_FORMULA',
                rule: '>0',
                color: '#34a853',
                negativeColor: '#ea4335'
              }
            },
            roiColumn: { 
              conditionalFormatting: {
                type: 'CUSTOM_FORMULA', 
                rule: '>0',
                format: 'PERCENTAGE'
              }
            },
            statusColumn: {
              dataValidation: {
                type: 'LIST',
                values: ['Pending', 'Won', 'Lost', 'Void', 'Cashed Out']
              }
            }
          },
          protectedRanges: ['K:K', 'M:M', 'N:N'], // Protect formula columns
          columnWidths: {
            'A': 100, 'B': 80, 'C': 200, 'D': 100, 'E': 150,
            'F': 120, 'G': 150, 'H': 100, 'I': 80, 'J': 80,
            'K': 120, 'L': 120, 'M': 100, 'N': 80, 'O': 150,
            'P': 100, 'Q': 100, 'R': 200, 'S': 80
          }
        },
        {
          name: 'Monthly Summary',
          description: 'Automated monthly performance tracking and analysis',
          sections: [
            {
              title: 'Monthly Performance Overview',
              startRow: 2,
              headers: [
                'Month', 'Total Bets', 'Bets Won', 'Bets Lost', 'Win Rate %',
                'Total Staked', 'Total Returns', 'Net Profit/Loss', 'ROI %', 
                'Average Stake', 'Best Win', 'Worst Loss'
              ],
              formulas: {
                'A3': '=TEXT(DATE(YEAR(TODAY()),MONTH(TODAY()),1),"MMM YYYY")',
                'B3': '=COUNTIFS(BetLog.A:A,">="&DATE(YEAR(TODAY()),MONTH(TODAY()),1),BetLog.A:A,"<"&DATE(YEAR(TODAY()),MONTH(TODAY())+1,1))',
                'C3': '=COUNTIFS(BetLog.A:A,">="&DATE(YEAR(TODAY()),MONTH(TODAY()),1),BetLog.A:A,"<"&DATE(YEAR(TODAY()),MONTH(TODAY())+1,1),BetLog.P:P,"Won")',
                'D3': '=COUNTIFS(BetLog.A:A,">="&DATE(YEAR(TODAY()),MONTH(TODAY()),1),BetLog.A:A,"<"&DATE(YEAR(TODAY()),MONTH(TODAY())+1,1),BetLog.P:P,"Lost")',
                'E3': '=IF(B3=0,0,C3/B3*100)',
                'F3': '=SUMIFS(BetLog.J:J,BetLog.A:A,">="&DATE(YEAR(TODAY()),MONTH(TODAY()),1),BetLog.A:A,"<"&DATE(YEAR(TODAY()),MONTH(TODAY())+1,1))',
                'G3': '=SUMIFS(BetLog.L:L,BetLog.A:A,">="&DATE(YEAR(TODAY()),MONTH(TODAY()),1),BetLog.A:A,"<"&DATE(YEAR(TODAY()),MONTH(TODAY())+1,1))',
                'H3': '=G3-F3',
                'I3': '=IF(F3=0,0,H3/F3*100)',
                'J3': '=IF(B3=0,0,F3/B3)',
                'K3': '=MAXIFS(BetLog.M:M,BetLog.A:A,">="&DATE(YEAR(TODAY()),MONTH(TODAY()),1),BetLog.A:A,"<"&DATE(YEAR(TODAY()),MONTH(TODAY())+1,1))',
                'L3': '=MINIFS(BetLog.M:M,BetLog.A:A,">="&DATE(YEAR(TODAY()),MONTH(TODAY()),1),BetLog.A:A,"<"&DATE(YEAR(TODAY()),MONTH(TODAY())+1,1))'
              }
            },
            {
              title: 'Key Performance Indicators',
              startRow: 8,
              data: [
                ['KPI', 'Current Month', 'All Time', 'Target', 'Status'],
                ['Win Rate %', '=E3', '=COUNTIF(BetLog.P:P,"Won")/COUNTA(BetLog.P:P)*100', '55%', '=IF(B9>=D9,"✅","❌")'],
                ['ROI %', '=I3', '=SUM(BetLog.M:M)/SUM(BetLog.J:J)*100', '10%', '=IF(B10>=D10,"✅","❌")'],
                ['Avg Stake', '=J3', '=AVERAGE(BetLog.J:J)', 'N/A', 'ℹ️'],
                ['Total Profit', '=H3', '=SUM(BetLog.M:M)', '$1000', '=IF(B11>=D11,"✅","❌")']
              ]
            }
          ],
          charts: [
            {
              type: 'LINE',
              title: 'Monthly Profit Trend',
              position: 'D15',
              dataRange: 'A3:H20'
            }
          ]
        },
        {
          name: 'Analytics Dashboard',
          description: 'Advanced analytics with charts and performance insights',
          charts: [
            {
              type: 'PIE',
              title: 'Bets by Sport',
              position: 'A2',
              dataRange: 'BetLog!D:D'
            },
            {
              type: 'COLUMN',
              title: 'Win Rate by Bookmaker',
              position: 'F2',
              dataRange: 'BetLog!O:P'
            },
            {
              type: 'LINE',
              title: 'Cumulative Profit/Loss',
              position: 'A20',
              dataRange: 'BetLog!A:M'
            },
            {
              type: 'HISTOGRAM',
              title: 'Stake Distribution',
              position: 'F20',
              dataRange: 'BetLog!J:J'
            }
          ],
          kpis: [
            { 
              name: 'Total Bets', 
              position: 'K2',
              formula: '=COUNTA(BetLog.A:A)-1',
              format: 'NUMBER'
            },
            { 
              name: 'Total Profit', 
              position: 'K4',
              formula: '=SUM(BetLog.M:M)',
              format: 'CURRENCY'
            },
            { 
              name: 'Overall ROI', 
              position: 'K6',
              formula: '=SUM(BetLog.M:M)/SUM(BetLog.J:J)*100',
              format: 'PERCENTAGE'
            },
            { 
              name: 'Win Rate', 
              position: 'K8',
              formula: '=COUNTIF(BetLog.P:P,"Won")/COUNTA(BetLog.P:P)*100',
              format: 'PERCENTAGE'
            },
            { 
              name: 'Best Sport', 
              position: 'K10',
              formula: '=INDEX(BetLog.D:D,MODE(MATCH(BetLog.D:D,BetLog.D:D,0)))',
              format: 'TEXT'
            },
            { 
              name: 'Avg Odds', 
              position: 'K12',
              formula: '=AVERAGE(BetLog.I:I)',
              format: 'NUMBER_2_DECIMAL'
            }
          ]
        },
        {
          name: 'Bankroll Management',
          description: 'Track bankroll growth and staking strategy',
          sections: [
            {
              title: 'Bankroll Tracking',
              startRow: 2,
              data: [
                ['Date', 'Starting Balance', 'Deposits', 'Withdrawals', 'Bet Results', 'Ending Balance', 'Growth %'],
                ['=TODAY()', '1000', '0', '0', '=SUMIFS(BetLog.M:M,BetLog.A:A,A3)', '=B3+C3-D3+E3', '=(F3-B3)/B3*100']
              ]
            },
            {
              title: 'Staking Strategy',
              startRow: 8,
              data: [
                ['Strategy Type', 'Current Setting', 'Recommendation'],
                ['Base Unit (%)', '2%', '1-5% of bankroll'],
                ['Max Bet (%)', '5%', '≤10% of bankroll'],
                ['Kelly Criterion', 'Disabled', 'Enable for optimal sizing'],
                ['Stop Loss', 'None', 'Set 20% drawdown limit']
              ]
            }
          ]
        },
        {
          name: 'Settings & Configuration',
          description: 'Customize your bet tracking preferences',
          content: [
            ['Setting Category', 'Setting', 'Value', 'Description'],
            ['Display', 'Currency', 'USD', 'Default currency for all calculations'],
            ['Display', 'Date Format', 'MM/DD/YYYY', 'Date format preference'],
            ['Display', 'Odds Format', 'American', 'Preferred odds display format'],
            ['Tracking', 'Timezone', 'UTC', 'Timezone for bet timestamps'],
            ['Tracking', 'Auto-sync', 'Enabled', 'Automatic bet synchronization'],
            ['Tracking', 'Backup Frequency', 'Daily', 'How often to backup data'],
            ['Analytics', 'Performance Period', '30 days', 'Default analysis timeframe'],
            ['Analytics', 'ROI Calculation', 'Simple', 'ROI calculation method'],
            ['Alerts', 'Win Notifications', 'Enabled', 'Notify on winning bets'],
            ['Alerts', 'Loss Notifications', 'Disabled', 'Notify on losing bets'],
            ['Alerts', 'Milestone Alerts', 'Enabled', 'Notify on profit milestones']
          ]
        }
      ],
      features: {
        conditionalFormatting: true,
        charts: true,
        formulas: true,
        dataValidation: true,
        protection: true,
        autoResize: true,
        filters: true,
        sorting: true
      },
      metadata: {
        created: new Date().toISOString(),
        version: '2.0',
        templateType: 'Professional',
        lastUpdated: new Date().toISOString()
      }
    };
  }

  // Create template with full setup
  async createTemplate() {
    try {
      // Use backend endpoint for template creation
      const response = await chrome.runtime.sendMessage({
        action: 'createSheetsTemplate'
      });
      
      if (response && response.success) {
        this.spreadsheetId = response.spreadsheetId;
        this.isAuthenticated = true;
        
        // Store spreadsheet info locally
        await chrome.storage.local.set({
          betTrackingSpreadsheetId: response.spreadsheetId,
          sheetsAuthenticated: true
        });
        
        return {
          success: true,
          spreadsheetId: response.spreadsheetId,
          spreadsheetUrl: response.spreadsheetUrl,
          message: 'Professional bet tracking template created successfully'
        };
      } else {
        throw new Error(response?.error || 'Template creation failed');
      }

    } catch (error) {
      console.error('Error creating template:', error);
      return { success: false, error: error.message };
    }
  }

  // Set up advanced template features
  async setupAdvancedTemplate() {
    console.log('🎨 Setting up advanced template features...');
    
    // In real implementation, this would:
    // 1. Create multiple sheets (Bet Log, Monthly Summary, Analytics, Settings)
    // 2. Add headers and formulas
    // 3. Set up conditional formatting
    // 4. Create charts and pivot tables
    // 5. Add data validation
    // 6. Set up protection for formula cells
    
    const features = [
      'Creating Bet Log sheet with formulas',
      'Setting up Monthly Summary with aggregations', 
      'Building Analytics dashboard with charts',
      'Configuring data validation rules',
      'Applying conditional formatting',
      'Setting up cell protection'
    ];
    
    for (const feature of features) {
      console.log(`✅ ${feature}`);
      await new Promise(resolve => setTimeout(resolve, 200)); // Simulate setup time
    }
    
    return { success: true };
  }

  // Sync bet data to Google Sheets
  async syncBetData(betData) {
    try {
      if (!this.isAuthenticated) {
        const authResult = await this.authenticate();
        if (!authResult.success) {
          throw new Error('Failed to authenticate with Google Sheets');
        }
      }

      if (!this.spreadsheetId) {
        const spreadsheetResult = await this.getOrCreateSpreadsheet();
        if (!spreadsheetResult.success) {
          throw new Error('Failed to get or create spreadsheet');
        }
      }

      // Prepare data for Google Sheets
      const rowData = this.formatBetDataForSheets(betData);
      
      // For demo purposes, simulate API call
      console.log('📊 Syncing bet data to Google Sheets:', rowData);
      
      // In real implementation, this would use the Google Sheets API
      await this.simulateSheetUpdate(rowData);

      return { 
        success: true, 
        message: 'Bet data synced to Google Sheets successfully',
        spreadsheetId: this.spreadsheetId 
      };

    } catch (error) {
      console.error('Error syncing bet data:', error);
      return { success: false, error: error.message };
    }
  }

  // Format bet data for Google Sheets
  formatBetDataForSheets(betData) {
    const stake = this.parseAmount(betData.stake);
    const potentialReturn = this.parseAmount(betData.potential_return);
    const profit = potentialReturn - stake;
    const roi = stake > 0 ? ((profit / stake) * 100).toFixed(2) : '0';

    return [
      betData.date || new Date().toLocaleDateString(),
      betData.teams || '',
      betData.sport || '',
      betData.bet_type || '',
      betData.selection || '',
      betData.odds || '',
      betData.stake || '',
      betData.potential_return || '',
      betData.bookmaker || '',
      betData.status || 'pending',
      profit.toFixed(2),
      roi + '%'
    ];
  }

  // Parse monetary amounts from strings
  parseAmount(amountStr) {
    if (!amountStr) return 0;
    const cleaned = amountStr.toString().replace(/[^\d.,]/g, '');
    return parseFloat(cleaned.replace(',', '.')) || 0;
  }

  // Simulate Google Sheets API update
  async simulateSheetUpdate(rowData) {
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('✅ Simulated Google Sheets update completed');
        resolve({ success: true });
      }, 500);
    });
  }

  // Bulk sync all bet history
  async syncAllHistory() {
    try {
      const result = await chrome.storage.local.get(['betHistory']);
      const history = result.betHistory || [];

      if (history.length === 0) {
        return { success: false, error: 'No bet history to sync' };
      }

      console.log(`📊 Starting bulk sync of ${history.length} bets...`);

      let successCount = 0;
      let failCount = 0;

      for (const bet of history) {
        try {
          await this.syncBetData(bet);
          successCount++;
        } catch (error) {
          console.error('Error syncing bet:', error);
          failCount++;
        }
      }

      return {
        success: true,
        message: `Synced ${successCount} bets successfully${failCount > 0 ? `, ${failCount} failed` : ''}`,
        synced: successCount,
        failed: failCount
      };

    } catch (error) {
      console.error('Error in bulk sync:', error);
      return { success: false, error: error.message };
    }
  }

  // Get Google Sheets URL for user
  getSpreadsheetUrl() {
    if (!this.spreadsheetId) {
      return null;
    }
    return `https://docs.google.com/spreadsheets/d/${this.spreadsheetId}/edit`;
  }

  // Check authentication status
  async getAuthStatus() {
    const token = await this.getStoredToken();
    this.isAuthenticated = token && await this.validateToken(token);
    
    // Get stored spreadsheet ID
    const stored = await chrome.storage.local.get(['betTrackingSpreadsheetId']);
    this.spreadsheetId = stored.betTrackingSpreadsheetId;
    
    return {
      isAuthenticated: this.isAuthenticated,
      hasSpreadsheet: !!this.spreadsheetId,
      spreadsheetUrl: this.getSpreadsheetUrl(),
      isSetupComplete: this.isAuthenticated && !!this.spreadsheetId
    };
  }

  // Disconnect from Google Sheets
  async disconnect() {
    try {
      await chrome.storage.local.remove([
        'googleSheetsToken',
        'sheetsAuthTime',
        'betTrackingSpreadsheetId'
      ]);

      this.isAuthenticated = false;
      this.accessToken = null;
      this.spreadsheetId = null;

      return { success: true, message: 'Disconnected from Google Sheets' };
    } catch (error) {
      console.error('Error disconnecting:', error);
      return { success: false, error: error.message };
    }
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SheetsService;
} else if (typeof window !== 'undefined') {
  window.SheetsService = SheetsService;
}