import { Router } from 'express';
import { authenticateRequest, RateLimiter } from '../lib/auth.js';
import { getUserById, createBet, checkUsageLimit, resetUsageIfNeeded, updateUser } from '../lib/database.js';
import { processWithGemini } from '../lib/gemini.js';

const router = Router();

// Rate limiter for bet processing
const rateLimiter = new RateLimiter({
  points: 100,
  duration: 3600,
  keyPrefix: 'process:'
});

// Process bet slip
router.post('/', async (req, res) => {
  try {
    // Rate limiting
    const clientIP = req.headers['x-forwarded-for']?.split(',')[0] || 
                    req.connection?.remoteAddress || 
                    'unknown';
    
    await rateLimiter.consume(clientIP);

    // Authenticate user
    const decoded = authenticateRequest(req);
    
    // Get request body
    const { imageData, selection } = req.body;

    if (!imageData) {
      return res.status(400).json({ success: false, error: 'Image data required' });
    }

    // Get user and check limits
    let user = await getUserById(decoded.userId);
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
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

    // Check usage limit
    if (!checkUsageLimit(user)) {
      return res.status(402).json({ 
        success: false, 
        error: 'Usage limit exceeded. Please upgrade your plan.',
        code: 'USAGE_LIMIT_EXCEEDED'
      });
    }

    // Process with Gemini AI (no image storage)
    const extractedData = await processWithGemini(imageData);

    // Increment usage count
    const newUsageCount = user.usage_count + 1;
    await updateUser(user.id, {
      usage_count: newUsageCount,
      updated_at: new Date().toISOString()
    });

    // Save bet to database
    const betData = {
      user_id: user.id,
      teams: extractedData.teams,
      sport: extractedData.sport,
      league: extractedData.league,
      bet_type: extractedData.bet_type,
      selection: extractedData.selection,
      odds: extractedData.odds,
      stake: extractedData.stake,
      potential_return: extractedData.potential_return,
      bookmaker: extractedData.bookmaker,
      status: 'pending',
      date: extractedData.date,
      confidence: extractedData.confidence,
      synced_to_sheets: false,
      processed_at: new Date().toISOString()
    };

    const savedBet = await createBet(betData);
    
    const limits = { free: 30, pro: 1000, proplus: 10000 };
    const limit = limits[user.plan] || limits.free;

    res.json({
      success: true,
      data: {
        ...extractedData,
        id: savedBet.id
      },
      usage: {
        count: newUsageCount,
        limit: limit,
        remaining: limit - newUsageCount
      }
    });

  } catch (error) {
    console.error('Bet processing error:', error);
    
    if (error.message.includes('token') || error.message.includes('Authorization')) {
      return res.status(401).json({ success: false, error: error.message });
    }
    
    if (error.message.includes('Rate limit')) {
      return res.status(429).json({ success: false, error: 'Rate limit exceeded' });
    }
    
    res.status(500).json({ success: false, error: 'Failed to process bet slip. Please try again.' });
  }
});

export { router as processBetHandler };