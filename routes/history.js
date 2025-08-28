import { Router } from 'express';
import { authenticateRequest } from '../lib/auth.js';
import { getBetHistory } from '../lib/database.js';

const router = Router();

// Get bet history
router.get('/', async (req, res) => {
  try {
    const decoded = authenticateRequest(req);
    
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);

    const historyData = await getBetHistory(decoded.userId, page, limit);

    res.json({
      success: true,
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
      return res.status(401).json({ success: false, error: error.message });
    }
    
    res.status(500).json({ success: false, error: 'Failed to get bet history' });
  }
});

export { router as historyHandler };