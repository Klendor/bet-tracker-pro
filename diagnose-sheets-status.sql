-- Diagnostic script to check Google Sheets integration status
-- Run this in Supabase SQL Editor to see the current state

SELECT 
    id,
    email,
    name,
    sheets_connected,
    spreadsheet_id,
    spreadsheet_url,
    google_access_token IS NOT NULL as has_access_token,
    google_refresh_token IS NOT NULL as has_refresh_token,
    created_at,
    updated_at
FROM users 
ORDER BY created_at DESC 
LIMIT 5;