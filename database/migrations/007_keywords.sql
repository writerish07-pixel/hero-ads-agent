-- Migration 007: Keywords Table
-- Tracks keywords per campaign with bidding and performance data

CREATE TABLE IF NOT EXISTS keywords (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id  UUID          NOT NULL REFERENCES campaigns (id) ON DELETE CASCADE,
    keyword_text VARCHAR(255)  NOT NULL,
    match_type   VARCHAR(20)   NOT NULL CHECK (match_type IN ('broad', 'phrase', 'exact')),
    -- Current bid in INR (NULL = auto-bid)
    bid          NUMERIC(10, 2) CHECK (bid >= 0),
    status       VARCHAR(20)   NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active', 'paused', 'removed')),
    -- TRUE for negative keywords
    is_negative  BOOLEAN       NOT NULL DEFAULT FALSE,
    -- Google Ads quality score 1–10
    quality_score INT          CHECK (quality_score BETWEEN 1 AND 10),
    -- Lifetime aggregates (updated by background job)
    impressions  BIGINT        NOT NULL DEFAULT 0,
    clicks       BIGINT        NOT NULL DEFAULT 0,
    conversions  INT           NOT NULL DEFAULT 0,
    avg_cpc      NUMERIC(10, 2),
    added_by     VARCHAR(10)   NOT NULL DEFAULT 'human'
                     CHECK (added_by IN ('ai', 'human')),
    created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_keywords_campaign_id  ON keywords (campaign_id);
CREATE INDEX IF NOT EXISTS idx_keywords_status       ON keywords (status);
CREATE INDEX IF NOT EXISTS idx_keywords_is_negative  ON keywords (is_negative);
CREATE INDEX IF NOT EXISTS idx_keywords_match_type   ON keywords (match_type);
-- Fast text search / duplicate detection
CREATE INDEX IF NOT EXISTS idx_keywords_text         ON keywords (campaign_id, keyword_text, match_type);

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trg_keywords_updated_at'
    ) THEN
        CREATE TRIGGER trg_keywords_updated_at
        BEFORE UPDATE ON keywords
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
END $$;
