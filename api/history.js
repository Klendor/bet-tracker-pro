// Vercel Serverless Function: Bet History
import { authenticateRequest, handleOptions, errorResponse, successResponse } from '../lib/auth.js';
import { getBetHistory } from '../lib/database.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;

  // Only allow GET method
  if (req.method !== 'GET') {
    return errorResponse(res, 405, 'Method not allowed');
  }

  try {
    // Authenticate user
    const decoded = authenticateRequest(req);
    
    // Get query parameters
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);

    // Get bet history from database
    const historyData = await getBetHistory(decoded.userId, page, limit);

    return successResponse(res, {
      data: historyData.bets,
      pagination: {
        page: historyData.page,
        limit: historyData.limit,
        total: historyData.total,
        pages: historyData.pages
      }
    });

  } catch (error) {
    console.error('Bet history error:', error);
    
    if (error.message.includes('token') || error.message.includes('Authorization')) {
      return errorResponse(res, 401, error.message);
    }
    
    return errorResponse(res, 500, 'Failed to get bet history');
  }
}