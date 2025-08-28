// Vercel Serverless Function: Google OAuth Initiation
import { google } from 'googleapis';
import { setCorsHeaders, handleOptions, errorResponse } from '../../lib/auth.js';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;

  // Only allow GET method
  if (req.method !== 'GET') {
    return errorResponse(res, 405, 'Method not allowed');
  }

  try {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
      return errorResponse(res, 500, 'Google OAuth not configured');
    }

    // Configure OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      GOOGLE_REDIRECT_URI
    );

    // Generate the url that will be used for authorization
    const authorizeUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: [
        'profile',
        'email',
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.file'
      ],
      state: 'bet-tracker-pro' // Optional state parameter
    });

    // Redirect to Google OAuth
    res.redirect(authorizeUrl);

  } catch (error) {
    console.error('Google OAuth initiation error:', error);
    return errorResponse(res, 500, 'Failed to initiate authentication');
  }
}