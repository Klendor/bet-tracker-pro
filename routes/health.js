import { Router } from 'express';

const router = Router();

// Health check endpoint
router.get('/', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Bet Tracker Pro API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production'
  });
});

export { router as healthHandler };