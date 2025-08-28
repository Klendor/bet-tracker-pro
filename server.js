import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// Import route handlers (converted from serverless functions)
import { healthHandler } from './routes/health.js';
import { authHandler } from './routes/auth.js';
import { userHandler } from './routes/user.js';
import { processBetHandler } from './routes/process-bet.js';
import { historyHandler } from './routes/history.js';
import { sheetsHandler } from './routes/sheets.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : '*',
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/health', healthHandler);
app.use('/api/auth', authHandler);
app.use('/api/user', userHandler);
app.use('/api/process-bet', processBetHandler);
app.use('/api/history', historyHandler);
app.use('/api/sheets', sheetsHandler);

// Serve auth success page
app.get('/auth-success.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'auth-success.html'));
});

// Root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error' 
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    error: 'Endpoint not found' 
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Bet Tracker Pro API server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
});

export default app;