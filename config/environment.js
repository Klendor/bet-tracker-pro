// Environment configuration for different deployment stages
class EnvironmentConfig {
  constructor() {
    this.environment = this.detectEnvironment();
    this.config = this.getEnvironmentConfig();
  }

  detectEnvironment() {
    const manifest = chrome.runtime.getManifest();
    
    // Check version suffix for environment detection
    if (manifest.version.includes('-dev')) {
      return 'staging';
    }
    
    // Check if running in development mode
    if (manifest.version_name && manifest.version_name.includes('dev')) {
      return 'development';
    }
    
    // Check extension name for staging indicator
    if (manifest.name.includes('(Staging)')) {
      return 'staging';
    }
    
    return 'production';
  }

  getEnvironmentConfig() {
    const configs = {
      development: {
        apiUrl: 'http://localhost:3000',
        githubRepo: 'klendor/bet-tracker-pro',
        updateCheckInterval: 5 * 60 * 1000, // 5 minutes for testing
        enableDebugLogs: true,
        enableAutoUpdate: false,
        corsOrigins: ['http://localhost:3000'],
        environment: 'development'
      },
      
      staging: {
        apiUrl: 'https://bet-tracker-pro-api-staging.vercel.app/api',
        githubRepo: 'klendor/bet-tracker-pro',
        updateCheckInterval: 60 * 60 * 1000, // 1 hour
        enableDebugLogs: true,
        enableAutoUpdate: true,
        corsOrigins: ['https://bet-tracker-pro-api-staging.vercel.app'],
        environment: 'staging'
      },
      
      production: {
        apiUrl: 'https://bet-tracker-pro-api.vercel.app/api',
        githubRepo: 'klendor/bet-tracker-pro',
        updateCheckInterval: 24 * 60 * 60 * 1000, // 24 hours
        enableDebugLogs: false,
        enableAutoUpdate: true,
        corsOrigins: ['https://bet-tracker-pro-api.vercel.app'],
        environment: 'production'
      }
    };

    return configs[this.environment] || configs.production;
  }

  get apiUrl() {
    return this.config.apiUrl;
  }

  get githubRepo() {
    return this.config.githubRepo;
  }

  get updateCheckInterval() {
    return this.config.updateCheckInterval;
  }

  get enableDebugLogs() {
    return this.config.enableDebugLogs;
  }

  get enableAutoUpdate() {
    return this.config.enableAutoUpdate;
  }

  get corsOrigins() {
    return this.config.corsOrigins;
  }

  get environmentName() {
    return this.environment;
  }

  log(message, ...args) {
    if (this.enableDebugLogs) {
      console.log(`[${this.environment.toUpperCase()}] ${message}`, ...args);
    }
  }

  error(message, ...args) {
    console.error(`[${this.environment.toUpperCase()}] ${message}`, ...args);
  }

  // Feature flags for different environments
  isFeatureEnabled(featureName) {
    const featureFlags = {
      development: {
        extensionAnalytics: false,
        betaFeatures: true,
        debugMode: true,
        mockData: true
      },
      staging: {
        extensionAnalytics: true,
        betaFeatures: true,
        debugMode: true,
        mockData: false
      },
      production: {
        extensionAnalytics: true,
        betaFeatures: false,
        debugMode: false,
        mockData: false
      }
    };

    return featureFlags[this.environment]?.[featureName] || false;
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EnvironmentConfig;
} else if (typeof window !== 'undefined') {
  window.EnvironmentConfig = EnvironmentConfig;
}