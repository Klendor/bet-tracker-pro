// Popup functionality for Bet Tracker Pro
class BetTrackerPopup {
  constructor() {
    this.currentUser = null;
    this.planLimits = {
      free: 30,
      pro: 1000,
      proplus: 10000
    };
    
    this.init();
  }

  async init() {
    await this.loadUserData();
    await this.loadThemePreference();
    this.setupEventListeners();
    this.updateUI();
  }

  setupEventListeners() {
    // Main capture button
    document.getElementById('captureBtn').addEventListener('click', () => {
      this.handleCapture();
    });

    // Authentication button
    document.getElementById('authBtn').addEventListener('click', () => {
      this.handleAuth();
    });

    // History button
    document.getElementById('historyBtn').addEventListener('click', () => {
      this.openHistory();
    });

    // Analytics button
    document.getElementById('analyticsBtn').addEventListener('click', () => {
      this.openAnalytics();
    });

    // Google Sheets button
    document.getElementById('sheetsBtn').addEventListener('click', () => {
      this.handleSheetsIntegration();
    });

    // Upgrade link
    document.getElementById('upgradeLink').addEventListener('click', () => {
      this.showUpgradePrompt();
    });

    // Upgrade prompt buttons
    document.getElementById('upgradeNowBtn').addEventListener('click', () => {
      this.handleUpgrade();
    });

    document.getElementById('closePromptBtn').addEventListener('click', () => {
      this.hideUpgradePrompt();
    });

    // Dark mode toggle
    document.getElementById('darkModeToggle').addEventListener('click', () => {
      this.toggleDarkMode();
    });

    // Check for updates button (if available)
    const updateBtn = document.getElementById('updateBtn');
    if (updateBtn) {
      updateBtn.addEventListener('click', () => {
        this.checkForUpdates();
      });
    }
  }

  async loadUserData() {
    try {
      // Check if there's a stored token from recent auth
      const storage = await chrome.storage.sync.get(['userToken', 'user']);
      
      if (storage.userToken) {
        // We have a token - get fresh user info
        const response = await chrome.runtime.sendMessage({ 
          action: 'getUserInfo',
          token: storage.userToken 
        });
        
        if (response.success) {
          this.currentUser = response.user;
          
          // Check if this is a new authentication (no previous user data)
          if (!storage.user || storage.user.id !== response.user.id) {
            this.showStatus('✅ Successfully signed in!', 'success');
          }
        } else {
          // Token might be invalid, clear it
          await chrome.storage.sync.remove(['userToken', 'user']);
          this.currentUser = null;
        }
      } else {
        // No token - user not authenticated
        this.currentUser = null;
      }
      
      // Check for available updates
      await this.checkUpdateStatus();
      
    } catch (error) {
      console.error('Error loading user data:', error);
      this.currentUser = null;
      this.showStatus('Error loading user data', 'error');
    }
  }

  updateUI() {
    this.updateUserStatus();
    this.updateUsageDisplay();
    this.updateCaptureButton();
  }

  updateUserStatus() {
    const userEmail = document.getElementById('userEmail');
    const authBtn = document.getElementById('authBtn');

    if (this.currentUser) {
      userEmail.textContent = this.currentUser.email;
      authBtn.textContent = 'Sign Out';
    } else {
      userEmail.textContent = 'Not signed in';
      authBtn.textContent = 'Sign In';
    }
  }

  updateUsageDisplay() {
    const planName = document.getElementById('planName');
    const usageCount = document.getElementById('usageCount');
    const usageLimit = document.getElementById('usageLimit');
    const usageFill = document.getElementById('usageFill');
    const resetDate = document.getElementById('resetDate');

    if (!this.currentUser) {
      // Show sign-in required state
      planName.textContent = 'Sign In Required';
      usageCount.textContent = '0';
      usageLimit.textContent = '0';
      usageFill.style.width = '0%';
      resetDate.textContent = 'Please sign in';
      return;
    }

    const plan = this.currentUser.plan || 'free';
    const limit = this.planLimits[plan];
    const count = this.currentUser.usage_count || 0;
    const percentage = (count / limit) * 100;

    // Update plan name
    const planNames = {
      free: 'Free Plan',
      pro: 'Pro Plan',
      proplus: 'Pro Plus Plan'
    };
    planName.textContent = planNames[plan];

    // Update usage numbers
    usageCount.textContent = count.toLocaleString();
    usageLimit.textContent = limit.toLocaleString();

    // Update usage bar
    usageFill.style.width = `${Math.min(percentage, 100)}%`;
    
    // Update bar color based on usage
    usageFill.className = 'usage-fill';
    if (percentage >= 90) {
      usageFill.classList.add('danger');
    } else if (percentage >= 75) {
      usageFill.classList.add('warning');
    }

    // Update reset date
    if (this.currentUser.usage_reset_date) {
      const resetDateObj = new Date(this.currentUser.usage_reset_date);
      resetDate.textContent = resetDateObj.toLocaleDateString();
    } else {
      resetDate.textContent = 'End of month';
    }

    // Show upgrade link for free users
    const upgradeLink = document.getElementById('upgradeLink');
    upgradeLink.style.display = plan === 'free' ? 'block' : 'none';
  }

  updateCaptureButton() {
    const captureBtn = document.getElementById('captureBtn');
    
    if (!this.currentUser) {
      captureBtn.disabled = true;
      captureBtn.textContent = '🔐 Sign In to Capture';
      return;
    }
    
    // Check if Google Sheets is set up (mandatory requirement)
    if (!this.currentUser.sheets_connected) {
      captureBtn.disabled = true;
      captureBtn.textContent = '📋 Complete Google Sheets Setup';
      captureBtn.addEventListener('click', () => {
        this.showMandatorySheetsOnboarding();
      });
      return;
    }

    const plan = this.currentUser.plan || 'free';
    const limit = this.planLimits[plan];
    const count = this.currentUser.usage_count || 0;

    if (count >= limit) {
      captureBtn.disabled = true;
      captureBtn.textContent = '🚫 Monthly Limit Reached';
    } else {
      captureBtn.disabled = false;
      captureBtn.textContent = '📸 Capture Bet Slip';
    }
  }

  async handleCapture() {
    // Check if user is signed in
    if (!this.currentUser) {
      this.showStatus('Please sign in to capture bet slips', 'error');
      return;
    }

    const plan = this.currentUser.plan || 'free';
    const limit = this.planLimits[plan];
    const count = this.currentUser.usage_count || 0;

    // Check usage limit
    if (count >= limit) {
      this.showUpgradePrompt();
      return;
    }

    try {
      this.showLoading('Preparing screenshot tool...');

      // Get current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab) {
        throw new Error('No active tab found');
      }

      // Inject content script and start capture
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content/content.js']
      });

      // Send message to content script to start capture
      await chrome.tabs.sendMessage(tab.id, { action: 'startCapture' });

      // Close popup
      window.close();

    } catch (error) {
      console.error('Error starting capture:', error);
      this.showStatus('Error starting capture: ' + error.message, 'error');
      this.hideLoading();
    }
  }

  async handleAuth() {
    if (this.currentUser) {
      // Sign out
      try {
        await chrome.runtime.sendMessage({ action: 'logoutUser' });
        this.currentUser = null;
        this.updateUI();
        this.showStatus('Signed out successfully', 'success');
      } catch (error) {
        this.showStatus('Error signing out', 'error');
      }
    } else {
      // Sign in with Google OAuth
      this.signInWithGoogle();
    }
  }
  
  async signInWithGoogle() {
    try {
      this.showLoading('Opening Google authentication...');
      
      // Get backend configuration
      const config = await chrome.runtime.sendMessage({ action: 'getBackendConfig' });
      
      if (!config || !config.baseUrl) {
        throw new Error('Backend configuration not available');
      }
      
      // Open Google OAuth flow
      const authUrl = `${config.baseUrl}/auth/google`;
      
      chrome.tabs.create({ url: authUrl }, (tab) => {
        this.hideLoading();
        this.showStatus('Complete authentication in the new tab. Extension will automatically detect completion.', 'info');
        
        // Don't close popup - let user complete auth and it will auto-detect
      });
      
    } catch (error) {
      this.hideLoading();
      console.error('Google authentication error:', error);
      this.showStatus('❌ Authentication failed: ' + error.message, 'error');
    }
  }

  async simulateSignIn() {
    try {
      this.showLoading('Signing in with demo account...');
      
      // Use real backend authentication with demo credentials
      const response = await chrome.runtime.sendMessage({
        action: 'authenticateUser',
        authData: {
          email: 'demo@bettracker.com',
          password: 'demo123'
        }
      });
      
      this.hideLoading();
      
      if (response && response.success) {
        this.currentUser = response.user;
        
        // Check if this is a new user or returning user
        const sheetsStatus = await chrome.runtime.sendMessage({ action: 'getSheetsStatus' });
        
        if (!sheetsStatus.isAuthenticated || !sheetsStatus.hasSpreadsheet) {
          // New user or incomplete setup - MANDATORY Google Sheets setup
          this.showMandatorySheetsOnboarding();
        } else {
          // Existing user with complete setup
          this.updateUI();
          this.showStatus('✅ Welcome back! All systems ready.', 'success');
        }
      } else {
        throw new Error(response?.error || 'Authentication failed');
      }
    } catch (error) {
      this.hideLoading();
      console.error('Demo authentication error:', error);
      
      if (error.message.includes('connect')) {
        this.showStatus('❌ Backend server not running. Please start the backend.', 'error');
      } else {
        this.showStatus('❌ Demo authentication failed: ' + error.message, 'error');
      }
    }
  }

  showUpgradePrompt() {
    document.getElementById('upgradePrompt').style.display = 'flex';
  }

  hideUpgradePrompt() {
    document.getElementById('upgradePrompt').style.display = 'none';
  }

  handleUpgrade() {
    // This would normally open the payment flow
    this.showStatus('Payment system coming soon!', 'info');
    this.hideUpgradePrompt();
  }

  openHistory() {
    // Open local history instead of external URL
    this.openLocalHistory();
  }

  async openLocalHistory() {
    try {
      // Get local bet history from storage
      const result = await chrome.storage.local.get(['betHistory']);
      const history = result.betHistory || [];
      
      if (history.length === 0) {
        this.showStatus('No bet history found. Process some bet slips first!', 'info');
        return;
      }
      
      // Create enhanced history display with search and filters
      const historyHtml = `
        <div class="history-display">
          <h3>📊 Enhanced Bet History (${history.length} bets)</h3>
          
          <!-- Search and Filter Controls -->
          <div class="history-controls">
            <div class="search-section">
              <input type="text" id="historySearch" placeholder="🔍 Search teams, bookmaker, or selection..." class="search-input">
            </div>
            <div class="filter-section">
              <select id="sportFilter" class="filter-select">
                <option value="">All Sports</option>
                <option value="soccer">Soccer</option>
                <option value="basketball">Basketball</option>
                <option value="football">Football</option>
                <option value="tennis">Tennis</option>
                <option value="baseball">Baseball</option>
              </select>
              <select id="dateFilter" class="filter-select">
                <option value="">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
              <select id="bookmakerFilter" class="filter-select">
                <option value="">All Bookmakers</option>
                ${this.getUniqueBookmakers(history).map(bookmaker => 
                  `<option value="${bookmaker}">${bookmaker}</option>`
                ).join('')}
              </select>
            </div>
          </div>
          
          <!-- Results Summary -->
          <div class="results-summary" id="resultsSummary">
            Showing ${history.length} bets
          </div>
          
          <div class="history-list" id="historyList">
            ${this.renderHistoryItems(history)}
          </div>
          
          <div class="history-actions">
            <button id="exportHistoryBtn" class="result-btn secondary">📄 Export CSV</button>
            <button id="exportExcelBtn" class="result-btn secondary">📈 Export Excel</button>
            <button id="clearHistoryBtn" class="result-btn danger">🗑️ Clear All</button>
            <button id="closeHistoryBtn" class="result-btn primary">Close</button>
          </div>
        </div>
      `;
      
      this.showResultModal(historyHtml);
      
      // Initialize search and filter functionality
      this.initializeHistoryFilters(history);
      
      // Add event listeners for history actions
      document.getElementById('exportHistoryBtn')?.addEventListener('click', () => {
        this.exportHistoryCSV(this.getFilteredHistory());
      });
      
      document.getElementById('exportExcelBtn')?.addEventListener('click', () => {
        this.exportHistoryExcel(this.getFilteredHistory());
      });
      
      document.getElementById('clearHistoryBtn')?.addEventListener('click', () => {
        this.clearBetHistory();
      });
      
      document.getElementById('closeHistoryBtn')?.addEventListener('click', () => {
        document.getElementById('resultModal').style.display = 'none';
      });
      
    } catch (error) {
      console.error('Error loading history:', error);
      this.showStatus('Error loading bet history', 'error');
    }
  }

  exportHistoryCSV(history) {
    const csvContent = [
      'Date,Teams,Sport,Bet Type,Selection,Odds,Stake,Potential Return,Bookmaker,Status',
      ...history.map(bet => [
        bet.date || new Date(bet.created_at).toLocaleDateString(),
        bet.teams || '',
        bet.sport || '',
        bet.bet_type || '',
        bet.selection || '',
        bet.odds || '',
        bet.stake || '',
        bet.potential_return || '',
        bet.bookmaker || '',
        bet.status || 'pending'
      ].map(field => `"${field}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bet-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    this.showStatus('✅ History exported to CSV!', 'success');
  }

  exportHistoryExcel(history) {
    // Create Excel-compatible CSV with enhanced formatting
    const excelContent = [
      'Date\tTeams\tSport\tBet Type\tSelection\tOdds\tStake\tPotential Return\tBookmaker\tProfit/Loss\tROI%',
      ...history.map(bet => {
        const stake = this.parseStakeAmount(bet.stake);
        const potentialReturn = this.parseStakeAmount(bet.potential_return);
        const profit = potentialReturn - stake;
        const roi = stake > 0 ? ((profit / stake) * 100).toFixed(2) : '0';
        
        return [
          bet.date || new Date(bet.created_at).toLocaleDateString(),
          bet.teams || '',
          bet.sport || '',
          bet.bet_type || '',
          bet.selection || '',
          bet.odds || '',
          bet.stake || '',
          bet.potential_return || '',
          bet.bookmaker || '',
          profit.toFixed(2),
          roi + '%'
        ].join('\t');
      })
    ].join('\n');
    
    const blob = new Blob([excelContent], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bet-analysis-${new Date().toISOString().split('T')[0]}.xls`;
    a.click();
    URL.revokeObjectURL(url);
    
    this.showStatus('✅ Enhanced analysis exported to Excel!', 'success');
  }

  async openAnalytics() {
    try {
      const result = await chrome.storage.local.get(['betHistory']);
      const history = result.betHistory || [];
      
      if (history.length === 0) {
        this.showStatus('No bet data available for analytics. Process some bet slips first!', 'info');
        return;
      }
      
      const analytics = this.calculateAnalytics(history);
      
      const analyticsHtml = `
        <div class="analytics-display">
          <h3>📈 Betting Analytics</h3>
          
          <div class="analytics-grid">
            <div class="analytics-card">
              <div class="card-header">🎯 Total Bets</div>
              <div class="card-value">${analytics.totalBets}</div>
            </div>
            <div class="analytics-card">
              <div class="card-header">💰 Total Staked</div>
              <div class="card-value">${analytics.totalStaked}</div>
            </div>
            <div class="analytics-card">
              <div class="card-header">📈 Potential Returns</div>
              <div class="card-value">${analytics.potentialReturns}</div>
            </div>
            <div class="analytics-card">
              <div class="card-header">🏆 Win Rate</div>
              <div class="card-value">${analytics.winRate}%</div>
            </div>
          </div>
          
          <div class="analytics-charts">
            <div class="chart-section">
              <h4>🎮 Sports Distribution</h4>
              <div class="chart-bars">
                ${Object.entries(analytics.sportDistribution).map(([sport, count]) => `
                  <div class="chart-bar">
                    <span class="bar-label">${sport || 'Unknown'}</span>
                    <div class="bar-fill" style="width: ${(count / analytics.totalBets) * 100}%"></div>
                    <span class="bar-value">${count}</span>
                  </div>
                `).join('')}
              </div>
            </div>
            
            <div class="chart-section">
              <h4>🏢 Bookmaker Performance</h4>
              <div class="chart-bars">
                ${Object.entries(analytics.bookmakerDistribution).map(([bookmaker, count]) => `
                  <div class="chart-bar">
                    <span class="bar-label">${bookmaker || 'Unknown'}</span>
                    <div class="bar-fill" style="width: ${(count / analytics.totalBets) * 100}%"></div>
                    <span class="bar-value">${count}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
          
          <div class="analytics-actions">
            <button id="exportAnalyticsBtn" class="result-btn secondary">📄 Export Report</button>
            <button id="closeAnalyticsBtn" class="result-btn primary">Close</button>
          </div>
        </div>
      `;
      
      this.showResultModal(analyticsHtml);
      
      document.getElementById('exportAnalyticsBtn')?.addEventListener('click', () => {
        this.exportAnalyticsReport(analytics, history);
      });
      
      document.getElementById('closeAnalyticsBtn')?.addEventListener('click', () => {
        document.getElementById('resultModal').style.display = 'none';
      });
      
    } catch (error) {
      console.error('Error loading analytics:', error);
      this.showStatus('Error loading analytics', 'error');
    }
  }

  calculateAnalytics(history) {
    const analytics = {
      totalBets: history.length,
      totalStaked: 0,
      potentialReturns: 0,
      winRate: 0,
      sportDistribution: {},
      bookmakerDistribution: {},
      averageOdds: 0
    };
    
    let totalOdds = 0;
    let validOddsCount = 0;
    
    history.forEach(bet => {
      // Calculate financial metrics
      const stake = this.parseStakeAmount(bet.stake);
      const potentialReturn = this.parseStakeAmount(bet.potential_return);
      
      analytics.totalStaked += stake;
      analytics.potentialReturns += potentialReturn;
      
      // Track sports distribution
      const sport = bet.sport || 'Unknown';
      analytics.sportDistribution[sport] = (analytics.sportDistribution[sport] || 0) + 1;
      
      // Track bookmaker distribution
      const bookmaker = bet.bookmaker || 'Unknown';
      analytics.bookmakerDistribution[bookmaker] = (analytics.bookmakerDistribution[bookmaker] || 0) + 1;
      
      // Calculate average odds
      const odds = this.parseOdds(bet.odds);
      if (odds > 0) {
        totalOdds += odds;
        validOddsCount++;
      }
    });
    
    // Format financial values
    analytics.totalStaked = this.formatCurrency(analytics.totalStaked);
    analytics.potentialReturns = this.formatCurrency(analytics.potentialReturns);
    
    // Calculate average odds
    analytics.averageOdds = validOddsCount > 0 ? (totalOdds / validOddsCount).toFixed(2) : '0.00';
    
    // Calculate win rate (for now, simulated - would need actual results)
    analytics.winRate = Math.round(Math.random() * 30 + 45); // Placeholder: 45-75%
    
    return analytics;
  }

  getUniqueBookmakers(history) {
    const bookmakers = new Set();
    history.forEach(bet => {
      if (bet.bookmaker && bet.bookmaker !== 'Unknown') {
        bookmakers.add(bet.bookmaker);
      }
    });
    return Array.from(bookmakers).sort();
  }

  renderHistoryItems(history) {
    return history.map((bet, index) => `
      <div class="history-item" data-sport="${bet.sport || ''}" data-bookmaker="${bet.bookmaker || ''}" data-date="${bet.date || ''}">
        <div class="bet-summary">
          <strong>${bet.teams || 'Bet #' + (index + 1)}</strong>
          <span class="bet-stake">${bet.stake || 'Unknown stake'}</span>
        </div>
        <div class="bet-details">
          <span>🎯 ${bet.selection || 'Unknown selection'}</span>
          <span>📊 ${bet.odds || 'No odds'}</span>
          <span>🏢 ${bet.bookmaker || 'Unknown'}</span>
          <span>🗺 ${bet.date || new Date(bet.created_at).toLocaleDateString()}</span>
        </div>
      </div>
    `).join('');
  }

  initializeHistoryFilters(history) {
    const searchInput = document.getElementById('historySearch');
    const sportFilter = document.getElementById('sportFilter');
    const dateFilter = document.getElementById('dateFilter');
    const bookmakerFilter = document.getElementById('bookmakerFilter');
    
    this.originalHistory = history;
    
    const applyFilters = () => {
      const filtered = this.getFilteredHistory();
      document.getElementById('historyList').innerHTML = this.renderHistoryItems(filtered);
      document.getElementById('resultsSummary').textContent = `Showing ${filtered.length} of ${history.length} bets`;
    };
    
    searchInput?.addEventListener('input', applyFilters);
    sportFilter?.addEventListener('change', applyFilters);
    dateFilter?.addEventListener('change', applyFilters);
    bookmakerFilter?.addEventListener('change', applyFilters);
  }

  getFilteredHistory() {
    if (!this.originalHistory) return [];
    
    const searchTerm = document.getElementById('historySearch')?.value.toLowerCase() || '';
    const sportFilter = document.getElementById('sportFilter')?.value || '';
    const dateFilter = document.getElementById('dateFilter')?.value || '';
    const bookmakerFilter = document.getElementById('bookmakerFilter')?.value || '';
    
    return this.originalHistory.filter(bet => {
      // Search filter
      if (searchTerm) {
        const searchableText = [
          bet.teams,
          bet.selection,
          bet.bookmaker,
          bet.sport
        ].join(' ').toLowerCase();
        
        if (!searchableText.includes(searchTerm)) {
          return false;
        }
      }
      
      // Sport filter
      if (sportFilter && bet.sport !== sportFilter) {
        return false;
      }
      
      // Bookmaker filter
      if (bookmakerFilter && bet.bookmaker !== bookmakerFilter) {
        return false;
      }
      
      // Date filter
      if (dateFilter) {
        const betDate = new Date(bet.date || bet.created_at);
        const now = new Date();
        
        switch (dateFilter) {
          case 'today':
            if (betDate.toDateString() !== now.toDateString()) return false;
            break;
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            if (betDate < weekAgo) return false;
            break;
          case 'month':
            const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
            if (betDate < monthAgo) return false;
            break;
        }
      }
      
      return true;
    });
  }

  async clearBetHistory() {
    if (confirm('⚠️ Are you sure you want to clear all bet history? This cannot be undone.')) {
      try {
        await chrome.storage.local.remove(['betHistory']);
        this.showStatus('✅ Bet history cleared successfully', 'success');
        document.getElementById('resultModal').style.display = 'none';
      } catch (error) {
        this.showStatus('❌ Error clearing history', 'error');
      }
    }
  }

  exportAnalyticsReport(analytics, history) {
    const reportContent = [
      'BET TRACKER PRO - ANALYTICS REPORT',
      `Generated: ${new Date().toLocaleString()}`,
      '',
      'SUMMARY',
      `Total Bets: ${analytics.totalBets}`,
      `Total Staked: ${analytics.totalStaked}`,
      `Potential Returns: ${analytics.potentialReturns}`,
      `Win Rate: ${analytics.winRate}%`,
      `Average Odds: ${analytics.averageOdds}`,
      '',
      'SPORTS DISTRIBUTION',
      ...Object.entries(analytics.sportDistribution).map(([sport, count]) => 
        `${sport}: ${count} bets (${((count / analytics.totalBets) * 100).toFixed(1)}%)`
      ),
      '',
      'BOOKMAKER DISTRIBUTION',
      ...Object.entries(analytics.bookmakerDistribution).map(([bookmaker, count]) => 
        `${bookmaker}: ${count} bets (${((count / analytics.totalBets) * 100).toFixed(1)}%)`
      )
    ].join('\n');
    
    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `betting-analytics-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    
    this.showStatus('✅ Analytics report exported!', 'success');
  }

  parseStakeAmount(stakeStr) {
    if (!stakeStr) return 0;
    const cleaned = stakeStr.toString().replace(/[^\d.,]/g, '');
    return parseFloat(cleaned.replace(',', '.')) || 0;
  }

  parseOdds(oddsStr) {
    if (!oddsStr) return 0;
    const cleaned = oddsStr.toString().replace(/[^\d.,]/g, '');
    return parseFloat(cleaned.replace(',', '.')) || 0;
  }

  formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  }

  // Dark Mode Methods
  async loadThemePreference() {
    try {
      const result = await chrome.storage.local.get(['darkMode']);
      const isDarkMode = result.darkMode || false;
      this.setTheme(isDarkMode);
    } catch (error) {
      console.error('Error loading theme preference:', error);
      // Default to system preference
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.setTheme(systemDark);
    }
  }

  async toggleDarkMode() {
    try {
      const isDarkMode = document.body.classList.contains('dark-mode');
      const newTheme = !isDarkMode;
      
      this.setTheme(newTheme);
      await chrome.storage.local.set({ darkMode: newTheme });
      
      this.showStatus(
        newTheme ? '🌙 Dark mode enabled' : '☀️ Light mode enabled', 
        'success'
      );
    } catch (error) {
      console.error('Error toggling dark mode:', error);
      this.showStatus('Error changing theme', 'error');
    }
  }

  setTheme(isDarkMode) {
    const body = document.body;
    const toggle = document.getElementById('darkModeToggle');
    const themeIcon = toggle?.querySelector('.theme-icon');
    
    if (isDarkMode) {
      body.classList.add('dark-mode');
      if (themeIcon) themeIcon.textContent = '☀️';
      if (toggle) toggle.title = 'Switch to Light Mode';
    } else {
      body.classList.remove('dark-mode');
      if (themeIcon) themeIcon.textContent = '🌙';
      if (toggle) toggle.title = 'Switch to Dark Mode';
    }
  }

  async handleSheetsIntegration() {
    try {
      this.showLoading('Checking Google Sheets status...');
      
      // Get current Google Sheets status
      const response = await chrome.runtime.sendMessage({ action: 'getSheetsStatus' });
      this.hideLoading();
      
      if (!response.success) {
        this.showStatus('Error checking Google Sheets status', 'error');
        return;
      }
      
      if (response.isAuthenticated && response.hasSpreadsheet) {
        // User is already connected and has a spreadsheet, show management options
        this.showSheetsManagement(response);
      } else if (response.isAuthenticated && !response.hasSpreadsheet) {
        // User is authenticated but needs to create spreadsheet
        this.showSheetsAuthentication();
      } else {
        // User needs to authenticate with Google first
        this.showStatus('Please complete Google authentication first', 'error');
      }
      
    } catch (error) {
      this.hideLoading();
      console.error('Error handling sheets integration:', error);
      this.showStatus('Error accessing Google Sheets', 'error');
    }
  }

  showSheetsAuthentication() {
    const authHtml = `
      <div class="sheets-auth">
        <h3>📋 Connect to Google Sheets</h3>
        <p>Automatically sync your bet data to Google Sheets for advanced tracking and analysis.</p>
        
        <div class="auth-benefits">
          <div class="benefit-item">
            <span class="benefit-icon">✨</span>
            <span>Real-time sync of all bet data</span>
          </div>
          <div class="benefit-item">
            <span class="benefit-icon">📈</span>
            <span>Advanced analytics and charts</span>
          </div>
          <div class="benefit-item">
            <span class="benefit-icon">🔄</span>
            <span>Automatic backup and history</span>
          </div>
          <div class="benefit-item">
            <span class="benefit-icon">📊</span>
            <span>Custom formulas and calculations</span>
          </div>
        </div>
        
        <div class="auth-actions">
          <button id="connectSheetsBtn" class="result-btn primary">🔗 Connect Google Sheets</button>
          <button id="cancelSheetsBtn" class="result-btn secondary">Maybe Later</button>
        </div>
      </div>
    `;
    
    this.showResultModal(authHtml);
    
    document.getElementById('connectSheetsBtn')?.addEventListener('click', async () => {
      await this.authenticateGoogleSheets();
    });
    
    document.getElementById('cancelSheetsBtn')?.addEventListener('click', () => {
      document.getElementById('resultModal').style.display = 'none';
    });
  }

  showSheetsManagement(sheetsStatus) {
    const managementHtml = `
      <div class="sheets-management">
        <h3>📋 Google Sheets Connected</h3>
        <div class="connection-status">
          <div class="status-item">
            <span class="status-label">Status:</span>
            <span class="status-value connected">✅ Connected</span>
          </div>
          <div class="status-item">
            <span class="status-label">Spreadsheet:</span>
            <span class="status-value">${sheetsStatus.hasSpreadsheet ? '✅ Created' : '❌ Not Created'}</span>
          </div>
        </div>
        
        <div class="sheets-actions">
          ${(sheetsStatus.hasSpreadsheet && sheetsStatus.spreadsheetUrl) ? `
            <button id="openSpreadsheetBtn" class="result-btn primary">📋 Open Spreadsheet</button>
          ` : `
            <button id="createTemplateBtn" class="result-btn primary">📋 Create Spreadsheet</button>
          `}
          <button id="syncAllBtn" class="result-btn secondary">🔄 Sync All History</button>
          <button id="disconnectSheetsBtn" class="result-btn danger">🔒 Disconnect</button>
          <button id="closeSheetsBtn" class="result-btn secondary">Close</button>
        </div>
        
        <div class="sync-info">
          <p><small>📝 New bets are automatically synced to Google Sheets</small></p>
        </div>
      </div>
    `;
    
    this.showResultModal(managementHtml);
    
    // Add event listeners
    document.getElementById('openSpreadsheetBtn')?.addEventListener('click', () => {
      if (sheetsStatus.spreadsheetUrl) {
        chrome.tabs.create({ url: sheetsStatus.spreadsheetUrl });
      }
    });
    
    document.getElementById('createTemplateBtn')?.addEventListener('click', async () => {
      await this.createSheetsTemplate();
    });
    
    document.getElementById('syncAllBtn')?.addEventListener('click', async () => {
      await this.syncAllToSheets();
    });
    
    document.getElementById('disconnectSheetsBtn')?.addEventListener('click', async () => {
      await this.disconnectGoogleSheets();
    });
    
    document.getElementById('closeSheetsBtn')?.addEventListener('click', () => {
      document.getElementById('resultModal').style.display = 'none';
    });
  }

  async authenticateGoogleSheets() {
    try {
      this.showLoading('Connecting to Google Sheets...');
      
      const response = await chrome.runtime.sendMessage({ action: 'authenticateSheets' });
      this.hideLoading();
      
      if (response.success) {
        this.showStatus('✅ Successfully connected to Google Sheets!', 'success');
        document.getElementById('resultModal').style.display = 'none';
        
        // Refresh user data to get updated sheets_connected status
        await this.loadUserData();
        this.updateUI();
        
        // Show management interface
        setTimeout(() => {
          this.handleSheetsIntegration();
        }, 1000);
      } else {
        this.showStatus('❌ Failed to connect: ' + response.error, 'error');
      }
      
    } catch (error) {
      this.hideLoading();
      console.error('Error authenticating with Google Sheets:', error);
      this.showStatus('Error connecting to Google Sheets', 'error');
    }
  }

  async createSheetsTemplate() {
    try {
      this.showLoading('Creating Google Sheets template...');
      
      const response = await chrome.runtime.sendMessage({ action: 'createSheetsTemplate' });
      this.hideLoading();
      
      if (response.success) {
        this.showStatus('✅ Google Sheets template created successfully!', 'success');
        document.getElementById('resultModal').style.display = 'none';
        
        // Refresh user data to get updated sheets_connected status
        await this.loadUserData();
        this.updateUI();
        
        // Refresh the sheets status
        setTimeout(() => {
          this.handleSheetsIntegration();
        }, 1000);
      } else {
        this.showStatus('❌ Failed to create template: ' + response.error, 'error');
      }
      
    } catch (error) {
      this.hideLoading();
      console.error('Error creating Google Sheets template:', error);
      this.showStatus('Error creating Google Sheets template', 'error');
    }
  }

  async syncAllToSheets() {
    try {
      this.showLoading('Syncing all bet history to Google Sheets...');
      
      const response = await chrome.runtime.sendMessage({ action: 'syncAllToSheets' });
      this.hideLoading();
      
      if (response.success) {
        this.showStatus(`✅ ${response.message}`, 'success');
      } else {
        this.showStatus('❌ Sync failed: ' + response.error, 'error');
      }
      
    } catch (error) {
      this.hideLoading();
      console.error('Error syncing to Google Sheets:', error);
      this.showStatus('Error syncing to Google Sheets', 'error');
    }
  }

  async disconnectGoogleSheets() {
    if (confirm('⚠️ Are you sure you want to disconnect from Google Sheets? This will not delete your existing spreadsheet.')) {
      try {
        this.showLoading('Disconnecting from Google Sheets...');
        
        console.log('🔌 Disconnecting from Google Sheets...');
        const response = await chrome.runtime.sendMessage({ action: 'disconnectSheets' });
        console.log('🔌 Disconnect response:', response);
        
        this.hideLoading();
        
        if (response && response.success) {
          this.showStatus('✅ Disconnected from Google Sheets', 'success');
          document.getElementById('resultModal').style.display = 'none';
          
          // Clear any cached sheets data
          await chrome.storage.local.remove(['sheetsAuthenticated', 'betTrackingSpreadsheetId']);
          
          // Refresh user data to get updated sheets_connected status
          await this.loadUserData();
          this.updateUI();
          
          // Update the capture button state
          this.updateCaptureButton();
        } else {
          const errorMsg = response?.error || 'Unknown error occurred';
          console.error('🔌 Disconnect failed:', errorMsg);
          this.showStatus('❌ Failed to disconnect: ' + errorMsg, 'error');
        }
        
      } catch (error) {
        this.hideLoading();
        console.error('🔌 Error disconnecting from Google Sheets:', error);
        this.showStatus('Error disconnecting from Google Sheets: ' + error.message, 'error');
      }
    }
  }

  openGoogleSheets() {
    // Legacy method - redirects to sheets integration
    this.handleSheetsIntegration();
  }

  showMandatorySheetsOnboarding() {
    const onboardingHtml = `
      <div class="mandatory-sheets-onboarding">
        <div class="mandatory-header">
          <h3>🎉 Welcome to Bet Tracker Pro!</h3>
          <p class="mandatory-subtitle">To start tracking your bets, we need to set up your personal spreadsheet</p>
          <div class="mandatory-badge">🔒 Required Setup</div>
        </div>
        
        <div class="why-mandatory">
          <h4>🤔 Why is this required?</h4>
          <div class="reason-grid">
            <div class="reason-item">
              <span class="reason-icon">📊</span>
              <div class="reason-content">
                <strong>Professional Tracking</strong>
                <p>Get a standardized spreadsheet with advanced formulas and analytics</p>
              </div>
            </div>
            <div class="reason-item">
              <span class="reason-icon">🔄</span>
              <div class="reason-content">
                <strong>Auto-Sync</strong>
                <p>Every bet is automatically saved and calculated in real-time</p>
              </div>
            </div>
            <div class="reason-item">
              <span class="reason-icon">📱</span>
              <div class="reason-content">
                <strong>Access Anywhere</strong>
                <p>View and analyze your bets on any device with Google Sheets</p>
              </div>
            </div>
            <div class="reason-item">
              <span class="reason-icon">🔒</span>
              <div class="reason-content">
                <strong>Your Data, Your Control</strong>
                <p>Spreadsheet is created in YOUR Google account - you own it completely</p>
              </div>
            </div>
          </div>
        </div>
        
        <div class="template-showcase">
          <h4>✨ What You'll Get:</h4>
          <div class="showcase-tabs">
            <div class="tab-buttons">
              <button class="tab-btn active" data-tab="features">📊 Features</button>
              <button class="tab-btn" data-tab="preview">👁️ Preview</button>
              <button class="tab-btn" data-tab="sheets">📄 Sheets</button>
            </div>
            
            <div class="tab-content active" data-tab-content="features">
              <div class="features-grid">
                <div class="feature-card">
                  <span class="feature-icon">💰</span>
                  <h5>Profit/Loss Tracking</h5>
                  <p>Automatic calculations for every bet</p>
                </div>
                <div class="feature-card">
                  <span class="feature-icon">📈</span>
                  <h5>ROI Analysis</h5>
                  <p>Track your return on investment</p>
                </div>
                <div class="feature-card">
                  <span class="feature-icon">🏆</span>
                  <h5>Win Rate Stats</h5>
                  <p>Monitor your success percentage</p>
                </div>
                <div class="feature-card">
                  <span class="feature-icon">📅</span>
                  <h5>Monthly Reports</h5>
                  <p>Automated monthly summaries</p>
                </div>
              </div>
            </div>
            
            <div class="tab-content" data-tab-content="preview">
              <div class="preview-table">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Teams</th>
                      <th>Odds</th>
                      <th>Stake</th>
                      <th>Profit/Loss</th>
                      <th>ROI %</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>2024-01-15</td>
                      <td>Lakers vs Warriors</td>
                      <td>2.50</td>
                      <td>$50</td>
                      <td class="profit">+$75</td>
                      <td class="profit">+150%</td>
                    </tr>
                    <tr>
                      <td>2024-01-14</td>
                      <td>Chiefs vs Bills</td>
                      <td>1.85</td>
                      <td>$100</td>
                      <td class="loss">-$100</td>
                      <td class="loss">-100%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            
            <div class="tab-content" data-tab-content="sheets">
              <div class="sheets-list">
                <div class="sheet-item">
                  <span class="sheet-icon">📊</span>
                  <div>
                    <strong>Bet Log</strong>
                    <p>Main tracking sheet with all your bets</p>
                  </div>
                </div>
                <div class="sheet-item">
                  <span class="sheet-icon">📅</span>
                  <div>
                    <strong>Monthly Summary</strong>
                    <p>Automated monthly performance reports</p>
                  </div>
                </div>
                <div class="sheet-item">
                  <span class="sheet-icon">📈</span>
                  <div>
                    <strong>Analytics</strong>
                    <p>Charts and KPIs for deeper insights</p>
                  </div>
                </div>
                <div class="sheet-item">
                  <span class="sheet-icon">⚙️</span>
                  <div>
                    <strong>Settings</strong>
                    <p>Customize your tracking preferences</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="mandatory-actions">
          <button id="proceedWithSetupBtn" class="result-btn primary large pulse">
            🚀 Set Up My Professional Tracker
          </button>
          <p class="setup-note">
            <span class="note-icon">🔒</span>
            Setup is required to use Bet Tracker Pro. Your spreadsheet will be created in your Google account.
          </p>
          <div class="security-badges">
            <span class="badge">🔒 Private & Secure</span>
            <span class="badge">🌐 Your Google Account</span>
            <span class="badge">✨ Professional Template</span>
          </div>
        </div>
      </div>
    `;
    
    this.showResultModal(onboardingHtml, true); // true = modal cannot be closed
    
    // Initialize tab functionality
    this.initializeTabs();
    
    document.getElementById('proceedWithSetupBtn')?.addEventListener('click', async () => {
      await this.setupSheetsWithTemplate();
    });
  }
  
  initializeTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const targetTab = button.getAttribute('data-tab');
        
        // Remove active class from all buttons and contents
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));
        
        // Add active class to clicked button and corresponding content
        button.classList.add('active');
        document.querySelector(`[data-tab-content="${targetTab}"]`).classList.add('active');
      });
    });
  }

  showSheetsOnboarding() {
    const onboardingHtml = `
      <div class="sheets-onboarding">
        <h3>🎉 Welcome to Bet Tracker Pro!</h3>
        <p class="onboarding-subtitle">Let's set up your professional bet tracking system</p>
        
        <div class="onboarding-step">
          <div class="step-number">1</div>
          <div class="step-content">
            <h4>📋 Connect Google Sheets</h4>
            <p>We'll create your personal bet tracking spreadsheet with professional features</p>
          </div>
        </div>
        
        <div class="template-preview">
          <h4>✨ Your Spreadsheet Will Include:</h4>
          <div class="template-features">
            <div class="feature-item">
              <span class="feature-icon">📈</span>
              <span>Automatic profit/loss calculations</span>
            </div>
            <div class="feature-item">
              <span class="feature-icon">📊</span>
              <span>ROI tracking and performance metrics</span>
            </div>
            <div class="feature-item">
              <span class="feature-icon">📅</span>
              <span>Monthly and yearly summaries</span>
            </div>
            <div class="feature-item">
              <span class="feature-icon">🏆</span>
              <span>Win rate and streak tracking</span>
            </div>
            <div class="feature-item">
              <span class="feature-icon">📉</span>
              <span>Interactive charts and graphs</span>
            </div>
            <div class="feature-item">
              <span class="feature-icon">🔄</span>
              <span>Real-time sync with every bet</span>
            </div>
          </div>
        </div>
        
        <div class="onboarding-actions">
          <button id="setupSheetsBtn" class="result-btn primary large">
            🚀 Set Up My Bet Tracker
          </button>
          <p class="onboarding-note">
            <small>🔒 Your data stays private in your Google account</small>
          </p>
        </div>
      </div>
    `;
    
    this.showResultModal(onboardingHtml);
    
    document.getElementById('setupSheetsBtn')?.addEventListener('click', async () => {
      await this.setupSheetsWithTemplate();
    });
  }

  async setupSheetsWithTemplate() {
    try {
      this.showLoading('Connecting to Google Sheets...');
      
      // Step 1: Authenticate with Google Sheets
      const authResponse = await chrome.runtime.sendMessage({ action: 'authenticateSheets' });
      
      if (!authResponse.success) {
        throw new Error('Failed to connect to Google Sheets: ' + authResponse.error);
      }
      
      this.showLoading('Creating your professional bet tracker template...');
      
      // Step 2: Create spreadsheet with standardized template
      const templateResponse = await chrome.runtime.sendMessage({ 
        action: 'createSheetsTemplate'
      });
      
      if (!templateResponse.success) {
        throw new Error('Failed to create spreadsheet template: ' + templateResponse.error);
      }
      
      this.hideLoading();
      
      // Step 3: Refresh user data to get updated sheets_connected status
      await this.loadUserData();
      
      // Step 4: Update UI to reflect completed setup
      this.updateUI();
      
      // Step 5: Show success and next steps
      this.showSetupComplete(templateResponse.spreadsheetUrl);
      
    } catch (error) {
      this.hideLoading();
      console.error('Error setting up Google Sheets:', error);
      
      // Show error but keep them in the mandatory flow
      this.showSetupError(error.message);
    }
  }
  
  showSetupError(errorMessage) {
    const errorHtml = `
      <div class="setup-error">
        <div class="error-icon">❌</div>
        <h3>Setup Error</h3>
        <p class="error-message">We encountered an issue setting up your bet tracker:</p>
        <div class="error-details">${errorMessage}</div>
        
        <div class="error-actions">
          <button id="retrySetupBtn" class="result-btn primary">
            🔄 Try Again
          </button>
          <button id="setupLaterBtn" class="result-btn secondary">
            ⏱️ Set Up Later
          </button>
        </div>
        
        <p class="error-note">
          <small>Note: You'll need to complete setup before tracking bets</small>
        </p>
      </div>
    `;
    
    this.showResultModal(errorHtml, true); // Keep as mandatory
    
    document.getElementById('retrySetupBtn')?.addEventListener('click', async () => {
      await this.setupSheetsWithTemplate();
    });
    
    document.getElementById('setupLaterBtn')?.addEventListener('click', () => {
      // Allow them to close but remind them setup is needed
      document.getElementById('resultModal').style.display = 'none';
      this.showStatus('⚠️ Setup required before tracking bets. Click "Google Sheets" to set up later.', 'warning');
    });
  }

  showSetupComplete(spreadsheetUrl) {
    const completeHtml = `
      <div class="setup-complete">
        <div class="success-animation">✅</div>
        <h3>🎉 Setup Complete!</h3>
        <p>Your professional bet tracking system is ready</p>
        
        <div class="setup-summary">
          <div class="summary-item">
            <strong>📋 Spreadsheet Created</strong>
            <p>Professional template with all formulas</p>
          </div>
          <div class="summary-item">
            <strong>🔄 Auto-Sync Enabled</strong>
            <p>Every bet will be automatically saved</p>
          </div>
          <div class="summary-item">
            <strong>📈 Analytics Ready</strong>
            <p>Real-time performance tracking</p>
          </div>
        </div>
        
        <div class="next-steps">
          <h4>🚀 Ready to Start!</h4>
          <p>Capture your first bet slip and watch the magic happen</p>
        </div>
        
        <div class="complete-actions">
          <button id="viewSpreadsheetBtn" class="result-btn secondary">
            📋 View My Spreadsheet
          </button>
          <button id="startTrackingBtn" class="result-btn primary">
            🎯 Start Tracking Bets
          </button>
        </div>
      </div>
    `;
    
    this.showResultModal(completeHtml);
    
    document.getElementById('viewSpreadsheetBtn')?.addEventListener('click', () => {
      if (spreadsheetUrl) {
        chrome.tabs.create({ url: spreadsheetUrl });
      }
    });
    
    document.getElementById('startTrackingBtn')?.addEventListener('click', () => {
      document.getElementById('resultModal').style.display = 'none';
      this.showStatus('✨ Ready to track! Click "Capture Bet Slip" to start.', 'success');
    });
  }

  showLoading(message = 'Processing...') {
    const overlay = document.getElementById('loadingOverlay');
    const text = overlay.querySelector('.loading-text');
    text.textContent = message;
    overlay.style.display = 'flex';
  }

  hideLoading() {
    document.getElementById('loadingOverlay').style.display = 'none';
  }

  showStatus(message, type = 'info') {
    const statusEl = document.getElementById('statusMessage');
    const textEl = document.getElementById('statusText');
    
    // Clear any existing animations
    statusEl.style.animation = 'none';
    statusEl.offsetHeight; // Trigger reflow
    
    textEl.textContent = message;
    statusEl.className = `status-message ${type}`;
    statusEl.style.display = 'block';
    
    // Add entrance animation
    statusEl.style.animation = 'statusSlideIn 0.4s ease-out forwards';
    
    // Add visual feedback based on type
    this.addStatusFeedback(statusEl, type);
    
    // Auto-hide after duration based on type
    const duration = type === 'error' ? 5000 : type === 'success' ? 4000 : 3000;
    
    setTimeout(() => {
      if (statusEl.style.display !== 'none') {
        statusEl.style.animation = 'statusSlideOut 0.3s ease-in forwards';
        setTimeout(() => {
          statusEl.style.display = 'none';
        }, 300);
      }
    }, duration);
  }

  addStatusFeedback(statusEl, type) {
    // Add specific visual feedback based on status type
    switch (type) {
      case 'success':
        this.addSuccessParticles(statusEl);
        break;
      case 'error':
        this.addErrorShake();
        break;
      case 'warning':
        this.addWarningPulse(statusEl);
        break;
    }
  }

  addSuccessParticles(element) {
    // Create success particle effect
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        const particle = document.createElement('div');
        particle.style.cssText = `
          position: absolute;
          width: 4px;
          height: 4px;
          background: #28a745;
          border-radius: 50%;
          pointer-events: none;
          z-index: 1000;
        `;
        
        const rect = element.getBoundingClientRect();
        particle.style.left = (rect.left + rect.width / 2) + 'px';
        particle.style.top = (rect.top + rect.height / 2) + 'px';
        
        document.body.appendChild(particle);
        
        // Animate particle
        const angle = (i / 5) * Math.PI * 2;
        const distance = 30 + Math.random() * 20;
        const finalX = rect.left + rect.width / 2 + Math.cos(angle) * distance;
        const finalY = rect.top + rect.height / 2 + Math.sin(angle) * distance;
        
        particle.animate([
          { transform: 'translate(0, 0) scale(1)', opacity: 1 },
          { transform: `translate(${finalX - (rect.left + rect.width / 2)}px, ${finalY - (rect.top + rect.height / 2)}px) scale(0)`, opacity: 0 }
        ], {
          duration: 800,
          easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
        }).onfinish = () => particle.remove();
      }, i * 100);
    }
  }

  addErrorShake() {
    // Shake the entire container on error
    const container = document.querySelector('.container');
    container.style.animation = 'shake 0.5s ease-in-out';
    setTimeout(() => {
      container.style.animation = '';
    }, 500);
  }

  addWarningPulse(element) {
    // Add warning pulse effect
    element.style.animation += ', warningGlow 2s ease-in-out infinite';
  }

  showDetailedResult(data) {
    // Create a detailed result display
    const resultHtml = `
      <div class="bet-result-details">
        <h3>✅ Bet Processed Successfully!</h3>
        <div class="result-data">
          <div class="result-row"><strong>🏆 Teams:</strong> ${data.teams || 'Not detected'}</div>
          <div class="result-row"><strong>🎨 Sport:</strong> ${data.sport || 'Not detected'}</div>
          <div class="result-row"><strong>🎯 Bet Type:</strong> ${data.bet_type || 'Not detected'}</div>
          <div class="result-row"><strong>🔻 Selection:</strong> ${data.selection || 'Not detected'}</div>
          <div class="result-row"><strong>📊 Odds:</strong> ${data.odds || 'Not detected'}</div>
          <div class="result-row"><strong>💰 Stake:</strong> ${data.stake || 'Not detected'}</div>
          <div class="result-row"><strong>💵 Return:</strong> ${data.potential_return || 'Not calculated'}</div>
          <div class="result-row"><strong>🏢 Bookmaker:</strong> ${data.bookmaker || 'Not detected'}</div>
          <div class="result-row"><strong>🗓️ Date:</strong> ${data.date || 'Not detected'}</div>
        </div>
        <div class="result-actions">
          <button id="viewHistoryBtn" class="result-btn primary">View All Bets</button>
          <button id="closeResultBtn" class="result-btn secondary">Close</button>
        </div>
      </div>
    `;
    
    // Show the result in a modal-like overlay
    this.showResultModal(resultHtml);
    
    // Update usage count
    if (this.currentUser) {
      this.currentUser.usage_count = (this.currentUser.usage_count || 0) + 1;
      this.updateUI();
    }
  }

  showResultModal(content, isMandatory = false) {
    // Create or update result modal
    let modal = document.getElementById('resultModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'resultModal';
      modal.className = 'result-modal';
      document.body.appendChild(modal);
    }
    
    // Add mandatory class if needed
    if (isMandatory) {
      modal.classList.add('mandatory-modal');
    } else {
      modal.classList.remove('mandatory-modal');
    }
    
    modal.innerHTML = `
      <div class="result-modal-content">
        ${content}
      </div>
    `;
    
    // Show modal with animation
    modal.style.display = 'flex';
    modal.style.animation = 'modalFadeIn 0.4s ease-out';
    
    // Only add click outside to close if not mandatory
    if (!isMandatory) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.closeModal(modal);
        }
      });
    }
    
    // Only add escape key to close if not mandatory
    if (!isMandatory) {
      const handleEscape = (e) => {
        if (e.key === 'Escape') {
          this.closeModal(modal);
          document.removeEventListener('keydown', handleEscape);
        }
      };
      document.addEventListener('keydown', handleEscape);
    }
    
    // Animate modal content
    const modalContent = modal.querySelector('.result-modal-content');
    modalContent.style.animation = 'modalSlideIn 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
    
    // Add event listeners for common buttons
    this.addModalEventListeners(modal);
  }

  closeModal(modal) {
    const modalContent = modal.querySelector('.result-modal-content');
    
    // Animate out
    modal.style.animation = 'modalFadeOut 0.3s ease-in';
    modalContent.style.animation = 'modalSlideOut 0.3s ease-in';
    
    setTimeout(() => {
      modal.style.display = 'none';
    }, 300);
  }

  addModalEventListeners(modal) {
    // Add hover effects to buttons
    const buttons = modal.querySelectorAll('.result-btn');
    buttons.forEach(button => {
      button.addEventListener('mouseenter', () => {
        button.style.transform = 'translateY(-1px) scale(1.02)';
      });
      
      button.addEventListener('mouseleave', () => {
        button.style.transform = 'translateY(0) scale(1)';
      });
      
      button.addEventListener('mousedown', () => {
        button.style.transform = 'translateY(0) scale(0.98)';
      });
      
      button.addEventListener('mouseup', () => {
        button.style.transform = 'translateY(-1px) scale(1.02)';
      });
    });
    
    // Add event listeners for common actions
    const viewHistoryBtn = document.getElementById('viewHistoryBtn');
    const closeResultBtn = document.getElementById('closeResultBtn');
    
    if (viewHistoryBtn) {
      viewHistoryBtn.addEventListener('click', () => {
        this.openLocalHistory();
        this.closeModal(modal);
      });
    }
    
    if (closeResultBtn) {
      closeResultBtn.addEventListener('click', () => {
        this.closeModal(modal);
      });
    }
  }

  // Method to increment usage (called from background script)
  async incrementUsage() {
    this.usageData.count++;
    await this.saveUsageData();
    this.updateUI();

    // Show warning if approaching limit
    const plan = this.usageData.plan;
    const limit = this.planLimits[plan];
    const percentage = (this.usageData.count / limit) * 100;

    if (percentage >= 90) {
      this.showStatus(`⚠️ You've used ${this.usageData.count}/${limit} bets this month!`, 'warning');
    }
  }

  // Extension update checking methods
  async checkUpdateStatus() {
    try {
      const updateStatus = await chrome.runtime.sendMessage({ action: 'getUpdateStatus' });
      
      if (updateStatus && updateStatus.hasUpdate) {
        this.showUpdateNotification(updateStatus);
      }
    } catch (error) {
      console.error('Error checking update status:', error);
    }
  }

  async checkForUpdates() {
    try {
      this.showLoading('Checking for updates...');
      
      const updateResult = await chrome.runtime.sendMessage({ action: 'checkForUpdates' });
      
      this.hideLoading();
      
      if (updateResult && updateResult.hasUpdate) {
        this.showUpdateModal(updateResult);
      } else {
        this.showStatus('✅ Extension is up to date!', 'success');
      }
    } catch (error) {
      this.hideLoading();
      console.error('Error checking for updates:', error);
      this.showStatus('❌ Failed to check for updates', 'error');
    }
  }

  showUpdateNotification(updateInfo) {
    // Show a small update badge or notification in the UI
    const updateBadge = document.createElement('div');
    updateBadge.className = 'update-badge';
    updateBadge.innerHTML = '🔄';
    updateBadge.title = `Update available: v${updateInfo.latestVersion}`;
    
    // Add to header or a visible location
    const header = document.querySelector('.popup-header');
    if (header && !header.querySelector('.update-badge')) {
      header.appendChild(updateBadge);
      
      updateBadge.addEventListener('click', () => {
        this.showUpdateModal(updateInfo);
      });
    }
  }

  showUpdateModal(updateInfo) {
    const updateHtml = `
      <div class="update-modal">
        <h3>🔄 Extension Update Available</h3>
        <div class="update-info">
          <div class="version-info">
            <p><strong>Current Version:</strong> ${updateInfo.currentVersion}</p>
            <p><strong>Latest Version:</strong> ${updateInfo.latestVersion}</p>
          </div>
          
          <div class="release-notes">
            <h4>What's New:</h4>
            <div class="notes-content">
              ${this.formatReleaseNotes(updateInfo.releaseNotes)}
            </div>
          </div>
        </div>
        
        <div class="update-actions">
          <button id="downloadUpdateBtn" class="result-btn primary">📥 Download Update</button>
          <button id="remindLaterBtn" class="result-btn secondary">⏰ Remind Later</button>
          <button id="closeUpdateBtn" class="result-btn">✕ Close</button>
        </div>
        
        <div class="update-instructions">
          <p><small>💡 Download the update, then load it as an unpacked extension in Chrome.</small></p>
        </div>
      </div>
    `;
    
    this.showResultModal(updateHtml);
    
    // Add event listeners
    document.getElementById('downloadUpdateBtn')?.addEventListener('click', () => {
      chrome.tabs.create({ url: updateInfo.releaseUrl });
      this.closeModal(document.getElementById('resultModal'));
    });
    
    document.getElementById('remindLaterBtn')?.addEventListener('click', () => {
      // Set reminder for 24 hours later
      chrome.storage.local.set({
        updateReminder: Date.now() + (24 * 60 * 60 * 1000)
      });
      this.closeModal(document.getElementById('resultModal'));
      this.showStatus('⏰ Will remind you tomorrow', 'info');
    });
    
    document.getElementById('closeUpdateBtn')?.addEventListener('click', () => {
      this.closeModal(document.getElementById('resultModal'));
    });
  }

  formatReleaseNotes(notes) {
    if (!notes) return '<p>No release notes available.</p>';
    
    // Simple markdown-like formatting
    return notes
      .replace(/###\s(.+)/g, '<h4>$1</h4>')
      .replace(/##\s(.+)/g, '<h3>$1</h3>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^-\s(.+)/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
      .replace(/\n/g, '<br>');
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const popup = new BetTrackerPopup();
  // Store reference for message handling
  window.betTrackerPopupInstance = popup;
});

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'betProcessed') {
    // Find the popup instance
    const popupInstance = window.betTrackerPopupInstance;
    
    if (message.success) {
      // Show detailed success message with extracted data
      const data = message.data;
      const summary = `✅ Bet processed successfully!\n\n` +
        `🏆 ${data.teams || 'Teams not detected'}\n` +
        `💰 Stake: ${data.stake || 'Unknown'}\n` +
        `📊 Odds: ${data.odds || 'Unknown'}\n` +
        `🎯 Selection: ${data.selection || 'Unknown'}`;
      
      if (popupInstance) {
        popupInstance.showDetailedResult(data);
      } else {
        // Create notification for user
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon-48.png',
          title: 'Bet Tracker Pro',
          message: 'Bet slip processed successfully! Check extension for details.'
        });
      }
    } else {
      if (popupInstance) {
        popupInstance.showStatus('❌ Failed to process bet slip: ' + (message.error || 'Unknown error'), 'error');
      }
    }
  }
});