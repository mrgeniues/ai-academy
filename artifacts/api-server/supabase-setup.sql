-- ================================================================
-- AI Academy 3.0 — Complete Supabase Database Setup
-- Paste this entire script into: Supabase Dashboard → SQL Editor
--
-- SAFE TO RUN ON ANY DATABASE:
--   • Fresh database  → creates everything from scratch
--   • Existing database → skips tables/columns that already exist,
--     adds any missing columns, and never drops data
-- ================================================================


-- ────────────────────────────────────────────────────────────────
-- USERS
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id               SERIAL PRIMARY KEY,
  email            TEXT NOT NULL UNIQUE,
  password_hash    TEXT NOT NULL,
  name             TEXT NOT NULL,
  role             TEXT NOT NULL DEFAULT 'member',     -- 'admin' | 'creator' | 'member'
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

-- Remove any email-format check constraints that may be leftover from previous setups
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_gmail_only;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_check;
ALTER TABLE users DROP CONSTRAINT IF EXISTS email_check;

-- Ensure all columns exist (safe on existing tables)
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_online        BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen        TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_approved      BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_blocked       BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS theme            TEXT NOT NULL DEFAULT 'light';
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login       TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_logout      TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS social_links     JSONB;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio              TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar           TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Browser presence sessions power the admin live-user and online/offline duration tracker.
-- A session is considered live while its last heartbeat is less than three minutes old.
CREATE TABLE IF NOT EXISTS user_presence_sessions (
  id           BIGSERIAL PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_key  TEXT NOT NULL,
  started_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at     TIMESTAMPTZ
);
ALTER TABLE user_presence_sessions DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS user_presence_sessions_user_id_idx ON user_presence_sessions(user_id);
CREATE INDEX IF NOT EXISTS user_presence_sessions_last_seen_idx ON user_presence_sessions(last_seen);
CREATE INDEX IF NOT EXISTS user_presence_sessions_active_idx
  ON user_presence_sessions(user_id, session_key)
  WHERE ended_at IS NULL;

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
  visibility      TEXT NOT NULL DEFAULT 'public',              -- 'public' | 'private'
  enrollment_mode TEXT NOT NULL DEFAULT 'approval_required',   -- 'open' | 'approval_required'
  created_by      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE courses DISABLE ROW LEVEL SECURITY;

ALTER TABLE courses ADD COLUMN IF NOT EXISTS external_url    TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS visibility      TEXT NOT NULL DEFAULT 'public';
ALTER TABLE courses ADD COLUMN IF NOT EXISTS enrollment_mode TEXT NOT NULL DEFAULT 'approval_required';
ALTER TABLE courses ADD COLUMN IF NOT EXISTS updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW();


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
  is_public   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE lessons DISABLE ROW LEVEL SECURITY;

ALTER TABLE lessons ADD COLUMN IF NOT EXISTS video_url  TEXT;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS content    TEXT;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS is_public  BOOLEAN NOT NULL DEFAULT TRUE;


-- ────────────────────────────────────────────────────────────────
-- ENROLLMENTS
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS enrollments (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id   INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  progress    INTEGER NOT NULL DEFAULT 0,
  is_approved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, course_id)
);
ALTER TABLE enrollments DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS enrollments_user_id_idx   ON enrollments(user_id);
CREATE INDEX IF NOT EXISTS enrollments_course_id_idx ON enrollments(course_id);


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
CREATE INDEX IF NOT EXISTS lesson_completions_user_id_idx   ON lesson_completions(user_id);
CREATE INDEX IF NOT EXISTS lesson_completions_lesson_id_idx ON lesson_completions(lesson_id);


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
CREATE INDEX IF NOT EXISTS posts_user_id_idx    ON posts(user_id);
CREATE INDEX IF NOT EXISTS posts_created_at_idx ON posts(created_at DESC);

ALTER TABLE posts ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS file_url  TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS file_type TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_vip    BOOLEAN NOT NULL DEFAULT FALSE;


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
CREATE INDEX IF NOT EXISTS comments_post_id_idx ON comments(post_id);
CREATE INDEX IF NOT EXISTS comments_user_id_idx ON comments(user_id);

ALTER TABLE comments ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS file_url  TEXT;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS file_type TEXT;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES comments(id) ON DELETE CASCADE;


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
CREATE INDEX IF NOT EXISTS likes_post_id_idx ON likes(post_id);


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
CREATE INDEX IF NOT EXISTS comment_likes_user_id_idx    ON comment_likes(user_id);


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
CREATE INDEX IF NOT EXISTS notifications_unread_idx  ON notifications(user_id, is_read);

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS post_id   INTEGER REFERENCES posts(id) ON DELETE SET NULL;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS course_id INTEGER REFERENCES courses(id) ON DELETE SET NULL;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_vip    BOOLEAN NOT NULL DEFAULT FALSE;


-- ────────────────────────────────────────────────────────────────
-- MESSAGES  (direct messages between users)
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
CREATE INDEX IF NOT EXISTS messages_sender_receiver_idx  ON messages(sender_id, receiver_id);
CREATE INDEX IF NOT EXISTS messages_receiver_unread_idx  ON messages(receiver_id, is_read);

ALTER TABLE messages ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_url  TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_type TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_read   BOOLEAN NOT NULL DEFAULT FALSE;


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
CREATE INDEX IF NOT EXISTS followers_follower_id_idx  ON followers(follower_id);
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
CREATE INDEX IF NOT EXISTS tools_created_at_idx ON tools(created_at DESC);

ALTER TABLE tools ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE tools ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE tools ADD COLUMN IF NOT EXISTS tool_url  TEXT;


-- ────────────────────────────────────────────────────────────────
-- TOOL REQUESTS  (access control for AI tools)
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
CREATE INDEX IF NOT EXISTS tool_requests_user_id_idx ON tool_requests(user_id);
CREATE INDEX IF NOT EXISTS tool_requests_tool_id_idx ON tool_requests(tool_id);


-- ────────────────────────────────────────────────────────────────
-- SITE SETTINGS  (key-value admin config: platform name, email, etc.)
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
-- SETTINGS  (general key-value store used by the server)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value      TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE settings DISABLE ROW LEVEL SECURITY;


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
-- ADMIN ACTIONS  (audit log)
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
CREATE INDEX IF NOT EXISTS admin_actions_actor_id_idx   ON admin_actions(actor_id);


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
CREATE INDEX IF NOT EXISTS password_resets_token_idx ON password_resets(token);


-- ================================================================
-- STORAGE BUCKET
-- Creates the "media" bucket for image/video/file uploads.
-- If this line errors, create the bucket manually in:
--   Supabase Dashboard → Storage → New Bucket → name: "media", Public: ON
-- ================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access on the media bucket
DROP POLICY IF EXISTS "Public media read" ON storage.objects;
CREATE POLICY "Public media read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'media');

-- Allow authenticated uploads to the media bucket
DROP POLICY IF EXISTS "Authenticated media upload" ON storage.objects;
CREATE POLICY "Authenticated media upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'media');


-- ================================================================
-- NO SEED DATA
-- The database starts clean. Create your admin account via the
-- signup page and set the role to 'admin' directly in Supabase:
--   UPDATE users SET role = 'admin', is_approved = TRUE
--   WHERE email = 'your@email.com';
-- ================================================================
