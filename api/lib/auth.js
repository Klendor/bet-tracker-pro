// Authentication utilities for Vercel serverless functions
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

// JWT token verification
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid token');
  }
};

// JWT token generation
export const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
};

// Middleware function for serverless routes
export const authenticateRequest = (req) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  
  if (!authHeader) {
    throw new Error('Authorization header required');
  }

  const token = authHeader.startsWith('Bearer ') 
    ? authHeader.slice(7) 
    : authHeader;

  if (!token) {
    throw new Error('Access token required');
  }

  return verifyToken(token);
};

// CORS headers for Vercel functions
export const setCorsHeaders = (res) => {
  const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || [
    'chrome-extension://*',
    'https://localhost:3000',
    'http://localhost:3000'
  ];

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
  
  return res;
};

// Handle preflight OPTIONS requests
export const handleOptions = (req, res) => {
  if (req.method === 'OPTIONS') {
    setCorsHeaders(res);
    return res.status(200).end();
  }
  return false;
};

// Rate limiting utilities (using Vercel KV or similar)
export class RateLimiter {
  constructor(options = {}) {
    this.points = options.points || 100;
    this.duration = options.duration || 3600; // 1 hour
    this.keyPrefix = options.keyPrefix || 'rl:';
  }

  async consume(identifier) {
    // For now, we'll implement basic in-memory rate limiting
    // In production, you'd use Vercel KV, Redis, or similar
    const key = `${this.keyPrefix}${identifier}`;
    const now = Date.now();
    
    // This is a simplified version - in production use proper storage
    return { remainingPoints: this.points - 1 };
  }
}

// Error response helper
export const errorResponse = (res, statusCode, message, code = null) => {
  setCorsHeaders(res);
  return res.status(statusCode).json({
    success: false,
    error: message,
    ...(code && { code })
  });
};

// Success response helper
export const successResponse = (res, data, statusCode = 200) => {
  setCorsHeaders(res);
  return res.status(statusCode).json({
    success: true,
    ...data
  });
};