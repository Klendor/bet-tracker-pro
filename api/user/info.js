// Vercel Serverless Function: User Info
import { authenticateRequest, handleOptions, errorResponse, successResponse } from '../lib/auth.js';
import { getUserById, resetUsageIfNeeded, updateUser } from '../lib/database.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;

  // Only allow GET method
  if (req.method !== 'GET') {
    return errorResponse(res, 405, 'Method not allowed');
  }

  try {
    // Authenticate user
    const decoded = authenticateRequest(req);
    
    // Get user from database
    let user = await getUserById(decoded.userId);
    
    if (!user) {
      return errorResponse(res, 404, 'User not found');
    }

    // Reset usage if needed
    const updatedUser = resetUsageIfNeeded(user);
    if (updatedUser.usage_count !== user.usage_count) {
      user = await updateUser(user.id, {
        usage_count: updatedUser.usage_count,
        usage_reset_date: updatedUser.usage_reset_date,
        updated_at: new Date().toISOString()
      });
    }

    const limits = { free: 30, pro: 1000, proplus: 10000 };
    
    return successResponse(res, {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        usage_count: user.usage_count,
        usage_limit: limits[user.plan] || limits.free,
        usage_reset_date: user.usage_reset_date,
        sheets_connected: user.sheets_connected,
        spreadsheet_url: user.spreadsheet_url
      }
    });

  } catch (error) {
    console.error('User info error:', error);
    
    if (error.message.includes('token') || error.message.includes('Authorization')) {
      return errorResponse(res, 401, error.message);
    }
    
    return errorResponse(res, 500, 'Failed to get user info');
  }
}