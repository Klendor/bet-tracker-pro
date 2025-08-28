import { Router } from 'express';
import { google } from 'googleapis';
import jwt from 'jsonwebtoken';
import { getUserByGoogleId, createUser, updateUser } from '../lib/database.js';

const router = Router();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;
const JWT_SECRET = process.env.JWT_SECRET;

// Google OAuth initiation
router.get('/google', async (req, res) => {
  try {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
      return res.status(500).json({ success: false, error: 'Google OAuth not configured' });
    }

    const oauth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      GOOGLE_REDIRECT_URI
    );

    const authorizeUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: [
        'profile',
        'email',
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.file'
      ],
      state: 'bet-tracker-pro'
    });

    res.redirect(authorizeUrl);
  } catch (error) {
    console.error('OAuth initiation error:', error);
    res.status(500).json({ success: false, error: 'Failed to initiate authentication' });
  }
});

// Google OAuth callback
router.get('/google/callback', async (req, res) => {
  try {
    const { code, error, state } = req.query;

    if (error) {
      console.error('OAuth error:', error);
      return res.redirect('/auth-success.html?error=access_denied');
    }

    if (!code) {
      return res.status(400).json({ success: false, error: 'Authorization code not provided' });
    }

    const oauth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      GOOGLE_REDIRECT_URI
    );

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    const profile = userInfo.data;

    let user = await getUserByGoogleId(profile.id);

    if (!user) {
      user = await createUser({
        email: profile.email,
        name: profile.name,
        google_id: profile.id,
        google_access_token: tokens.access_token,
        google_refresh_token: tokens.refresh_token,
        plan: 'free',
        usage_count: 0
      });
    } else {
      await updateUser(user.id, {
        google_access_token: tokens.access_token,
        google_refresh_token: tokens.refresh_token || user.google_refresh_token,
        name: profile.name,
        email: profile.email
      });
    }

    const token = jwt.sign(
      { 
        userId: user.id,
        email: user.email,
        plan: user.plan
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.redirect(`/auth-success.html?token=${token}&user=${encodeURIComponent(JSON.stringify({
      id: user.id,
      email: user.email,
      name: user.name,
      plan: user.plan,
      usage_count: user.usage_count
    }))}`);

  } catch (error) {
    console.error('OAuth callback error:', error);
    res.redirect('/auth-success.html?error=server_error');
  }
});

export { router as authHandler };