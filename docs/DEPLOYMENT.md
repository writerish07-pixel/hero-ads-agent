# Deployment Guide

This guide covers deploying Hero AI Ads Agent to a production environment using Docker Compose.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Production Deployment with Docker](#production-deployment-with-docker)
3. [Environment Variables for Production](#environment-variables-for-production)
4. [Database Setup and Migrations](#database-setup-and-migrations)
5. [SSL/TLS Configuration](#ssltls-configuration)
6. [Monitoring and Logging](#monitoring-and-logging)
7. [Backup Strategy](#backup-strategy)

---

## Prerequisites

- A Linux server (Ubuntu 22.04 LTS recommended)
- Docker 24+ and Docker Compose v2
- A domain name pointing to your server's IP
- A valid SSL certificate (Let's Encrypt recommended)
- Open ports: `80` (HTTP → redirect), `443` (HTTPS)

---

## Production Deployment with Docker

### 1. Clone the repository

```bash
git clone https://github.com/your-org/hero-ads-agent.git
cd hero-ads-agent
```

### 2. Configure environment variables

```bash
cp .env.example .env
# Edit .env — see Environment Variables section below
nano .env
```

### 3. Build and start services

```bash
docker compose up --build -d
```

### 4. Run database migrations

Migrations are applied automatically by the `db-migrate` service in `docker-compose.yml`. To re-run manually:

```bash
docker compose run --rm db-migrate
```

### 5. Verify all services are healthy

```bash
docker compose ps
```

All services should show `healthy` or `running`.

### 6. Check logs

```bash
# All services
docker compose logs -f

# Backend only
docker compose logs -f backend
```

---

## Environment Variables for Production

Copy `.env.example` to `.env` and update the following values. **Never commit `.env` to source control.**

### Required secrets

```bash
# Generate a secure JWT secret (minimum 32 characters)
openssl rand -base64 48

# Generate a 32-byte AES-256 encryption key
openssl rand -hex 32
```

### Critical production settings

```ini
NODE_ENV=production

# Use strong, unique secrets
JWT_SECRET=<output of openssl rand -base64 48>
ENCRYPTION_KEY=<output of openssl rand -hex 32>

# Replace with your actual connection strings
DATABASE_URL=postgresql://hero_user:strong_password@postgres:5432/hero_ads
REDIS_URL=redis://:redis_password@redis:6379

# Restrict CORS to your actual frontend domain
FRONTEND_URL=https://ads.yourdomain.com

# Set real API credentials
OPENAI_API_KEY=sk-...
META_APP_ID=...
META_APP_SECRET=...
META_ACCESS_TOKEN=...
GOOGLE_ADS_DEVELOPER_TOKEN=...
```

### PostgreSQL hardening

Update `docker-compose.yml` for production:

```yaml
postgres:
  environment:
    POSTGRES_USER: hero_user
    POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}  # Set a strong password in .env
    POSTGRES_DB: hero_ads
  # Remove external port mapping for security
  # ports:
  #   - "5432:5432"
```

---

## Database Setup and Migrations

### Initial schema

The schema is applied automatically on first run by the `db-migrate` service:

```bash
docker compose up db-migrate
```

### Manual migration

```bash
docker compose exec postgres psql -U hero_user -d hero_ads -f /migrations/schema.sql
```

### Running incremental migrations

Numbered migration files live in `database/migrations/`. Apply them in order:

```bash
for f in database/migrations/*.sql; do
  docker compose exec -T postgres psql -U hero_user -d hero_ads < "$f"
done
```

### Connecting to the database directly

```bash
docker compose exec postgres psql -U hero_user -d hero_ads
```

---

## SSL/TLS Configuration

### Using Certbot (Let's Encrypt)

1. Install Certbot on the host:

```bash
sudo apt install certbot python3-certbot-nginx
```

2. Obtain a certificate:

```bash
sudo certbot --nginx -d ads.yourdomain.com
```

3. Update `nginx.conf` to enable HTTPS:

```nginx
server {
    listen 80;
    server_name ads.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ads.yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/ads.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ads.yourdomain.com/privkey.pem;

    # Modern TLS settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # HSTS
    add_header Strict-Transport-Security "max-age=63072000" always;

    location / {
        proxy_pass http://frontend:80;
    }

    location /api {
        proxy_pass http://backend:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

4. Mount certificates in `docker-compose.yml`:

```yaml
nginx:
  volumes:
    - ./nginx.conf:/etc/nginx/nginx.conf:ro
    - /etc/letsencrypt:/etc/letsencrypt:ro
```

5. Auto-renew certificates (runs twice daily):

```bash
sudo systemctl enable certbot.timer
```

---

## Monitoring and Logging

### Winston application logs

The backend uses [Winston](https://github.com/winstonjs/winston) for structured JSON logging. Log files are written to `backend/logs/` (configurable).

Log levels in production: `error`, `warn`, `info`. Set `LOG_LEVEL=debug` in `.env` for verbose output during troubleshooting.

### Docker log collection

```bash
# Tail live logs with timestamps
docker compose logs -f --timestamps backend

# Export logs to a file
docker compose logs --no-color backend > backend.log
```

### Health checks

Each service exposes a Docker health check. Monitor them with:

```bash
docker inspect --format='{{json .State.Health}}' hero-ads-backend | jq
```

### Recommended monitoring stack

For production observability, consider:

| Tool | Purpose |
|---|---|
| **Prometheus** | Metrics collection |
| **Grafana** | Dashboards and alerting |
| **Loki** | Log aggregation |
| **Uptime Kuma** | Uptime / endpoint monitoring |

A minimal Prometheus scrape config for the backend:

```yaml
scrape_configs:
  - job_name: hero-ads-backend
    static_configs:
      - targets: ['backend:3001']
    metrics_path: /metrics
```

---

## Backup Strategy

### PostgreSQL backups

#### Automated daily backup script

Create `/etc/cron.daily/hero-ads-backup`:

```bash
#!/bin/bash
set -euo pipefail

BACKUP_DIR=/backups/postgres
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
CONTAINER=$(docker compose -f /opt/hero-ads-agent/docker-compose.yml ps -q postgres)

mkdir -p "$BACKUP_DIR"

docker exec "$CONTAINER" \
  pg_dump -U hero_user -d hero_ads --format=custom \
  > "$BACKUP_DIR/hero_ads_$TIMESTAMP.dump"

# Keep last 30 days
find "$BACKUP_DIR" -name "*.dump" -mtime +30 -delete

echo "Backup completed: hero_ads_$TIMESTAMP.dump"
```

```bash
chmod +x /etc/cron.daily/hero-ads-backup
```

#### Restore from backup

```bash
docker exec -i $(docker compose ps -q postgres) \
  pg_restore -U hero_user -d hero_ads --clean < backup.dump
```

### Redis persistence

Redis is configured with AOF (Append-Only File) persistence by default in the Docker image. Backup the Redis volume:

```bash
docker run --rm \
  -v hero-ads-agent_redis_data:/data \
  -v /backups/redis:/backup \
  alpine tar czf /backup/redis_$(date +%Y%m%d).tar.gz /data
```

### Off-site backup

Sync backups to an S3-compatible bucket:

```bash
aws s3 sync /backups/ s3://your-bucket/hero-ads-backups/ \
  --storage-class STANDARD_IA \
  --delete
```

### Recovery time objectives

| Component | RPO | RTO |
|---|---|---|
| PostgreSQL | 24 h (daily backup) | < 30 min |
| Redis | Near-zero (AOF) | < 5 min |
| Application | On-demand (Docker images) | < 10 min |
