-- Migration 009: Audit Logs Table
-- Immutable log of all user and system actions

CREATE TABLE IF NOT EXISTS audit_logs (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- NULL when action is performed by the system / background job
    user_id       UUID         REFERENCES users (id) ON DELETE SET NULL,
    -- e.g. 'campaign.create', 'budget.approve', 'user.login'
    action        VARCHAR(100) NOT NULL,
    -- e.g. 'campaign', 'ad_account', 'keyword'
    resource_type VARCHAR(100),
    -- UUID or external ID of the affected resource
    resource_id   VARCHAR(100),
    -- Full before/after payload or relevant context
    details_json  JSONB        NOT NULL DEFAULT '{}',
    ip_address    INET,
    user_agent    TEXT,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Indexes optimised for audit queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id       ON audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action        ON audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource      ON audit_logs (resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at    ON audit_logs (created_at DESC);
