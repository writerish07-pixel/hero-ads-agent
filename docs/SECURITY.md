# Security Guide

This document describes the security architecture, controls, and best practices for Hero AI Ads Agent.

---

## Table of Contents

1. [Authentication & Authorization](#authentication--authorization)
2. [API Key Management](#api-key-management)
3. [Encrypted Credential Storage](#encrypted-credential-storage)
4. [Rate Limiting](#rate-limiting)
5. [Input Validation](#input-validation)
6. [Audit Logging](#audit-logging)
7. [Environment Variable Management](#environment-variable-management)
8. [HTTP Security Headers](#http-security-headers)
9. [CORS Policy](#cors-policy)
10. [Dependency Security](#dependency-security)

---

## Authentication & Authorization

### JWT tokens

The API uses a two-token scheme:

| Token | Lifetime | Purpose |
|---|---|---|
| Access token | 7 days (configurable via `JWT_EXPIRES_IN`) | Authenticates API requests |
| Refresh token | 30 days | Issues new access tokens without re-login |

Both tokens are signed with `HS256` using `JWT_SECRET`. The secret **must** be at least 32 randomly-generated characters.

> **Production recommendation:** The default 7-day access token lifetime is convenient for development but is longer than typical best practice (15 minutes to 1 hour). Reduce `JWT_EXPIRES_IN` to `15m` or `1h` in production to limit the exposure window if a token is compromised. Clients should use the refresh token endpoint (`POST /api/auth/refresh`) to silently obtain new access tokens.

Generate a secure secret:

```bash
openssl rand -base64 48
```

### Password hashing

Passwords are hashed with **bcrypt** at cost factor **12** before storage. Plain-text passwords are never logged or persisted.

### Role-based access control (RBAC)

Three built-in roles:

| Role | Permissions |
|---|---|
| `admin` | Full access — read, write, delete, controls |
| `manager` | Read + write campaigns, budgets, keywords; no delete or controls |
| `viewer` | Read-only access to analytics and campaigns |

The `authenticate` middleware verifies the JWT and attaches `req.user` (including `role`) to every protected request. Route handlers check roles where needed.

### Token storage (frontend)

The dashboard stores the access token in `localStorage`. For higher-security deployments, consider migrating to **httpOnly cookies** to mitigate XSS token theft.

---

## API Key Management

### Third-party API keys

All platform credentials (Meta, Google Ads, OpenAI, Gemini) are:

1. Stored **only in environment variables** — never hard-coded in source
2. Never logged — Winston log configuration explicitly redacts `Authorization` headers and known secret fields
3. Encrypted at rest when persisted to the database (see [Encrypted Credential Storage](#encrypted-credential-storage))

### Rotating keys

To rotate an API key:

1. Update the value in `.env` (or your secrets manager)
2. Restart the backend service: `docker compose restart backend`
3. Revoke the old key in the respective provider's dashboard

### Using a secrets manager (recommended for production)

Instead of a `.env` file, inject secrets via:

- **AWS Secrets Manager** + the `aws-sdk` or `@aws-sdk/client-secrets-manager` package
- **HashiCorp Vault** with the Vault Agent sidecar
- **Docker Secrets** (for Swarm deployments)

---

## Encrypted Credential Storage

Third-party OAuth tokens and access keys stored in the `ad_accounts` database table are encrypted using **AES-256-GCM** before being written to disk.

The encryption key is set via the `ENCRYPTION_KEY` environment variable and **must be exactly 32 bytes**:

```bash
# Generate a valid 32-byte key
openssl rand -hex 32 | head -c 32
```

The encryption/decryption routines live in `backend/src/services/` and use Node.js's built-in `crypto` module — no third-party encryption library is required.

> **Important:** If you lose `ENCRYPTION_KEY`, all stored credentials become unrecoverable. Back up this value securely (e.g., in a password manager or secrets vault).

---

## Rate Limiting

Rate limiting is implemented with [express-rate-limit](https://github.com/express-rate-limit/express-rate-limit) and keyed by IP address.

| Limiter | Applies to | Limit |
|---|---|---|
| `strictLimiter` | `POST /api/auth/login`, `POST /api/auth/register` | 5 requests per 15 minutes |
| `standardLimiter` | All other API routes | 100 requests per 15 minutes |

In production, deploy behind a reverse proxy (Nginx) and set `app.set('trust proxy', 1)` so that `X-Forwarded-For` is used as the client IP, not the proxy IP.

### Nginx-level rate limiting

Add upstream rate limiting in `nginx.conf` for an additional layer:

```nginx
limit_req_zone $binary_remote_addr zone=api:10m rate=30r/m;

location /api/auth {
    limit_req zone=api burst=5 nodelay;
    proxy_pass http://backend:3001;
}
```

---

## Input Validation

All request bodies that accept user input are validated with **Joi** schemas before any business logic runs. The `validate` middleware returns a `400 Bad Request` with a descriptive error message on schema violation.

Validation covers:

- **Type checking** — strings, numbers, booleans
- **String constraints** — minimum/maximum length, regex patterns
- **Enum values** — only accepted values are allowed (e.g., `platform` must be `meta`, `google`, or `both`)
- **Email format** — `Joi.string().email()`
- **Date format** — ISO 8601 enforced with `Joi.string().isoDate()`
- **Numeric ranges** — `dailyBudget` must be a positive number

### SQL injection

The project uses parameterised queries via the `pg` library (see `backend/src/config/database.js`). User input is **never** interpolated directly into SQL strings.

### XSS prevention

- Helmet.js sets `Content-Security-Policy` and `X-XSS-Protection` headers
- React's JSX automatically escapes string values rendered to the DOM

---

## Audit Logging

All significant state-changing operations are recorded to the `audit_logs` table (schema: `database/migrations/009_audit_logs.sql`).

Each audit log entry captures:

| Column | Description |
|---|---|
| `id` | UUID |
| `user_id` | User who performed the action |
| `action` | Action type (e.g., `campaign.pause`, `budget.approve`) |
| `resource_type` | Entity type affected |
| `resource_id` | Entity ID affected |
| `metadata` | JSON blob with before/after values |
| `ip_address` | Client IP |
| `created_at` | Timestamp |

Winston application logs (info-level and above) are also written to structured JSON for ingestion into log aggregation tools.

### What is logged

- User login / logout / registration
- Campaign create / update / pause / resume / delete
- Budget approval and adjustment
- Ad account connect / remove
- All uses of emergency controls (pause-all, stop-all, resume-all)
- Authentication failures

### What is never logged

- Passwords or password hashes
- Raw API access tokens
- JWT token values
- `ENCRYPTION_KEY` or `JWT_SECRET`

---

## Environment Variable Management

### Development

Use `.env` files (excluded from git via `.gitignore`). Copy `.env.example` and never commit actual secrets.

### Production

Prefer injecting secrets via the container runtime or a dedicated secrets manager rather than file-based `.env`:

```yaml
# docker-compose.yml — production override
services:
  backend:
    environment:
      JWT_SECRET: ${JWT_SECRET}        # Injected by CI/CD or secrets manager
      ENCRYPTION_KEY: ${ENCRYPTION_KEY}
      DATABASE_URL: ${DATABASE_URL}
```

### Secret rotation checklist

- [ ] `JWT_SECRET` — rotate quarterly; invalidates all active sessions
- [ ] `ENCRYPTION_KEY` — rotate annually (requires re-encrypting stored credentials)
- [ ] Platform access tokens — rotate per provider schedule
- [ ] Database passwords — rotate quarterly; update `DATABASE_URL`

---

## HTTP Security Headers

Helmet.js is applied globally and sets the following headers:

| Header | Value |
|---|---|
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `X-XSS-Protection` | `0` (modern browsers use CSP instead) |
| `Strict-Transport-Security` | `max-age=15552000; includeSubDomains` |
| `Content-Security-Policy` | Restricts scripts, styles, and media to trusted origins |
| `Referrer-Policy` | `no-referrer` |

---

## CORS Policy

CORS is restricted to the origin specified in the `FRONTEND_URL` environment variable:

```javascript
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
```

In production, set `FRONTEND_URL` to your exact frontend domain (e.g., `https://ads.yourdomain.com`). Wildcard `*` origins are **not** used.

---

## Dependency Security

### Automated scanning

Run a security audit before every deployment:

```bash
# Backend
cd backend && npm audit

# Frontend
cd dashboard && npm audit
```

Fix critical and high-severity vulnerabilities before deploying:

```bash
npm audit fix
```

### Keeping dependencies up to date

```bash
# Check for outdated packages
npm outdated

# Update to latest compatible versions
npm update
```

Use a tool like [Renovate](https://github.com/renovatebot/renovate) or [Dependabot](https://github.com/dependabot) to automate dependency update PRs.

### Docker image security

- Base images use `-alpine` variants (minimal attack surface)
- The backend Dockerfile runs the application as the non-root `node` user
- Rebuild images regularly to pick up OS-level security patches:

```bash
docker compose build --no-cache && docker compose up -d
```
