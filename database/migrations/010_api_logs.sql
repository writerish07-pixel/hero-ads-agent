-- Migration 010: API Logs Table
-- Records every outbound call to Meta / Google Ads APIs for debugging and billing

CREATE TABLE IF NOT EXISTS api_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform        VARCHAR(20)  NOT NULL CHECK (platform IN ('meta', 'google')),
    endpoint        TEXT         NOT NULL,
    method          VARCHAR(10)  NOT NULL CHECK (method IN ('GET', 'POST', 'PUT', 'PATCH', 'DELETE')),
    -- Sanitised request payload (credentials must be stripped before insert)
    request_json    JSONB        NOT NULL DEFAULT '{}',
    response_status INT,
    -- Sanitised response payload
    response_json   JSONB        NOT NULL DEFAULT '{}',
    -- Round-trip duration in milliseconds
    duration_ms     INT          CHECK (duration_ms >= 0),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_api_logs_platform    ON api_logs (platform);
CREATE INDEX IF NOT EXISTS idx_api_logs_status      ON api_logs (response_status);
CREATE INDEX IF NOT EXISTS idx_api_logs_created_at  ON api_logs (created_at DESC);
