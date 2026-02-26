-- Migration 008: Leads & Lead Interactions Tables
-- Captures inbound leads and their lifecycle history

CREATE TABLE IF NOT EXISTS leads (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id  UUID        NOT NULL REFERENCES campaigns (id) ON DELETE CASCADE,
    -- keyword_id is nullable (lead may come from display / unknown)
    keyword_id   UUID        REFERENCES keywords (id) ON DELETE SET NULL,
    name         VARCHAR(255),
    phone        VARCHAR(30),
    email        VARCHAR(255),
    location     VARCHAR(255),
    lead_source  VARCHAR(100),
    -- AI-assigned lead quality score 0–100
    quality_score NUMERIC(5, 2) CHECK (quality_score BETWEEN 0 AND 100),
    status       VARCHAR(20)  NOT NULL DEFAULT 'new'
                     CHECK (status IN ('new', 'contacted', 'converted', 'lost')),
    notes        TEXT,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lead_interactions (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id          UUID        NOT NULL REFERENCES leads (id) ON DELETE CASCADE,
    -- e.g. 'call', 'email', 'whatsapp', 'status_change'
    interaction_type VARCHAR(50) NOT NULL,
    notes            TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_leads_campaign_id     ON leads (campaign_id);
CREATE INDEX IF NOT EXISTS idx_leads_keyword_id      ON leads (keyword_id);
CREATE INDEX IF NOT EXISTS idx_leads_status          ON leads (status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at      ON leads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_interactions_lead ON lead_interactions (lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_interactions_type ON lead_interactions (interaction_type);

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trg_leads_updated_at'
    ) THEN
        CREATE TRIGGER trg_leads_updated_at
        BEFORE UPDATE ON leads
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
END $$;
