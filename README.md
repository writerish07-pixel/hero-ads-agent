# Hero AI Ads Agent

An AI-powered advertising management platform that autonomously manages, optimises, and reports on Meta and Google ad campaigns using LLM-driven decision-making.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Tech Stack](#tech-stack)
3. [Prerequisites](#prerequisites)
4. [Quick Start (Docker)](#quick-start-docker)
5. [Local Development](#local-development)
6. [Environment Variables](#environment-variables)
7. [API Documentation](#api-documentation)
8. [Security](#security)
9. [Project Structure](#project-structure)

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                        Browser / Client                          │
│                  React + Vite Dashboard (port 3000)              │
└────────────────────────────┬─────────────────────────────────────┘
                             │ HTTP / WebSocket
┌────────────────────────────▼─────────────────────────────────────┐
│                   Node.js / Express API (port 3001)              │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │  Auth / JWT  │  │  REST Routes │  │  WebSocket (real-time) │ │
│  └──────────────┘  └──────┬───────┘  └────────────────────────┘ │
│                           │                                       │
│  ┌────────────────────────▼──────────────────────────────────┐   │
│  │                     BullMQ Workers                        │   │
│  │  Bid Optimiser │ Anomaly Detector │ AI Ad Generator       │   │
│  └────────────────────────┬──────────────────────────────────┘   │
└───────────────────────────┼──────────────────────────────────────┘
                            │
         ┌──────────────────┼──────────────────────┐
         ▼                  ▼                       ▼
  ┌─────────────┐   ┌──────────────┐      ┌───────────────────┐
  │ PostgreSQL  │   │    Redis     │      │  External APIs    │
  │  (data)     │   │  (queues /   │      │  Meta · Google    │
  │             │   │   cache)     │      │  OpenAI · Gemini  │
  └─────────────┘   └──────────────┘      └───────────────────┘
```

The backend exposes a REST API consumed by the React dashboard and drives background jobs via BullMQ queues backed by Redis. All persistent data lives in PostgreSQL. The AI layer (OpenAI / Gemini) powers bid optimisation, anomaly detection, and ad-copy generation.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Recharts, Lucide React |
| Backend | Node.js 20, Express 4 |
| Database | PostgreSQL 15 |
| Cache / Queues | Redis 7, BullMQ |
| AI | OpenAI GPT-4, Google Gemini |
| Ad Platforms | Meta Ads API, Google Ads API |
| Auth | JWT (access + refresh tokens), bcrypt |
| Containerisation | Docker, Docker Compose |
| Reverse Proxy | Nginx |

---

## Prerequisites

- **Node.js** 20+ and npm 10+
- **Docker** 24+ and **Docker Compose** v2
- Meta and Google Ads API credentials (optional for development — mock data is used when absent)
- An OpenAI API key (optional for development)

---

## Quick Start (Docker)

The fastest way to run the full stack:

```bash
# 1. Clone the repository
git clone https://github.com/your-org/hero-ads-agent.git
cd hero-ads-agent

# 2. Copy and configure environment variables
cp .env.example .env
# Edit .env with your API keys and secrets

# 3. Start all services
docker compose up --build

# 4. Open the dashboard
open http://localhost:3000
```

Services started:

| Service | URL |
|---|---|
| Dashboard (frontend) | http://localhost:3000 |
| API (backend) | http://localhost:3001 |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

### Demo credentials

| Field | Value |
|---|---|
| Email | `demo@heroadsx.com` |
| Password | `Demo1234!` |

---

## Local Development

### Backend

```bash
cd backend

# Install dependencies
npm install

# Copy environment file
cp ../.env.example ../.env
# Edit .env — set DATABASE_URL_LOCAL and REDIS_URL_LOCAL

# Start PostgreSQL and Redis (via Docker)
docker compose up postgres redis -d

# Run migrations
psql "$DATABASE_URL_LOCAL" -f ../database/schema.sql

# Start the dev server (hot-reload via nodemon)
npm run dev
# API available at http://localhost:3001
```

### Frontend

```bash
cd dashboard

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
# VITE_API_URL defaults to http://localhost:3001

# Start the dev server
npm run dev
# Dashboard available at http://localhost:5173
```

The Vite dev server proxies all `/api` requests to `http://localhost:3001` so you can develop the frontend against a locally-running backend without CORS issues.

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the required values.

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | API server port (default: `3001`) |
| `NODE_ENV` | No | `development` or `production` |
| `JWT_SECRET` | **Yes** | Minimum 32-character random string |
| `JWT_EXPIRES_IN` | No | Access token lifetime (default: `7d`) |
| `DATABASE_URL` | **Yes** | PostgreSQL connection string (Docker) |
| `DATABASE_URL_LOCAL` | No | PostgreSQL connection string (local dev) |
| `REDIS_URL` | **Yes** | Redis connection string (Docker) |
| `REDIS_URL_LOCAL` | No | Redis connection string (local dev) |
| `META_APP_ID` | No | Meta (Facebook) App ID |
| `META_APP_SECRET` | No | Meta App Secret |
| `META_ACCESS_TOKEN` | No | Meta long-lived access token |
| `META_AD_ACCOUNT_ID` | No | Meta ad account ID (`act_…`) |
| `GOOGLE_ADS_DEVELOPER_TOKEN` | No | Google Ads developer token |
| `GOOGLE_ADS_CLIENT_ID` | No | Google OAuth2 client ID |
| `GOOGLE_ADS_CLIENT_SECRET` | No | Google OAuth2 client secret |
| `GOOGLE_ADS_REFRESH_TOKEN` | No | Google OAuth2 refresh token |
| `GOOGLE_ADS_CUSTOMER_ID` | No | Google Ads customer ID |
| `OPENAI_API_KEY` | No | OpenAI API key for ad generation |
| `GEMINI_API_KEY` | No | Google Gemini API key |
| `ENCRYPTION_KEY` | **Yes** | Exactly 32 bytes, used for AES-256 |
| `FRONTEND_URL` | No | Allowed CORS origin (default: `http://localhost:3000`) |

See `.env.example` for a full template with descriptions.

---

## API Documentation

Full endpoint reference: [`docs/API.md`](docs/API.md)

### Base URL

```
http://localhost:3001/api
```

### Authentication

All endpoints except `/api/auth/login` and `/api/auth/register` require a JWT Bearer token:

```
Authorization: Bearer <accessToken>
```

### Endpoint Summary

| Method | Path | Description |
|---|---|---|
| POST | `/auth/login` | Obtain JWT tokens |
| POST | `/auth/register` | Create a new user |
| POST | `/auth/refresh` | Refresh access token |
| GET | `/auth/me` | Current user profile |
| GET | `/accounts` | List ad accounts |
| POST | `/accounts` | Connect new ad account |
| DELETE | `/accounts/:id` | Remove ad account |
| GET | `/campaigns` | List campaigns |
| POST | `/campaigns` | Create campaign |
| PUT | `/campaigns/:id` | Update campaign |
| DELETE | `/campaigns/:id` | Delete campaign |
| POST | `/campaigns/:id/pause` | Pause campaign |
| POST | `/campaigns/:id/resume` | Resume campaign |
| GET | `/budgets` | Budget overview |
| POST | `/budgets/:id/approve` | Approve budget change |
| POST | `/budgets/:id/adjust` | Adjust budget |
| GET | `/analytics/metrics` | Top-level KPIs |
| GET | `/analytics/performance` | Weekly performance data |
| GET | `/analytics/locations` | Geo-performance breakdown |
| GET | `/keywords` | List keywords |
| GET | `/keywords/suggestions` | AI keyword suggestions |
| POST | `/keywords` | Add keywords |
| POST | `/keywords/negative` | Add negative keywords |
| POST | `/ads/generate` | AI-generate ad copy |
| POST | `/controls/pause-all` | Pause all campaigns |
| POST | `/controls/stop-all` | Stop all campaigns |
| POST | `/controls/resume-all` | Resume all campaigns |

---

## Security

See [`docs/SECURITY.md`](docs/SECURITY.md) for the full security guide.

Key measures implemented:

- **JWT authentication** with short-lived access tokens (7 d) and long-lived refresh tokens (30 d)
- **bcrypt** password hashing (cost factor 12)
- **Helmet.js** HTTP security headers
- **Rate limiting** — strict limits on auth endpoints, standard limits on all others
- **Input validation** via Joi schemas on every route that accepts a body
- **AES-256 encryption** for stored third-party credentials
- **CORS** restricted to `FRONTEND_URL`
- **Audit logging** for all significant state-changing operations

---

## Project Structure

```
hero-ads-agent/
├── backend/
│   ├── src/
│   │   ├── config/           # Database, Redis, logger setup
│   │   ├── jobs/             # BullMQ background workers
│   │   ├── middleware/        # Auth, validation, rate limiting, error handling
│   │   ├── routes/           # Express route handlers
│   │   ├── services/         # AI, Meta Ads, Google Ads service wrappers
│   │   └── server.js         # Entry point
│   └── package.json
├── dashboard/
│   ├── src/
│   │   ├── api.js            # Axios API client
│   │   ├── App.jsx           # Root component with all views
│   │   ├── App.css
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.js
│   ├── .env.example
│   └── package.json
├── database/
│   ├── migrations/           # Incremental SQL migration files
│   ├── schema.sql            # Full schema (applied by Docker Compose)
│   └── seed.sql              # Optional seed data
├── docs/
│   ├── API.md                # Full API reference
│   ├── DEPLOYMENT.md         # Production deployment guide
│   └── SECURITY.md           # Security best practices
├── .env.example              # Root environment variable template
├── docker-compose.yml        # Full-stack Docker Compose
├── docker-compose.dev.yml    # Dev overrides
├── Dockerfile.backend
├── Dockerfile.frontend
├── nginx.conf                # Nginx reverse-proxy config
└── README.md
```
