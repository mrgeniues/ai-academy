-- ================================================================
-- AI Academy 2.0 — Supabase Database Setup
-- Paste this entire script into Supabase Dashboard → SQL Editor
-- Safe to run on an empty database or on top of an existing one
-- ================================================================


-- ────────────────────────────────────────────────────────────────
-- USERS
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id               SERIAL PRIMARY KEY,
  email            TEXT NOT NULL UNIQUE,
  password_hash    TEXT NOT NULL,
  name             TEXT NOT NULL,
  role             TEXT NOT NULL DEFAULT 'member',   -- 'admin' | 'creator' | 'member'
  avatar           TEXT,
  bio              TEXT,
  social_links     JSONB,
  last_login       TIMESTAMPTZ,
  last_logout      TIMESTAMPTZ,
  is_online        BOOLEAN NOT NULL DEFAULT FALSE,
  last_seen        TIMESTAMPTZ DEFAULT NOW(),
  is_approved      BOOLEAN NOT NULL DEFAULT FALSE,
  is_blocked       BOOLEAN NOT NULL DEFAULT FALSE,
  rejection_reason TEXT,
  theme            TEXT NOT NULL DEFAULT 'light',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Auto-approve admins on insert/update
CREATE OR REPLACE FUNCTION auto_approve_admin()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.role = 'admin' THEN NEW.is_approved := TRUE; END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_auto_approve_admin ON users;
CREATE TRIGGER trg_auto_approve_admin
  BEFORE INSERT OR UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION auto_approve_admin();


-- ────────────────────────────────────────────────────────────────
-- COURSES
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS courses (
  id              SERIAL PRIMARY KEY,
  title           TEXT NOT NULL,
  description     TEXT,
  thumbnail       TEXT,
  external_url    TEXT,
  visibility      TEXT NOT NULL DEFAULT 'public',           -- 'public' | 'private'
  enrollment_mode TEXT NOT NULL DEFAULT 'approval_required',-- 'open' | 'approval_required'
  created_by      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE courses DISABLE ROW LEVEL SECURITY;


-- ────────────────────────────────────────────────────────────────
-- LESSONS
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lessons (
  id          SERIAL PRIMARY KEY,
  course_id   INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  video_url   TEXT,
  content     TEXT,
  "order"     INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE lessons DISABLE ROW LEVEL SECURITY;


-- ────────────────────────────────────────────────────────────────
-- ENROLLMENTS
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS enrollments (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id   INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  progress    INTEGER NOT NULL DEFAULT 0,
  is_approved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE enrollments DISABLE ROW LEVEL SECURITY;


-- ────────────────────────────────────────────────────────────────
-- REJECTED ENROLLMENTS
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rejected_enrollments (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id   INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  reason      TEXT,
  rejected_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE rejected_enrollments DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS rejected_enrollments_user_course_idx ON rejected_enrollments(user_id, course_id);


-- ────────────────────────────────────────────────────────────────
-- LESSON COMPLETIONS
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lesson_completions (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id  INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, lesson_id)
);
ALTER TABLE lesson_completions DISABLE ROW LEVEL SECURITY;


-- ────────────────────────────────────────────────────────────────
-- POSTS
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS posts (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  image_url  TEXT,
  video_url  TEXT,
  file_url   TEXT,
  file_type  TEXT,
  is_vip     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE posts DISABLE ROW LEVEL SECURITY;


-- ────────────────────────────────────────────────────────────────
-- COMMENTS
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comments (
  id         SERIAL PRIMARY KEY,
  post_id    INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  comment    TEXT NOT NULL,
  image_url  TEXT,
  video_url  TEXT,
  file_url   TEXT,
  file_type  TEXT,
  parent_id  INTEGER REFERENCES comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE comments DISABLE ROW LEVEL SECURITY;


-- ────────────────────────────────────────────────────────────────
-- POST LIKES
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS likes (
  id         SERIAL PRIMARY KEY,
  post_id    INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);
ALTER TABLE likes DISABLE ROW LEVEL SECURITY;


-- ────────────────────────────────────────────────────────────────
-- COMMENT LIKES
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comment_likes (
  id         SERIAL PRIMARY KEY,
  comment_id INTEGER NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(comment_id, user_id)
);
ALTER TABLE comment_likes DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS comment_likes_comment_id_idx ON comment_likes(comment_id);


-- ────────────────────────────────────────────────────────────────
-- NOTIFICATIONS
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  message    TEXT NOT NULL,
  post_id    INTEGER REFERENCES posts(id) ON DELETE SET NULL,
  course_id  INTEGER REFERENCES courses(id) ON DELETE SET NULL,
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  is_vip     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_unread_idx ON notifications(user_id, is_read);


-- ────────────────────────────────────────────────────────────────
-- MESSAGES (direct messages between users)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id          SERIAL PRIMARY KEY,
  sender_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message     TEXT NOT NULL DEFAULT '',
  image_url   TEXT,
  video_url   TEXT,
  file_url    TEXT,
  file_type   TEXT,
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS messages_sender_receiver_idx ON messages(sender_id, receiver_id);
CREATE INDEX IF NOT EXISTS messages_receiver_unread_idx ON messages(receiver_id, is_read);


-- ────────────────────────────────────────────────────────────────
-- FOLLOWERS
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS followers (
  id           SERIAL PRIMARY KEY,
  follower_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);
ALTER TABLE followers DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS followers_follower_id_idx ON followers(follower_id);
CREATE INDEX IF NOT EXISTS followers_following_id_idx ON followers(following_id);


-- ────────────────────────────────────────────────────────────────
-- AI TOOLS
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tools (
  id          SERIAL PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT,
  image_url   TEXT,
  video_url   TEXT,
  tool_url    TEXT,
  created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE tools DISABLE ROW LEVEL SECURITY;


-- ────────────────────────────────────────────────────────────────
-- TOOL REQUESTS (access control for AI tools)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tool_requests (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tool_id     INTEGER NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
  is_approved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, tool_id)
);
ALTER TABLE tool_requests DISABLE ROW LEVEL SECURITY;


-- ────────────────────────────────────────────────────────────────
-- SITE SETTINGS (key-value admin config)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS site_settings (
  id         SERIAL PRIMARY KEY,
  key        TEXT NOT NULL UNIQUE,
  value      TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE site_settings DISABLE ROW LEVEL SECURITY;


-- ────────────────────────────────────────────────────────────────
-- MAINTENANCE SETTINGS
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS maintenance_settings (
  id          SERIAL PRIMARY KEY,
  is_active   BOOLEAN NOT NULL DEFAULT FALSE,
  start_time  TIMESTAMPTZ,
  end_time    TIMESTAMPTZ,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE maintenance_settings DISABLE ROW LEVEL SECURITY;


-- ────────────────────────────────────────────────────────────────
-- ADMIN ACTIONS AUDIT LOG
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_actions (
  id             SERIAL PRIMARY KEY,
  actor_id       INTEGER REFERENCES users(id) ON DELETE SET NULL,
  target_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action         TEXT NOT NULL,
  entity_type    TEXT NOT NULL,
  entity_id      INTEGER,
  reason         TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE admin_actions DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS admin_actions_created_at_idx ON admin_actions(created_at DESC);


-- ────────────────────────────────────────────────────────────────
-- PASSWORD RESETS
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS password_resets (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE password_resets DISABLE ROW LEVEL SECURITY;


-- ────────────────────────────────────────────────────────────────
-- COMMUNITY PAYMENT SETTINGS  (single-row config table)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS community_payment_settings (
  id              SERIAL PRIMARY KEY,
  monthly_price   NUMERIC(10,2) NOT NULL DEFAULT 9.99,
  yearly_price    NUMERIC(10,2) NOT NULL DEFAULT 79.99,
  lifetime_price  NUMERIC(10,2) NOT NULL DEFAULT 199.99,
  binance_account TEXT,
  binance_qr_url  TEXT,
  nayapay_account TEXT,
  nayapay_qr_url  TEXT,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE community_payment_settings DISABLE ROW LEVEL SECURITY;
INSERT INTO community_payment_settings DEFAULT VALUES ON CONFLICT DO NOTHING;

-- ────────────────────────────────────────────────────────────────
-- COMMUNITY PAYMENTS
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS community_payments (
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  community_id   INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  plan           TEXT NOT NULL,           -- 'monthly' | 'yearly' | 'lifetime'
  payment_method TEXT,                    -- 'binance' | 'nayapay'
  screenshot_url TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE community_payments DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS community_payments_status_idx ON community_payments(status);
CREATE INDEX IF NOT EXISTS community_payments_user_id_idx ON community_payments(user_id);

-- ────────────────────────────────────────────────────────────────
-- COMMUNITY MEMBERS
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS community_members (
  id           SERIAL PRIMARY KEY,
  community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'pending',   -- 'pending' | 'approved' | 'rejected'
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(community_id, user_id)
);
ALTER TABLE community_members DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS community_members_community_id_idx ON community_members(community_id);

-- ────────────────────────────────────────────────────────────────
-- COMMUNITY POSTS
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS community_posts (
  id           SERIAL PRIMARY KEY,
  community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content      TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE community_posts DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS community_posts_community_id_idx ON community_posts(community_id);

-- ────────────────────────────────────────────────────────────────
-- COMMUNITY COURSES
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS community_courses (
  id           SERIAL PRIMARY KEY,
  community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  course_id    INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(community_id, course_id)
);
ALTER TABLE community_courses DISABLE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────────
-- COMMUNITY TOOLS
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS community_tools (
  id           SERIAL PRIMARY KEY,
  community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  tool_id      INTEGER NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(community_id, tool_id)
);
ALTER TABLE community_tools DISABLE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────────
-- COMMUNITY MESSAGES (group chat)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS community_messages (
  id           SERIAL PRIMARY KEY,
  community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  sender_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content      TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE community_messages DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS community_messages_community_id_idx ON community_messages(community_id);

-- ────────────────────────────────────────────────────────────────
-- COMMUNITIES
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS communities (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  owner_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'pending',   -- 'pending' | 'approved' | 'rejected'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE communities DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS communities_owner_id_idx ON communities(owner_id);
CREATE INDEX IF NOT EXISTS communities_status_idx ON communities(status);


-- ================================================================
-- STORAGE BUCKET
-- Create the "media" bucket for file/image/video uploads.
-- Run this separately if the SQL below causes an error
-- (Supabase sometimes requires bucket creation via the Dashboard).
-- ================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;


-- ================================================================
-- SEED DATA  (safe to re-run — uses ON CONFLICT DO NOTHING)
-- Passwords for all seed users: password123
-- ================================================================

INSERT INTO users (email, password_hash, name, role, is_approved) VALUES
  ('admin@lms.com',     '$2b$10$kJnu2jmgF5a9RsKtsGDEhOSDowhs3t.fGIagheU95AW09hIcmbhHy', 'Admin User',    'admin',   TRUE),
  ('alice@example.com', '$2b$10$kJnu2jmgF5a9RsKtsGDEhOSDowhs3t.fGIagheU95AW09hIcmbhHy', 'Alice Johnson', 'creator', TRUE),
  ('bob@example.com',   '$2b$10$kJnu2jmgF5a9RsKtsGDEhOSDowhs3t.fGIagheU95AW09hIcmbhHy', 'Bob Smith',     'member',  TRUE)
ON CONFLICT (email) DO NOTHING;

INSERT INTO courses (title, description, thumbnail, visibility, enrollment_mode, created_by)
SELECT
  'Introduction to Web Development',
  'Learn HTML, CSS, and JavaScript from scratch. Build your first website.',
  'https://images.unsplash.com/photo-1593720213428-28a5b9e94613?w=640',
  'public', 'open', id
FROM users WHERE email = 'alice@example.com'
ON CONFLICT DO NOTHING;

INSERT INTO courses (title, description, thumbnail, visibility, enrollment_mode, created_by)
SELECT
  'Advanced React Patterns',
  'Deep dive into React hooks, context, performance optimization and design patterns.',
  'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=640',
  'public', 'approval_required', id
FROM users WHERE email = 'alice@example.com'
ON CONFLICT DO NOTHING;

INSERT INTO courses (title, description, thumbnail, visibility, enrollment_mode, created_by)
SELECT
  'Node.js & Express API Design',
  'Build production-ready REST APIs with Node.js, Express, authentication and databases.',
  'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=640',
  'private', 'approval_required', id
FROM users WHERE email = 'admin@lms.com'
ON CONFLICT DO NOTHING;

INSERT INTO lessons (course_id, title, description, "order")
SELECT 1, 'HTML Fundamentals',     'Learn the building blocks of web pages.', 1 WHERE EXISTS (SELECT 1 FROM courses WHERE id = 1)
ON CONFLICT DO NOTHING;
INSERT INTO lessons (course_id, title, description, "order")
SELECT 1, 'CSS Styling Basics',    'Style your HTML with colors, fonts, and layout.', 2 WHERE EXISTS (SELECT 1 FROM courses WHERE id = 1)
ON CONFLICT DO NOTHING;
INSERT INTO lessons (course_id, title, description, "order")
SELECT 1, 'JavaScript Essentials', 'Variables, functions, DOM manipulation, and events.', 3 WHERE EXISTS (SELECT 1 FROM courses WHERE id = 1)
ON CONFLICT DO NOTHING;

INSERT INTO posts (user_id, content)
SELECT id, 'Welcome to AI Academy! Check out the new courses and let me know what topics you want next.'
FROM users WHERE email = 'alice@example.com'
ON CONFLICT DO NOTHING;

INSERT INTO posts (user_id, content)
SELECT id, 'Just finished the Web Development course — absolutely loved it. Highly recommend!'
FROM users WHERE email = 'bob@example.com'
ON CONFLICT DO NOTHING;

INSERT INTO posts (user_id, content)
SELECT id, 'Platform update: progress tracking and community features are now live. Keep learning!'
FROM users WHERE email = 'admin@lms.com'
ON CONFLICT DO NOTHING;
