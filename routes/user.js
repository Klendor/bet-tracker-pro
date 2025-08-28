import { Router } from 'express';
import { authenticateRequest } from '../lib/auth.js';
import { getUserById } from '../lib/database.js';

const router = Router();

// Get user info
router.get('/info', async (req, res) => {
  try {
    const decoded = authenticateRequest(req);
    const user = await getUserById(decoded.userId);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        usage_count: user.usage_count,
        sheets_connected: user.sheets_connected,
        created_at: user.created_at
      }
    });

  } catch (error) {
    console.error('Get user info error:', error);
    
    if (error.message.includes('token') || error.message.includes('Authorization')) {
      return res.status(401).json({ success: false, error: error.message });
    }
    
    res.status(500).json({ success: false, error: 'Failed to get user info' });
  }
});

export { router as userHandler };