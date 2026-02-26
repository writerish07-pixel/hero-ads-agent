-- =============================================================================
-- Hero Ads Agent – Combined Database Schema
-- Run this file to initialise the full database from scratch.
-- Individual migrations are in ./migrations/NNN_*.sql
-- =============================================================================

-- Enable pgcrypto for gen_random_uuid() on PostgreSQL < 13
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- Shared trigger function (defined once, reused by all tables)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- =============================================================================
-- 001: users
-- =============================================================================
CREATE TABLE IF NOT EXISTS users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name     VARCHAR(255) NOT NULL,
    role          VARCHAR(20)  NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    mfa_enabled   BOOLEAN      NOT NULL DEFAULT FALSE,
    mfa_secret    VARCHAR(255),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    last_login    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_role  ON users (role);

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_users_updated_at') THEN
        CREATE TRIGGER trg_users_updated_at
        BEFORE UPDATE ON users
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
END $$;

-- =============================================================================
-- 002: ad_accounts
-- =============================================================================
CREATE TABLE IF NOT EXISTS ad_accounts (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    platform                VARCHAR(20)  NOT NULL CHECK (platform IN ('meta', 'google')),
    account_id              VARCHAR(100) NOT NULL,
    account_name            VARCHAR(255) NOT NULL,
    access_token_encrypted  TEXT,
    refresh_token_encrypted TEXT,
    is_active               BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    UNIQUE (user_id, platform, account_id)
);

CREATE INDEX IF NOT EXISTS idx_ad_accounts_user_id  ON ad_accounts (user_id);
CREATE INDEX IF NOT EXISTS idx_ad_accounts_platform ON ad_accounts (platform);
CREATE INDEX IF NOT EXISTS idx_ad_accounts_active   ON ad_accounts (is_active);

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_ad_accounts_updated_at') THEN
        CREATE TRIGGER trg_ad_accounts_updated_at
        BEFORE UPDATE ON ad_accounts
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
END $$;

-- =============================================================================
-- 003: campaigns
-- =============================================================================
CREATE TABLE IF NOT EXISTS campaigns (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id              UUID           NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    ad_account_id        UUID           NOT NULL REFERENCES ad_accounts (id) ON DELETE CASCADE,
    platform_campaign_id VARCHAR(100),
    name                 VARCHAR(255)   NOT NULL,
    status               VARCHAR(20)    NOT NULL DEFAULT 'paused'
                             CHECK (status IN ('active', 'paused', 'learning', 'stopped')),
    daily_budget         NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total_budget         NUMERIC(12, 2) NOT NULL DEFAULT 0,
    start_date           DATE,
    end_date             DATE,
    target_cpl           NUMERIC(10, 2),
    platform             VARCHAR(20)    NOT NULL CHECK (platform IN ('meta', 'google', 'both')),
    ai_score             NUMERIC(5, 2)  CHECK (ai_score BETWEEN 0 AND 100),
    created_at           TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_user_id       ON campaigns (user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_ad_account_id ON campaigns (ad_account_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status        ON campaigns (status);
CREATE INDEX IF NOT EXISTS idx_campaigns_platform      ON campaigns (platform);
CREATE INDEX IF NOT EXISTS idx_campaigns_start_date    ON campaigns (start_date);

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_campaigns_updated_at') THEN
        CREATE TRIGGER trg_campaigns_updated_at
        BEFORE UPDATE ON campaigns
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
END $$;

-- =============================================================================
-- 004: ad_creatives & ad_variants
-- =============================================================================
CREATE TABLE IF NOT EXISTS ad_creatives (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id   UUID          NOT NULL REFERENCES campaigns (id) ON DELETE CASCADE,
    title         VARCHAR(255)  NOT NULL,
    description   TEXT,
    url           TEXT,
    extensions    JSONB         NOT NULL DEFAULT '{}',
    quality_score NUMERIC(4, 2) CHECK (quality_score BETWEEN 0 AND 10),
    predicted_ctr NUMERIC(6, 4) CHECK (predicted_ctr BETWEEN 0 AND 1),
    status        VARCHAR(20)   NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft', 'active', 'paused')),
    created_by    VARCHAR(10)   NOT NULL DEFAULT 'human'
                      CHECK (created_by IN ('ai', 'human')),
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ad_variants (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ad_creative_id    UUID         NOT NULL REFERENCES ad_creatives (id) ON DELETE CASCADE,
    variant_name      VARCHAR(100) NOT NULL,
    changes_json      JSONB        NOT NULL DEFAULT '{}',
    performance_score NUMERIC(5, 2),
    is_winner         BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ad_creatives_campaign_id ON ad_creatives (campaign_id);
CREATE INDEX IF NOT EXISTS idx_ad_creatives_status      ON ad_creatives (status);
CREATE INDEX IF NOT EXISTS idx_ad_creatives_created_by  ON ad_creatives (created_by);
CREATE INDEX IF NOT EXISTS idx_ad_variants_creative_id  ON ad_variants (ad_creative_id);
CREATE INDEX IF NOT EXISTS idx_ad_variants_is_winner    ON ad_variants (is_winner);

-- =============================================================================
-- 005: budget_allocations & budget_rules
-- =============================================================================
CREATE TABLE IF NOT EXISTS budget_allocations (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID           NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    campaign_id    UUID           NOT NULL REFERENCES campaigns (id) ON DELETE CASCADE,
    amount         NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    approved_by    UUID           REFERENCES users (id) ON DELETE SET NULL,
    approved_at    TIMESTAMPTZ,
    status         VARCHAR(20)    NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending', 'approved', 'rejected')),
    notes          TEXT,
    effective_date DATE           NOT NULL,
    created_at     TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS budget_rules (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID           NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    daily_cap       NUMERIC(12, 2) CHECK (daily_cap > 0),
    monthly_cap     NUMERIC(12, 2) CHECK (monthly_cap > 0),
    max_cpl         NUMERIC(10, 2) CHECK (max_cpl > 0),
    flex_percentage NUMERIC(5, 2)  NOT NULL DEFAULT 10
                        CHECK (flex_percentage BETWEEN 0 AND 100),
    created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

    UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_budget_allocations_user_id     ON budget_allocations (user_id);
CREATE INDEX IF NOT EXISTS idx_budget_allocations_campaign_id ON budget_allocations (campaign_id);
CREATE INDEX IF NOT EXISTS idx_budget_allocations_status      ON budget_allocations (status);
CREATE INDEX IF NOT EXISTS idx_budget_allocations_eff_date    ON budget_allocations (effective_date);
CREATE INDEX IF NOT EXISTS idx_budget_rules_user_id           ON budget_rules (user_id);

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_budget_rules_updated_at') THEN
        CREATE TRIGGER trg_budget_rules_updated_at
        BEFORE UPDATE ON budget_rules
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
END $$;

-- =============================================================================
-- 006: performance_metrics & performance_hourly
-- =============================================================================
CREATE TABLE IF NOT EXISTS performance_metrics (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id     UUID           NOT NULL REFERENCES campaigns (id) ON DELETE CASCADE,
    date            DATE           NOT NULL,
    impressions     BIGINT         NOT NULL DEFAULT 0,
    clicks          BIGINT         NOT NULL DEFAULT 0,
    ctr             NUMERIC(8, 6)  CHECK (ctr BETWEEN 0 AND 1),
    cpc             NUMERIC(10, 2),
    spend           NUMERIC(12, 2) NOT NULL DEFAULT 0,
    leads           INT            NOT NULL DEFAULT 0,
    cpl             NUMERIC(10, 2),
    conversions     INT            NOT NULL DEFAULT 0,
    conversion_rate NUMERIC(8, 6)  CHECK (conversion_rate BETWEEN 0 AND 1),
    platform        VARCHAR(20)    NOT NULL CHECK (platform IN ('meta', 'google', 'both')),
    created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

    UNIQUE (campaign_id, date, platform)
);

CREATE TABLE IF NOT EXISTS performance_hourly (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id    UUID           NOT NULL REFERENCES campaigns (id) ON DELETE CASCADE,
    hour_timestamp TIMESTAMPTZ    NOT NULL,
    impressions    BIGINT         NOT NULL DEFAULT 0,
    clicks         BIGINT         NOT NULL DEFAULT 0,
    spend          NUMERIC(12, 2) NOT NULL DEFAULT 0,
    leads          INT            NOT NULL DEFAULT 0,

    UNIQUE (campaign_id, hour_timestamp)
);

CREATE INDEX IF NOT EXISTS idx_perf_metrics_campaign_date ON performance_metrics (campaign_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_perf_metrics_date          ON performance_metrics (date DESC);
CREATE INDEX IF NOT EXISTS idx_perf_metrics_platform      ON performance_metrics (platform);
CREATE INDEX IF NOT EXISTS idx_perf_hourly_campaign_ts    ON performance_hourly (campaign_id, hour_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_perf_hourly_ts             ON performance_hourly (hour_timestamp DESC);

-- =============================================================================
-- 007: keywords
-- =============================================================================
CREATE TABLE IF NOT EXISTS keywords (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id   UUID          NOT NULL REFERENCES campaigns (id) ON DELETE CASCADE,
    keyword_text  VARCHAR(255)  NOT NULL,
    match_type    VARCHAR(20)   NOT NULL CHECK (match_type IN ('broad', 'phrase', 'exact')),
    bid           NUMERIC(10, 2) CHECK (bid >= 0),
    status        VARCHAR(20)   NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active', 'paused', 'removed')),
    is_negative   BOOLEAN       NOT NULL DEFAULT FALSE,
    quality_score INT           CHECK (quality_score BETWEEN 1 AND 10),
    impressions   BIGINT        NOT NULL DEFAULT 0,
    clicks        BIGINT        NOT NULL DEFAULT 0,
    conversions   INT           NOT NULL DEFAULT 0,
    avg_cpc       NUMERIC(10, 2),
    added_by      VARCHAR(10)   NOT NULL DEFAULT 'human'
                      CHECK (added_by IN ('ai', 'human')),
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_keywords_campaign_id ON keywords (campaign_id);
CREATE INDEX IF NOT EXISTS idx_keywords_status      ON keywords (status);
CREATE INDEX IF NOT EXISTS idx_keywords_is_negative ON keywords (is_negative);
CREATE INDEX IF NOT EXISTS idx_keywords_match_type  ON keywords (match_type);
CREATE INDEX IF NOT EXISTS idx_keywords_text        ON keywords (campaign_id, keyword_text, match_type);

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_keywords_updated_at') THEN
        CREATE TRIGGER trg_keywords_updated_at
        BEFORE UPDATE ON keywords
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
END $$;

-- =============================================================================
-- 008: leads & lead_interactions
-- =============================================================================
CREATE TABLE IF NOT EXISTS leads (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id   UUID         NOT NULL REFERENCES campaigns (id) ON DELETE CASCADE,
    keyword_id    UUID         REFERENCES keywords (id) ON DELETE SET NULL,
    name          VARCHAR(255),
    phone         VARCHAR(30),
    email         VARCHAR(255),
    location      VARCHAR(255),
    lead_source   VARCHAR(100),
    quality_score NUMERIC(5, 2) CHECK (quality_score BETWEEN 0 AND 100),
    status        VARCHAR(20)  NOT NULL DEFAULT 'new'
                      CHECK (status IN ('new', 'contacted', 'converted', 'lost')),
    notes         TEXT,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lead_interactions (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id          UUID        NOT NULL REFERENCES leads (id) ON DELETE CASCADE,
    interaction_type VARCHAR(50) NOT NULL,
    notes            TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_campaign_id      ON leads (campaign_id);
CREATE INDEX IF NOT EXISTS idx_leads_keyword_id       ON leads (keyword_id);
CREATE INDEX IF NOT EXISTS idx_leads_status           ON leads (status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at       ON leads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_interactions_lead ON lead_interactions (lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_interactions_type ON lead_interactions (interaction_type);

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_leads_updated_at') THEN
        CREATE TRIGGER trg_leads_updated_at
        BEFORE UPDATE ON leads
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
END $$;

-- =============================================================================
-- 009: audit_logs
-- =============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID         REFERENCES users (id) ON DELETE SET NULL,
    action        VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id   VARCHAR(100),
    details_json  JSONB        NOT NULL DEFAULT '{}',
    ip_address    INET,
    user_agent    TEXT,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id    ON audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action     ON audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource   ON audit_logs (resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at DESC);

-- =============================================================================
-- 010: api_logs
-- =============================================================================
CREATE TABLE IF NOT EXISTS api_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform        VARCHAR(20)  NOT NULL CHECK (platform IN ('meta', 'google')),
    endpoint        TEXT         NOT NULL,
    method          VARCHAR(10)  NOT NULL CHECK (method IN ('GET', 'POST', 'PUT', 'PATCH', 'DELETE')),
    request_json    JSONB        NOT NULL DEFAULT '{}',
    response_status INT,
    response_json   JSONB        NOT NULL DEFAULT '{}',
    duration_ms     INT          CHECK (duration_ms >= 0),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_logs_platform   ON api_logs (platform);
CREATE INDEX IF NOT EXISTS idx_api_logs_status     ON api_logs (response_status);
CREATE INDEX IF NOT EXISTS idx_api_logs_created_at ON api_logs (created_at DESC);
