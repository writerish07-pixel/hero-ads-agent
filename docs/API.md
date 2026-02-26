# API Reference

Base URL: `http://localhost:3001`

All endpoint paths below are relative to this base (e.g., full URL for login is `http://localhost:3001/api/auth/login`).

All responses follow a consistent envelope:

```json
{
  "success": true,
  "data": { ... }
}
```

Error responses:

```json
{
  "success": false,
  "message": "Human-readable error description"
}
```

---

## Authentication

All protected endpoints require a JWT Bearer token in the `Authorization` header:

```
Authorization: Bearer <accessToken>
```

Tokens are obtained via `/api/auth/login` or `/api/auth/register`.

---

### POST /api/auth/login

Authenticate with email and password and receive JWT tokens.

**Rate limited** — 10 requests per 15 minutes per IP.

**Request body**

```json
{
  "email": "demo@heroadsx.com",
  "password": "Demo1234!"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `email` | string | Yes | Valid email address |
| `password` | string | Yes | Minimum 6 characters |

**Response `200`**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "name": "Demo User",
      "email": "demo@heroadsx.com",
      "role": "admin"
    },
    "accessToken": "<jwt>",
    "refreshToken": "<jwt>"
  }
}
```

**Errors**

| Code | Message |
|---|---|
| 401 | Invalid credentials |
| 429 | Too many requests |

---

### POST /api/auth/register

Create a new user account.

**Rate limited** — 10 requests per 15 minutes per IP.

**Request body**

```json
{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "password": "SecurePass1!",
  "role": "manager"
}
```

| Field | Type | Required | Values |
|---|---|---|---|
| `name` | string | Yes | 2–100 characters |
| `email` | string | Yes | Valid email |
| `password` | string | Yes | Minimum 8 characters |
| `role` | string | No | `admin`, `manager`, `viewer` (default: `manager`) |

**Response `201`**

Same shape as `/login`.

**Errors**

| Code | Message |
|---|---|
| 409 | Email already registered |

---

### POST /api/auth/refresh

Exchange a refresh token for a new access token.

**Request body**

```json
{
  "refreshToken": "<jwt>"
}
```

**Response `200`**

```json
{
  "success": true,
  "data": {
    "accessToken": "<jwt>",
    "refreshToken": "<jwt>"
  }
}
```

---

### GET /api/auth/me

Return the currently authenticated user's profile.

**Response `200`**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "demo@heroadsx.com",
      "role": "admin"
    }
  }
}
```

---

## Accounts

### GET /api/accounts

List all connected ad accounts.

**Response `200`**

```json
{
  "success": true,
  "data": {
    "accounts": [
      {
        "id": "uuid",
        "platform": "meta",
        "accountId": "act_123456789",
        "name": "Hero Jaipur — Meta",
        "status": "active",
        "createdAt": "2024-01-15T10:00:00Z"
      }
    ]
  }
}
```

---

### POST /api/accounts

Connect a new ad account.

**Request body**

```json
{
  "platform": "meta",
  "accountId": "act_123456789",
  "accessToken": "EAAxxxx",
  "name": "Hero Jaipur — Meta"
}
```

| Field | Type | Required | Values |
|---|---|---|---|
| `platform` | string | Yes | `meta`, `google` |
| `accountId` | string | Yes | Platform account identifier |
| `accessToken` | string | Yes | OAuth access token (encrypted at rest) |
| `name` | string | No | Friendly display name |

**Response `201`**

```json
{
  "success": true,
  "data": { "account": { "id": "uuid", ... } }
}
```

---

### DELETE /api/accounts/:id

Remove a connected ad account.

**Response `200`**

```json
{
  "success": true,
  "data": { "message": "Account removed" }
}
```

---

## Campaigns

### GET /api/campaigns

List all campaigns.

**Response `200`**

```json
{
  "success": true,
  "data": {
    "campaigns": [
      {
        "id": "camp-1",
        "name": "Summer Lead Gen",
        "platform": "meta",
        "objective": "leads",
        "dailyBudget": 150,
        "status": "active",
        "startDate": "2024-06-01",
        "endDate": null,
        "metrics": {
          "impressions": 45230,
          "clicks": 1820,
          "leads": 94,
          "spend": 892.50,
          "ctr": 4.02,
          "cpl": 9.50
        }
      }
    ]
  }
}
```

---

### POST /api/campaigns

Create a new campaign.

**Request body**

```json
{
  "name": "Monsoon Sale",
  "platform": "google",
  "objective": "conversions",
  "dailyBudget": 200,
  "startDate": "2024-07-01",
  "endDate": "2024-07-31",
  "targetAudience": {
    "locations": ["Jaipur", "Delhi"],
    "ageMin": 25,
    "ageMax": 55
  }
}
```

| Field | Type | Required | Values |
|---|---|---|---|
| `name` | string | Yes | 2–200 characters |
| `platform` | string | Yes | `meta`, `google`, `both` |
| `objective` | string | Yes | `awareness`, `traffic`, `leads`, `conversions` |
| `dailyBudget` | number | Yes | Positive number (USD) |
| `startDate` | string | Yes | ISO 8601 date |
| `endDate` | string | No | ISO 8601 date |
| `targetAudience` | object | No | Audience targeting parameters |
| `status` | string | No | `active`, `paused`, `draft` (default: `draft`) |

**Response `201`**

```json
{
  "success": true,
  "data": { "campaign": { "id": "uuid", ... } }
}
```

---

### PUT /api/campaigns/:id

Update an existing campaign. Accepts the same fields as `POST /api/campaigns`; all fields are optional.

**Response `200`**

```json
{
  "success": true,
  "data": { "campaign": { "id": "uuid", ... } }
}
```

---

### DELETE /api/campaigns/:id

Delete a campaign.

**Response `200`**

```json
{
  "success": true,
  "data": { "message": "Campaign deleted" }
}
```

---

### POST /api/campaigns/:id/pause

Pause an active campaign.

**Response `200`**

```json
{
  "success": true,
  "data": { "campaign": { "id": "uuid", "status": "paused" } }
}
```

---

### POST /api/campaigns/:id/resume

Resume a paused campaign.

**Response `200`**

```json
{
  "success": true,
  "data": { "campaign": { "id": "uuid", "status": "active" } }
}
```

---

## Budgets

### GET /api/budgets

Return budget allocation overview including pending approval items.

**Response `200`**

```json
{
  "success": true,
  "data": {
    "totalBudget": 5000,
    "allocated": 3200,
    "spent": 1847.30,
    "pendingApprovals": [
      {
        "id": "budget-uuid",
        "campaignId": "camp-1",
        "campaignName": "Summer Lead Gen",
        "currentBudget": 150,
        "proposedBudget": 200,
        "reason": "CTR above target — scaling recommended",
        "requestedAt": "2024-06-15T14:00:00Z"
      }
    ]
  }
}
```

---

### POST /api/budgets/:id/approve

Approve a pending budget change proposal.

**Response `200`**

```json
{
  "success": true,
  "data": { "message": "Budget change approved", "newBudget": 200 }
}
```

---

### POST /api/budgets/:id/adjust

Manually adjust a campaign budget.

**Request body**

```json
{
  "newBudget": 250,
  "reason": "Manual override for weekend push"
}
```

**Response `200`**

```json
{
  "success": true,
  "data": { "message": "Budget adjusted", "newBudget": 250 }
}
```

---

## Analytics

### GET /api/analytics/metrics

Return top-level KPI metrics across all campaigns.

**Response `200`**

```json
{
  "success": true,
  "data": {
    "totalLeads": 247,
    "totalSpend": 1847.30,
    "avgCPL": 7.48,
    "activeCampaigns": 3,
    "totalImpressions": 128450,
    "totalClicks": 5240,
    "avgCTR": 4.08,
    "roas": 3.2
  }
}
```

---

### GET /api/analytics/performance

Return day-by-day performance data for the last 7 days.

**Response `200`**

```json
{
  "success": true,
  "data": {
    "performance": [
      {
        "day": "Mon",
        "leads": 32,
        "impressions": 18400,
        "clicks": 742,
        "spend": 185.60
      }
    ]
  }
}
```

---

### GET /api/analytics/locations

Return performance breakdown by geographic location.

**Response `200`**

```json
{
  "success": true,
  "data": {
    "locations": [
      { "city": "Jaipur", "leads": 94, "spend": 712.50, "cpl": 7.58 },
      { "city": "Delhi", "leads": 63, "spend": 521.80, "cpl": 8.28 }
    ]
  }
}
```

---

## Keywords

### GET /api/keywords

List all active keywords.

**Response `200`**

```json
{
  "success": true,
  "data": {
    "keywords": [
      {
        "id": "kw-uuid",
        "text": "luxury apartments jaipur",
        "matchType": "phrase",
        "status": "active",
        "avgCpc": 1.24,
        "impressions": 4200,
        "clicks": 168,
        "conversions": 12
      }
    ]
  }
}
```

---

### GET /api/keywords/suggestions

Return AI-generated keyword suggestions based on campaign context and historical performance.

**Response `200`**

```json
{
  "success": true,
  "data": {
    "suggestions": [
      {
        "text": "3 bhk flat jaipur",
        "matchType": "broad",
        "estimatedVolume": "1K–10K",
        "competition": "medium",
        "suggestedCpc": 0.95
      }
    ]
  }
}
```

---

### POST /api/keywords

Add one or more keywords.

**Request body**

```json
{
  "keywords": [
    { "text": "buy flat jaipur", "matchType": "exact" },
    { "text": "2 bhk apartment", "matchType": "phrase" }
  ],
  "campaignId": "camp-1"
}
```

**Response `201`**

```json
{
  "success": true,
  "data": { "added": 2, "keywords": [ ... ] }
}
```

---

### POST /api/keywords/negative

Add negative keywords to prevent irrelevant impressions.

**Request body**

```json
{
  "keywords": ["free", "rent", "pg"],
  "campaignId": "camp-1",
  "matchType": "broad"
}
```

**Response `201`**

```json
{
  "success": true,
  "data": { "added": 3 }
}
```

---

## Ad Creator

### POST /api/ads/generate

Generate ad copy (headlines, descriptions, CTAs) using AI.

**Request body**

```json
{
  "campaignId": "camp-1",
  "platform": "meta",
  "objective": "leads",
  "productDescription": "3 BHK luxury apartments in Jaipur starting at ₹85 lakh",
  "targetAudience": "Young professionals aged 28–45 looking to buy their first home",
  "tone": "professional",
  "count": 3
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `campaignId` | string | No | Scope generation to a campaign |
| `platform` | string | Yes | `meta` or `google` |
| `objective` | string | Yes | `awareness`, `traffic`, `leads`, `conversions` |
| `productDescription` | string | Yes | What is being advertised |
| `targetAudience` | string | No | Audience description for tone tuning |
| `tone` | string | No | `professional`, `casual`, `urgent` (default: `professional`) |
| `count` | number | No | Number of variants to generate (1–5, default: 3) |

**Response `200`**

```json
{
  "success": true,
  "data": {
    "ads": [
      {
        "headline": "Own Your Dream Home in Jaipur",
        "description": "Spacious 3 BHK apartments starting at ₹85L. Prime location, modern amenities. Book a site visit today.",
        "cta": "Book Now",
        "score": 87
      }
    ]
  }
}
```

---

## Controls

Emergency and bulk controls for all campaigns.

### POST /api/controls/pause-all

Pause all active campaigns immediately.

**Response `200`**

```json
{
  "success": true,
  "data": {
    "message": "All campaigns paused",
    "affected": 3
  }
}
```

---

### POST /api/controls/stop-all

Stop and archive all campaigns. **This action is not reversible via the API.**

**Response `200`**

```json
{
  "success": true,
  "data": {
    "message": "All campaigns stopped",
    "affected": 3
  }
}
```

---

### POST /api/controls/resume-all

Resume all paused campaigns.

**Response `200`**

```json
{
  "success": true,
  "data": {
    "message": "All campaigns resumed",
    "affected": 3
  }
}
```
