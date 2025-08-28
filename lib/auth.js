// Authentication utilities for Express.js application
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

// Authenticate request and extract user info
export const authenticateRequest = (req) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Authorization header missing or invalid');
  }
  
  const token = authHeader.substring(7);
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

// Rate limiter class for API protection
export class RateLimiter {
  constructor(options) {
    this.points = options.points || 100;
    this.duration = options.duration || 3600;
    this.keyPrefix = options.keyPrefix || 'rate:';
    this.store = new Map();
  }
  
  async consume(key) {
    const fullKey = this.keyPrefix + key;
    const now = Date.now();
    const windowStart = now - (this.duration * 1000);
    
    // Clean old entries
    const entry = this.store.get(fullKey) || { requests: [], lastReset: now };
    entry.requests = entry.requests.filter(time => time > windowStart);
    
    if (entry.requests.length >= this.points) {
      throw new Error('Rate limit exceeded');
    }
    
    entry.requests.push(now);
    this.store.set(fullKey, entry);
    
    return true;
  }
}

// Helper functions for error responses
export const errorResponse = (res, status, message, code = null) => {
  return res.status(status).json({
    success: false,
    error: message,
    ...(code && { code })
  });
};

export const successResponse = (res, data) => {
  return res.json({
    success: true,
    ...data
  });
};