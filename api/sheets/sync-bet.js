// Vercel Serverless Function: Sync Bet to Google Sheets
import { authenticateRequest, handleOptions, errorResponse, successResponse } from '../../lib/auth.js';
import { getUserById } from '../../lib/database.js';
import { syncBetToSheets } from '../../lib/sheets.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;

  // Only allow POST method
  if (req.method !== 'POST') {
    return errorResponse(res, 405, 'Method not allowed');
  }

  try {
    // Authenticate user
    const decoded = authenticateRequest(req);
    
    // Get request body
    const { betData } = req.body;
    
    if (!betData) {
      return errorResponse(res, 400, 'Bet data required');
    }

    // Get user from database
    const user = await getUserById(decoded.userId);
    
    if (!user || !user.spreadsheet_id) {
      return errorResponse(res, 400, 'Spreadsheet not configured');
    }

    // Sync bet to Google Sheets
    const result = await syncBetToSheets(user, betData);
    
    return successResponse(res, result);

  } catch (error) {
    console.error('Sync error:', error);
    
    if (error.message.includes('token') || error.message.includes('Authorization')) {
      return errorResponse(res, 401, error.message);
    }
    
    return errorResponse(res, 500, 'Sync failed');
  }
}