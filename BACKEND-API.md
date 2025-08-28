# Bet Tracker Pro - Backend API Specification

## Base URLs
- **Development**: `http://localhost:3000`
- **Production**: `https://api.bettrackerpro.com`

## Authentication
All authenticated endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <user_token>
```

## Endpoints

### Authentication

#### POST `/auth/register`
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Account created successfully. Please verify your email.",
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "John Doe",
    "plan": "free",
    "usage_count": 0,
    "usage_reset_date": "2024-02-01T00:00:00Z"
  }
}
```

#### POST `/auth/login`
Authenticate user and get access token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt_token_here",
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "John Doe", 
    "plan": "free",
    "usage_count": 5,
    "usage_reset_date": "2024-02-01T00:00:00Z"
  }
}
```

### User Management

#### GET `/user/info`
Get current user information and usage stats.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "John Doe",
    "plan": "pro",
    "usage_count": 45,
    "usage_limit": 1000,
    "usage_reset_date": "2024-02-01T00:00:00Z",
    "subscription": {
      "status": "active",
      "current_period_end": "2024-02-01T00:00:00Z"
    }
  }
}
```

### Bet Processing

#### POST `/process-bet`
Process a bet slip image and extract bet details.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "imageData": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "selection": {
    "left": 100,
    "top": 200,
    "width": 300,
    "height": 400
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "bet_456",
    "teams": "Lakers vs Warriors",
    "sport": "basketball",
    "bet_type": "moneyline",
    "selection": "Lakers to win",
    "odds": "+150",
    "stake": "$50",
    "potential_return": "$125",
    "bookmaker": "DraftKings",
    "date": "2024-01-15",
    "confidence": "high",
    "processed_at": "2024-01-15T10:30:15Z",
    "processor": "gemini-1.5-flash"
  },
  "usage": {
    "count": 6,
    "limit": 30,
    "remaining": 24
  }
}
```

**Error Responses:**
- `401`: Authentication required/invalid
- `402`: Usage limit exceeded (payment required)
- `429`: Rate limit exceeded
- `500`: Server error

### History

#### GET `/history`
Get user's bet history.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `start_date`: Filter from date (ISO 8601)
- `end_date`: Filter to date (ISO 8601)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "bet_456",
      "teams": "Lakers vs Warriors",
      "sport": "basketball",
      "bet_type": "moneyline",
      "selection": "Lakers to win",
      "odds": "+150",
      "stake": "$50",
      "potential_return": "$125",
      "bookmaker": "DraftKings",
      "date": "2024-01-15",
      "processed_at": "2024-01-15T10:30:15Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  }
}
```

### Subscriptions

#### POST `/upgrade`
Upgrade user subscription plan.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "plan": "pro",
  "payment_method": "pm_stripe_payment_method_id"
}
```

**Response:**
```json
{
  "success": true,
  "subscription": {
    "id": "sub_123",
    "plan": "pro",
    "status": "active",
    "current_period_end": "2024-02-15T00:00:00Z"
  },
  "user": {
    "plan": "pro",
    "usage_limit": 1000
  }
}
```

## Error Format

All errors follow this format:
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

## Rate Limits

- **Authentication**: 10 requests per minute
- **Bet Processing**: 100 requests per hour per user
- **Other endpoints**: 1000 requests per hour per user

## Subscription Plans

| Plan | Price | Monthly Bets | Features |
|------|-------|--------------|----------|
| Free | $0 | 30 | Basic extraction, Local storage |
| Pro | $9.99 | 1,000 | Advanced extraction, Google Sheets, CSV export |
| Pro Plus | $29.99 | 10,000 | All Pro features + API access, Priority support |

## Webhooks

#### POST `/webhooks/stripe`
Handle Stripe webhook events for subscription management.

**Headers:** `Stripe-Signature: <signature>`

**Events Handled:**
- `customer.subscription.created`
- `customer.subscription.updated` 
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`