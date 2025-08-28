// Vercel Serverless Function: Google Sheets Status
import { authenticateRequest, handleOptions, errorResponse, successResponse } from '../../lib/auth.js';
import { getUserById } from '../../lib/database.js';

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
    const user = await getUserById(decoded.userId);
    
    if (!user) {
      return errorResponse(res, 404, 'User not found');
    }

    return successResponse(res, {
      isAuthenticated: !!user.google_access_token,
      hasSpreadsheet: !!user.spreadsheet_id,
      spreadsheetUrl: user.spreadsheet_url,
      isSetupComplete: !!user.google_access_token && !!user.spreadsheet_id
    });

  } catch (error) {
    console.error('Sheets status error:', error);
    
    if (error.message.includes('token') || error.message.includes('Authorization')) {
      return errorResponse(res, 401, error.message);
    }
    
    return errorResponse(res, 500, 'Failed to get status');
  }
}