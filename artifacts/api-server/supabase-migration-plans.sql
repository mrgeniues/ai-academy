-- ================================================================
-- MIGRATION: Plans, Coupons, Communities, and Payment Enhancements
-- Run EACH statement block in Supabase SQL Editor (Dashboard → SQL Editor)
-- Safe to run multiple times — all statements use IF NOT EXISTS / IF EXISTS
-- ================================================================

-- ── 1. COMMUNITIES TABLE (create if missing) ─────────────────────
CREATE TABLE IF NOT EXISTS communities (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  owner_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'pending',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE communities DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS communities_owner_id_idx ON communities(owner_id);
CREATE INDEX IF NOT EXISTS communities_status_idx   ON communities(status);

-- ── 2. COMMUNITY_PAYMENTS TABLE (create if missing) ──────────────
CREATE TABLE IF NOT EXISTS community_payments (
  id              SERIAL PRIMARY KEY,
  community_id    INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan            TEXT,
  payment_method  TEXT,
  screenshot_url  TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE community_payments DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS community_payments_community_id_idx ON community_payments(community_id);
CREATE INDEX IF NOT EXISTS community_payments_user_id_idx      ON community_payments(user_id);
CREATE INDEX IF NOT EXISTS community_payments_status_idx       ON community_payments(status);

-- ── 3. PLANS TABLE ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS plans (
  id               SERIAL PRIMARY KEY,
  name             TEXT NOT NULL,
  price            NUMERIC(10,2) NOT NULL DEFAULT 0,
  max_communities  INTEGER NOT NULL DEFAULT 1,
  max_tools        INTEGER NOT NULL DEFAULT 5,
  max_courses      INTEGER NOT NULL DEFAULT 5,
  discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  description      TEXT,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE plans DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS plans_is_active_idx ON plans(is_active);

-- ── 4. COUPONS TABLE ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coupons (
  id               SERIAL PRIMARY KEY,
  code             TEXT NOT NULL UNIQUE,
  discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  plan_id          INTEGER REFERENCES plans(id) ON DELETE SET NULL,
  expiry_date      TIMESTAMPTZ,
  max_usage        INTEGER NOT NULL DEFAULT 100,
  used_count       INTEGER NOT NULL DEFAULT 0,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE coupons DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS coupons_code_idx     ON coupons(code);
CREATE INDEX IF NOT EXISTS coupons_is_active_idx ON coupons(is_active);

-- ── 5. ADD plan_id TO communities ────────────────────────────────
ALTER TABLE communities
  ADD COLUMN IF NOT EXISTS plan_id INTEGER REFERENCES plans(id) ON DELETE SET NULL;

-- ── 6. ADD new columns TO community_payments ─────────────────────
ALTER TABLE community_payments
  ADD COLUMN IF NOT EXISTS plan_id         INTEGER REFERENCES plans(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS coupon_id       INTEGER REFERENCES coupons(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS final_price     NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) DEFAULT 0;

-- Make 'plan' column nullable (may already be nullable — safe to run)
ALTER TABLE community_payments ALTER COLUMN plan DROP NOT NULL;

CREATE INDEX IF NOT EXISTS community_payments_plan_id_idx   ON community_payments(plan_id);
CREATE INDEX IF NOT EXISTS community_payments_coupon_id_idx ON community_payments(coupon_id);

-- ── 7. STORED PROC: increment coupon usage atomically ────────────
CREATE OR REPLACE FUNCTION increment_coupon_usage(coupon_id INTEGER)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  UPDATE coupons SET used_count = used_count + 1 WHERE id = coupon_id;
END;
$$;

-- ── 8. SEED DEFAULT PLANS ─────────────────────────────────────────
INSERT INTO plans (name, price, max_communities, max_tools, max_courses, description, is_active)
VALUES
  ('Starter',  9.99,   1,  5,  5,  'Perfect for getting started. 1 community, 5 tools, 5 courses.',   TRUE),
  ('Pro',      19.99,  3,  15, 15, 'For serious creators. 3 communities, 15 tools, 15 courses.',       TRUE),
  ('Business', 49.99,  10, 50, 50, 'Scale your empire. 10 communities, 50 tools, 50 courses.',         TRUE)
ON CONFLICT DO NOTHING;

-- ── 9. SEED community_payment_settings (payment methods config) ───
-- Only needed if the table exists but has no rows
INSERT INTO community_payment_settings (monthly_price, yearly_price, lifetime_price)
VALUES (9.99, 79.99, 199.99)
ON CONFLICT DO NOTHING;

-- ── 10. PAYMENT METHODS TABLE (dynamic, admin-managed) ───────────
CREATE TABLE IF NOT EXISTS payment_methods (
  id              SERIAL PRIMARY KEY,
  name            TEXT NOT NULL,
  instructions    TEXT,
  account_details TEXT,
  qr_url          TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE payment_methods DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS payment_methods_is_active_idx ON payment_methods(is_active);
CREATE INDEX IF NOT EXISTS payment_methods_sort_order_idx ON payment_methods(sort_order);

-- ── 11. ADD rejection_reason TO community_payments ────────────────
ALTER TABLE community_payments
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- ── 12b. ADD invite_code TO communities ───────────────────────────
ALTER TABLE communities
  ADD COLUMN IF NOT EXISTS invite_code TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS communities_invite_code_idx ON communities(invite_code)
  WHERE invite_code IS NOT NULL;

-- ── 12c. COMMUNITY_MEMBERS TABLE (if missing) ─────────────────────
CREATE TABLE IF NOT EXISTS community_members (
  id           SERIAL PRIMARY KEY,
  community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'pending',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(community_id, user_id)
);
ALTER TABLE community_members DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS community_members_community_id_idx ON community_members(community_id);
CREATE INDEX IF NOT EXISTS community_members_user_id_idx      ON community_members(user_id);
CREATE INDEX IF NOT EXISTS community_members_status_idx       ON community_members(status);

-- ── 12. SEED DEFAULT PAYMENT METHODS ─────────────────────────────
INSERT INTO payment_methods (name, instructions, account_details, is_active, sort_order)
VALUES
  ('Binance Pay', 'Send the exact amount to our Binance Pay account and take a screenshot of the transfer confirmation.', NULL, TRUE, 0),
  ('NayaPay',     'Send the exact amount to our NayaPay account and take a screenshot of the transaction confirmation.', NULL, TRUE, 1)
ON CONFLICT DO NOTHING;
