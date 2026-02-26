-- Migration 003: Campaigns Table
-- Stores ad campaigns across platforms with AI scoring

CREATE TABLE IF NOT EXISTS campaigns (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id              UUID           NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    ad_account_id        UUID           NOT NULL REFERENCES ad_accounts (id) ON DELETE CASCADE,
    -- External ID as assigned by the advertising platform
    platform_campaign_id VARCHAR(100),
    name                 VARCHAR(255)   NOT NULL,
    status               VARCHAR(20)    NOT NULL DEFAULT 'paused'
                             CHECK (status IN ('active', 'paused', 'learning', 'stopped')),
    daily_budget         NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total_budget         NUMERIC(12, 2) NOT NULL DEFAULT 0,
    start_date           DATE,
    end_date             DATE,
    -- Target cost-per-lead in INR
    target_cpl           NUMERIC(10, 2),
    platform             VARCHAR(20)    NOT NULL CHECK (platform IN ('meta', 'google', 'both')),
    -- AI-generated quality/performance score 0–100
    ai_score             NUMERIC(5, 2)  CHECK (ai_score BETWEEN 0 AND 100),
    created_at           TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_campaigns_user_id       ON campaigns (user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_ad_account_id ON campaigns (ad_account_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status        ON campaigns (status);
CREATE INDEX IF NOT EXISTS idx_campaigns_platform      ON campaigns (platform);
CREATE INDEX IF NOT EXISTS idx_campaigns_start_date    ON campaigns (start_date);

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trg_campaigns_updated_at'
    ) THEN
        CREATE TRIGGER trg_campaigns_updated_at
        BEFORE UPDATE ON campaigns
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
END $$;
