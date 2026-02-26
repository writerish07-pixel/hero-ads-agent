-- Migration 002: Ad Accounts Table
-- Stores connected advertising platform accounts per user

CREATE TABLE IF NOT EXISTS ad_accounts (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                  UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    platform                 VARCHAR(20)  NOT NULL CHECK (platform IN ('meta', 'google')),
    account_id               VARCHAR(100) NOT NULL,
    account_name             VARCHAR(255) NOT NULL,
    -- Tokens are stored encrypted at the application layer
    access_token_encrypted   TEXT,
    refresh_token_encrypted  TEXT,
    is_active                BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    -- One platform account can only be connected once per user
    UNIQUE (user_id, platform, account_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ad_accounts_user_id  ON ad_accounts (user_id);
CREATE INDEX IF NOT EXISTS idx_ad_accounts_platform ON ad_accounts (platform);
CREATE INDEX IF NOT EXISTS idx_ad_accounts_active   ON ad_accounts (is_active);

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trg_ad_accounts_updated_at'
    ) THEN
        CREATE TRIGGER trg_ad_accounts_updated_at
        BEFORE UPDATE ON ad_accounts
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
END $$;
