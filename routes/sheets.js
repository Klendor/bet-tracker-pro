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
      isSetupComplete: user.sheets_connected
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
    const decoded = authenticateRequest(req);
    const { betId } = req.body;

    if (!betId) {
      return res.status(400).json({ success: false, error: 'Bet ID required' });
    }

    const user = await getUserById(decoded.userId);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const result = await syncBetToSheets(user, betId);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Sync bet error:', error);
    
    if (error.message.includes('token') || error.message.includes('Authorization')) {
      return res.status(401).json({ success: false, error: error.message });
    }
    
    res.status(500).json({ success: false, error: 'Failed to sync bet to sheets' });
  }
});

export { router as sheetsHandler };