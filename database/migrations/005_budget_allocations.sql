-- Migration 005: Budget Allocations & Rules Tables
-- Tracks budget approvals and per-user spending rules

CREATE TABLE IF NOT EXISTS budget_allocations (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID           NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    campaign_id    UUID           NOT NULL REFERENCES campaigns (id) ON DELETE CASCADE,
    amount         NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    -- UUID of the approving user (NULL if auto-approved by system)
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
    -- Maximum daily spend across all campaigns (INR)
    daily_cap       NUMERIC(12, 2) CHECK (daily_cap > 0),
    -- Maximum monthly spend across all campaigns (INR)
    monthly_cap     NUMERIC(12, 2) CHECK (monthly_cap > 0),
    -- Maximum acceptable cost-per-lead (INR)
    max_cpl         NUMERIC(10, 2) CHECK (max_cpl > 0),
    -- Allowed overshoot percentage (e.g., 10 = ±10%)
    flex_percentage NUMERIC(5, 2)  NOT NULL DEFAULT 10
                        CHECK (flex_percentage BETWEEN 0 AND 100),
    created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

    UNIQUE (user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_budget_allocations_user_id     ON budget_allocations (user_id);
CREATE INDEX IF NOT EXISTS idx_budget_allocations_campaign_id ON budget_allocations (campaign_id);
CREATE INDEX IF NOT EXISTS idx_budget_allocations_status      ON budget_allocations (status);
CREATE INDEX IF NOT EXISTS idx_budget_allocations_eff_date    ON budget_allocations (effective_date);
CREATE INDEX IF NOT EXISTS idx_budget_rules_user_id           ON budget_rules (user_id);

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trg_budget_rules_updated_at'
    ) THEN
        CREATE TRIGGER trg_budget_rules_updated_at
        BEFORE UPDATE ON budget_rules
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
END $$;
