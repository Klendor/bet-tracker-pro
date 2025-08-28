// Vercel Serverless Function: Google OAuth Callback
import { google } from 'googleapis';
import { generateToken, setCorsHeaders, handleOptions, errorResponse, successResponse } from '../lib/auth.js';
import { getUserByGoogleId, createUser, updateUser } from '../lib/database.js';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;

  // Only allow GET method for OAuth callback
  if (req.method !== 'GET') {
    return errorResponse(res, 405, 'Method not allowed');
  }

  try {
    const { code, state } = req.query;

    if (!code) {
      return errorResponse(res, 400, 'Authorization code required');
    }

    // Configure OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      GOOGLE_REDIRECT_URI
    );

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get user profile
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: profile } = await oauth2.userinfo.get();

    if (!profile.email) {
      return errorResponse(res, 400, 'Email not provided by Google');
    }

    // Check if user exists
    let user = await getUserByGoogleId(profile.id);
    
    if (user) {
      // Update existing user with new tokens
      user = await updateUser(user.id, {
        google_access_token: tokens.access_token,
        google_refresh_token: tokens.refresh_token,
        updated_at: new Date().toISOString()
      });
    } else {
      // Create new user
      const resetDate = new Date();
      resetDate.setMonth(resetDate.getMonth() + 1, 1);
      
      user = await createUser({
        email: profile.email,
        name: profile.name || '',
        google_id: profile.id,
        google_access_token: tokens.access_token,
        google_refresh_token: tokens.refresh_token,
        plan: 'free',
        usage_count: 0,
        usage_reset_date: resetDate.toISOString(),
        sheets_connected: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }

    // Generate JWT token
    const jwtToken = generateToken({
      userId: user.id,
      email: user.email
    });

    // Redirect back to extension with token
    const extensionUrl = process.env.EXTENSION_URL || 'chrome-extension://your-extension-id';
    const redirectUrl = `${extensionUrl}/auth-success.html?token=${jwtToken}`;
    
    // For browser redirect
    res.redirect(redirectUrl);

  } catch (error) {
    console.error('Google OAuth callback error:', error);
    return errorResponse(res, 500, 'Authentication failed');
  }
}