// Chrome Extension Auto-Update Service
class ExtensionUpdater {
  constructor() {
    this.currentVersion = chrome.runtime.getManifest().version;
    this.updateCheckInterval = 24 * 60 * 60 * 1000; // 24 hours
    this.githubRepo = 'yourusername/bet-tracker-pro'; // Update with your GitHub repo
    this.lastUpdateCheck = null;
    
    this.init();
  }

  init() {
    // Check for updates on startup
    this.checkForUpdates();
    
    // Set up periodic update checks
    this.scheduleUpdateChecks();
    
    // Listen for manual update requests
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'checkForUpdates') {
        this.checkForUpdates(true).then(sendResponse);
        return true;
      }
    });
  }

  async checkForUpdates(manual = false) {
    try {
      const now = Date.now();
      
      // Skip automatic checks if we checked recently (unless manual)
      if (!manual && this.lastUpdateCheck && (now - this.lastUpdateCheck) < this.updateCheckInterval) {
        return { hasUpdate: false, reason: 'Recently checked' };
      }

      console.log('🔍 Checking for extension updates...');
      
      // Fetch latest release from GitHub
      const response = await fetch(`https://api.github.com/repos/${this.githubRepo}/releases/latest`);
      
      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }
      
      const release = await response.json();
      const latestVersion = release.tag_name.replace('v', '');
      
      this.lastUpdateCheck = now;
      chrome.storage.local.set({ lastUpdateCheck: now });
      
      // Compare versions
      if (this.isNewerVersion(latestVersion, this.currentVersion)) {
        console.log(`📦 Update available: ${this.currentVersion} → ${latestVersion}`);
        
        // Store update info
        const updateInfo = {
          hasUpdate: true,
          currentVersion: this.currentVersion,
          latestVersion: latestVersion,
          releaseUrl: release.html_url,
          downloadUrl: this.getDownloadUrl(release),
          releaseNotes: release.body,
          publishedAt: release.published_at
        };
        
        await chrome.storage.local.set({ availableUpdate: updateInfo });
        
        // Show update notification
        this.showUpdateNotification(updateInfo);
        
        return updateInfo;
      } else {
        console.log('✅ Extension is up to date');
        await chrome.storage.local.remove(['availableUpdate']);
        return { hasUpdate: false, currentVersion: this.currentVersion, latestVersion };
      }
      
    } catch (error) {
      console.error('Update check failed:', error);
      return { hasUpdate: false, error: error.message };
    }
  }

  getDownloadUrl(release) {
    // Find the production zip file in release assets
    const asset = release.assets.find(asset => 
      asset.name === 'bet-tracker-pro-production.zip'
    );
    return asset ? asset.browser_download_url : release.html_url;
  }

  isNewerVersion(latest, current) {
    // Simple version comparison (assumes semantic versioning)
    const latestParts = latest.split('.').map(Number);
    const currentParts = current.split('.').map(Number);
    
    for (let i = 0; i < Math.max(latestParts.length, currentParts.length); i++) {
      const latestPart = latestParts[i] || 0;
      const currentPart = currentParts[i] || 0;
      
      if (latestPart > currentPart) return true;
      if (latestPart < currentPart) return false;
    }
    
    return false;
  }

  async showUpdateNotification(updateInfo) {
    // Create notification
    chrome.notifications.create('update-available', {
      type: 'basic',
      iconUrl: 'icons/icon-48.png',
      title: 'Bet Tracker Pro Update Available',
      message: `Version ${updateInfo.latestVersion} is now available. Click to download.`,
      buttons: [
        { title: 'Download Update' },
        { title: 'Remind Later' }
      ]
    });

    // Handle notification clicks
    chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
      if (notificationId === 'update-available') {
        if (buttonIndex === 0) {
          // Open download page
          chrome.tabs.create({ url: updateInfo.releaseUrl });
        }
        chrome.notifications.clear(notificationId);
      }
    });

    chrome.notifications.onClicked.addListener((notificationId) => {
      if (notificationId === 'update-available') {
        chrome.tabs.create({ url: updateInfo.releaseUrl });
        chrome.notifications.clear(notificationId);
      }
    });
  }

  scheduleUpdateChecks() {
    // Set up alarm for periodic checks
    chrome.alarms.create('updateCheck', {
      delayInMinutes: 60, // First check in 1 hour
      periodInMinutes: 60 * 24 // Then every 24 hours
    });

    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === 'updateCheck') {
        this.checkForUpdates();
      }
    });
  }

  async getUpdateStatus() {
    const result = await chrome.storage.local.get(['availableUpdate']);
    return result.availableUpdate || { hasUpdate: false };
  }
}

// Export for use in background script
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ExtensionUpdater;
} else if (typeof window !== 'undefined') {
  window.ExtensionUpdater = ExtensionUpdater;
}