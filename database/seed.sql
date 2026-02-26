-- =============================================================================
-- Hero Ads Agent – Demo Seed Data
-- Depends on schema.sql having been applied first.
-- Password hash below is bcrypt of 'demo123' (cost 12).
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Demo user
-- ---------------------------------------------------------------------------
INSERT INTO users (id, email, password_hash, full_name, role, mfa_enabled, created_at, updated_at)
VALUES (
    '11111111-0000-0000-0000-000000000001',
    'demo@herojaipur.com',
    '$2b$12$KIXwAAWqNHRi3XaURxnmM.LCXzPMsqd6CqE3qpKyWV4DsBXN4Lrz6',  -- bcrypt('demo123', 12)
    'Demo User',
    'admin',
    FALSE,
    NOW(),
    NOW()
)
ON CONFLICT (email) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. Google Ads account connection
-- ---------------------------------------------------------------------------
INSERT INTO ad_accounts (
    id, user_id, platform, account_id, account_name,
    access_token_encrypted, refresh_token_encrypted, is_active, created_at, updated_at
)
VALUES (
    '22222222-0000-0000-0000-000000000001',
    '11111111-0000-0000-0000-000000000001',
    'google',
    '123-456-7890',
    'Hero Jaipur Google Ads',
    'ENCRYPTED_ACCESS_TOKEN_PLACEHOLDER',
    'ENCRYPTED_REFRESH_TOKEN_PLACEHOLDER',
    TRUE,
    NOW(),
    NOW()
)
ON CONFLICT (user_id, platform, account_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. Five sample campaigns
-- ---------------------------------------------------------------------------
INSERT INTO campaigns (
    id, user_id, ad_account_id, platform_campaign_id, name,
    status, daily_budget, total_budget, start_date, end_date,
    target_cpl, platform, ai_score, created_at, updated_at
)
VALUES
    -- Campaign 1: Search – Residential Properties
    (
        '33333333-0000-0000-0000-000000000001',
        '11111111-0000-0000-0000-000000000001',
        '22222222-0000-0000-0000-000000000001',
        'G-CAMP-001',
        'Hero Homes – Residential Search',
        'active',
        5000.00, 150000.00,
        CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE + INTERVAL '60 days',
        800.00,
        'google',
        87.50,
        NOW(), NOW()
    ),
    -- Campaign 2: Display – Brand Awareness
    (
        '33333333-0000-0000-0000-000000000002',
        '11111111-0000-0000-0000-000000000001',
        '22222222-0000-0000-0000-000000000001',
        'G-CAMP-002',
        'Hero Homes – Brand Awareness Display',
        'active',
        3000.00, 90000.00,
        CURRENT_DATE - INTERVAL '20 days', CURRENT_DATE + INTERVAL '40 days',
        1200.00,
        'google',
        72.00,
        NOW(), NOW()
    ),
    -- Campaign 3: Search – Luxury Villas
    (
        '33333333-0000-0000-0000-000000000003',
        '11111111-0000-0000-0000-000000000001',
        '22222222-0000-0000-0000-000000000001',
        'G-CAMP-003',
        'Hero Villas – Luxury Search',
        'learning',
        8000.00, 240000.00,
        CURRENT_DATE - INTERVAL '7 days',  CURRENT_DATE + INTERVAL '83 days',
        1500.00,
        'google',
        61.00,
        NOW(), NOW()
    ),
    -- Campaign 4: Remarketing
    (
        '33333333-0000-0000-0000-000000000004',
        '11111111-0000-0000-0000-000000000001',
        '22222222-0000-0000-0000-000000000001',
        'G-CAMP-004',
        'Hero Homes – Remarketing',
        'paused',
        2000.00, 60000.00,
        CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE + INTERVAL '15 days',
        600.00,
        'google',
        54.00,
        NOW(), NOW()
    ),
    -- Campaign 5: Performance Max
    (
        '33333333-0000-0000-0000-000000000005',
        '11111111-0000-0000-0000-000000000001',
        '22222222-0000-0000-0000-000000000001',
        'G-CAMP-005',
        'Hero Homes – Performance Max',
        'active',
        10000.00, 300000.00,
        CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE + INTERVAL '80 days',
        900.00,
        'google',
        91.00,
        NOW(), NOW()
    )
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 4. Sample keywords (for Campaigns 1 & 3)
-- ---------------------------------------------------------------------------
INSERT INTO keywords (
    id, campaign_id, keyword_text, match_type, bid,
    status, is_negative, quality_score,
    impressions, clicks, conversions, avg_cpc, added_by,
    created_at, updated_at
)
VALUES
    -- Campaign 1 keywords
    ('44444444-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001',
     'residential plots jaipur',    'exact',  85.00, 'active', FALSE, 8, 12400, 310, 38, 78.50,  'human', NOW(), NOW()),
    ('44444444-0000-0000-0000-000000000002', '33333333-0000-0000-0000-000000000001',
     'buy flat in jaipur',          'phrase', 65.00, 'active', FALSE, 7, 18200, 420, 52, 62.10,  'human', NOW(), NOW()),
    ('44444444-0000-0000-0000-000000000003', '33333333-0000-0000-0000-000000000001',
     'affordable housing jaipur',   'broad',  45.00, 'active', FALSE, 6, 32100, 590, 61, 44.80,  'ai',    NOW(), NOW()),
    ('44444444-0000-0000-0000-000000000004', '33333333-0000-0000-0000-000000000001',
     'hero homes jaipur',           'exact', 120.00, 'active', FALSE, 9,  5600, 215, 48, 115.30, 'human', NOW(), NOW()),
    ('44444444-0000-0000-0000-000000000005', '33333333-0000-0000-0000-000000000001',
     'real estate scam',            'exact',   0.00, 'active', TRUE,  NULL,    0,   0,  0,   NULL, 'ai',    NOW(), NOW()),
    -- Campaign 3 keywords
    ('44444444-0000-0000-0000-000000000006', '33333333-0000-0000-0000-000000000003',
     'luxury villas jaipur',        'exact', 200.00, 'active', FALSE, 7,  3400,  98, 12, 185.00, 'human', NOW(), NOW()),
    ('44444444-0000-0000-0000-000000000007', '33333333-0000-0000-0000-000000000003',
     '4 bhk villa jaipur',          'phrase', 150.00, 'active', FALSE, 6,  5100, 134, 18, 142.50, 'human', NOW(), NOW()),
    ('44444444-0000-0000-0000-000000000008', '33333333-0000-0000-0000-000000000003',
     'premium villas near jaipur',  'broad',  95.00, 'active', FALSE, 5,  8900, 210, 22,  88.00, 'ai',    NOW(), NOW())
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 5. Performance metrics – last 7 days for all 5 campaigns
-- ---------------------------------------------------------------------------
INSERT INTO performance_metrics (
    campaign_id, date, impressions, clicks, ctr, cpc, spend,
    leads, cpl, conversions, conversion_rate, platform
)
SELECT
    c.id                                                    AS campaign_id,
    (CURRENT_DATE - s.offset_days)                         AS date,
    -- Randomised but deterministic figures per campaign + day
    (c.daily_budget * 8  + s.offset_days * 12)::BIGINT     AS impressions,
    (c.daily_budget * 0.12 + s.offset_days)::BIGINT        AS clicks,
    ROUND(0.0150 + s.offset_days * 0.0005, 6)              AS ctr,
    ROUND(c.daily_budget * 0.008, 2)                       AS cpc,
    ROUND(c.daily_budget * 0.90 + s.offset_days * 50, 2)   AS spend,
    (c.daily_budget / 500 + s.offset_days)::INT            AS leads,
    ROUND(c.target_cpl * 0.95 - s.offset_days * 10, 2)    AS cpl,
    (c.daily_budget / 1000)::INT                           AS conversions,
    ROUND(0.0350 + s.offset_days * 0.0020, 6)             AS conversion_rate,
    c.platform
FROM campaigns c
CROSS JOIN (
    SELECT 0 AS offset_days UNION ALL SELECT 1 UNION ALL SELECT 2
    UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6
) s
WHERE c.user_id = '11111111-0000-0000-0000-000000000001'
ON CONFLICT (campaign_id, date, platform) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 6. Budget rules for the demo user
-- ---------------------------------------------------------------------------
INSERT INTO budget_rules (id, user_id, daily_cap, monthly_cap, max_cpl, flex_percentage)
VALUES (
    '55555555-0000-0000-0000-000000000001',
    '11111111-0000-0000-0000-000000000001',
    28000.00,
    600000.00,
    1500.00,
    10.00
)
ON CONFLICT (user_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 7. Sample audit log entry
-- ---------------------------------------------------------------------------
INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details_json, ip_address)
VALUES (
    '11111111-0000-0000-0000-000000000001',
    'user.login',
    'user',
    '11111111-0000-0000-0000-000000000001',
    '{"method": "password", "success": true}',
    '127.0.0.1'
);

COMMIT;
