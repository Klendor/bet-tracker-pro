// Background service worker for Bet Tracker Pro

// Import extension updater
importScripts('extension-updater.js');

class BetTrackerBackground {
  constructor() {
    this.userToken = null;
    this.backendConfig = this.getBackendConfig();
    this.extensionUpdater = new ExtensionUpdater();
    this.init();
  }

  init() {
    // Load configuration
    this.loadConfig();
    
    // Set up message listeners
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep message channel open for async responses
    });

    // Handle extension installation
    chrome.runtime.onInstalled.addListener((details) => {
      this.onInstalled(details);
    });
  }

  getBackendConfig() {
    // Use Railway production URL
    return {
      baseUrl: 'https://bet-tracker-pro-production.up.railway.app/api',
      timeout: 30000,
      retryAttempts: 3,
      environment: 'production'
    };
  }

  async loadConfig() {
    try {
      // Load user authentication token from storage
      const result = await chrome.storage.sync.get(['userToken', 'user']);
      this.userToken = result.userToken;
      this.currentUser = result.user;

      // Log status for debugging
      if (!this.userToken) {
        console.log('ℹ️ User not authenticated. Authentication required for bet processing.');
      } else {
        console.log('✅ User authenticated successfully');
      }
    } catch (error) {
      console.error('Error loading config:', error);
    }
  }

  async handleMessage(message, sender, sendResponse) {
    try {
      switch (message.action) {
        case 'processBetSlip':
          await this.processBetSlip(message.imageData, message.selection, sendResponse);
          break;
          
        case 'captureVisibleTab':
          await this.captureVisibleTab(message.selection, sendResponse);
          break;
          
        case 'authenticateUser':
          await this.authenticateUser(message.authData, sendResponse);
          break;
          
        case 'getUserInfo':
          await this.getUserInfo(sendResponse, message.token);
          break;
          
        case 'logoutUser':
          await this.logoutUser(sendResponse);
          break;
          
        case 'incrementUsage':
          await this.incrementUsage(sendResponse);
          break;
          
        case 'authenticateSheets':
          await this.authenticateSheets(sendResponse);
          break;
          
        case 'syncToSheets':
          await this.syncToSheets(message.betData, sendResponse);
          break;
          
        case 'syncAllToSheets':
          await this.syncAllToSheets(sendResponse);
          break;
          
        case 'getSheetsStatus':
          await this.getSheetsStatus(sendResponse);
          break;
          
        case 'disconnectSheets':
          await this.disconnectSheets(sendResponse);
          break;
          
        case 'createSheetsTemplate':
          await this.createSheetsTemplate(sendResponse);
          break;
          
        case 'getBackendConfig':
          sendResponse({
            baseUrl: this.backendConfig.baseUrl,
            environment: this.backendConfig.baseUrl.includes('localhost') ? 'development' : 'production'
          });
          break;
          
        case 'authComplete':
          await this.handleAuthComplete(message.token, sendResponse);
          break;
          
        case 'checkForUpdates':
          await this.extensionUpdater.checkForUpdates(true, sendResponse);
          break;
          
        case 'getUpdateStatus':
          const updateStatus = await this.extensionUpdater.getUpdateStatus();
          sendResponse(updateStatus);
          break;
          
        default:
          sendResponse({ error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ error: error.message });
    }
  }

  async captureVisibleTab(selection, sendResponse) {
    try {
      console.log('Background: Capturing visible tab...');
      
      // Get the active tab info
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!activeTab) {
        throw new Error('No active tab found');
      }
      
      console.log('Active tab:', activeTab.url);
      
      // Capture the entire visible tab with maximum quality
      const dataUrl = await chrome.tabs.captureVisibleTab(activeTab.windowId, {
        format: 'png'
        // Note: quality parameter is ignored for PNG format
      });
      
      console.log('Screenshot captured:', {
        tabId: activeTab.id,
        dataUrlLength: dataUrl ? dataUrl.length : 0
      });
      
      if (!dataUrl) {
        throw new Error('Failed to capture screenshot - no data returned');
      }
      
      sendResponse({ dataUrl: dataUrl });
      
    } catch (error) {
      console.error('Error capturing visible tab:', error);
      sendResponse({ error: error.message });
    }
  }

  async processBetSlip(imageData, selection, sendResponse) {
    try {
      // Check if user is authenticated
      if (!this.userToken) {
        sendResponse({ 
          success: false, 
          error: 'Authentication required. Please sign in to process bet slips.',
          requiresAuth: true
        });
        return;
      }

      // Process with backend service
      const extractedData = await this.processWithBackendService(imageData, selection);
      
      if (!extractedData) {
        throw new Error('Failed to extract bet data');
      }

      // Send success response
      sendResponse({
        success: true,
        data: extractedData
      });

      // Notify popup of successful processing
      this.notifyPopup('betProcessed', { success: true, data: extractedData });

    } catch (error) {
      console.error('Error processing bet slip:', error);
      sendResponse({ 
        success: false, 
        error: error.message 
      });

      // Notify popup of error
      this.notifyPopup('betProcessed', { success: false, error: error.message });
    }
  }

  async processWithBackendService(imageData, selection) {
    try {
      const response = await fetch(`${this.backendConfig.baseUrl}/process-bet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.userToken}`
        },
        body: JSON.stringify({
          imageData: imageData,
          selection: selection,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        if (response.status === 401) {
          // Token expired or invalid
          await this.logoutUser();
          throw new Error('Authentication expired. Please sign in again.');
        } else if (response.status === 402) {
          // Payment required - usage limit exceeded
          throw new Error(errorData.message || 'Usage limit exceeded. Please upgrade your plan.');
        } else if (response.status === 429) {
          // Rate limit
          throw new Error('Too many requests. Please try again later.');
        }
        
        throw new Error(errorData.message || `Server error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to process bet slip');
      }

      // Store bet history locally as backup
      await this.storeBetLocally(data.data);
      
      return data.data;

    } catch (error) {
      console.error('Backend service error:', error);
      
      // If network error, inform user
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Unable to connect to service. Please check your internet connection.');
      }
      
      throw error;
    }
  }

  async storeBetLocally(betData) {
    try {
      // Store bet history locally as backup
      const result = await chrome.storage.local.get(['betHistory']);
      const history = result.betHistory || [];
      
      // Add new bet to history
      const betEntry = {
        id: betData.id || Date.now().toString(),
        ...betData,
        created_at: new Date().toISOString()
      };
      
      history.unshift(betEntry); // Add to beginning of array
      
      // Keep only last 100 bets in local storage
      if (history.length > 100) {
        history.splice(100);
      }
      
      await chrome.storage.local.set({ betHistory: history });
      
      // Auto-sync to Google Sheets if authenticated and connected
      try {
        if (this.userToken) {
          console.log('🔍 Auto-sync: Checking sheets status...');
          // Check if user has sheets connected
          const sheetsStatus = await this.getSheetsStatusInternal();
          console.log('🔍 Auto-sync: Sheets status:', sheetsStatus);
          
          if (sheetsStatus && sheetsStatus.isAuthenticated && sheetsStatus.hasSpreadsheet && sheetsStatus.isSetupComplete) {
            console.log('🔍 Auto-sync: Preparing bet data for sheets...');
            
            // Format bet data properly for sheets
            const formattedBetData = {
              date: betEntry.date || new Date().toLocaleDateString(),
              teams: betEntry.teams || betEntry.event || '',
              sport: betEntry.sport || '',
              league: betEntry.league || '',
              bet_type: betEntry.bet_type || betEntry.betType || '',
              selection: betEntry.selection || '',
              odds: betEntry.odds || '',
              stake: betEntry.stake || '',
              potential_return: betEntry.potential_return || betEntry.potentialReturn || '',
              bookmaker: betEntry.bookmaker || '',
              status: betEntry.status || 'pending',
              notes: betEntry.notes || '',
              confidence: betEntry.confidence || '',
              actual_return: betEntry.actual_return || '',
              id: betEntry.id
            };
            
            console.log('🔍 Auto-sync: Sending formatted bet data to backend...', formattedBetData);
            
            const syncResponse = await fetch(`${this.backendConfig.baseUrl}/sheets/sync-bet`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${this.userToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ betData: formattedBetData })
            });
            
            console.log('🔍 Auto-sync: Response status:', syncResponse.status);
            
            if (syncResponse.ok) {
              const syncData = await syncResponse.json();
              console.log('🔍 Auto-sync: Response data:', syncData);
              if (syncData.success) {
                console.log('✅ Auto-synced bet to Google Sheets successfully');
                // Notify popup of successful sync
                this.notifyPopup('sheetsSync', { success: true, message: 'Bet synced to Google Sheets' });
              } else {
                console.error('⚠️ Google Sheets sync failed:', syncData.error);
                console.log('🔍 Full sync error response:', syncData);
                // Check if it's an auth issue
                if (syncData.error && syncData.error.includes('authentication')) {
                  console.log('🔄 Sheets authentication may have expired');
                }
              }
            } else {
              const errorText = await syncResponse.text();
              console.error('⚠️ Google Sheets sync request failed:', syncResponse.status);
              try {
                const parsedError = JSON.parse(errorText);
                console.error('🔍 Parsed error details:', parsedError);
                if (parsedError.error && parsedError.error.includes('authentication')) {
                  console.log('🔄 Google authentication expired - user needs to reconnect');
                }
              } catch (e) {
                console.error('🔍 Raw error response:', errorText);
              }
            }
          } else {
            console.log('📝 Google Sheets not fully configured:', {
              isAuthenticated: sheetsStatus?.isAuthenticated,
              hasSpreadsheet: sheetsStatus?.hasSpreadsheet,
              isSetupComplete: sheetsStatus?.isSetupComplete
            });
          }
        } else {
          console.log('🔍 Auto-sync: No user token available');
        }
      } catch (sheetsError) {
        console.error('❌ Google Sheets auto-sync error:', sheetsError);
        console.error('Stack trace:', sheetsError.stack);
        // Don't fail the main operation if sheets sync fails
      }
      
      return { success: true, method: 'local_storage', id: betEntry.id };
      
    } catch (error) {
      console.error('Error storing bet locally:', error);
      return { success: false, error: error.message };
    }
  }

  async authenticateUser(authData, sendResponse) {
    try {
      // Note: Login endpoint not implemented in serverless version
      // Using Google OAuth only for production
      sendResponse({ 
        success: false, 
        error: 'Please use Google Sign In for authentication',
        useGoogleAuth: true
      });
    } catch (error) {
      sendResponse({ success: false, error: 'Authentication error' });
    }
  }

  async getUserInfo(sendResponse, token = null) {
    try {
      const userToken = token || this.userToken;
      
      if (!userToken) {
        sendResponse({ success: false, error: 'Not authenticated' });
        return;
      }

      const response = await fetch(`${this.backendConfig.baseUrl}/user/info`, {
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      });

      const data = await response.json();
      
      if (response.ok) {
        // Update local user info
        this.currentUser = data.user;
        this.userToken = userToken;
        await chrome.storage.sync.set({ 
          user: data.user,
          userToken: userToken
        });
        
        sendResponse({ success: true, user: data.user });
      } else {
        if (response.status === 401) {
          await this.logoutUser();
        }
        sendResponse({ success: false, error: data.error || 'Failed to get user info' });
      }
    } catch (error) {
      sendResponse({ success: false, error: 'Network error' });
    }
  }
  
  async handleAuthComplete(token, sendResponse) {
    try {
      // Store token and get user info
      this.userToken = token;
      await chrome.storage.sync.set({ userToken: token });
      
      // Get user information
      const response = await fetch(`${this.backendConfig.baseUrl}/user/info`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      if (response.ok) {
        this.currentUser = data.user;
        await chrome.storage.sync.set({ user: data.user });
        sendResponse({ success: true, user: data.user });
      } else {
        sendResponse({ success: false, error: data.error || 'Failed to get user info' });
      }
    } catch (error) {
      console.error('Auth complete error:', error);
      sendResponse({ success: false, error: 'Failed to complete authentication' });
    }
  }

  async logoutUser(sendResponse) {
    try {
      // Clear stored authentication
      this.userToken = null;
      this.currentUser = null;
      
      await chrome.storage.sync.remove(['userToken', 'user']);
      
      if (sendResponse) {
        sendResponse({ success: true });
      }
    } catch (error) {
      if (sendResponse) {
        sendResponse({ success: false, error: error.message });
      }
    }
  }

  notifyPopup(action, data) {
    // Try to send message to popup if it's open
    chrome.runtime.sendMessage({ action: action, ...data }).catch(() => {
      // Popup is not open, ignore error
    });
  }

  onInstalled(details) {
    if (details.reason === 'install') {
      // First time installation
      console.log('Bet Tracker Pro installed');
      
      // Open welcome page
      chrome.tabs.create({ url: chrome.runtime.getURL('welcome.html') });
    }
  }

  // Google Sheets Integration Methods
  async authenticateSheets(sendResponse) {
    try {
      // Since user is already authenticated with Google OAuth,
      // we just need to create the sheets template
      const response = await fetch(`${this.backendConfig.baseUrl}/sheets/create-template`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.userToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        sendResponse({
          success: true,
          message: 'Google Sheets template created successfully',
          spreadsheetId: data.data.spreadsheetId,
          spreadsheetUrl: data.data.spreadsheetUrl
        });
      } else {
        sendResponse({ success: false, error: data.error || 'Failed to create sheets template' });
      }
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  async createSheetsTemplate(sendResponse) {
    try {
      const response = await fetch(`${this.backendConfig.baseUrl}/sheets/create-template`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.userToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        sendResponse({
          success: true,
          message: 'Google Sheets template created successfully',
          spreadsheetId: data.data.spreadsheetId,
          spreadsheetUrl: data.data.spreadsheetUrl
        });
      } else {
        sendResponse({ success: false, error: data.error || 'Failed to create sheets template' });
      }
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  async getSheetsStatus(sendResponse) {
    try {
      const response = await fetch(`${this.backendConfig.baseUrl}/sheets/status`, {
        headers: {
          'Authorization': `Bearer ${this.userToken}`
        }
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        // Flatten the response structure for the popup
        sendResponse({
          success: true,
          isAuthenticated: data.data.isAuthenticated,
          hasSpreadsheet: data.data.hasSpreadsheet,
          isSetupComplete: data.data.isSetupComplete,
          spreadsheetUrl: data.data.spreadsheetUrl
        });
      } else {
        sendResponse({ success: false, error: data.error || 'Failed to get sheets status' });
      }
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  async getSheetsStatusInternal() {
    try {
      const response = await fetch(`${this.backendConfig.baseUrl}/sheets/status`, {
        headers: {
          'Authorization': `Bearer ${this.userToken}`
        }
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        return {
          isAuthenticated: data.data.isAuthenticated,
          hasSpreadsheet: data.data.hasSpreadsheet,
          isSetupComplete: data.data.isSetupComplete,
          spreadsheetUrl: data.data.spreadsheetUrl
        };
      } else {
        return null;
      }
    } catch (error) {
      return null;
    }
  }

  async syncToSheets(betData, sendResponse) {
    try {
      const response = await fetch(`${this.backendConfig.baseUrl}/sheets/sync-bet`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.userToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ betData })
      });
      
      const data = await response.json();
      sendResponse(data);
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  async syncAllToSheets(sendResponse) {
    try {
      const result = await chrome.storage.local.get(['betHistory']);
      const history = result.betHistory || [];
      
      if (history.length === 0) {
        sendResponse({ success: false, error: 'No bet history to sync' });
        return;
      }
      
      console.log(`📊 Syncing ${history.length} bets to Google Sheets...`);
      
      let successCount = 0;
      let failCount = 0;
      const failedBets = [];
      
      for (const bet of history) {
        try {
          // Format bet data properly before sending
          const formattedBetData = {
            date: bet.date || new Date(bet.created_at || Date.now()).toLocaleDateString(),
            teams: bet.teams || bet.event || '',
            sport: bet.sport || '',
            league: bet.league || '',
            bet_type: bet.bet_type || bet.betType || '',
            selection: bet.selection || '',
            odds: bet.odds || '',
            stake: bet.stake || '',
            potential_return: bet.potential_return || bet.potentialReturn || '',
            bookmaker: bet.bookmaker || '',
            status: bet.status || 'pending',
            notes: bet.notes || '',
            confidence: bet.confidence || '',
            actual_return: bet.actual_return || '',
            id: bet.id || Date.now().toString()
          };
          
          console.log(`📊 Syncing bet ${bet.id}...`);
          
          const response = await fetch(`${this.backendConfig.baseUrl}/sheets/sync-bet`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.userToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ betData: formattedBetData })
          });
          
          const data = await response.json();
          if (response.ok && data.success) {
            successCount++;
            console.log(`✅ Bet ${bet.id} synced successfully`);
          } else {
            console.error(`❌ Sync failed for bet ${bet.id}:`, data.error || 'Unknown error');
            failCount++;
            failedBets.push({ id: bet.id, error: data.error });
          }
        } catch (error) {
          console.error(`❌ Sync error for bet ${bet.id}:`, error.message);
          failCount++;
          failedBets.push({ id: bet.id, error: error.message });
        }
      }
      
      console.log(`📊 Sync complete: ${successCount} succeeded, ${failCount} failed`);
      
      if (failedBets.length > 0) {
        console.error('Failed bets:', failedBets);
      }
      
      sendResponse({
        success: true,
        message: `Synced ${successCount} bets successfully${failCount > 0 ? `, ${failCount} failed` : ''}`,
        synced: successCount,
        failed: failCount,
        failedBets: failedBets
      });
    } catch (error) {
      console.error('Error in syncAllToSheets:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async disconnectSheets(sendResponse) {
    try {
      const response = await fetch(`${this.backendConfig.baseUrl}/sheets/disconnect`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.userToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Clear local sheets data
        await chrome.storage.local.remove([
          'betTrackingSpreadsheetId',
          'sheetsAuthenticated'
        ]);
      }
      
      sendResponse(data);
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }
}

// Initialize background script
const betTrackerBackground = new BetTrackerBackground();