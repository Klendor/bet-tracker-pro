// Modern Bet Tracker Pro Popup Logic
console.log('Bet Tracker Modern JS Loading...');

class BetTrackerModern {
  constructor() {
    this.currentUser = null;
    this.init();
  }

  async init() {
    try {
      await this.loadUserData();
      this.setupEventListeners();
      this.updateUI();
      this.loadRecentBets();
      this.startAnimations();
    } catch (error) {
      console.error('Initialization error:', error);
    }
  }

  async loadUserData() {
    try {
      const storage = await chrome.storage.sync.get(['userToken', 'user']);
      
      if (storage.userToken && storage.user) {
        this.currentUser = storage.user;
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  }

  setupEventListeners() {
    // Main capture button
    const captureBtn = document.getElementById('captureBtn');
    if (captureBtn) {
      captureBtn.addEventListener('click', () => this.handleCapture());
    }

    // Auth toggle
    const authToggle = document.getElementById('authToggle');
    if (authToggle) {
      authToggle.addEventListener('click', () => this.handleAuth());
    }

    // Menu button
    const menuBtn = document.getElementById('menuBtn');
    if (menuBtn) {
      menuBtn.addEventListener('click', () => this.toggleMenu());
    }

    // Menu close
    const menuClose = document.getElementById('menuClose');
    if (menuClose) {
      menuClose.addEventListener('click', () => this.closeMenu());
    }

    // Menu backdrop
    const menuBackdrop = document.getElementById('menuBackdrop');
    if (menuBackdrop) {
      menuBackdrop.addEventListener('click', () => this.closeMenu());
    }

    // Quick actions
    document.getElementById('sheetsBtn')?.addEventListener('click', () => this.openSheets());
    document.getElementById('historyBtn')?.addEventListener('click', () => this.openHistory());
    document.getElementById('analyticsBtn')?.addEventListener('click', () => this.openAnalytics());
    document.getElementById('settingsBtn')?.addEventListener('click', () => this.openSettings());

    // See all button
    document.getElementById('seeAllBtn')?.addEventListener('click', () => this.openHistory());

    // Theme toggle
    const themeSwitch = document.getElementById('themeSwitch');
    if (themeSwitch) {
      themeSwitch.addEventListener('change', (e) => this.toggleTheme(e.target.checked));
    }

    // Menu items
    document.getElementById('profileItem')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.showProfile();
    });

    document.getElementById('upgradeItem')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.showUpgrade();
    });

    document.getElementById('exportItem')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.exportData();
    });

    document.getElementById('helpItem')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.showHelp();
    });
  }

  updateUI() {
    if (this.currentUser) {
      // Update user info
      document.getElementById('userName').textContent = this.currentUser.email || 'User';
      
      // Update plan badge
      const plan = this.currentUser.plan || 'free';
      const planBadge = document.getElementById('planBadge');
      if (planBadge) {
        planBadge.textContent = plan.toUpperCase();
        if (plan !== 'free') {
          planBadge.style.background = 'var(--gradient-primary)';
        }
      }
      
      // Update usage
      const usage = this.currentUser.usage_count || 0;
      const limit = this.getPlanLimit(plan);
      document.getElementById('usageText').textContent = `${usage}/${limit} bets`;
      
      // Update progress ring
      this.updateProgressRing(usage, limit);
      
      // Update capture button state
      this.updateCaptureButton(usage, limit);
      
      // Update stats
      this.updateQuickStats();
    } else {
      document.getElementById('userName').textContent = 'Not signed in';
      document.getElementById('usageText').textContent = 'Sign in required';
      
      // Disable capture button
      const captureBtn = document.getElementById('captureBtn');
      if (captureBtn) {
        captureBtn.disabled = true;
        const buttonText = captureBtn.querySelector('.button-text');
        if (buttonText) {
          buttonText.textContent = 'Sign In Required';
        }
      }
    }
  }

  getPlanLimit(plan) {
    const limits = {
      free: 30,
      pro: 1000,
      proplus: 10000
    };
    return limits[plan] || 30;
  }

  updateProgressRing(current, total) {
    const progressRing = document.getElementById('progressRing');
    if (progressRing) {
      const percentage = (current / total) * 100;
      const circumference = 2 * Math.PI * 20; // radius = 20
      const offset = circumference - (percentage / 100) * circumference;
      
      progressRing.style.strokeDasharray = circumference;
      progressRing.style.strokeDashoffset = offset;
      
      // Change color based on usage
      if (percentage >= 90) {
        progressRing.style.stroke = 'var(--accent-danger)';
      } else if (percentage >= 75) {
        progressRing.style.stroke = 'var(--accent-warning)';
      } else {
        progressRing.style.stroke = 'var(--accent-primary)';
      }
    }
  }

  updateCaptureButton(usage, limit) {
    const captureBtn = document.getElementById('captureBtn');
    if (!captureBtn) return;

    const buttonText = captureBtn.querySelector('.button-text');
    const buttonHint = captureBtn.querySelector('.button-hint');

    if (!this.currentUser) {
      captureBtn.disabled = true;
      if (buttonText) buttonText.textContent = 'Sign In Required';
      if (buttonHint) buttonHint.textContent = 'Please sign in first';
    } else if (!this.currentUser.sheets_connected) {
      captureBtn.disabled = true;
      if (buttonText) buttonText.textContent = 'Setup Required';
      if (buttonHint) buttonHint.textContent = 'Connect Google Sheets first';
    } else if (usage >= limit) {
      captureBtn.disabled = true;
      if (buttonText) buttonText.textContent = 'Limit Reached';
      if (buttonHint) buttonHint.textContent = 'Upgrade for more captures';
    } else {
      captureBtn.disabled = false;
      if (buttonText) buttonText.textContent = 'Capture Bet Slip';
      if (buttonHint) buttonHint.textContent = 'Click to select area';
    }
  }

  async updateQuickStats() {
    try {
      const result = await chrome.storage.local.get(['betHistory']);
      const history = result.betHistory || [];
      
      // Calculate today's count
      const today = new Date().toDateString();
      const todayBets = history.filter(bet => {
        const betDate = new Date(bet.created_at || bet.date);
        return betDate.toDateString() === today;
      });
      document.getElementById('todayCount').textContent = todayBets.length;
      
      // Calculate streak (mock for now)
      document.getElementById('streakCount').textContent = Math.floor(Math.random() * 10);
      
      // Calculate win rate (mock for now)
      document.getElementById('winRate').textContent = Math.floor(Math.random() * 30 + 50) + '%';
      
      // Calculate month P/L (mock for now)
      const profit = Math.floor(Math.random() * 1000 - 200);
      document.getElementById('monthProfit').textContent = profit >= 0 ? `+$${profit}` : `-$${Math.abs(profit)}`;
      if (profit < 0) {
        document.getElementById('monthProfit').style.color = 'var(--accent-danger)';
      } else {
        document.getElementById('monthProfit').style.color = 'var(--accent-secondary)';
      }
    } catch (error) {
      console.error('Error updating stats:', error);
    }
  }

  async loadRecentBets() {
    try {
      const result = await chrome.storage.local.get(['betHistory']);
      const history = result.betHistory || [];
      
      const recentBetsContainer = document.getElementById('recentBets');
      if (!recentBetsContainer) return;
      
      if (history.length === 0) {
        // Show empty state (already in HTML)
        return;
      }
      
      // Show recent 3 bets
      const recentBets = history.slice(0, 3);
      const betsHtml = recentBets.map(bet => `
        <div class="bet-item">
          <div class="bet-header">
            <div class="bet-teams">${bet.teams || 'Unknown'}</div>
            <div class="bet-stake">${bet.stake || '$0'}</div>
          </div>
          <div class="bet-details">
            <span>${bet.sport || 'Sport'}</span>
            <span>${bet.odds || 'Odds'}</span>
            <span>${bet.bookmaker || 'Bookmaker'}</span>
          </div>
        </div>
      `).join('');
      
      recentBetsContainer.innerHTML = betsHtml;
    } catch (error) {
      console.error('Error loading recent bets:', error);
    }
  }

  async handleCapture() {
    if (!this.currentUser) {
      this.showToast('Please sign in first', 'error');
      return;
    }

    if (!this.currentUser.sheets_connected) {
      this.showToast('Please connect Google Sheets first', 'warning');
      this.openSheets();
      return;
    }

    try {
      this.showLoading('Preparing capture...');
      
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) {
        throw new Error('No active tab found');
      }

      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content/content.js']
      });

      await chrome.tabs.sendMessage(tab.id, { action: 'startCapture' });
      
      this.hideLoading();
      window.close();
    } catch (error) {
      this.hideLoading();
      this.showToast('Failed to start capture: ' + error.message, 'error');
    }
  }

  async handleAuth() {
    if (this.currentUser) {
      // Sign out
      if (confirm('Are you sure you want to sign out?')) {
        await chrome.runtime.sendMessage({ action: 'logoutUser' });
        await chrome.storage.sync.remove(['userToken', 'user']);
        this.currentUser = null;
        this.updateUI();
        this.showToast('Signed out successfully', 'success');
      }
    } else {
      // Sign in
      try {
        const config = await chrome.runtime.sendMessage({ action: 'getBackendConfig' });
        if (!config || !config.baseUrl) {
          throw new Error('Backend configuration not available');
        }
        
        const authUrl = `${config.baseUrl}/auth/google`;
        chrome.tabs.create({ url: authUrl });
        
        this.showToast('Complete authentication in the new tab', 'info');
      } catch (error) {
        this.showToast('Authentication failed: ' + error.message, 'error');
      }
    }
  }

  toggleMenu() {
    const menu = document.getElementById('floatingMenu');
    if (menu) {
      menu.classList.add('active');
    }
  }

  closeMenu() {
    const menu = document.getElementById('floatingMenu');
    if (menu) {
      menu.classList.remove('active');
    }
  }

  async openSheets() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getSheetsStatus' });
      
      if (response.success && response.hasSpreadsheet && response.spreadsheetUrl) {
        chrome.tabs.create({ url: response.spreadsheetUrl });
      } else {
        this.showToast('Setting up Google Sheets...', 'info');
        // Trigger sheets setup
        await chrome.runtime.sendMessage({ action: 'createSheetsTemplate' });
      }
    } catch (error) {
      this.showToast('Failed to open sheets', 'error');
    }
  }

  async openHistory() {
    // Create a new tab with history view
    chrome.tabs.create({ url: chrome.runtime.getURL('history.html') });
  }

  async openAnalytics() {
    this.showToast('Analytics coming soon!', 'info');
  }

  openSettings() {
    this.showToast('Settings coming soon!', 'info');
  }

  showProfile() {
    this.closeMenu();
    this.showToast('Profile management coming soon!', 'info');
  }

  showUpgrade() {
    this.closeMenu();
    this.showToast('Upgrade options coming soon!', 'info');
  }

  async exportData() {
    this.closeMenu();
    try {
      const result = await chrome.storage.local.get(['betHistory']);
      const history = result.betHistory || [];
      
      if (history.length === 0) {
        this.showToast('No data to export', 'warning');
        return;
      }
      
      const csvContent = this.generateCSV(history);
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `bet-history-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      
      URL.revokeObjectURL(url);
      this.showToast('Data exported successfully!', 'success');
    } catch (error) {
      this.showToast('Export failed', 'error');
    }
  }

  generateCSV(history) {
    const headers = ['Date', 'Teams', 'Sport', 'Bet Type', 'Selection', 'Odds', 'Stake', 'Potential Return', 'Bookmaker'];
    const rows = history.map(bet => [
      bet.date || new Date(bet.created_at).toLocaleDateString(),
      bet.teams || '',
      bet.sport || '',
      bet.bet_type || '',
      bet.selection || '',
      bet.odds || '',
      bet.stake || '',
      bet.potential_return || '',
      bet.bookmaker || ''
    ]);
    
    return [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
  }

  showHelp() {
    this.closeMenu();
    chrome.tabs.create({ url: 'https://github.com/klendor/bet-tracker-pro#readme' });
  }

  toggleTheme(isDark) {
    if (isDark) {
      document.body.classList.remove('light-theme');
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
      document.body.classList.add('light-theme');
    }
    
    chrome.storage.local.set({ darkMode: isDark });
  }

  showToast(message, type = 'info') {
    const toast = document.getElementById('statusToast');
    const toastIcon = document.getElementById('toastIcon');
    const toastMessage = document.getElementById('toastMessage');
    
    if (!toast || !toastMessage) return;
    
    // Set icon based on type
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };
    
    if (toastIcon) {
      toastIcon.textContent = icons[type] || icons.info;
    }
    
    toastMessage.textContent = message;
    
    // Set toast type class
    toast.className = 'status-toast show ' + type;
    
    // Auto hide after 3 seconds
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }

  showLoading(message = 'Loading...') {
    const overlay = document.getElementById('loadingOverlay');
    const loadingText = document.getElementById('loadingText');
    
    if (overlay) {
      overlay.classList.add('show');
    }
    
    if (loadingText) {
      loadingText.textContent = message;
    }
  }

  hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
      overlay.classList.remove('show');
    }
  }

  startAnimations() {
    // Add any startup animations or effects here
    console.log('Bet Tracker Pro - Modern UI Loaded');
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new BetTrackerModern();
});

// Listen for messages from background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'betProcessed') {
    if (message.success) {
      // Reload recent bets
      const tracker = new BetTrackerModern();
      tracker.loadRecentBets();
      tracker.updateQuickStats();
    }
  }
});
