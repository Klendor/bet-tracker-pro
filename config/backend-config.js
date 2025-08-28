// Backend service configuration for Bet Tracker Pro SaaS
const BACKEND_CONFIG = {
  // Production API endpoints
  PRODUCTION: {
    BASE_URL: 'https://api.bettrackerpro.com',
    ENDPOINTS: {
      AUTH: '/auth',
      PROCESS_BET: '/process-bet',
      GET_USAGE: '/usage',
      GET_HISTORY: '/history',
      UPGRADE: '/upgrade',
      WEBHOOKS: '/webhooks'
    }
  },
  
  // Development API endpoints
  DEVELOPMENT: {
    BASE_URL: 'http://localhost:3000',
    ENDPOINTS: {
      AUTH: '/auth',
      PROCESS_BET: '/process-bet',
      GET_USAGE: '/usage',
      GET_HISTORY: '/history',
      UPGRADE: '/upgrade',
      WEBHOOKS: '/webhooks'
    }
  },
  
  // Current environment (change to 'PRODUCTION' when deployed)
  ENVIRONMENT: 'DEVELOPMENT',
  
  // API request configuration
  REQUEST_CONFIG: {
    TIMEOUT: 30000, // 30 seconds
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000, // 1 second
  },
  
  // Plan limits (enforced on backend)
  PLAN_LIMITS: {
    free: 30,
    pro: 1000,
    proplus: 10000
  },
  
  // Subscription plans
  SUBSCRIPTION_PLANS: {
    free: {
      name: 'Free',
      price: 0,
      currency: 'USD',
      period: 'month',
      limits: {
        bets: 30,
        features: ['basic_extraction', 'local_storage']
      }
    },
    pro: {
      name: 'Pro',
      price: 9.99,
      currency: 'USD', 
      period: 'month',
      limits: {
        bets: 1000,
        features: ['advanced_extraction', 'google_sheets', 'export_csv']
      }
    },
    proplus: {
      name: 'Pro Plus',
      price: 29.99,
      currency: 'USD',
      period: 'month', 
      limits: {
        bets: 10000,
        features: ['advanced_extraction', 'google_sheets', 'export_csv', 'api_access', 'priority_support']
      }
    }
  }
};

// Get current API configuration
function getApiConfig() {
  const env = BACKEND_CONFIG.ENVIRONMENT;
  return {
    baseUrl: BACKEND_CONFIG[env].BASE_URL,
    endpoints: BACKEND_CONFIG[env].ENDPOINTS,
    requestConfig: BACKEND_CONFIG.REQUEST_CONFIG
  };
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { BACKEND_CONFIG, getApiConfig };
}