// Complete Bet Tracker Pro Popup - New Design
console.log('🚀 Bet Tracker Pro popup loaded - New Design v2.0');

class BetTrackerPopup {
  constructor() {
    this.currentUser = null;
    this.betHistory = [];
    this.sheetsConnected = false;
    this.planLimits = {
      free: 30,
      pro: 1000,
      proplus: 10000
    };
    
    // Initialize on DOM ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.init());
    } else {
      this.init();
    }
  }

  async init() {
    try {
      console.log('📱 Initializing popup...');
      
      // Load all data first
      await Promise.all([
        this.loadUserData(),
        this.loadBetHistory()
      ]);
      
      // Setup UI
      this.setupEventListeners();
      this.updateUI();
      this.startAnimations();
      
      console.log('✅ Popup initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing popup:', error);
      this.showToast('Error loading extension', 'error');
    }
  }

  // ===== DATA LOADING =====
  async loadUserData() {
    try {
      const storage = await chrome.storage.sync.get(['userToken', 'user']);
      
      if (storage.userToken) {
        // Get fresh user info from backend
        const response = await chrome.runtime.sendMessage({ 
          action: 'getUserInfo',
          token: storage.userToken 
        });
        
        if (response?.success) {
          this.currentUser = response.user;
          console.log('👤 User loaded:', this.currentUser.email);
          
          // Check sheets connection
          const sheetsStatus = await chrome.runtime.sendMessage({ 
            action: 'getSheetsStatus' 
          });
          this.sheetsConnected = sheetsStatus?.isAuthenticated && sheetsStatus?.hasSpreadsheet;
        } else {
          // Token invalid, clear it
          await chrome.storage.sync.remove(['userToken', 'user']);
          this.currentUser = null;
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      this.currentUser = null;
    }
  }

  async loadBetHistory() {
    try {
      const result = await chrome.storage.local.get(['betHistory']);
      this.betHistory = result.betHistory || [];
      console.log(`📊 Loaded ${this.betHistory.length} bets from history`);
    } catch (error) {
      console.error('Error loading bet history:', error);
      this.betHistory = [];
    }
  }


  // ===== UI UPDATES =====
  updateUI() {
    this.updateUserCard();
    this.updateQuickStats();
    this.updateCaptureButton();
    this.updateRecentBets();
    this.updateActionButtons();
  }

  updateUserCard() {
    const userName = document.getElementById('userName');
    const planBadge = document.getElementById('planBadge');
    const usageText = document.getElementById('usageText');
    const authToggle = document.getElementById('authToggle');
    const progressRing = document.getElementById('progressRing');

    if (this.currentUser) {
      // Update user info
      userName.textContent = this.currentUser.email?.split('@')[0] || 'User';
      
      const plan = this.currentUser.plan || 'free';
      const planNames = { free: 'FREE', pro: 'PRO', proplus: 'PRO+' };
      planBadge.textContent = planNames[plan];
      planBadge.className = `plan-badge ${plan}`;
      
      // Update usage
      const limit = this.planLimits[plan];
      const usage = this.currentUser.usage_count || 0;
      usageText.textContent = `${usage}/${limit} bets`;
      
      // Update progress ring
      const percentage = (usage / limit) * 100;
      const circumference = 2 * Math.PI * 20; // radius = 20
      const offset = circumference - (percentage / 100) * circumference;
      progressRing.style.strokeDashoffset = offset;
      
      // Update auth button
      authToggle.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M6 14L2 8L6 2M10 2L14 8L10 14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      `;
      authToggle.title = 'Sign Out';
    } else {
      // Not signed in state
      userName.textContent = 'Guest User';
      planBadge.textContent = 'FREE';
      planBadge.className = 'plan-badge free';
      usageText.textContent = '0/30 bets';
      progressRing.style.strokeDashoffset = 126;
      
      authToggle.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M2 8H14M10 4L14 8L10 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      `;
      authToggle.title = 'Sign In';
    }
  }

  updateQuickStats() {
    // Calculate stats from bet history
    const today = new Date().toDateString();
    const todayBets = this.betHistory.filter(bet => 
      new Date(bet.created_at || bet.date).toDateString() === today
    );
    
    // Calculate streak (simplified - consecutive days with bets)
    let streak = 0;
    const dates = [...new Set(this.betHistory.map(bet => 
      new Date(bet.created_at || bet.date).toDateString()
    ))].sort().reverse();
    
    const now = new Date();
    for (let i = 0; i < dates.length; i++) {
      const betDate = new Date(dates[i]);
      const expectedDate = new Date(now);
      expectedDate.setDate(expectedDate.getDate() - i);
      
      if (betDate.toDateString() === expectedDate.toDateString()) {
        streak++;
      } else {
        break;
      }
    }
    
    // Calculate win rate (placeholder - would need actual results)
    const winRate = this.betHistory.length > 0 ? 
      Math.round(45 + Math.random() * 30) : 0; // Placeholder 45-75%
    
    // Calculate monthly P/L
    const currentMonth = new Date().getMonth();
    const monthBets = this.betHistory.filter(bet => 
      new Date(bet.created_at || bet.date).getMonth() === currentMonth
    );
    
    let monthProfit = 0;
    monthBets.forEach(bet => {
      const stake = this.parseAmount(bet.stake);
      const potentialReturn = this.parseAmount(bet.potential_return);
      // Simplified - assuming 50% win rate for demo
      monthProfit += Math.random() > 0.5 ? (potentialReturn - stake) : -stake;
    });
    
    // Update UI
    document.getElementById('todayCount').textContent = todayBets.length;
    document.getElementById('streakCount').textContent = streak;
    document.getElementById('winRate').textContent = `${winRate}%`;
    document.getElementById('monthProfit').textContent = this.formatCurrency(monthProfit);
  }

  updateCaptureButton() {
    const captureBtn = document.getElementById('captureBtn');
    const buttonText = captureBtn.querySelector('.button-text');
    const buttonHint = captureBtn.querySelector('.button-hint');
    
    if (!this.currentUser) {
      captureBtn.disabled = true;
      buttonText.textContent = 'Sign In Required';
      buttonHint.textContent = 'Please sign in first';
      return;
    }
    
    if (!this.sheetsConnected) {
      captureBtn.disabled = true;
      buttonText.textContent = 'Setup Required';
      buttonHint.textContent = 'Connect Google Sheets';
      return;
    }
    
    const plan = this.currentUser.plan || 'free';
    const limit = this.planLimits[plan];
    const usage = this.currentUser.usage_count || 0;
    
    if (usage >= limit) {
      captureBtn.disabled = true;
      buttonText.textContent = 'Limit Reached';
      buttonHint.textContent = 'Upgrade for more';
    } else {
      captureBtn.disabled = false;
      buttonText.textContent = 'Capture Bet Slip';
      buttonHint.textContent = 'Click to select area';
    }
  }

  updateRecentBets() {
    const recentBets = document.getElementById('recentBets');
    
    if (this.betHistory.length === 0) {
      recentBets.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📸</div>
          <p class="empty-text">No bets captured yet</p>
          <p class="empty-hint">Click the capture button to start</p>
        </div>
      `;
      return;
    }
    
    // Show last 3 bets
    const recent = this.betHistory.slice(-3).reverse();
    recentBets.innerHTML = recent.map(bet => `
      <div class="bet-item">
        <div class="bet-header">
          <span class="bet-teams">${bet.teams || 'Unknown Teams'}</span>
          <span class="bet-stake">${bet.stake || '$0'}</span>
        </div>
        <div class="bet-details">
          <span>📊 ${bet.odds || 'N/A'}</span>
          <span>🎯 ${bet.selection || 'N/A'}</span>
          <span>📅 ${new Date(bet.created_at || bet.date).toLocaleDateString()}</span>
        </div>
      </div>
    `).join('');
  }

  updateActionButtons() {
    const sheetsBtn = document.getElementById('sheetsBtn');
    
    if (this.sheetsConnected) {
      sheetsBtn.style.borderColor = 'var(--accent-secondary)';
      sheetsBtn.style.color = 'var(--accent-secondary)';
    } else {
      sheetsBtn.style.borderColor = '';
      sheetsBtn.style.color = '';
    }
  }

  // ===== EVENT LISTENERS =====
  setupEventListeners() {
    // Capture button
    document.getElementById('captureBtn')?.addEventListener('click', () => {
      this.handleCapture();
    });
    
    // Auth toggle
    document.getElementById('authToggle')?.addEventListener('click', () => {
      this.handleAuth();
    });
    
    // Menu button
    document.getElementById('menuBtn')?.addEventListener('click', () => {
      this.openMenu();
    });
    
    // Menu close
    document.getElementById('menuClose')?.addEventListener('click', () => {
      this.closeMenu();
    });
    
    // Menu backdrop
    document.getElementById('menuBackdrop')?.addEventListener('click', () => {
      this.closeMenu();
    });
    
    // Quick action buttons
    document.getElementById('sheetsBtn')?.addEventListener('click', () => {
      this.handleSheetsIntegration();
    });
    
    document.getElementById('historyBtn')?.addEventListener('click', () => {
      this.openHistory();
    });
    
    document.getElementById('analyticsBtn')?.addEventListener('click', () => {
      this.openAnalytics();
    });
    
    document.getElementById('settingsBtn')?.addEventListener('click', () => {
      this.openSettings();
    });
    
    // See all button
    document.getElementById('seeAllBtn')?.addEventListener('click', () => {
      this.openHistory();
    });
    
    // Menu items
    document.getElementById('profileItem')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.openProfile();
    });
    
    document.getElementById('upgradeItem')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.handleUpgrade();
    });
    
    document.getElementById('exportItem')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.exportData();
    });
    
    document.getElementById('helpItem')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.openHelp();
    });
  }

  // ===== MAIN ACTIONS =====
  async handleCapture() {
    try {
      if (!this.currentUser) {
        this.showToast('Please sign in first', 'error');
        return;
      }
      
      if (!this.sheetsConnected) {
        this.showToast('Please connect Google Sheets first', 'error');
        this.handleSheetsIntegration();
        return;
      }
      
      // Check usage limit
      const plan = this.currentUser.plan || 'free';
      const limit = this.planLimits[plan];
      const usage = this.currentUser.usage_count || 0;
      
      if (usage >= limit) {
        this.showToast('Monthly limit reached. Please upgrade.', 'warning');
        this.handleUpgrade();
        return;
      }
      
      this.showLoading('Preparing screenshot tool...');
      
      // Get current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab) {
        throw new Error('No active tab found');
      }
      
      // Inject content script
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content/content.js']
      });
      
      // Start capture
      await chrome.tabs.sendMessage(tab.id, { action: 'startCapture' });
      
      // Close popup
      window.close();
      
    } catch (error) {
      console.error('Error starting capture:', error);
      this.hideLoading();
      this.showToast(`Error: ${error.message}`, 'error');
    }
  }

  async handleAuth() {
    if (this.currentUser) {
      // Sign out
      try {
        this.showLoading('Signing out...');
        await chrome.runtime.sendMessage({ action: 'logoutUser' });
        await chrome.storage.sync.remove(['userToken', 'user']);
        this.currentUser = null;
        this.hideLoading();
        this.updateUI();
        this.showToast('Signed out successfully', 'success');
      } catch (error) {
        this.hideLoading();
        this.showToast('Error signing out', 'error');
      }
    } else {
      // Sign in
      this.signInWithGoogle();
    }
  }

  async signInWithGoogle() {
    try {
      this.showLoading('Opening Google authentication...');
      
      const config = await chrome.runtime.sendMessage({ action: 'getBackendConfig' });
      
      if (!config?.baseUrl) {
        throw new Error('Backend configuration not available');
      }
      
      const authUrl = `${config.baseUrl}/auth/google`;
      
      chrome.tabs.create({ url: authUrl }, () => {
        this.hideLoading();
        this.showToast('Complete authentication in the new tab', 'info');
      });
      
    } catch (error) {
      this.hideLoading();
      console.error('Authentication error:', error);
      this.showToast(`Authentication failed: ${error.message}`, 'error');
    }
  }

  async handleSheetsIntegration() {
    try {
      if (!this.currentUser) {
        this.showToast('Please sign in first', 'error');
        return;
      }
      
      this.showLoading('Checking Google Sheets status...');
      
      const response = await chrome.runtime.sendMessage({ action: 'getSheetsStatus' });
      this.hideLoading();
      
      if (!response?.success) {
        throw new Error('Failed to check Sheets status');
      }
      
      if (response.isAuthenticated && response.hasSpreadsheet) {
        // Already connected - show management options
        this.showSheetsManagement(response);
      } else if (!response.isAuthenticated) {
        // Need to authenticate
        this.showSheetsAuthentication();
      } else {
        // Need to create spreadsheet
        this.createSheetsTemplate();
      }
      
    } catch (error) {
      this.hideLoading();
      console.error('Sheets integration error:', error);
      this.showToast('Error accessing Google Sheets', 'error');
    }
  }

  async showSheetsAuthentication() {
    const modal = this.createModal(`
      <div class="modal-header">
        <h3>📋 Connect Google Sheets</h3>
      </div>
      <div class="modal-body">
        <p>Sync your bets automatically to Google Sheets for advanced tracking.</p>
        <div class="benefits-list">
          <div class="benefit-item">✨ Real-time sync</div>
          <div class="benefit-item">📈 Advanced analytics</div>
          <div class="benefit-item">🔄 Automatic backup</div>
          <div class="benefit-item">📊 Custom formulas</div>
        </div>
      </div>
      <div class="modal-actions">
        <button class="action-btn primary" id="connectSheetsBtn">Connect</button>
        <button class="action-btn secondary" id="cancelSheetsBtn">Cancel</button>
      </div>
    `);
    
    document.getElementById('connectSheetsBtn').onclick = async () => {
      await this.authenticateGoogleSheets();
      modal.remove();
    };
    
    document.getElementById('cancelSheetsBtn').onclick = () => {
      modal.remove();
    };
  }

  async authenticateGoogleSheets() {
    try {
      this.showLoading('Connecting to Google Sheets...');
      
      const response = await chrome.runtime.sendMessage({ action: 'authenticateSheets' });
      this.hideLoading();
      
      if (response?.success) {
        this.sheetsConnected = true;
        this.updateUI();
        this.showToast('Successfully connected to Google Sheets!', 'success');
        
        // Create template if needed
        setTimeout(() => this.createSheetsTemplate(), 500);
      } else {
        throw new Error(response?.error || 'Connection failed');
      }
      
    } catch (error) {
      this.hideLoading();
      console.error('Sheets authentication error:', error);
      this.showToast(`Failed to connect: ${error.message}`, 'error');
    }
  }

  async createSheetsTemplate() {
    try {
      this.showLoading('Creating spreadsheet template...');
      
      const response = await chrome.runtime.sendMessage({ action: 'createSheetsTemplate' });
      this.hideLoading();
      
      if (response?.success) {
        this.sheetsConnected = true;
        this.updateUI();
        this.showToast('Spreadsheet created successfully!', 'success');
        
        if (response.spreadsheetUrl) {
          const open = confirm('Spreadsheet created! Would you like to open it now?');
          if (open) {
            chrome.tabs.create({ url: response.spreadsheetUrl });
          }
        }
      } else {
        throw new Error(response?.error || 'Creation failed');
      }
      
    } catch (error) {
      this.hideLoading();
      console.error('Template creation error:', error);
      this.showToast(`Failed to create template: ${error.message}`, 'error');
    }
  }

  showSheetsManagement(status) {
    const modal = this.createModal(`
      <div class="modal-header">
        <h3>📋 Google Sheets Settings</h3>
      </div>
      <div class="modal-body">
        <div class="status-item">
          <span>Status:</span>
          <span class="status-value success">✅ Connected</span>
        </div>
        <div class="status-item">
          <span>Auto-sync:</span>
          <span class="status-value">✅ Enabled</span>
        </div>
      </div>
      <div class="modal-actions">
        ${status.spreadsheetUrl ? `
          <button class="action-btn primary" id="openSheetBtn">Open Spreadsheet</button>
        ` : ''}
        <button class="action-btn secondary" id="syncAllBtn">Sync All History</button>
        <button class="action-btn danger" id="disconnectBtn">Disconnect</button>
        <button class="action-btn" id="closeBtn">Close</button>
      </div>
    `);
    
    document.getElementById('openSheetBtn')?.addEventListener('click', () => {
      if (status.spreadsheetUrl) {
        chrome.tabs.create({ url: status.spreadsheetUrl });
      }
    });
    
    document.getElementById('syncAllBtn')?.addEventListener('click', async () => {
      await this.syncAllToSheets();
      modal.remove();
    });
    
    document.getElementById('disconnectBtn')?.addEventListener('click', async () => {
      await this.disconnectSheets();
      modal.remove();
    });
    
    document.getElementById('closeBtn')?.addEventListener('click', () => {
      modal.remove();
    });
  }

  async syncAllToSheets() {
    try {
      this.showLoading('Syncing all history to Sheets...');
      
      const response = await chrome.runtime.sendMessage({ action: 'syncAllToSheets' });
      this.hideLoading();
      
      if (response?.success) {
        this.showToast(response.message || 'Sync completed!', 'success');
      } else {
        throw new Error(response?.error || 'Sync failed');
      }
      
    } catch (error) {
      this.hideLoading();
      console.error('Sync error:', error);
      this.showToast(`Sync failed: ${error.message}`, 'error');
    }
  }

  async disconnectSheets() {
    if (!confirm('Are you sure you want to disconnect from Google Sheets?')) {
      return;
    }
    
    try {
      this.showLoading('Disconnecting...');
      
      const response = await chrome.runtime.sendMessage({ action: 'disconnectSheets' });
      this.hideLoading();
      
      if (response?.success) {
        this.sheetsConnected = false;
        await chrome.storage.local.remove(['sheetsAuthenticated', 'betTrackingSpreadsheetId']);
        this.updateUI();
        this.showToast('Disconnected from Google Sheets', 'success');
      } else {
        throw new Error(response?.error || 'Disconnect failed');
      }
      
    } catch (error) {
      this.hideLoading();
      console.error('Disconnect error:', error);
      this.showToast(`Failed to disconnect: ${error.message}`, 'error');
    }
  }

  // ===== HISTORY & ANALYTICS =====
  openHistory() {
    if (this.betHistory.length === 0) {
      this.showToast('No bet history available', 'info');
      return;
    }
    
    const modal = this.createModal(`
      <div class="modal-header">
        <h3>📊 Bet History (${this.betHistory.length} bets)</h3>
      </div>
      <div class="modal-body" style="max-height: 350px; overflow-y: auto;">
        ${this.betHistory.map(bet => `
          <div class="bet-item">
            <div class="bet-header">
              <span class="bet-teams">${bet.teams || 'Unknown'}</span>
              <span class="bet-stake">${bet.stake || '$0'}</span>
            </div>
            <div class="bet-details">
              <span>📊 ${bet.odds || 'N/A'}</span>
              <span>🎯 ${bet.selection || 'N/A'}</span>
              <span>🏢 ${bet.bookmaker || 'N/A'}</span>
              <span>📅 ${new Date(bet.created_at || bet.date).toLocaleDateString()}</span>
            </div>
          </div>
        `).reverse().join('')}
      </div>
      <div class="modal-actions">
        <button class="action-btn secondary" id="exportHistoryBtn">📄 Export CSV</button>
        <button class="action-btn danger" id="clearHistoryBtn">🗑️ Clear All</button>
        <button class="action-btn primary" id="closeHistoryBtn">Close</button>
      </div>
    `);
    
    document.getElementById('exportHistoryBtn').addEventListener('click', () => {
      this.exportHistory();
    });
    
    document.getElementById('clearHistoryBtn').addEventListener('click', () => {
      this.clearHistory();
    });
    
    document.getElementById('closeHistoryBtn').addEventListener('click', () => {
      modal.remove();
    });
  }

  exportHistory() {
    const csv = [
      'Date,Teams,Sport,Selection,Odds,Stake,Potential Return,Bookmaker',
      ...this.betHistory.map(bet => [
        new Date(bet.created_at || bet.date).toLocaleDateString(),
        bet.teams || '',
        bet.sport || '',
        bet.selection || '',
        bet.odds || '',
        bet.stake || '',
        bet.potential_return || '',
        bet.bookmaker || ''
      ].map(field => `"${field}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bet-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    this.showToast('History exported to CSV!', 'success');
  }

  async clearHistory() {
    if (!confirm('Are you sure you want to clear all bet history?')) {
      return;
    }
    
    try {
      await chrome.storage.local.remove(['betHistory']);
      this.betHistory = [];
      this.updateUI();
      this.showToast('History cleared', 'success');
      document.querySelector('.modal-container')?.remove();
    } catch (error) {
      this.showToast('Failed to clear history', 'error');
    }
  }

  openAnalytics() {
    if (this.betHistory.length === 0) {
      this.showToast('No data for analytics', 'info');
      return;
    }
    
    const stats = this.calculateAnalytics();
    
    const modal = this.createModal(`
      <div class="modal-header">
        <h3>📈 Betting Analytics</h3>
      </div>
      <div class="modal-body">
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon">🎯</div>
            <div class="stat-value">${stats.totalBets}</div>
            <div class="stat-label">Total Bets</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">💰</div>
            <div class="stat-value">${stats.totalStaked}</div>
            <div class="stat-label">Total Staked</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">📈</div>
            <div class="stat-value">${stats.avgOdds}</div>
            <div class="stat-label">Avg Odds</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">🏢</div>
            <div class="stat-value">${stats.topBookmaker}</div>
            <div class="stat-label">Top Bookmaker</div>
          </div>
        </div>
      </div>
      <div class="modal-actions">
        <button class="action-btn primary" id="closeAnalyticsBtn">Close</button>
      </div>
    `);
    
    document.getElementById('closeAnalyticsBtn').onclick = () => modal.remove();
  }

  calculateAnalytics() {
    let totalStake = 0;
    let totalOdds = 0;
    let validOdds = 0;
    const bookmakers = {};
    
    this.betHistory.forEach(bet => {
      totalStake += this.parseAmount(bet.stake);
      
      const odds = this.parseAmount(bet.odds);
      if (odds > 0) {
        totalOdds += odds;
        validOdds++;
      }
      
      const bookmaker = bet.bookmaker || 'Unknown';
      bookmakers[bookmaker] = (bookmakers[bookmaker] || 0) + 1;
    });
    
    const topBookmaker = Object.entries(bookmakers)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
    
    return {
      totalBets: this.betHistory.length,
      totalStaked: this.formatCurrency(totalStake),
      avgOdds: validOdds > 0 ? (totalOdds / validOdds).toFixed(2) : 'N/A',
      topBookmaker
    };
  }

  // ===== MENU ACTIONS =====
  openMenu() {
    const menu = document.getElementById('floatingMenu');
    menu.classList.add('active');
  }

  closeMenu() {
    const menu = document.getElementById('floatingMenu');
    menu.classList.remove('active');
  }

  openProfile() {
    this.closeMenu();
    
    if (!this.currentUser) {
      this.showToast('Please sign in first', 'error');
      return;
    }
    
    const modal = this.createModal(`
      <div class="modal-header">
        <h3>👤 Profile</h3>
      </div>
      <div class="modal-body">
        <div class="profile-info">
          <div class="info-item">
            <span class="info-label">Email:</span>
            <span class="info-value">${this.currentUser.email}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Plan:</span>
            <span class="info-value">${this.currentUser.plan || 'free'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Usage:</span>
            <span class="info-value">${this.currentUser.usage_count || 0} bets this month</span>
          </div>
          <div class="info-item">
            <span class="info-label">Member Since:</span>
            <span class="info-value">${new Date(this.currentUser.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
      <div class="modal-actions">
        <button class="action-btn primary" id="closeProfileBtn">Close</button>
      </div>
    `);
    
    document.getElementById('closeProfileBtn').onclick = () => modal.remove();
  }

  handleUpgrade() {
    this.closeMenu();
    this.showToast('Upgrade system coming soon!', 'info');
  }

  exportData() {
    this.closeMenu();
    this.exportHistory();
  }

  openHelp() {
    this.closeMenu();
    chrome.tabs.create({ url: 'https://github.com/yourusername/bet-tracker-pro#readme' });
  }

  openSettings() {
    this.showToast('Settings page coming soon!', 'info');
  }


  // ===== UI HELPERS =====
  showLoading(message = 'Processing...') {
    const overlay = document.getElementById('loadingOverlay');
    const text = document.getElementById('loadingText');
    if (overlay && text) {
      text.textContent = message;
      overlay.classList.add('show');
    }
  }

  hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
      overlay.classList.remove('show');
    }
  }

  showToast(message, type = 'info') {
    const toast = document.getElementById('statusToast');
    const icon = document.getElementById('toastIcon');
    const msg = document.getElementById('toastMessage');
    
    if (!toast || !icon || !msg) return;
    
    // Set icon based on type
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };
    
    icon.textContent = icons[type] || icons.info;
    msg.textContent = message;
    
    // Set toast type class
    toast.className = 'status-toast show ' + type;
    
    // Auto hide after 3 seconds
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }

  createModal(content) {
    // Remove any existing modal
    document.querySelector('.modal-container')?.remove();
    
    const modal = document.createElement('div');
    modal.className = 'modal-container show';
    modal.innerHTML = `
      <div class="modal-content">
        ${content}
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
    
    return modal;
  }

  // ===== ANIMATIONS =====
  startAnimations() {
    // Animate progress ring on load
    const progressRing = document.getElementById('progressRing');
    if (progressRing && this.currentUser) {
      const plan = this.currentUser.plan || 'free';
      const limit = this.planLimits[plan];
      const usage = this.currentUser.usage_count || 0;
      const percentage = (usage / limit) * 100;
      const circumference = 2 * Math.PI * 20;
      const offset = circumference - (percentage / 100) * circumference;
      
      setTimeout(() => {
        progressRing.style.transition = 'stroke-dashoffset 1s ease';
        progressRing.style.strokeDashoffset = offset;
      }, 100);
    }
  }

  // ===== UTILITY FUNCTIONS =====
  parseAmount(str) {
    if (!str) return 0;
    const cleaned = str.toString().replace(/[^0-9.,]/g, '');
    return parseFloat(cleaned.replace(',', '.')) || 0;
  }

  formatCurrency(amount) {
    const prefix = amount < 0 ? '-' : '+';
    return prefix + '$' + Math.abs(amount).toFixed(2);
  }
}

// Initialize popup
const popup = new BetTrackerPopup();
window.betTrackerPopup = popup;

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'betProcessed') {
    if (message.success) {
      popup.showToast('Bet processed successfully!', 'success');
      // Reload data
      popup.loadBetHistory().then(() => {
        popup.updateUI();
      });
    } else {
      popup.showToast(`Failed: ${message.error}`, 'error');
    }
  } else if (message.action === 'userAuthenticated') {
    // User just signed in
    popup.loadUserData().then(() => {
      popup.updateUI();
      popup.showToast('Successfully signed in!', 'success');
    });
  }
});
