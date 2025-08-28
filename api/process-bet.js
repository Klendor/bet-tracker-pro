// Vercel Serverless Function: Process Bet Slip
import { authenticateRequest, handleOptions, errorResponse, successResponse, RateLimiter } from '../lib/auth.js';
import { getUserById, createBet, checkUsageLimit, resetUsageIfNeeded, updateUser } from '../lib/database.js';
import { processWithGemini } from '../lib/gemini.js';

// Rate limiter for bet processing
const rateLimiter = new RateLimiter({
  points: 100,
  duration: 3600,
  keyPrefix: 'process:'
});

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;

  // Only allow POST method
  if (req.method !== 'POST') {
    return errorResponse(res, 405, 'Method not allowed');
  }

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
      return errorResponse(res, 400, 'Image data required');
    }

    // Get user and check limits
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

    // Check usage limit
    if (!checkUsageLimit(user)) {
      return errorResponse(res, 402, 'Usage limit exceeded. Please upgrade your plan.', 'USAGE_LIMIT_EXCEEDED');
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

    return successResponse(res, {
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
      return errorResponse(res, 401, error.message);
    }
    
    if (error.message.includes('Rate limit')) {
      return errorResponse(res, 429, 'Rate limit exceeded');
    }
    
    return errorResponse(res, 500, 'Failed to process bet slip. Please try again.');
  }
}