// Vercel Serverless Function: Create Google Sheets Template
import { authenticateRequest, handleOptions, errorResponse, successResponse } from '../../lib/auth.js';
import { getUserById, updateUser } from '../../lib/database.js';
import { createGoogleSheetsTemplate } from '../../lib/sheets.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;

  // Only allow POST method
  if (req.method !== 'POST') {
    return errorResponse(res, 405, 'Method not allowed');
  }

  try {
    // Authenticate user
    const decoded = authenticateRequest(req);
    
    // Get user from database
    const user = await getUserById(decoded.userId);
    
    if (!user || !user.google_access_token) {
      return errorResponse(res, 401, 'Google authentication required');
    }

    // Create Google Sheets template
    const result = await createGoogleSheetsTemplate(user);

    if (result.success) {
      // Update user with spreadsheet info
      await updateUser(user.id, {
        spreadsheet_id: result.spreadsheetId,
        spreadsheet_url: result.spreadsheetUrl,
        sheets_connected: true,
        updated_at: new Date().toISOString()
      });
      
      return successResponse(res, result);
    } else {
      return errorResponse(res, 500, result.error);
    }

  } catch (error) {
    console.error('Template creation error:', error);
    
    if (error.message.includes('token') || error.message.includes('Authorization')) {
      return errorResponse(res, 401, error.message);
    }
    
    return errorResponse(res, 500, 'Template creation failed');
  }
}