-- Migration 006: Performance Metrics Tables
-- Daily and hourly campaign performance data

CREATE TABLE IF NOT EXISTS performance_metrics (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id      UUID           NOT NULL REFERENCES campaigns (id) ON DELETE CASCADE,
    date             DATE           NOT NULL,
    impressions      BIGINT         NOT NULL DEFAULT 0,
    clicks           BIGINT         NOT NULL DEFAULT 0,
    -- Click-through rate (0–1)
    ctr              NUMERIC(8, 6)  CHECK (ctr BETWEEN 0 AND 1),
    -- Cost-per-click (INR)
    cpc              NUMERIC(10, 2),
    -- Total spend for the day (INR)
    spend            NUMERIC(12, 2) NOT NULL DEFAULT 0,
    leads            INT            NOT NULL DEFAULT 0,
    -- Cost-per-lead (INR)
    cpl              NUMERIC(10, 2),
    conversions      INT            NOT NULL DEFAULT 0,
    -- Conversion rate (0–1)
    conversion_rate  NUMERIC(8, 6)  CHECK (conversion_rate BETWEEN 0 AND 1),
    platform         VARCHAR(20)    NOT NULL CHECK (platform IN ('meta', 'google', 'both')),
    created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

    UNIQUE (campaign_id, date, platform)
);

CREATE TABLE IF NOT EXISTS performance_hourly (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id     UUID           NOT NULL REFERENCES campaigns (id) ON DELETE CASCADE,
    -- Truncated to the hour (e.g., 2024-06-01 14:00:00+00)
    hour_timestamp  TIMESTAMPTZ    NOT NULL,
    impressions     BIGINT         NOT NULL DEFAULT 0,
    clicks          BIGINT         NOT NULL DEFAULT 0,
    -- Total spend for the hour (INR)
    spend           NUMERIC(12, 2) NOT NULL DEFAULT 0,
    leads           INT            NOT NULL DEFAULT 0,

    UNIQUE (campaign_id, hour_timestamp)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_perf_metrics_campaign_date ON performance_metrics (campaign_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_perf_metrics_date          ON performance_metrics (date DESC);
CREATE INDEX IF NOT EXISTS idx_perf_metrics_platform      ON performance_metrics (platform);
CREATE INDEX IF NOT EXISTS idx_perf_hourly_campaign_ts    ON performance_hourly (campaign_id, hour_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_perf_hourly_ts             ON performance_hourly (hour_timestamp DESC);
