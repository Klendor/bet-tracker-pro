// Welcome page JavaScript - separated to fix CSP issues
class WelcomePageSetup {
  constructor() {
    this.apiKeySet = false;
    this.init();
  }

  init() {
    // Wait for DOM to load
    document.addEventListener('DOMContentLoaded', () => {
      this.setupEventListeners();
      this.checkExistingAuth();
    });
  }

  setupEventListeners() {
    // Create account button
    const createBtn = document.getElementById('createAccountBtn');
    if (createBtn) {
      createBtn.addEventListener('click', () => this.createAccount());
    }

    // Sign in button
    const signInBtn = document.getElementById('signInBtn');
    if (signInBtn) {
      signInBtn.addEventListener('click', () => this.signIn());
    }

    // Final setup button
    const finalBtn = document.getElementById('finishSetupBtn');
    if (finalBtn) {
      finalBtn.addEventListener('click', () => this.finishSetup());
    }
  }

  createAccount() {
    // Open account creation page
    chrome.tabs.create({ url: 'https://auth.bettrackerpro.com/register' });
    
    // Show completion steps
    this.showSetupComplete();
  }
  
  signIn() {
    // Open sign in page
    chrome.tabs.create({ url: 'https://auth.bettrackerpro.com/login' });
    
    // Show completion steps
    this.showSetupComplete();
  }
  
  showSetupComplete() {
    // Mark steps as completed
    document.getElementById('step1').classList.add('completed');
    document.getElementById('step2').classList.add('completed');
    document.getElementById('step3').classList.add('completed');
    document.getElementById('step4').classList.add('completed');
    
    const statusDiv = document.getElementById('authStatus');
    statusDiv.innerHTML = '<div class="alert alert-success">✅ Account setup initiated! Please complete authentication in the new tab, then return to use the extension.</div>';
    
    // Show final step
    document.getElementById('finalStep').style.display = 'block';
    
    // Scroll to final step
    document.getElementById('finalStep').scrollIntoView({ behavior: 'smooth' });
  }
  
  finishSetup() {
    // Close this tab and focus on a betting site for demo
    alert('Setup complete! 🎉\n\nTry it out:\n1. Go to any betting site\n2. Click the Bet Tracker Pro icon\n3. Click "Capture Bet Slip"\n4. Select your bet slip area');
    window.close();
  }
  
  async checkExistingAuth() {
    try {
      const result = await chrome.storage.sync.get(['userToken', 'user']);
      if (result.userToken && result.user) {
        // User is already authenticated
        this.showSetupComplete();
      }
    } catch (error) {
      console.log('No existing authentication found');
    }
  }
}

// Initialize the welcome page setup
new WelcomePageSetup();