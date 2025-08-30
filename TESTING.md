# Bet Tracker Pro - Testing Documentation

## Overview
This document outlines comprehensive test cases for all functions in the Bet Tracker Pro Chrome extension, including edge cases, error scenarios, and expected behaviors.

## Testing Environment Setup

### Prerequisites
1. Chrome browser (latest version)
2. Extension loaded in Developer Mode
3. Backend server running (Railway deployment)
4. Test Google account for authentication
5. Network connection for API calls

### Test Data
- Test Google Account: Use a dedicated test account
- Test Spreadsheet: Create a test spreadsheet for Sheets integration
- Sample bet slips: Use various bookmaker websites

---

## 1. Authentication Tests

### 1.1 Sign In Flow
**Test Case:** User signs in with Google OAuth
- **Steps:**
  1. Click "Sign In" button (auth toggle)
  2. Complete Google OAuth in new tab
  3. Return to extension popup
- **Expected:** 
  - User email displayed
  - Usage stats loaded
  - Auth button changes to "Sign Out"
- **Error Cases:**
  - Network failure: Show "Authentication failed" toast
  - Invalid token: Clear storage and show guest state
  - Backend down: Show "Backend not available" error

### 1.2 Sign Out Flow
**Test Case:** User signs out
- **Steps:**
  1. Click "Sign Out" button
  2. Confirm action if prompted
- **Expected:**
  - User data cleared
  - Return to guest state
  - Show "Signed out successfully" toast
- **Error Cases:**
  - Network failure: Still clear local data

### 1.3 Session Persistence
**Test Case:** Extension remembers user
- **Steps:**
  1. Sign in successfully
  2. Close and reopen extension
- **Expected:** User remains signed in
- **Edge Case:** Token expired - auto sign out

---

## 2. Google Sheets Integration Tests

### 2.1 Initial Connection
**Test Case:** Connect Google Sheets for first time
- **Steps:**
  1. Sign in to extension
  2. Click Google Sheets button
  3. Authorize Sheets access
  4. Wait for template creation
- **Expected:**
  - Sheets connected indicator
  - Template spreadsheet created
  - Capture button enabled
- **Error Cases:**
  - Authorization denied: Show error, keep button disabled
  - API quota exceeded: Show specific error message
  - Network timeout: Retry with exponential backoff

### 2.2 Disconnect Sheets
**Test Case:** Disconnect from Google Sheets
- **Steps:**
  1. Open Sheets settings
  2. Click "Disconnect"
  3. Confirm action
- **Expected:**
  - Sheets disconnected
  - Capture button disabled
  - Local reference cleared
- **Error Cases:**
  - Backend error: Still clear local state
  - Network failure: Queue for retry

### 2.3 Sync All History
**Test Case:** Sync existing bets to Sheets
- **Steps:**
  1. Have local bet history
  2. Click "Sync All History"
- **Expected:**
  - All bets appear in spreadsheet
  - Success message with count
  - No duplicates created
- **Error Cases:**
  - Large dataset (>100 bets): Batch processing
  - Partial failure: Report which bets failed
  - Rate limiting: Implement retry logic

---

## 3. Bet Capture Tests

### 3.1 Successful Capture
**Test Case:** Capture bet slip from supported site
- **Steps:**
  1. Navigate to betting site
  2. Click "Capture Bet Slip"
  3. Select area with bet slip
  4. Click to confirm
- **Expected:**
  - Screenshot captured
  - AI processes data
  - Bet saved to history
  - Synced to Sheets
  - Success toast shown
- **Error Cases:**
  - Invalid selection: Prompt to retry
  - AI extraction fails: Save raw image, manual entry option
  - Sync fails: Save locally, retry later

### 3.2 Usage Limits
**Test Case:** User reaches monthly limit
- **Steps:**
  1. Use all monthly captures
  2. Try to capture another
- **Expected:**
  - Button disabled
  - "Limit Reached" message
  - Upgrade prompt shown
- **Edge Cases:**
  - Exactly at limit: Allow last capture
  - Plan change mid-month: Update limits immediately

### 3.3 Unsupported Sites
**Test Case:** Capture from non-betting site
- **Steps:**
  1. Navigate to non-betting site
  2. Attempt capture
- **Expected:**
  - Capture still works
  - AI attempts extraction
  - User can manual adjust if needed

---

## 4. Data Management Tests

### 4.1 Bet History Display
**Test Case:** View bet history
- **Steps:**
  1. Click "History" button
  2. Browse through bets
- **Expected:**
  - All bets displayed
  - Correct sorting (newest first)
  - All fields shown
- **Edge Cases:**
  - Empty history: Show empty state
  - >1000 bets: Implement pagination
  - Corrupted data: Skip invalid entries

### 4.2 Export Functions
**Test Case:** Export bet history to CSV
- **Steps:**
  1. Open history
  2. Click "Export CSV"
- **Expected:**
  - CSV file downloaded
  - All data included
  - Proper formatting
- **Error Cases:**
  - Download blocked: Show instructions
  - Large file: Compress or split

### 4.3 Clear History
**Test Case:** Clear all bet history
- **Steps:**
  1. Open history
  2. Click "Clear All"
  3. Confirm action
- **Expected:**
  - All local history deleted
  - UI updates to empty state
  - Sheets data unchanged
- **Edge Cases:**
  - Partial clear failure: Retry
  - Sync in progress: Wait for completion

---

## 5. UI/UX Tests

### 5.1 Theme Toggle
**Test Case:** Switch between dark/light mode
- **Steps:**
  1. Open menu
  2. Toggle theme switch
- **Expected:**
  - Theme changes immediately
  - Preference saved
  - All elements styled correctly
- **Edge Cases:**
  - System theme preference: Respect initially
  - Animation performance: Smooth transitions

### 5.2 Stats Calculation
**Test Case:** Quick stats update correctly
- **Steps:**
  1. Add new bet
  2. Check stats cards
- **Expected:**
  - Today count increments
  - Streak updates
  - Monthly P/L recalculates
- **Edge Cases:**
  - Timezone changes: Use local time
  - Missing data: Show 0 or N/A

### 5.3 Loading States
**Test Case:** All async operations show loading
- **Steps:**
  1. Trigger any async operation
  2. Observe loading indicator
- **Expected:**
  - Loading overlay appears
  - Descriptive message shown
  - Disappears on completion
- **Error Cases:**
  - Timeout: Auto-hide after 30s
  - Multiple operations: Queue or block

---

## 6. Error Handling Tests

### 6.1 Network Failures
**Test Case:** Handle offline/network errors
- **Steps:**
  1. Disconnect network
  2. Try various operations
- **Expected:**
  - Graceful degradation
  - Clear error messages
  - Local operations still work
  - Queue for retry when online

### 6.2 Backend Errors
**Test Case:** Backend returns errors
- **Scenarios:**
  - 500 Internal Server Error
  - 401 Unauthorized
  - 429 Rate Limited
  - 503 Service Unavailable
- **Expected:**
  - Specific error messages
  - Retry logic where appropriate
  - Fallback to local storage

### 6.3 Storage Errors
**Test Case:** Chrome storage quota exceeded
- **Steps:**
  1. Fill storage to limit
  2. Try to save new bet
- **Expected:**
  - Error message shown
  - Suggest clearing old data
  - Priority save (newest data)

---

## 7. Performance Tests

### 7.1 Load Time
**Test Case:** Extension loads quickly
- **Metrics:**
  - Initial load: <500ms
  - Data fetch: <1s
  - UI render: <100ms
- **Optimization:**
  - Lazy load non-critical
  - Cache frequently used data
  - Minimize API calls

### 7.2 Memory Usage
**Test Case:** Extension doesn't leak memory
- **Steps:**
  1. Use extension for extended period
  2. Monitor memory usage
- **Expected:**
  - Stable memory usage
  - Proper cleanup on close
  - No detached DOM nodes

### 7.3 Large Dataset Handling
**Test Case:** Handle 1000+ bets efficiently
- **Expected:**
  - Smooth scrolling
  - Fast search/filter
  - Pagination if needed
- **Optimization:**
  - Virtual scrolling
  - Debounced search
  - Indexed data structures

---

## 8. Security Tests

### 8.1 Token Security
**Test Case:** Tokens stored securely
- **Verification:**
  - Tokens in chrome.storage.sync
  - Never in localStorage
  - Never exposed in UI
  - Cleared on logout

### 8.2 API Security
**Test Case:** API calls are secure
- **Verification:**
  - HTTPS only
  - Token in headers
  - No sensitive data in URLs
  - CORS properly configured

### 8.3 Content Security Policy
**Test Case:** CSP prevents XSS
- **Verification:**
  - No inline scripts
  - No eval() usage
  - External resources whitelisted
  - Proper sanitization

---

## 9. Compatibility Tests

### 9.1 Chrome Versions
**Test Versions:**
- Chrome 100+
- Chrome Beta
- Chrome Canary
**Expected:** Full functionality in all

### 9.2 Screen Sizes
**Test Resolutions:**
- 1920x1080 (Full HD)
- 2560x1440 (2K)
- 3840x2160 (4K)
- Zoom levels: 50%-200%
**Expected:** Popup renders correctly

### 9.3 Operating Systems
**Test OS:**
- Windows 10/11
- macOS 12+
- Linux (Ubuntu 20.04+)
**Expected:** Consistent behavior

---

## 10. Edge Cases & Boundary Tests

### 10.1 Rapid Actions
**Test Case:** User clicks rapidly
- **Scenarios:**
  - Multiple capture clicks
  - Rapid sign in/out
  - Quick navigation
- **Expected:** 
  - Debouncing prevents duplicates
  - No crashes or freezes
  - Clear state management

### 10.2 Concurrent Operations
**Test Case:** Multiple operations at once
- **Scenarios:**
  - Capture while syncing
  - Export during history load
  - Theme change during API call
- **Expected:**
  - Operations queue or block appropriately
  - No race conditions
  - UI remains responsive

### 10.3 Data Validation
**Test Case:** Invalid/malformed data
- **Scenarios:**
  - Corrupt bet data
  - Invalid dates
  - Missing required fields
  - XSS attempts in fields
- **Expected:**
  - Graceful handling
  - Default values used
  - Security sanitization
  - Error logged, user notified

---

## Testing Checklist

### Before Each Release
- [ ] All authentication flows work
- [ ] Google Sheets integration functional
- [ ] Bet capture on 3+ betting sites
- [ ] History export produces valid CSV
- [ ] Theme toggle persists
- [ ] No console errors in normal flow
- [ ] Loading states appear/disappear correctly
- [ ] Error messages are user-friendly
- [ ] Monthly limits enforced
- [ ] Offline mode degrades gracefully

### Regression Tests
- [ ] Previous bugs remain fixed
- [ ] Performance hasn't degraded
- [ ] All features from previous version work
- [ ] Data migration successful (if applicable)

### User Acceptance Tests
- [ ] New user can complete onboarding
- [ ] Existing user data preserved on update
- [ ] UI animations smooth
- [ ] All text readable and clear
- [ ] Buttons/links provide feedback
- [ ] Help documentation accessible

---

## Bug Reporting Template

When reporting bugs, include:

```
**Environment:**
- Chrome Version: 
- OS: 
- Extension Version: 
- Network Status: 
- User State: (signed in/out)

**Steps to Reproduce:**
1. 
2. 
3. 

**Expected Behavior:**

**Actual Behavior:**

**Error Messages:**

**Screenshots:**

**Console Logs:**
```

---

## Automated Testing (Future)

### Unit Tests (Jest)
- Authentication functions
- Data parsing utilities
- Storage operations
- API request builders

### Integration Tests (Puppeteer)
- Full user flows
- Cross-browser testing
- Screenshot comparisons
- Performance benchmarks

### E2E Tests (Cypress)
- Complete user journeys
- Real betting site integration
- Google Sheets verification
- Multi-tab coordination

---

## Contact

For testing support or to report issues:
- GitHub Issues: [Project Repository]
- Email: support@bettrackerpro.com
- Discord: [Community Server]

Last Updated: January 2024
