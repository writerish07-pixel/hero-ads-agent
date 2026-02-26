-- Migration 004: Ad Creatives & Variants Tables
-- Stores ad copy, assets, and A/B-test variants

CREATE TABLE IF NOT EXISTS ad_creatives (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id    UUID         NOT NULL REFERENCES campaigns (id) ON DELETE CASCADE,
    title          VARCHAR(255) NOT NULL,
    description    TEXT,
    url            TEXT,
    -- JSON blob for platform-specific extensions (sitelinks, callouts, etc.)
    extensions     JSONB        NOT NULL DEFAULT '{}',
    -- Predicted quality score 0–10 (e.g., Google Ad Strength equivalent)
    quality_score  NUMERIC(4, 2) CHECK (quality_score BETWEEN 0 AND 10),
    -- AI-predicted click-through rate
    predicted_ctr  NUMERIC(6, 4) CHECK (predicted_ctr BETWEEN 0 AND 1),
    status         VARCHAR(20)  NOT NULL DEFAULT 'draft'
                       CHECK (status IN ('draft', 'active', 'paused')),
    created_by     VARCHAR(10)  NOT NULL DEFAULT 'human'
                       CHECK (created_by IN ('ai', 'human')),
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ad_variants (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ad_creative_id    UUID         NOT NULL REFERENCES ad_creatives (id) ON DELETE CASCADE,
    variant_name      VARCHAR(100) NOT NULL,
    -- JSON diff describing what changed vs. the parent creative
    changes_json      JSONB        NOT NULL DEFAULT '{}',
    performance_score NUMERIC(5, 2),
    is_winner         BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ad_creatives_campaign_id   ON ad_creatives (campaign_id);
CREATE INDEX IF NOT EXISTS idx_ad_creatives_status        ON ad_creatives (status);
CREATE INDEX IF NOT EXISTS idx_ad_creatives_created_by    ON ad_creatives (created_by);
CREATE INDEX IF NOT EXISTS idx_ad_variants_creative_id    ON ad_variants (ad_creative_id);
CREATE INDEX IF NOT EXISTS idx_ad_variants_is_winner      ON ad_variants (is_winner);
