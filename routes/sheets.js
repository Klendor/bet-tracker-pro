import { Router } from 'express';
import { authenticateRequest } from '../lib/auth.js';
import { getUserById, updateUser, createBet } from '../lib/database.js';
import { 
  createGoogleSheetsTemplate,
  syncBetToSheets
} from '../lib/sheets.js';

const router = Router();

// Check Google Sheets connection status
router.get('/status', async (req, res) => {
  try {
    const decoded = authenticateRequest(req);
    const user = await getUserById(decoded.userId);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const status = {
      isAuthenticated: !!(user.google_access_token && user.google_refresh_token),
      hasSpreadsheet: !!user.spreadsheet_id,
      isSetupComplete: user.sheets_connected,
      spreadsheetUrl: user.spreadsheet_url
    };

    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    console.error('Sheets status error:', error);
    
    if (error.message.includes('token') || error.message.includes('Authorization')) {
      return res.status(401).json({ success: false, error: error.message });
    }
    
    res.status(500).json({ success: false, error: 'Failed to check sheets status' });
  }
});

// Create Google Sheets template
router.post('/create-template', async (req, res) => {
  try {
    const decoded = authenticateRequest(req);
    const user = await getUserById(decoded.userId);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const result = await createGoogleSheetsTemplate(user);

    await updateUser(user.id, {
      sheets_connected: true,
      spreadsheet_id: result.spreadsheetId,
      spreadsheet_url: result.spreadsheetUrl,
      updated_at: new Date().toISOString()
    });

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Create template error:', error);
    
    if (error.message.includes('token') || error.message.includes('Authorization')) {
      return res.status(401).json({ success: false, error: error.message });
    }
    
    res.status(500).json({ success: false, error: 'Failed to create sheets template' });
  }
});

// Sync bet to Google Sheets
router.post('/sync-bet', async (req, res) => {
  try {
    console.log('📊 [Sheets Sync] Request received');
    console.log('📊 [Sheets Sync] Request body:', JSON.stringify(req.body, null, 2));
    
    const decoded = authenticateRequest(req);
    const { betId, betData } = req.body;
    
    console.log('📊 [Sheets Sync] User ID:', decoded.userId);
    console.log('📊 [Sheets Sync] Has betData:', !!betData);
    console.log('📊 [Sheets Sync] Has betId:', !!betId);
    
    // Log the actual betData if present
    if (betData) {
      console.log('📊 [Sheets Sync] BetData received:', {
        id: betData.id,
        teams: betData.teams,
        date: betData.date,
        hasAllFields: !!(betData.teams && betData.stake && betData.odds)
      });
    }

    const user = await getUserById(decoded.userId);

    if (!user) {
      console.error('📊 [Sheets Sync] User not found:', decoded.userId);
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    console.log('📊 [Sheets Sync] User sheets status:', {
      hasAccessToken: !!user.google_access_token,
      hasRefreshToken: !!user.google_refresh_token,
      hasSpreadsheetId: !!user.spreadsheet_id,
      sheetsConnected: user.sheets_connected
    });

    // Check if sheets is properly configured
    if (!user.spreadsheet_id) {
      console.error('📊 [Sheets Sync] No spreadsheet configured for user');
      return res.status(400).json({ 
        success: false, 
        error: 'No spreadsheet configured. Please set up Google Sheets integration first.' 
      });
    }

    if (!user.google_access_token || !user.google_refresh_token) {
      console.error('📊 [Sheets Sync] Missing Google tokens');
      return res.status(401).json({ 
        success: false, 
        error: 'Google authentication required. Please reconnect your Google account.' 
      });
    }

    let result;
    if (betData && Object.keys(betData).length > 0) {
      // Direct bet data provided (for syncing from local storage)
      console.log('📊 [Sheets Sync] Syncing bet data directly');
      result = await syncBetToSheets(user, betData);
    } else if (betId) {
      // Bet ID provided (for syncing from database)
      console.log('📊 [Sheets Sync] Syncing bet by ID:', betId);
      // This would need to fetch the bet from database first
      return res.status(400).json({ 
        success: false, 
        error: 'Syncing by bet ID not implemented. Please provide betData.' 
      });
    } else {
      console.error('📊 [Sheets Sync] No valid bet data provided');
      console.error('📊 [Sheets Sync] Request body was:', req.body);
      return res.status(400).json({ 
        success: false, 
        error: 'Bet data is required for syncing' 
      });
    }
    
    console.log('📊 [Sheets Sync] Sync result:', result);

    // Check if the result indicates an error
    if (!result || !result.success) {
      console.error('📊 [Sheets Sync] Sync failed:', result?.error || 'Unknown error');
      return res.json({
        success: false,
        error: result?.error || 'Failed to sync to Google Sheets',
        details: result?.details
      });
    }

    res.json({
      success: true,
      data: result,
      message: 'Bet synced to Google Sheets successfully'
    });

  } catch (error) {
    console.error('📊 [Sheets Sync] Error:', error);
    console.error('📊 [Sheets Sync] Error stack:', error.stack);
    
    if (error.message.includes('token') || error.message.includes('Authorization')) {
      return res.status(401).json({ success: false, error: error.message });
    }
    
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to sync bet to sheets',
      details: error.toString()
    });
  }
});

// Disconnect from Google Sheets
router.post('/disconnect', async (req, res) => {
  try {
    console.log('🔓 [Sheets Disconnect] Request received');
    const decoded = authenticateRequest(req);
    const user = await getUserById(decoded.userId);

    if (!user) {
      console.error('🔓 [Sheets Disconnect] User not found:', decoded.userId);
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    console.log('🔓 [Sheets Disconnect] Clearing sheets data for user:', user.email);
    console.log('🔓 [Sheets Disconnect] Current sheets status:', {
      sheetsConnected: user.sheets_connected,
      hasSpreadsheetId: !!user.spreadsheet_id,
      spreadsheetUrl: user.spreadsheet_url
    });

    // Clear sheets connection data but keep Google OAuth tokens
    // (user might want to reconnect later without re-authenticating)
    const updateResult = await updateUser(user.id, {
      sheets_connected: false,
      spreadsheet_id: null,
      spreadsheet_url: null,
      updated_at: new Date().toISOString()
    });
    
    console.log('🔓 [Sheets Disconnect] Update successful:', {
      userId: user.id,
      sheetsConnected: updateResult.sheets_connected,
      spreadsheetId: updateResult.spreadsheet_id
    });

    res.json({
      success: true,
      message: 'Disconnected from Google Sheets successfully'
    });

  } catch (error) {
    console.error('🔓 [Sheets Disconnect] Error:', error);
    console.error('🔓 [Sheets Disconnect] Error stack:', error.stack);
    
    if (error.message.includes('token') || error.message.includes('Authorization')) {
      return res.status(401).json({ success: false, error: error.message });
    }
    
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to disconnect from sheets',
      details: error.toString()
    });
  }
});

export { router as sheetsHandler };