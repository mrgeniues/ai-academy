-- ============================================================
-- AI Academy 2.0 — Full Database Migration
-- Generated: 2026-05-01T04:32:33.012Z
-- 
-- HOW TO USE:
-- 1. Create a new project at supabase.com
-- 2. Go to SQL Editor in your new project
-- 3. Paste and run this ENTIRE file
-- 4. Update your .env with the new project credentials
-- ============================================================

-- ============================================================
-- PART 1: SCHEMA (create all tables, columns, indexes)
-- ============================================================

-- LearnHub LMS - Supabase Database Setup
-- Run this entire script in your Supabase Dashboard > SQL Editor

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  avatar TEXT,
  bio TEXT,
  social_links JSONB,
  last_login TIMESTAMPTZ,
  last_logout TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Browser presence sessions (powers the Admin Tracker live view and time ledger)
CREATE TABLE IF NOT EXISTS user_presence_sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_key TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);
ALTER TABLE user_presence_sessions DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS user_presence_sessions_user_id_idx ON user_presence_sessions(user_id);
CREATE INDEX IF NOT EXISTS user_presence_sessions_last_seen_idx ON user_presence_sessions(last_seen);
CREATE INDEX IF NOT EXISTS user_presence_sessions_active_idx
  ON user_presence_sessions(user_id, session_key)
  WHERE ended_at IS NULL;

-- Courses table
CREATE TABLE IF NOT EXISTS courses (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail TEXT,
  external_url TEXT,
  visibility TEXT NOT NULL DEFAULT 'public',
  created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Lessons table
CREATE TABLE IF NOT EXISTS lessons (
  id SERIAL PRIMARY KEY,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT,
  content TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enrollments table
CREATE TABLE IF NOT EXISTS enrollments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  progress INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Lesson completions table (tracks which lessons each user has finished)
CREATE TABLE IF NOT EXISTS lesson_completions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, lesson_id)
);

-- Posts table
CREATE TABLE IF NOT EXISTS posts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Likes table
CREATE TABLE IF NOT EXISTS likes (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Disable Row Level Security (backend uses service role key)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE courses DISABLE ROW LEVEL SECURITY;
ALTER TABLE lessons DISABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments DISABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_completions DISABLE ROW LEVEL SECURITY;
ALTER TABLE posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE likes DISABLE ROW LEVEL SECURITY;

-- Seed demo users (password for all: "password123")
INSERT INTO users (email, password_hash, name, role) VALUES
  ('admin@lms.com', '$2b$10$kJnu2jmgF5a9RsKtsGDEhOSDowhs3t.fGIagheU95AW09hIcmbhHy', 'Admin User', 'admin'),
  ('alice@example.com', '$2b$10$kJnu2jmgF5a9RsKtsGDEhOSDowhs3t.fGIagheU95AW09hIcmbhHy', 'Alice Johnson', 'creator'),
  ('bob@example.com', '$2b$10$kJnu2jmgF5a9RsKtsGDEhOSDowhs3t.fGIagheU95AW09hIcmbhHy', 'Bob Smith', 'member')
ON CONFLICT (email) DO NOTHING;

-- Sample courses
INSERT INTO courses (title, description, thumbnail, visibility, created_by) VALUES
  ('Introduction to Web Development', 'Learn HTML, CSS, and JavaScript from scratch. Build your first website.', 'https://images.unsplash.com/photo-1593720213428-28a5b9e94613?w=640', 'public', 2),
  ('Advanced React Patterns', 'Deep dive into React hooks, context, performance optimization and design patterns.', 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=640', 'public', 2),
  ('Node.js & Express API Design', 'Build production-ready REST APIs with Node.js, Express, authentication and databases.', 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=640', 'private', 1)
ON CONFLICT DO NOTHING;

-- Lessons for course 1
INSERT INTO lessons (course_id, title, description, video_url, "order") VALUES
  (1, 'HTML Fundamentals', 'Learn the building blocks of web pages — tags, attributes, and document structure.', null, 1),
  (1, 'CSS Styling Basics', 'Style your HTML with colors, fonts, layout, and the box model.', null, 2),
  (1, 'JavaScript Essentials', 'Variables, functions, DOM manipulation, and event handling.', null, 3),
  (1, 'Building Your First Website', 'Put it all together and deploy your first responsive website.', null, 4);

-- Lessons for course 2
INSERT INTO lessons (course_id, title, description, video_url, "order") VALUES
  (2, 'Custom Hooks Deep Dive', 'Extract stateful logic into reusable custom hooks with real-world examples.', null, 1),
  (2, 'Context API & State Management', 'Manage global state without Redux using React Context and useReducer.', null, 2),
  (2, 'Performance Optimization', 'useMemo, useCallback, React.memo, and code splitting strategies.', null, 3);

-- Lessons for course 3
INSERT INTO lessons (course_id, title, description, video_url, "order") VALUES
  (3, 'Express Routing & Middleware', 'Design RESTful routes and build custom middleware for logging, auth, and validation.', null, 1),
  (3, 'JWT Authentication', 'Implement secure JWT-based authentication with refresh tokens.', null, 2),
  (3, 'Database Integration', 'Connect to PostgreSQL and write type-safe queries with an ORM.', null, 3);

-- Sample community posts
INSERT INTO posts (user_id, content) VALUES
  (2, 'Welcome to LearnHub! I just uploaded 3 new courses. Check them out and let me know what topics you''d like next!'),
  (3, 'Just finished the Introduction to Web Development course. Absolutely loved it — highly recommend!'),
  (1, 'Platform update: We''ve added progress tracking and new community features. Keep learning!');

-- ============================================================
-- Media columns for posts and comments
-- ============================================================
ALTER TABLE posts ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS file_type TEXT;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS file_type TEXT;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES comments(id) ON DELETE CASCADE;

-- ============================================================
-- Notifications table
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  post_id INTEGER REFERENCES posts(id) ON DELETE SET NULL,
  course_id INTEGER REFERENCES courses(id) ON DELETE SET NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_vip BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_is_read_idx ON notifications(user_id, is_read);

-- ============================================================
-- User feature columns
-- ============================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS theme TEXT NOT NULL DEFAULT 'light';

-- ============================================================
-- Course feature columns
-- ============================================================
ALTER TABLE courses ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public';
ALTER TABLE courses ADD COLUMN IF NOT EXISTS external_url TEXT;

-- ============================================================
-- Enrollment mode column (open = auto-approved, approval_required = needs admin)
-- ============================================================
ALTER TABLE courses ADD COLUMN IF NOT EXISTS enrollment_mode TEXT NOT NULL DEFAULT 'approval_required';

-- ============================================================
-- Lesson feature columns (in case created with older schema)
-- ============================================================
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS content TEXT;

-- ============================================================
-- VIP posts column
-- ============================================================
ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_vip BOOLEAN NOT NULL DEFAULT FALSE;

-- Disable RLS on all tables (service role key bypasses anyway)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE courses DISABLE ROW LEVEL SECURITY;
ALTER TABLE lessons DISABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments DISABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_completions DISABLE ROW LEVEL SECURITY;
ALTER TABLE posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE likes DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- Approval feature columns
-- ============================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_approved BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE users SET is_approved = TRUE WHERE role = 'admin';

ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS is_approved BOOLEAN NOT NULL DEFAULT FALSE;

-- ============================================================
-- Site settings table (key-value store for admin configuration)
-- ============================================================
CREATE TABLE IF NOT EXISTS site_settings (
  id SERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE site_settings DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- Admin actions audit log
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_actions (
  id SERIAL PRIMARY KEY,
  actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  target_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('user_approved','user_rejected','user_unblocked','enrollment_approved','enrollment_rejected')),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('user','enrollment')),
  entity_id INTEGER,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE admin_actions DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS admin_actions_created_at_idx ON admin_actions (created_at DESC);
-- Add constraints for existing tables (no-op if they already exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'admin_actions_action_check' AND conrelid = 'admin_actions'::regclass) THEN
    ALTER TABLE admin_actions ADD CONSTRAINT admin_actions_action_check
      CHECK (action IN ('user_approved','user_rejected','user_unblocked','enrollment_approved','enrollment_rejected'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'admin_actions_entity_type_check' AND conrelid = 'admin_actions'::regclass) THEN
    ALTER TABLE admin_actions ADD CONSTRAINT admin_actions_entity_type_check
      CHECK (entity_type IN ('user','enrollment'));
  END IF;
END $$;

-- Password reset tokens table
CREATE TABLE IF NOT EXISTS password_resets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Followers table (social follow/unfollow between users)
-- ============================================================
CREATE TABLE IF NOT EXISTS followers (
  id SERIAL PRIMARY KEY,
  follower_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);
ALTER TABLE followers DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS followers_follower_id_idx ON followers(follower_id);
CREATE INDEX IF NOT EXISTS followers_following_id_idx ON followers(following_id);

-- ============================================================
-- AI Tools table
-- ============================================================
CREATE TABLE IF NOT EXISTS tools (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  video_url TEXT,
  tool_url TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE tools DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- Tool requests table (user requests access to a tool)
-- ON DELETE CASCADE ensures deleting a user removes their requests
-- ============================================================
CREATE TABLE IF NOT EXISTS tool_requests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tool_id INTEGER NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, tool_id)
);
ALTER TABLE tool_requests DISABLE ROW LEVEL SECURITY;

-- Fix existing tool_requests foreign key to use ON DELETE CASCADE
-- (Run this if tool_requests table already exists without CASCADE)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tool_requests_user_id_fkey'
    AND conrelid = 'tool_requests'::regclass
  ) THEN
    ALTER TABLE tool_requests DROP CONSTRAINT tool_requests_user_id_fkey;
    ALTER TABLE tool_requests ADD CONSTRAINT tool_requests_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================================
-- Rejection reason columns (show reason in-app, not just email)
-- ============================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

CREATE TABLE IF NOT EXISTS rejected_enrollments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  reason TEXT,
  rejected_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE rejected_enrollments DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS rejected_enrollments_user_course_idx ON rejected_enrollments(user_id, course_id);


-- ============================================================
-- PART 2: DATA (all your existing records)
-- ============================================================

-- Disable triggers temporarily for faster import
SET session_replication_role = replica;

-- ─────────────────────────────────────
-- users (40 rows)
-- ─────────────────────────────────────
INSERT INTO users ("id", "email", "password_hash", "name", "role", "avatar", "bio", "social_links", "last_login", "last_logout", "is_blocked", "theme", "created_at", "updated_at", "is_approved", "is_online") VALUES
  (57, 'hassan.zubair0192@gmail.com', '$2b$10$Qjo3dhdEvgtJ233AfXNKt.xceFmmhqjAokATTg1qC/JoMdTGTy6EG', 'Hassan Zubair', 'member', NULL, NULL, NULL, '2026-04-29T09:12:26.827+00:00', '2026-04-29T09:12:24.025+00:00', FALSE, 'light', '2026-04-17T08:17:50.949648+00:00', '2026-04-17T08:17:50.949648+00:00', TRUE, FALSE),
  (59, 'muhammadusama11786@gmail.com', '$2b$10$CiWh4CeiuBIcWoHf3DhYVubc11m1n4ryyLO.UJnwDgpKlTbj.cSIy', 'Muhammad Usama', 'member', NULL, NULL, NULL, '2026-04-17T08:20:02.141+00:00', NULL, FALSE, 'light', '2026-04-17T08:20:02.100768+00:00', '2026-04-17T08:20:02.100768+00:00', TRUE, FALSE),
  (91, 'muhammaddilawarhussain92@gmail.com', '$2b$10$XUoxS/yHRKV3ElatUa7h2.rGhz7ppHNjCmYwE1nRV94oSEOdQw1rC', 'Muhammad Ahmed', 'member', NULL, NULL, NULL, '2026-04-24T18:24:24.562+00:00', NULL, FALSE, 'light', '2026-04-17T16:16:22.749631+00:00', '2026-04-17T16:16:22.749631+00:00', TRUE, FALSE),
  (95, 'engrahmedddali@gmail.com', '$2b$10$TKb5KhoxZvbpWyWyMD.9cOxJP4N/cMtN42KxFkKM9r411prQSzSLW', 'Ahmed Ali', 'member', NULL, NULL, NULL, '2026-04-17T16:50:25.572+00:00', NULL, FALSE, 'light', '2026-04-17T16:50:13.246309+00:00', '2026-04-17T16:50:13.246309+00:00', TRUE, FALSE),
  (58, 'ayeshahabib0159@gmail.com', '$2b$10$rZTSFjZIxILEMVfkRSe9muEWfvADtDQ74tN38QrUp1IGdTPYDUOp.', 'Ayesha Habib', 'member', NULL, NULL, NULL, '2026-04-23T08:18:20.013+00:00', NULL, FALSE, 'light', '2026-04-17T08:18:11.513761+00:00', '2026-04-17T08:18:11.513761+00:00', TRUE, FALSE),
  (97, 'zohaibuddinsoomro@gmail.com', '$2b$10$AayDcg2QkP9Ufszsseitw.DDFZgnqtZUl8fCM1GchDDSp0M8zuDQ2', 'Zohaib', 'member', NULL, NULL, NULL, '2026-04-18T10:01:40.054+00:00', NULL, FALSE, 'dark', '2026-04-17T17:29:35.041094+00:00', '2026-04-17T17:29:35.041094+00:00', TRUE, FALSE),
  (55, 'numanalin8n@gmail.com', '$2b$10$oraTPPlAsr0fwL6j7P2XNuIsNUr/SxoAmZRfj3L5RqeFEDP05QDpS', 'Numan Ali', 'member', NULL, NULL, NULL, '2026-04-17T07:48:29.255+00:00', NULL, FALSE, 'light', '2026-04-17T07:48:29.205209+00:00', '2026-04-17T07:48:29.205209+00:00', TRUE, FALSE),
  (166, 'engr.sulemanbhatti@gmail.com', '$2b$10$1r1HdPAmFKRC/gTfWFhS6u9zw7L935z9hvmRVn3l7h1MQvjQ4UiaG', 'Muhammad Suleman Yasin', 'member', NULL, NULL, NULL, '2026-04-27T05:44:38.176+00:00', NULL, FALSE, 'light', '2026-04-19T10:57:41.479393+00:00', '2026-04-19T10:57:41.479393+00:00', TRUE, FALSE),
  (66, 'zeeshanabid1920@gmail.com', '$2b$10$gbr3dA/LHpa1zoq13bnVw.0pUeHEe8jpV4WBJMFVrahhXEWdqXiYu', 'Zeeshan Kanjo', 'member', NULL, NULL, NULL, '2026-04-17T08:41:38.688+00:00', NULL, FALSE, 'light', '2026-04-17T08:41:24.666803+00:00', '2026-04-17T08:41:24.666803+00:00', TRUE, FALSE),
  (67, 'abdulmoizbaig50@gmail.com', '$2b$10$j1njj8uwe9Qnn2sRiIvzn.RJ94pj2qrsk8oAQE.3d849Craw464Rm', 'Abdul Moiz Baig', 'member', NULL, NULL, NULL, '2026-04-17T08:45:00.431+00:00', NULL, FALSE, 'light', '2026-04-17T08:44:49.644994+00:00', '2026-04-17T08:44:49.644994+00:00', TRUE, FALSE),
  (69, 'mudassirakhtar96@gmail.com', '$2b$10$y0qVI8KOrRTTt2rcCVNbGOchh45geCRCf9YXiVFfBdF3pcZa5j5a.', 'Mudassir Akhtar', 'member', NULL, NULL, NULL, '2026-04-19T09:22:53.979+00:00', NULL, FALSE, 'light', '2026-04-17T09:03:25.366113+00:00', '2026-04-17T09:03:25.366113+00:00', TRUE, FALSE),
  (70, 'taharafique806@gmail.com', '$2b$10$GXnWrFnqYbLZ6K72sN9lfeP/2dy0D1Q6ceYLtT2uu.s5GYoIXIV3i', 'Taha Rafique', 'member', NULL, NULL, NULL, '2026-04-18T14:51:10.899+00:00', NULL, FALSE, 'light', '2026-04-17T09:07:46.672719+00:00', '2026-04-17T09:07:46.672719+00:00', TRUE, FALSE),
  (90, 'rohit.god44455@gmail.com', '$2b$10$Gi1meb2GeVNXcf5vA0RXiuQh4ees.gbUz6WYf6MJ/0Qd2AUYus9Lm', 'Rohit Dangol', 'member', NULL, NULL, NULL, '2026-04-17T16:09:11.969+00:00', NULL, FALSE, 'light', '2026-04-17T16:08:45.998863+00:00', '2026-04-17T16:08:45.998863+00:00', TRUE, FALSE),
  (72, 'mab552657@gmail.com', '$2b$10$Tn4V2WPjMPWHjL6g.ieqvO7O3urbm0tpTuJ9rVaySBIdi6L.vt8H2', 'Malik Abdullah', 'member', NULL, NULL, NULL, '2026-04-17T09:20:41.325+00:00', NULL, FALSE, 'light', '2026-04-17T09:20:41.229376+00:00', '2026-04-17T09:20:41.229376+00:00', TRUE, FALSE),
  (93, 'umansaeedamz@gmail.com', '$2b$10$aXpzjuzTDmvUtwfQ8bSIie5QW0CEgvwmvfXP/LiQstQZCEMqedTuq', 'Uman Saeed ', 'member', NULL, NULL, NULL, '2026-04-17T16:20:50.297+00:00', NULL, FALSE, 'light', '2026-04-17T16:20:50.252733+00:00', '2026-04-17T16:20:50.252733+00:00', TRUE, FALSE),
  (98, 'aymanweb125@gmail.com', '$2b$10$kfuh8epT3TuUJLJBLtdwgesiNYJh0ZYX38Y4r07qIY2zMeUqTtOyK', 'Ayman Samy', 'member', NULL, NULL, NULL, '2026-04-18T19:39:44.598+00:00', NULL, FALSE, 'light', '2026-04-17T18:02:47.433852+00:00', '2026-04-17T18:02:47.433852+00:00', TRUE, FALSE),
  (87, 'velu2k03@gmail.com', '$2b$10$3QU82tWxs4mQ7eaXe5KDouP9krFjhEbZfYN84eVNwjeg/NUWj67P2', 'VELU MURUGAN', 'member', NULL, NULL, NULL, '2026-04-17T15:22:06.981+00:00', NULL, FALSE, 'light', '2026-04-17T15:22:06.9271+00:00', '2026-04-17T15:22:06.9271+00:00', TRUE, FALSE),
  (65, 'basit1511031@gmail.com', '$2b$10$2YEEPvXQQ6SJ6ZrVpowr4.a/xs2FoO4Nul8CTjMFS179R602QZHfi', 'Abdul Basit', 'member', NULL, NULL, NULL, '2026-04-28T03:34:45.094+00:00', '2026-04-28T03:01:40.893+00:00', FALSE, 'light', '2026-04-17T08:32:03.778108+00:00', '2026-04-17T08:32:03.778108+00:00', TRUE, FALSE),
  (138, 'engr.mfaisal@gmail.com', '$2b$10$Xd09GN5l9wTRFdKrupTS7ua.daV0yUAIpveNMyYcCQMpoc.7SnKsG', 'Muhammad Faisal', 'member', NULL, NULL, NULL, '2026-04-18T18:32:48.695+00:00', NULL, FALSE, 'light', '2026-04-18T18:32:48.644359+00:00', '2026-04-18T18:32:48.644359+00:00', TRUE, FALSE),
  (74, 'usolution40@gmail.com', '$2b$10$kjP6YLCjRXixfjMUJ/s5VOhEATNL8RDgDES05VnHdumlEvjrQpv4G', 'Abdul', 'member', NULL, NULL, NULL, '2026-04-17T09:27:40.732+00:00', NULL, FALSE, 'light', '2026-04-17T09:27:29.628768+00:00', '2026-04-17T09:27:29.628768+00:00', TRUE, FALSE),
  (64, 'usmangfxart@gmail.com', '$2b$10$r4kz5MqRBFUnQggtRlpCFeBx3nSbqLONZgZm3aKUVKF.U7v6jXGyu', 'M. Usman', 'member', 'https://gbyjpnfnxtywxszxfgle.supabase.co/storage/v1/object/public/media/64/1776442391274-coz90cg4iun.jpg', NULL, '{"tiktok":null,"twitter":null,"facebook":null,"linkedin":null,"whatsapp":null,"instagram":null}', '2026-04-17T09:41:46.311+00:00', NULL, FALSE, 'dark', '2026-04-17T08:31:46.281492+00:00', '2026-04-17T08:31:46.281492+00:00', TRUE, FALSE),
  (132, 'automateabi@gmail.com', '$2b$10$de3OOJmYskbWDNEhFz491OL8V66WeWB3IJ9Zwv6SNIBfYSMGYNz/S', 'Muhammad Tabish Raza', 'member', NULL, NULL, NULL, '2026-04-18T14:55:32.836+00:00', NULL, FALSE, 'light', '2026-04-18T14:55:32.746584+00:00', '2026-04-18T14:55:32.746584+00:00', TRUE, FALSE),
  (73, 'jonathana0412@gmail.com', '$2b$10$zrhCBAu41R.giX0dUhHoXupkrSW.L2FNvVgdoBM6PUiYu4gnRPfyC', 'JONATHAN ALINO', 'member', NULL, NULL, NULL, '2026-04-17T23:23:02.821+00:00', '2026-04-17T12:32:04.059+00:00', FALSE, 'light', '2026-04-17T09:20:41.688779+00:00', '2026-04-17T09:20:41.688779+00:00', TRUE, FALSE),
  (92, 'muhammadahtsham0786@gmail.com', '$2b$10$7XYpo3tw5hdMT5G4TGyQgOPKMqJQhSdqvbKbFcl.KXJROjztMtUQC', 'M Ahtsham Akram', 'member', NULL, NULL, NULL, '2026-04-17T16:52:41.532+00:00', NULL, FALSE, 'light', '2026-04-17T16:16:48.080587+00:00', '2026-04-17T16:16:48.080587+00:00', TRUE, FALSE),
  (234, 'flowerbean74@gmail.com', '$2b$10$bD1W78HfNmI44SpQSFmNHel05C0dTYf3RaXGE/05cD.ao9kuwdBYi', 'Rida hassan', 'member', NULL, NULL, NULL, '2026-04-27T12:27:12.581+00:00', NULL, FALSE, 'light', '2026-04-21T09:19:35.244888+00:00', '2026-04-21T09:19:35.244888+00:00', TRUE, FALSE),
  (103, 'afshanmursaleende@gmail.com', '$2b$10$UhEASZBREzUinkX3ZiQI..9rWjwSvz68ZDjoix8zkgCvw8YK/GeN6', 'Afshan Mursaleen', 'member', NULL, NULL, NULL, '2026-04-17T19:53:46.336+00:00', NULL, FALSE, 'light', '2026-04-17T19:53:37.610557+00:00', '2026-04-17T19:53:37.610557+00:00', TRUE, FALSE),
  (151, 'onlinemail8890@gmail.com', '$2b$10$t8KGc4rx5k0i0NGCSleiFeW9LX0x6OXJRziUk.2FIwqtHrvvqhwYe', 'Anupam Das', 'member', NULL, NULL, NULL, '2026-04-19T02:35:58.648+00:00', NULL, FALSE, 'light', '2026-04-19T02:35:58.593549+00:00', '2026-04-19T02:35:58.593549+00:00', TRUE, FALSE),
  (156, 'muhammadahmed9043@gmail.com', '$2b$10$oyMd0jCVxOd6L9c62lQzoOTfWrI6pAvefE8i3HaNeaL1QLUr9Vmz.', 'Muhammad Ahmed', 'member', NULL, NULL, NULL, '2026-04-19T04:51:10.083+00:00', NULL, FALSE, 'light', '2026-04-19T04:50:55.908667+00:00', '2026-04-19T04:50:55.908667+00:00', TRUE, FALSE),
  (84, 'fayazahmedbhayo2.8@gmail.com', '$2b$10$Bi0VlNk3e3tpjTquHYOAT.OTg11wkbfsfImY2rB4Ty2Er3JPqgxdK', 'Fayaz Ahmed', 'member', NULL, NULL, NULL, '2026-04-19T14:23:25.52+00:00', NULL, FALSE, 'light', '2026-04-17T13:36:42.808382+00:00', '2026-04-17T13:36:42.808382+00:00', TRUE, FALSE),
  (28, 'Mr.Numan0786@gmail.com', '$2b$10$AxHXsBOX7P6Z8LNwfoybJuXKrna8MZ1vYqNoNzqisGRQN7cVsq1Si', 'Agent Numan', 'admin', 'https://gbyjpnfnxtywxszxfgle.supabase.co/storage/v1/object/public/media/28/1776409016897-qgbfevom2go.jpg', NULL, '{"tiktok":null,"twitter":null,"facebook":null,"linkedin":null,"whatsapp":null,"instagram":null}', '2026-04-19T06:56:25.127+00:00', '2026-04-17T06:21:14.842+00:00', FALSE, 'dark', '2026-04-17T04:03:21.044651+00:00', '2026-04-17T04:03:21.044651+00:00', TRUE, FALSE),
  (71, 'mariumiq1982@gmail.com', '$2b$10$oGjVIXb//N7pPPaDeho1MeObT.vBybL1JJ6XoTatgtzAC83Im/XEW', 'marium iqbal', 'member', NULL, NULL, NULL, '2026-04-20T05:07:07.563+00:00', '2026-04-17T17:00:13.618+00:00', FALSE, 'light', '2026-04-17T09:08:56.188381+00:00', '2026-04-17T09:08:56.188381+00:00', TRUE, FALSE),
  (101, 'chfaisalnawaz702@gmail.com', '$2b$10$57gKvL/zHMUGHVP5CUBjDeIvuDmzfUCsy0SDbYjZMLdezIvSBefPy', 'Faisal Nawaz', 'member', NULL, NULL, NULL, '2026-04-29T07:43:34.413+00:00', NULL, FALSE, 'light', '2026-04-17T19:10:25.47598+00:00', '2026-04-17T19:10:25.47598+00:00', TRUE, FALSE),
  (214, 'mali295@gmail.com', '$2b$10$vazHQsBM1M6Xj0lFSWxFUuJrP5.BPavGOxServjNtAFcI37NpBzTW', 'Muhammad Ali', 'member', NULL, NULL, NULL, '2026-04-21T08:40:30.57+00:00', '2026-04-21T08:40:25.174+00:00', FALSE, 'light', '2026-04-20T20:56:13.662328+00:00', '2026-04-20T20:56:13.662328+00:00', TRUE, FALSE),
  (210, 'muhammadalb881@gmail.com', '$2b$10$zYLQdDzNFK1zmg/3FZ86pOI.YbWDomW83WOROckfop.Gf6jsCJwcu', 'muhammad bilal', 'member', NULL, NULL, NULL, '2026-04-20T18:52:49.488+00:00', '2026-04-20T18:52:47.054+00:00', FALSE, 'light', '2026-04-20T18:52:12.528445+00:00', '2026-04-20T18:52:12.528445+00:00', TRUE, FALSE),
  (177, 'abdullahriaz2917@gmail.com', '$2b$10$401qWbp6FoaQos2hTiu7juWxUra9AJZ0bN1VAiVthEx1WCtXJW7ey', 'Muhammed Abdullah', 'member', NULL, NULL, NULL, '2026-04-21T07:05:43.847+00:00', NULL, FALSE, 'light', '2026-04-19T19:32:43.349642+00:00', '2026-04-19T19:32:43.349642+00:00', TRUE, FALSE),
  (113, 'saidelbacha97@gmail.com', '$2b$10$GIVH3srhp/Yc8DCSZhrYzOaKGie9oB5uY/Uihg386MpNfMekr1SLe', 'Said EL-BACHA', 'member', NULL, NULL, NULL, '2026-04-21T13:39:29.263+00:00', NULL, FALSE, 'light', '2026-04-18T02:03:59.354162+00:00', '2026-04-18T02:03:59.354162+00:00', TRUE, FALSE),
  (89, 'mohammadshoaibmastoi@gmail.com', '$2b$10$OiaxmpHnbs/pg1N8g4OYLutASa8xBZ4OKW8mbs67DJ.RQANHzjuKS', 'Shoaib Mastoi', 'member', 'https://gbyjpnfnxtywxszxfgle.supabase.co/storage/v1/object/public/media/89/1776442869852-pbdyrug50mk.jpg', NULL, '{"tiktok":null,"twitter":null,"facebook":null,"linkedin":"https://www.linkedin.com/in/shoaib-mastoi-791067343?trk=contact-info","whatsapp":"https://wa.me/qr/NM6EY6FJQOIQD1","instagram":null}', '2026-04-22T12:29:56.15+00:00', '2026-04-17T16:08:01.954+00:00', FALSE, 'light', '2026-04-17T16:07:53.261159+00:00', '2026-04-17T16:07:53.261159+00:00', TRUE, FALSE),
  (332, 'mrkhalifahacker@gmail.com', '$2b$10$gE/o2kN5ebnc56XiR2b4DeIe4DexLb5CGUYv57/uSNHESU3Baw.ve', 'HASNAD AZHAR YT AUTOMATION ', 'member', 'https://gbyjpnfnxtywxszxfgle.supabase.co/storage/v1/object/public/media/332/1777177415621-ixqf2lkfqs.jpg', 'Assalamualaikum guys!
Mera naam Hasnad Ahmad hai, aur main ek passionate content creator aur YouTube automation expert hoon.

Main aap logon ke liye YouTube growth, online earning aur digital skills se related valuable content laata hoon, taake aap bhi online success achieve kar sako.', '{"tiktok":null,"twitter":null,"facebook":null,"linkedin":null,"whatsapp":null,"instagram":null}', '2026-04-24T07:41:23.92+00:00', NULL, FALSE, 'light', '2026-04-24T07:41:16.443075+00:00', '2026-04-24T07:41:16.443075+00:00', TRUE, FALSE),
  (379, 'mabdullahhybrid@gmail.com', '$2b$10$DUAnRbvnyOVBE2tLtZ8bjeyL20j71sGFIw3DfhQ4yFJ9ybQZq8uDa', 'Muhammad Abdullah', 'member', NULL, NULL, NULL, '2026-04-26T21:06:49.116+00:00', '2026-04-25T19:05:23.211+00:00', FALSE, 'light', '2026-04-25T19:02:17.009111+00:00', '2026-04-25T19:02:17.009111+00:00', TRUE, FALSE),
  (380, 'abdullah.weudo@gmail.com', '$2b$10$9YWggNelxf/Aibi3wpBNKO37zizbiU1ocPPfReXDp9oAMCvmch/xa', 'Muhammed Abdullah', 'member', NULL, NULL, NULL, '2026-04-25T19:04:09.287+00:00', NULL, TRUE, 'light', '2026-04-25T19:04:09.234058+00:00', '2026-04-25T19:04:09.234058+00:00', FALSE, FALSE);
SELECT setval(pg_get_serial_sequence('users', 'id'), COALESCE((SELECT MAX(id) FROM users), 1));

-- ─────────────────────────────────────
-- courses (1 rows)
-- ─────────────────────────────────────
INSERT INTO courses ("id", "title", "description", "thumbnail", "external_url", "visibility", "created_by", "created_at", "updated_at", "enrollment_mode") VALUES
  (32, '🚀 Learn How to Make AI Tools Using Vibe Coding', '🔥 Want to build your own AI tools from scratch — without getting stuck in boring theory? This journey takes you from beginner to advanced level using a modern, creative approach called Vibe Coding 💻✨ 🎯 What You’ll Learn: 👉 Basics of AI tools & how they actually work 🤖 👉 No-code & low-code methods to build tools fast ⚡ 👉 Using APIs (like OpenAI, automation tools, SaaS integrations) 🔗 👉 Creating real-world AI apps (chatbots, generators, automation tools) 🛠️ 👉 Frontend + backend integration for full-stack AI tools 🌐 👉 Monetization strategies (SaaS, subscriptions, automation services) 💸', 'https://gbyjpnfnxtywxszxfgle.supabase.co/storage/v1/object/public/media/28/1776413167934-nxsioglc6qp.png', NULL, 'public', 28, '2026-04-17T08:06:09.131104+00:00', '2026-04-17T08:06:09.131104+00:00', 'approval_required');
SELECT setval(pg_get_serial_sequence('courses', 'id'), COALESCE((SELECT MAX(id) FROM courses), 1));

-- ─────────────────────────────────────
-- lessons (12 rows)
-- ─────────────────────────────────────
INSERT INTO lessons ("id", "course_id", "title", "description", "video_url", "content", "order", "created_at", "is_public") VALUES
  (76, 32, 'Building the Site in Firebase', NULL, 'https://drive.google.com/file/d/1y-2Gb4PHkm0iAZzgyXwJnCI7THdSZ_Ep/view', NULL, 3, '2026-04-17T08:07:14.038853+00:00', TRUE),
  (77, 32, 'Intro Motion Design in web', NULL, 'https://drive.google.com/file/d/1gRToFKw8-ogTgwbfsZf3QF9gyQvWOlTM/view?usp=drive_link', NULL, 4, '2026-04-17T08:07:45.36791+00:00', TRUE),
  (78, 32, 'Scroll-Based Motion', NULL, 'https://drive.google.com/file/d/14AR5K-yQM7ThUpaQ1yIR5Iv43syepcvz/view?usp=drive_link', NULL, 5, '2026-04-17T08:07:59.776657+00:00', TRUE),
  (79, 32, 'Micro-Interactions', NULL, 'https://drive.google.com/file/d/1hy33cO10-sk7S5uimDoPMIdyiTAxONDW/view', NULL, 6, '2026-04-17T08:08:14.754746+00:00', TRUE),
  (74, 32, 'Understood Vibe Coding', NULL, 'https://drive.google.com/file/d/1llR352H8SkpW2zu44LJ3qw5sSCVD6QYG/view?usp=drivesdk', NULL, 1, '2026-04-17T08:06:26.35349+00:00', TRUE),
  (81, 32, 'Final Check', NULL, 'https://drive.google.com/file/d/1D1R9ukLk2pHPtFhVYW4FeAZoNrAUBNM1/view', NULL, 8, '2026-04-18T03:28:00.262441+00:00', TRUE),
  (80, 32, 'Optimize Smooth Playback', NULL, 'https://drive.google.com/file/d/19U7IiiGxKD3GkXo1WQu-zOkmaGAnx7YM/view', NULL, 7, '2026-04-18T03:26:46.227142+00:00', TRUE),
  (75, 32, 'One Prompt Web” Formula', NULL, 'https://drive.google.com/file/d/1YvbBgkq-q6nE6MG6-5eJ6P2C3BTw9RpZ/view?usp=drivesdk', '<p>ANDYNOCODE Marketing Agency Website Structure and Branding Guidelines</p><p>1. Page Structure</p><p>ANDYNOCODE Marketing Agency</p><p>├── HEADER</p><p>├── HERO</p><p>├── ABOUT</p><p>├── SERVICES</p><p>├── CTA</p><p>└── FOOTER</p><p>2. Branding Guidelines</p><p>1. Visual Identity ("Titanium &amp; Glass")</p><p>• Typography: Use Inter or SF Pro Display. Headlines should be massive (60px+) and tight. Body text should be small but high-contrast.</p><p>• Color Palette: Deep "Space Gray" background (#0d0d0d), Text is "Off-White" (#f5f5f7). Accents are subtle "Titanium Blue" gradients, not bright neon.</p><p>• Shapes: Everything uses "Squircle" (super-ellipse) corners (30px radius).</p><p>• Materials: Extensive use of backdrop-filter: blur(20px) (frosted glass) with very thin, subtle white borders (1px, 10% opacity).</p><p>2. Motion ("Fluid Physics")</p><p>• No jerky movements. Use distinct ease-out curves (cubic-bezier).</p><p>• Parallax: As I scroll, the text should slide over the images.</p><p>• Scrollytelling: Elements shouldn''t just appear; they should bloom or fade in upwards as if they are heavy.</p><p>3. Mobile &amp; Quality</p><p>• Responsiveness: On mobile, the experience must feel like a native app. Full-width images, large touch areas.</p><p>• Imagery: Images should be the "Hero." Give them massive scale, often edge-to-edge.</p><p>3. Content Instructions</p><p>1. HEADER (Navigation)</p><p>Content Inputs</p><p>• Logo Text: `ANDYNOCODE`</p><p>• Navigation Links: `Home`, `About`, `Services`, `Contact`</p><p>• Mobile Menu: Hamburger icon (auto)</p><p>Content Elements</p><p>• Navigation bar shape: Pill / Dynamic Island style</p><p>• Link style: Uppercase, 14px, tight letter spacing</p><p>• Logo placement: Left-aligned</p><p>Background</p><p>• Frosted glass (backdrop-filter: blur 20px)</p><p>• Semi-transparent (5–10% opacity white)</p><p>Extra Elements</p><p>• Subtle drop shadow (soft, diffused)</p><p>• Stays centered at the top (floating)</p><p>Style References</p><p>• <a target="_blank" rel="noopener noreferrer" class="text-primary underline cursor-pointer" href="http://Apple.com">Apple.com</a> nav bar transparency</p><p>• iOS Control Center glass effect</p><p>• Dynamic Island shape language</p><p>2. HERO SECTION</p><p>Content Inputs</p><p>• Headline (H1): “Your SEO Growth Engine.”</p><p>• Subtitle: One sentence about how ANDYNOCODE helps clients grow.</p><p>• Primary CTA: e.g., “Get Free Audit”</p><p>• Optional Image/Graphic: None required (background handles visuals)</p><p>Content Elements</p><p>• CTA is a glass button (no pulse animation)</p><p>• Subtitle fades in 0.5s after the headline</p><p>Background</p><p>• Slow-moving 3D abstract mesh OR fluid light ribbons</p><p>• Dark void base (#0d0d0d)</p><p>• Extremely subtle motion</p><p>Extra Elements</p><p>• Light vignette around edges</p><p>• Very large H1 (60–80px)</p><p>Style References</p><p>• Apple TV screensaver light ribbons</p><p>• macOS Sonoma dynamic wallpaper</p><p>• “Fluid physics” motions with ease-outs</p><p>3. ABOUT SECTION</p><p>Content Inputs</p><p>- Section Title (H2): e.g., “Who We Are”</p><p>- Stats (3×):</p><p>  - Metric 1: “+230% Average SEO Lift”</p><p>  - Metric 2: “120+ Campaigns Delivered”</p><p>  - Metric 3: “8 Years Experience”</p><p>- Bio Text: 2–3 sentences about ANDYNOCODE</p><p>- Profile Image: Black &amp; white portrait</p><p>Content Elements</p><p>- Bento Grid layout:</p><p>  - Left: 3 small square stat cards</p><p>  - Right: one tall portrait card + bio</p><p>Background</p><p>- Deep space gray (#0d0d0d)</p><p>- Cards slightly lighter (#1a1a1c)</p><p>Extra Elements</p><p>- Portrait image has inner shadow (no borders)</p><p>- Stats use large, bold numbers</p><p>Style References</p><p>- Apple Bento-style components (Settings app sections)</p><p>- macOS Finder “squircle” shape system</p><p>---</p><p>4. SERVICES SECTION</p><p>Content Inputs</p><p>- Section Title (H2): e.g., “What We Do”</p><p>- Three Services:</p><p>  - Service 1 Title: “SEO Analytics”</p><p>  - Service 2 Title: “Campaign Automation”</p><p>  - Service 3 Title: “ROI Performance”</p><p>- Each service needs 1–2 sentences describing value.</p><p>Content Elements</p><p>- 3 equal-height tall cards</p><p>- Each card includes:</p><p>  - Thin-line icon (minimal, abstract)</p><p>  - Title</p><p>  - Description</p><p>Background</p><p>- Cards: #1c1c1e dark mode</p><p>- Page background: #0d0d0d</p><p>Extra Elements</p><p>- Hover effect: text lights up from grey → white</p><p>- No movement / lift</p><p>- Icons are not generic; more like SF Symbols</p><p>Style References</p><p>- iOS Settings section card design</p><p>- Apple’s thin-line iconography</p><p>---</p><p>5. CTA SECTION</p><p>Content Inputs</p><p>- Headline (H2): “Ready to 10x?”</p><p>- Supporting Copy: 1–2 lines explaining the offer</p><p>- Primary CTA Button: e.g., “Book Strategy Call”</p><p>- Secondary CTA Button: e.g., “View Case Studies”</p><p>Content Elements</p><p>- Two pill-shaped buttons</p><p>  - Primary: White text on Black</p><p>  - Secondary: Glass-style with border</p><p>Background</p><p>- Subtle centered deep blue spotlight gradient</p><p>  (barely visible)</p><p>Extra Elements</p><p>- Slight upward fade-in</p><p>- Large spacing around the section</p><p>Style References</p><p>- Apple Homepage: call-to-action spacing</p><p>- Subtle radial lights (Apple Vision Pro landing page)</p><p>---</p><p>6. FOOTER</p><p>Content Inputs</p><p>- Company Name: `ANDYNOCODE`</p><p>- Contact Email: student chooses</p><p>- Social Icons: Instagram, LinkedIn, X, YouTube</p><p>- Copyright: “© 2025 ANDYNOCODE. All Rights Reserved.”</p><p>Content Elements</p><p>- Icons monochrome &amp; tiny</p><p>- Text opacity: 50%</p><p>Background</p><p>- Solid black</p><p>- No gradients, no glass</p><p>Extra Elements</p><p>- Tight spacing, very minimal</p><p>- Icons on one row, small gaps</p><p>Style References</p><p>- <a target="_blank" rel="noopener noreferrer" class="text-primary underline cursor-pointer" href="http://Apple.com">Apple.com</a> minimal footers</p><p>- Clean legal text sections</p><p>---</p><p></p>', 2, '2026-04-17T08:06:45.203902+00:00', TRUE),
  (83, 32, 'Cinematic Transitions', NULL, 'https://drive.google.com/file/d/1we_fGiwJ0YYEYBlLMbL4SPn2nI5MNhZJ/view', NULL, 9, '2026-04-20T05:16:12.219589+00:00', TRUE),
  (84, 32, 'AI Video Integration', NULL, 'https://drive.google.com/file/d/1u7TJtDRInFIxvLDEdlZTwcZRwLJYV_ge/view?usp=sharing', NULL, 10, '2026-04-20T05:16:33.085493+00:00', TRUE),
  (87, 32, 'Add CMS Text Updates', NULL, 'https://drive.google.com/file/d/1Rdm6-nnuoC2OkG1e2aQW30GQPPUtiya2/view', NULL, 12, '2026-04-21T05:03:23.330134+00:00', TRUE),
  (86, 32, 'Adding Contact Forms', NULL, 'https://drive.google.com/file/d/1UfU1YKlFXsRoYm1NuBDyUXzo2Tvc6Cj1/view?usp=sharing', NULL, 11, '2026-04-21T05:02:36.822695+00:00', TRUE);
SELECT setval(pg_get_serial_sequence('lessons', 'id'), COALESCE((SELECT MAX(id) FROM lessons), 1));

-- ─────────────────────────────────────
-- enrollments (35 rows)
-- ─────────────────────────────────────
INSERT INTO enrollments ("id", "user_id", "course_id", "progress", "created_at", "is_approved") VALUES
  (38, 156, 32, 0, '2026-04-19T08:01:59.125629+00:00', TRUE),
  (43, 234, 32, 0, '2026-04-21T16:40:55.71505+00:00', TRUE),
  (15, 57, 32, 100, '2026-04-17T15:39:56.481473+00:00', TRUE),
  (18, 64, 32, 100, '2026-04-17T16:12:07.723045+00:00', TRUE),
  (33, 69, 32, 25, '2026-04-18T07:19:28.076748+00:00', TRUE),
  (39, 177, 32, 0, '2026-04-20T04:32:40.735457+00:00', TRUE),
  (12, 55, 32, 0, '2026-04-17T08:09:19.721412+00:00', TRUE),
  (13, 59, 32, 0, '2026-04-17T09:12:03.972651+00:00', TRUE),
  (37, 151, 32, 50, '2026-04-19T02:44:11.804088+00:00', TRUE),
  (30, 73, 32, 100, '2026-04-17T23:52:58.016047+00:00', TRUE),
  (36, 101, 32, 100, '2026-04-18T17:19:41.982674+00:00', TRUE),
  (21, 92, 32, 0, '2026-04-17T16:30:18.696394+00:00', TRUE),
  (17, 87, 32, 100, '2026-04-17T16:10:25.570911+00:00', TRUE),
  (24, 71, 32, 10, '2026-04-17T16:52:57.7797+00:00', TRUE),
  (26, 84, 32, 0, '2026-04-17T17:38:54.692203+00:00', TRUE),
  (32, 72, 32, 0, '2026-04-18T06:50:16.65753+00:00', TRUE),
  (19, 74, 32, 67, '2026-04-17T16:15:18.29916+00:00', TRUE),
  (27, 93, 32, 0, '2026-04-17T18:01:18.412468+00:00', TRUE),
  (23, 91, 32, 33, '2026-04-17T16:48:12.258272+00:00', TRUE),
  (35, 132, 32, 88, '2026-04-18T14:59:21.527968+00:00', TRUE),
  (14, 58, 32, 100, '2026-04-17T10:04:23.151198+00:00', TRUE),
  (16, 90, 32, 100, '2026-04-17T16:09:20.809191+00:00', TRUE),
  (44, 89, 32, 100, '2026-04-22T12:30:37.205249+00:00', TRUE),
  (34, 70, 32, 63, '2026-04-18T10:08:05.150088+00:00', TRUE),
  (45, 67, 32, 0, '2026-04-25T18:23:52.092324+00:00', TRUE),
  (28, 98, 32, 50, '2026-04-17T18:09:17.756736+00:00', TRUE),
  (25, 97, 32, 100, '2026-04-17T17:32:44.25011+00:00', TRUE),
  (47, 379, 32, 0, '2026-04-26T21:06:59.775687+00:00', TRUE),
  (31, 113, 32, 8, '2026-04-18T03:31:48.567333+00:00', TRUE),
  (41, 214, 32, 0, '2026-04-21T08:07:57.139907+00:00', TRUE),
  (42, 95, 32, 0, '2026-04-21T11:58:36.332597+00:00', TRUE),
  (29, 103, 32, 100, '2026-04-17T21:23:41.41617+00:00', TRUE),
  (46, 332, 32, 58, '2026-04-26T04:21:55.09446+00:00', TRUE),
  (20, 65, 32, 8, '2026-04-17T16:18:44.915934+00:00', TRUE),
  (40, 166, 32, 100, '2026-04-20T05:08:32.781325+00:00', TRUE);
SELECT setval(pg_get_serial_sequence('enrollments', 'id'), COALESCE((SELECT MAX(id) FROM enrollments), 1));

-- ─────────────────────────────────────
-- lesson_completions (170 rows)
-- ─────────────────────────────────────
INSERT INTO lesson_completions ("id", "user_id", "lesson_id", "created_at") VALUES
  (1, 57, 76, '2026-04-17T16:42:22.504884+00:00'),
  (2, 57, 77, '2026-04-17T16:42:25.171619+00:00'),
  (3, 57, 78, '2026-04-17T16:42:33.762426+00:00'),
  (4, 57, 79, '2026-04-17T16:43:01.600524+00:00'),
  (5, 90, 74, '2026-04-17T17:10:06.16207+00:00'),
  (6, 97, 74, '2026-04-17T17:33:26.265785+00:00'),
  (7, 97, 75, '2026-04-17T17:33:28.491851+00:00'),
  (8, 97, 76, '2026-04-17T17:33:30.279986+00:00'),
  (9, 97, 77, '2026-04-17T17:33:31.385109+00:00'),
  (10, 97, 78, '2026-04-17T17:33:32.915299+00:00'),
  (11, 97, 79, '2026-04-17T17:33:34.683246+00:00'),
  (12, 74, 74, '2026-04-17T17:41:26.090409+00:00'),
  (13, 74, 75, '2026-04-17T17:41:33.259588+00:00'),
  (14, 74, 76, '2026-04-17T17:41:39.147073+00:00'),
  (15, 74, 77, '2026-04-17T17:41:42.163415+00:00'),
  (16, 58, 74, '2026-04-17T18:20:32.836437+00:00'),
  (17, 58, 75, '2026-04-17T18:20:36.324377+00:00'),
  (18, 103, 74, '2026-04-17T21:25:06.508139+00:00'),
  (19, 103, 75, '2026-04-17T21:25:08.427583+00:00'),
  (20, 103, 76, '2026-04-17T21:25:10.52152+00:00'),
  (21, 103, 77, '2026-04-17T21:25:12.780552+00:00'),
  (22, 103, 78, '2026-04-17T21:25:37.740218+00:00'),
  (23, 103, 79, '2026-04-17T21:25:57.862327+00:00'),
  (24, 64, 74, '2026-04-18T04:11:10.250236+00:00'),
  (25, 64, 75, '2026-04-18T04:11:16.86403+00:00'),
  (26, 64, 76, '2026-04-18T04:11:23.822852+00:00'),
  (27, 64, 77, '2026-04-18T04:11:26.136422+00:00'),
  (28, 64, 78, '2026-04-18T04:11:31.328525+00:00'),
  (29, 64, 79, '2026-04-18T04:11:35.061836+00:00'),
  (31, 64, 80, '2026-04-18T04:20:10.166962+00:00'),
  (33, 57, 74, '2026-04-18T04:42:07.631003+00:00'),
  (34, 57, 75, '2026-04-18T04:42:22.32885+00:00'),
  (35, 57, 80, '2026-04-18T04:46:25.665131+00:00'),
  (36, 57, 81, '2026-04-18T04:48:44.698722+00:00'),
  (37, 97, 80, '2026-04-18T10:03:22.821317+00:00'),
  (38, 97, 81, '2026-04-18T10:06:48.762618+00:00'),
  (39, 73, 74, '2026-04-18T12:46:46.046698+00:00'),
  (40, 73, 75, '2026-04-18T14:23:48.036081+00:00'),
  (41, 73, 76, '2026-04-18T14:24:33.492088+00:00'),
  (42, 73, 77, '2026-04-18T14:24:36.994263+00:00'),
  (43, 64, 81, '2026-04-18T14:43:32.889727+00:00'),
  (44, 132, 74, '2026-04-18T15:02:43.543559+00:00'),
  (45, 132, 75, '2026-04-18T15:04:24.148984+00:00'),
  (46, 132, 76, '2026-04-18T15:06:28.834805+00:00'),
  (47, 132, 77, '2026-04-18T15:07:15.602242+00:00'),
  (48, 132, 78, '2026-04-18T15:08:20.37388+00:00'),
  (49, 132, 80, '2026-04-18T15:10:08.25352+00:00'),
  (50, 132, 81, '2026-04-18T15:11:08.937508+00:00'),
  (51, 90, 75, '2026-04-18T16:02:23.947715+00:00'),
  (52, 90, 76, '2026-04-18T16:02:30.30275+00:00'),
  (53, 90, 77, '2026-04-18T16:02:32.000856+00:00'),
  (54, 90, 78, '2026-04-18T16:02:33.933797+00:00'),
  (55, 90, 79, '2026-04-18T16:02:35.695491+00:00'),
  (56, 90, 80, '2026-04-18T16:05:13.392195+00:00'),
  (57, 90, 81, '2026-04-18T16:05:15.505342+00:00'),
  (58, 70, 74, '2026-04-18T18:47:34.597538+00:00'),
  (59, 70, 75, '2026-04-18T19:06:45.432095+00:00'),
  (60, 70, 76, '2026-04-18T19:19:45.651548+00:00'),
  (61, 70, 77, '2026-04-18T19:23:45.550146+00:00'),
  (62, 70, 78, '2026-04-18T19:37:24.76552+00:00'),
  (63, 98, 74, '2026-04-18T19:40:07.795357+00:00'),
  (64, 98, 75, '2026-04-18T19:40:14.653068+00:00'),
  (65, 98, 76, '2026-04-18T19:40:21.066934+00:00'),
  (66, 98, 77, '2026-04-18T19:40:25.762578+00:00'),
  (68, 151, 75, '2026-04-19T08:25:50.90168+00:00'),
  (69, 69, 74, '2026-04-19T09:59:58.079258+00:00'),
  (70, 69, 75, '2026-04-19T10:00:14.321491+00:00'),
  (72, 87, 75, '2026-04-20T05:14:22.471716+00:00'),
  (73, 87, 76, '2026-04-20T05:14:29.072407+00:00'),
  (74, 87, 77, '2026-04-20T05:14:31.204757+00:00'),
  (75, 87, 78, '2026-04-20T05:14:35.179485+00:00'),
  (76, 64, 83, '2026-04-20T05:44:27.825977+00:00'),
  (77, 57, 83, '2026-04-20T06:07:28.164118+00:00'),
  (78, 57, 84, '2026-04-20T06:09:58.517815+00:00'),
  (79, 97, 83, '2026-04-20T06:11:53.531841+00:00'),
  (80, 97, 84, '2026-04-20T06:14:49.398762+00:00'),
  (81, 64, 84, '2026-04-20T06:21:15.003576+00:00'),
  (82, 71, 74, '2026-04-20T06:26:39.28725+00:00'),
  (83, 166, 74, '2026-04-20T07:12:53.576931+00:00'),
  (84, 166, 75, '2026-04-20T07:13:12.505165+00:00'),
  (85, 166, 76, '2026-04-20T16:28:37.349105+00:00'),
  (86, 166, 77, '2026-04-20T16:52:04.571995+00:00'),
  (87, 166, 78, '2026-04-20T16:56:25.824032+00:00'),
  (88, 58, 76, '2026-04-20T18:15:42.560632+00:00'),
  (89, 58, 77, '2026-04-20T18:31:52.439243+00:00'),
  (91, 58, 78, '2026-04-20T18:35:19.032187+00:00'),
  (92, 103, 80, '2026-04-20T22:34:03.399019+00:00'),
  (93, 103, 81, '2026-04-21T00:12:36.694847+00:00'),
  (94, 103, 83, '2026-04-21T00:17:37.659949+00:00'),
  (95, 103, 84, '2026-04-21T00:19:49.132844+00:00'),
  (96, 73, 78, '2026-04-21T03:22:24.531937+00:00'),
  (97, 151, 74, '2026-04-21T03:28:05.61482+00:00'),
  (98, 73, 79, '2026-04-21T03:56:43.711157+00:00'),
  (99, 73, 80, '2026-04-21T03:57:20.722666+00:00'),
  (100, 73, 81, '2026-04-21T03:57:50.966171+00:00'),
  (101, 73, 83, '2026-04-21T03:58:06.612039+00:00'),
  (102, 73, 84, '2026-04-21T03:58:29.289473+00:00'),
  (103, 166, 79, '2026-04-21T07:06:21.311005+00:00'),
  (104, 166, 84, '2026-04-21T07:37:39.970764+00:00'),
  (105, 166, 80, '2026-04-21T07:37:55.683722+00:00'),
  (106, 166, 83, '2026-04-21T07:40:13.255781+00:00'),
  (107, 166, 81, '2026-04-21T07:41:01.836921+00:00'),
  (108, 97, 86, '2026-04-21T11:22:59.423427+00:00'),
  (109, 97, 87, '2026-04-21T11:24:04.19468+00:00'),
  (110, 87, 79, '2026-04-21T12:55:13.634683+00:00'),
  (111, 87, 80, '2026-04-21T12:59:28.055622+00:00'),
  (112, 113, 74, '2026-04-21T13:40:25.700399+00:00'),
  (113, 57, 86, '2026-04-22T01:34:02.789279+00:00'),
  (114, 57, 87, '2026-04-22T01:34:09.797521+00:00'),
  (115, 64, 86, '2026-04-22T04:23:05.790921+00:00'),
  (116, 64, 87, '2026-04-22T04:42:30.4438+00:00'),
  (117, 151, 76, '2026-04-22T12:19:47.408713+00:00'),
  (118, 151, 77, '2026-04-22T12:19:50.351457+00:00'),
  (119, 151, 78, '2026-04-22T12:19:53.537257+00:00'),
  (120, 151, 79, '2026-04-22T12:19:55.780016+00:00'),
  (121, 89, 74, '2026-04-22T15:14:21.97029+00:00'),
  (122, 89, 75, '2026-04-22T15:23:25.153206+00:00'),
  (123, 73, 86, '2026-04-23T05:36:49.553037+00:00'),
  (124, 73, 87, '2026-04-23T05:38:11.452214+00:00'),
  (125, 87, 74, '2026-04-23T06:08:25.440032+00:00'),
  (126, 87, 81, '2026-04-23T06:08:34.01924+00:00'),
  (127, 87, 83, '2026-04-23T06:08:36.661529+00:00'),
  (128, 166, 87, '2026-04-23T08:02:20.17735+00:00'),
  (130, 89, 76, '2026-04-23T19:21:59.92181+00:00'),
  (131, 89, 77, '2026-04-23T19:24:36.066846+00:00'),
  (132, 89, 78, '2026-04-23T19:29:47.257396+00:00'),
  (133, 89, 79, '2026-04-23T19:30:10.03989+00:00'),
  (134, 58, 87, '2026-04-24T15:47:56.466555+00:00'),
  (135, 91, 74, '2026-04-24T18:29:35.411772+00:00'),
  (136, 91, 75, '2026-04-24T18:29:45.062146+00:00'),
  (137, 91, 76, '2026-04-24T18:30:02.284784+00:00'),
  (138, 91, 77, '2026-04-24T18:30:06.37414+00:00'),
  (139, 58, 79, '2026-04-25T07:43:08.258421+00:00'),
  (140, 58, 80, '2026-04-25T07:43:11.512096+00:00'),
  (141, 58, 81, '2026-04-25T07:43:13.105556+00:00'),
  (142, 58, 83, '2026-04-25T07:43:18.478658+00:00'),
  (143, 58, 84, '2026-04-25T07:43:21.342669+00:00'),
  (144, 58, 86, '2026-04-25T07:43:23.899313+00:00'),
  (145, 89, 80, '2026-04-25T08:20:27.593089+00:00'),
  (146, 89, 81, '2026-04-25T08:20:30.259364+00:00'),
  (147, 89, 83, '2026-04-25T08:22:07.346468+00:00'),
  (148, 89, 84, '2026-04-25T08:22:09.909764+00:00'),
  (149, 89, 87, '2026-04-25T08:37:34.190546+00:00'),
  (150, 89, 86, '2026-04-25T08:47:07.382826+00:00'),
  (151, 103, 86, '2026-04-27T00:57:11.329928+00:00'),
  (153, 103, 87, '2026-04-27T01:11:52.119955+00:00'),
  (154, 332, 74, '2026-04-28T01:08:01.035642+00:00'),
  (155, 332, 75, '2026-04-28T01:14:46.228037+00:00'),
  (156, 332, 76, '2026-04-28T01:17:08.242711+00:00'),
  (157, 332, 77, '2026-04-28T01:17:17.018522+00:00'),
  (158, 332, 78, '2026-04-28T01:17:21.758952+00:00'),
  (159, 332, 79, '2026-04-28T01:17:24.018078+00:00'),
  (160, 332, 80, '2026-04-28T01:17:26.997044+00:00'),
  (161, 65, 74, '2026-04-28T03:38:52.591182+00:00'),
  (162, 166, 86, '2026-04-28T07:29:48.96634+00:00'),
  (163, 101, 74, '2026-04-29T07:44:33.463262+00:00'),
  (164, 101, 75, '2026-04-29T07:44:42.064279+00:00'),
  (165, 101, 76, '2026-04-29T07:44:50.65976+00:00'),
  (166, 101, 77, '2026-04-29T07:44:54.199212+00:00'),
  (167, 101, 78, '2026-04-29T07:44:57.365795+00:00'),
  (168, 101, 79, '2026-04-29T07:45:00.551758+00:00'),
  (169, 101, 80, '2026-04-29T07:45:03.030994+00:00'),
  (170, 101, 81, '2026-04-29T07:45:05.076844+00:00'),
  (171, 101, 83, '2026-04-29T07:45:07.12267+00:00'),
  (172, 101, 84, '2026-04-29T07:45:09.16742+00:00'),
  (173, 101, 86, '2026-04-29T07:45:11.07031+00:00'),
  (174, 101, 87, '2026-04-29T07:45:12.910033+00:00'),
  (175, 87, 84, '2026-04-29T18:39:52.643633+00:00'),
  (176, 87, 86, '2026-04-29T18:39:53.776848+00:00'),
  (177, 87, 87, '2026-04-29T18:39:54.82725+00:00');
SELECT setval(pg_get_serial_sequence('lesson_completions', 'id'), COALESCE((SELECT MAX(id) FROM lesson_completions), 1));

-- ─────────────────────────────────────
-- posts (4 rows)
-- ─────────────────────────────────────
INSERT INTO posts ("id", "user_id", "content", "image_url", "video_url", "is_vip", "created_at", "file_url", "file_type") VALUES
  (30, 28, 'Hi Everyone!

Wellcome in the AI Acadmy😍', NULL, NULL, FALSE, '2026-04-17T08:11:05.673355+00:00', NULL, NULL),
  (31, 28, '1- Click on link
2-Redeem offer
3-Use any sadapay in which you have no any ammount.
https://www.linkedin.com/premium/redeem/?upsellOrderOrigin=sn_referral_promotion&coupon=x9uWm7gyi&customKey=ref_s&redeemTypeV2=REFERRAL_COUPON', 'https://gbyjpnfnxtywxszxfgle.supabase.co/storage/v1/object/public/media/28/1776523921174-jilvdpxhex.png', NULL, TRUE, '2026-04-18T14:52:01.769234+00:00', NULL, NULL),
  (32, 28, 'Follow the below steps
1-Open the LInk
2-Select any Annual Plan & Past coupon code
3-Add payment Method

Coupon :joinsecret-annual-x9fd3j
https://app.prodcamp.com/settings/billing', 'https://gbyjpnfnxtywxszxfgle.supabase.co/storage/v1/object/public/media/28/1776661919219-jrztk6c6qyr.png', NULL, TRUE, '2026-04-20T05:11:59.783972+00:00', NULL, NULL),
  (33, 64, 'Prompts used today

Create smooth cinematic flow between sections:
Hero Page Load: Hero reveal like a movie opening - background first, then headline sweeps up gracefully, subheadline
follows elegantly, button arrives last with purpose
About to Features: About section softly fades as Features rise to meet it, like scenes dissolving into each other
Features to CTA: Features slide away gently left while CTA emerges confidently from the right
CTA to footer: CTA dims smoothly as Footer rises to close the story perfectly
Sections connect fluily like one continuous camera movement through the page.


Visual Focus: How Many Things Move

Limit motion so only a small handful of elements move at any given moment. Let 3–5 key pieces of content animate in while everything else stays calm and stable.
Use animation to highlight what matters most on the screen, not everything at once. Keep supporting elements still so the eye knows where to look.

Rhythm: Timing That Feels Natural

Make quick feedback animations, like button presses and hovers, feel almost instant, like a crisp tap.
Let bigger cinematic reveals, like sections entering, feel smooth and graceful instead of rushed or sluggish.

Medium: What Properties to Animate

When animating, focus on smooth movements and fades—move things and fade them in or out without changing their actual layout on the page.
Use motion that feels like sliding, lifting, or fading, handled efficiently by the browser so everything stays fluid.', NULL, NULL, FALSE, '2026-04-20T06:21:53.372255+00:00', NULL, NULL);
SELECT setval(pg_get_serial_sequence('posts', 'id'), COALESCE((SELECT MAX(id) FROM posts), 1));

-- ─────────────────────────────────────
-- comments (6 rows)
-- ─────────────────────────────────────
INSERT INTO comments ("id", "post_id", "user_id", "comment", "image_url", "video_url", "created_at", "file_url", "file_type", "parent_id") VALUES
  (7, 30, 92, 'Thanks alot', NULL, NULL, '2026-04-17T16:59:53.753916+00:00', NULL, NULL, NULL),
  (8, 30, 93, 'Thanks Sir', NULL, NULL, '2026-04-17T18:00:42.290585+00:00', NULL, NULL, NULL),
  (9, 30, 69, 'Thank u so much , you are great sir', NULL, NULL, '2026-04-18T07:21:07.689092+00:00', NULL, NULL, NULL),
  (10, 32, 156, 'Bin For it', NULL, NULL, '2026-04-20T05:42:33.235378+00:00', NULL, NULL, NULL),
  (11, 32, 28, 'Will be user real cared', NULL, NULL, '2026-04-20T05:52:55.943682+00:00', NULL, NULL, 10),
  (12, 32, 156, 'OK', NULL, NULL, '2026-04-20T07:08:42.338289+00:00', NULL, NULL, NULL);
SELECT setval(pg_get_serial_sequence('comments', 'id'), COALESCE((SELECT MAX(id) FROM comments), 1));

-- ─────────────────────────────────────
-- likes (23 rows)
-- ─────────────────────────────────────
INSERT INTO likes ("id", "post_id", "user_id", "created_at") VALUES
  (5, 30, 28, '2026-04-17T08:30:33.506065+00:00'),
  (6, 30, 87, '2026-04-17T16:10:46.648312+00:00'),
  (7, 30, 64, '2026-04-17T16:12:37.267806+00:00'),
  (8, 30, 92, '2026-04-17T16:59:43.280269+00:00'),
  (9, 30, 93, '2026-04-17T18:00:28.392822+00:00'),
  (10, 30, 57, '2026-04-18T05:43:08.282138+00:00'),
  (11, 30, 69, '2026-04-18T07:20:27.052992+00:00'),
  (12, 31, 90, '2026-04-18T16:15:19.333388+00:00'),
  (13, 30, 98, '2026-04-18T19:41:28.001161+00:00'),
  (14, 31, 67, '2026-04-18T20:10:57.2817+00:00'),
  (15, 31, 28, '2026-04-19T02:36:49.719996+00:00'),
  (16, 30, 156, '2026-04-19T08:04:17.305106+00:00'),
  (17, 33, 28, '2026-04-21T04:52:45.446527+00:00'),
  (18, 32, 28, '2026-04-21T04:52:57.811667+00:00'),
  (19, 33, 89, '2026-04-22T12:33:07.032585+00:00'),
  (20, 32, 69, '2026-04-22T14:29:17.008488+00:00'),
  (21, 30, 89, '2026-04-22T15:08:20.139272+00:00'),
  (22, 31, 57, '2026-04-23T05:35:44.903963+00:00'),
  (23, 32, 57, '2026-04-23T05:35:46.417655+00:00'),
  (24, 33, 57, '2026-04-23T05:36:25.088548+00:00'),
  (25, 30, 166, '2026-04-23T07:52:22.796154+00:00'),
  (26, 33, 67, '2026-04-25T18:24:12.981376+00:00'),
  (27, 30, 332, '2026-04-26T04:21:48.424358+00:00');
SELECT setval(pg_get_serial_sequence('likes', 'id'), COALESCE((SELECT MAX(id) FROM likes), 1));

-- messages: empty

-- ─────────────────────────────────────
-- notifications (268 rows)
-- ─────────────────────────────────────
INSERT INTO notifications ("id", "user_id", "type", "title", "message", "post_id", "course_id", "is_read", "is_vip", "created_at") VALUES
  (136, 69, 'comment', 'New Comment', 'M Ahtsham Akram commented on a post', 30, NULL, TRUE, FALSE, '2026-04-17T16:59:53.944708+00:00'),
  (128, 58, 'comment', 'New Comment', 'M Ahtsham Akram commented on a post', 30, NULL, TRUE, FALSE, '2026-04-17T16:59:53.944708+00:00'),
  (177, 58, 'comment', 'New Comment', 'Mudassir Akhtar commented on a post', 30, NULL, TRUE, FALSE, '2026-04-18T07:21:07.879363+00:00'),
  (188, 72, 'comment', 'New Comment', 'Mudassir Akhtar commented on a post', 30, NULL, TRUE, FALSE, '2026-04-18T07:21:07.879363+00:00'),
  (145, 64, 'comment', 'New Comment', 'M Ahtsham Akram commented on a post', 30, NULL, TRUE, FALSE, '2026-04-17T16:59:53.944708+00:00'),
  (194, 64, 'comment', 'New Comment', 'Mudassir Akhtar commented on a post', 30, NULL, TRUE, FALSE, '2026-04-18T07:21:07.879363+00:00'),
  (190, 98, 'comment', 'New Comment', 'Mudassir Akhtar commented on a post', 30, NULL, TRUE, FALSE, '2026-04-18T07:21:07.879363+00:00'),
  (143, 28, 'comment', 'New Comment', 'M Ahtsham Akram commented on a post', 30, NULL, TRUE, FALSE, '2026-04-17T16:59:53.944708+00:00'),
  (192, 28, 'comment', 'New Comment', 'Mudassir Akhtar commented on a post', 30, NULL, TRUE, FALSE, '2026-04-18T07:21:07.879363+00:00'),
  (122, 55, 'admin_course', 'New Course Available', 'Admin added a new course: 🚀 Learn How to Make AI Tools Using Vibe Coding', NULL, NULL, FALSE, TRUE, '2026-04-17T07:57:38.686321+00:00'),
  (124, 55, 'admin_course', 'New Course Available', 'Admin added a new course: 🚀 Learn How to Make AI Tools Using Vibe Coding', NULL, 32, FALSE, TRUE, '2026-04-17T08:06:09.318896+00:00'),
  (127, 59, 'comment', 'New Comment', 'M Ahtsham Akram commented on a post', 30, NULL, FALSE, FALSE, '2026-04-17T16:59:53.944708+00:00'),
  (129, 89, 'comment', 'New Comment', 'M Ahtsham Akram commented on a post', 30, NULL, FALSE, FALSE, '2026-04-17T16:59:53.944708+00:00'),
  (130, 91, 'comment', 'New Comment', 'M Ahtsham Akram commented on a post', 30, NULL, FALSE, FALSE, '2026-04-17T16:59:53.944708+00:00'),
  (131, 55, 'comment', 'New Comment', 'M Ahtsham Akram commented on a post', 30, NULL, FALSE, FALSE, '2026-04-17T16:59:53.944708+00:00'),
  (132, 65, 'comment', 'New Comment', 'M Ahtsham Akram commented on a post', 30, NULL, FALSE, FALSE, '2026-04-17T16:59:53.944708+00:00'),
  (133, 66, 'comment', 'New Comment', 'M Ahtsham Akram commented on a post', 30, NULL, FALSE, FALSE, '2026-04-17T16:59:53.944708+00:00'),
  (134, 67, 'comment', 'New Comment', 'M Ahtsham Akram commented on a post', 30, NULL, FALSE, FALSE, '2026-04-17T16:59:53.944708+00:00'),
  (135, 95, 'comment', 'New Comment', 'M Ahtsham Akram commented on a post', 30, NULL, FALSE, FALSE, '2026-04-17T16:59:53.944708+00:00'),
  (137, 70, 'comment', 'New Comment', 'M Ahtsham Akram commented on a post', 30, NULL, FALSE, FALSE, '2026-04-17T16:59:53.944708+00:00'),
  (138, 90, 'comment', 'New Comment', 'M Ahtsham Akram commented on a post', 30, NULL, FALSE, FALSE, '2026-04-17T16:59:53.944708+00:00'),
  (139, 72, 'comment', 'New Comment', 'M Ahtsham Akram commented on a post', 30, NULL, FALSE, FALSE, '2026-04-17T16:59:53.944708+00:00'),
  (141, 87, 'comment', 'New Comment', 'M Ahtsham Akram commented on a post', 30, NULL, FALSE, FALSE, '2026-04-17T16:59:53.944708+00:00'),
  (142, 73, 'comment', 'New Comment', 'M Ahtsham Akram commented on a post', 30, NULL, FALSE, FALSE, '2026-04-17T16:59:53.944708+00:00'),
  (144, 74, 'comment', 'New Comment', 'M Ahtsham Akram commented on a post', 30, NULL, FALSE, FALSE, '2026-04-17T16:59:53.944708+00:00'),
  (148, 84, 'comment', 'New Comment', 'M Ahtsham Akram commented on a post', 30, NULL, FALSE, FALSE, '2026-04-17T16:59:53.944708+00:00'),
  (149, 71, 'comment', 'New Comment', 'M Ahtsham Akram commented on a post', 30, NULL, FALSE, FALSE, '2026-04-17T16:59:53.944708+00:00'),
  (140, 93, 'comment', 'New Comment', 'M Ahtsham Akram commented on a post', 30, NULL, TRUE, FALSE, '2026-04-17T16:59:53.944708+00:00'),
  (126, 57, 'comment', 'New Comment', 'M Ahtsham Akram commented on a post', 30, NULL, TRUE, FALSE, '2026-04-17T16:59:53.944708+00:00'),
  (175, 57, 'comment', 'New Comment', 'Mudassir Akhtar commented on a post', 30, NULL, FALSE, FALSE, '2026-04-18T07:21:07.879363+00:00'),
  (176, 59, 'comment', 'New Comment', 'Mudassir Akhtar commented on a post', 30, NULL, FALSE, FALSE, '2026-04-18T07:21:07.879363+00:00'),
  (178, 71, 'comment', 'New Comment', 'Mudassir Akhtar commented on a post', 30, NULL, FALSE, FALSE, '2026-04-18T07:21:07.879363+00:00'),
  (179, 95, 'comment', 'New Comment', 'Mudassir Akhtar commented on a post', 30, NULL, FALSE, FALSE, '2026-04-18T07:21:07.879363+00:00'),
  (180, 89, 'comment', 'New Comment', 'Mudassir Akhtar commented on a post', 30, NULL, FALSE, FALSE, '2026-04-18T07:21:07.879363+00:00'),
  (181, 91, 'comment', 'New Comment', 'Mudassir Akhtar commented on a post', 30, NULL, FALSE, FALSE, '2026-04-18T07:21:07.879363+00:00'),
  (182, 55, 'comment', 'New Comment', 'Mudassir Akhtar commented on a post', 30, NULL, FALSE, FALSE, '2026-04-18T07:21:07.879363+00:00'),
  (183, 65, 'comment', 'New Comment', 'Mudassir Akhtar commented on a post', 30, NULL, FALSE, FALSE, '2026-04-18T07:21:07.879363+00:00'),
  (184, 66, 'comment', 'New Comment', 'Mudassir Akhtar commented on a post', 30, NULL, FALSE, FALSE, '2026-04-18T07:21:07.879363+00:00'),
  (185, 67, 'comment', 'New Comment', 'Mudassir Akhtar commented on a post', 30, NULL, FALSE, FALSE, '2026-04-18T07:21:07.879363+00:00'),
  (186, 70, 'comment', 'New Comment', 'Mudassir Akhtar commented on a post', 30, NULL, FALSE, FALSE, '2026-04-18T07:21:07.879363+00:00'),
  (187, 90, 'comment', 'New Comment', 'Mudassir Akhtar commented on a post', 30, NULL, FALSE, FALSE, '2026-04-18T07:21:07.879363+00:00'),
  (189, 93, 'comment', 'New Comment', 'Mudassir Akhtar commented on a post', 30, NULL, FALSE, FALSE, '2026-04-18T07:21:07.879363+00:00'),
  (191, 87, 'comment', 'New Comment', 'Mudassir Akhtar commented on a post', 30, NULL, FALSE, FALSE, '2026-04-18T07:21:07.879363+00:00'),
  (193, 74, 'comment', 'New Comment', 'Mudassir Akhtar commented on a post', 30, NULL, FALSE, FALSE, '2026-04-18T07:21:07.879363+00:00'),
  (123, 55, 'admin_course', 'New Course Available', 'Admin added a new course: Learn Make.com AI Automation — Build Smart Workflows Without Coding', NULL, NULL, FALSE, TRUE, '2026-04-17T07:58:33.934814+00:00'),
  (125, 55, 'admin_post', 'New Admin Post', 'Agent Numan: Hi Everyone!

Wellcome in the AI Acadmy😍', 30, NULL, FALSE, FALSE, '2026-04-17T08:11:05.858702+00:00'),
  (151, 59, 'comment', 'New Comment', 'Uman Saeed  commented on a post', 30, NULL, FALSE, FALSE, '2026-04-17T18:00:42.476953+00:00'),
  (153, 71, 'comment', 'New Comment', 'Uman Saeed  commented on a post', 30, NULL, FALSE, FALSE, '2026-04-17T18:00:42.476953+00:00'),
  (154, 95, 'comment', 'New Comment', 'Uman Saeed  commented on a post', 30, NULL, FALSE, FALSE, '2026-04-17T18:00:42.476953+00:00'),
  (155, 89, 'comment', 'New Comment', 'Uman Saeed  commented on a post', 30, NULL, FALSE, FALSE, '2026-04-17T18:00:42.476953+00:00'),
  (156, 91, 'comment', 'New Comment', 'Uman Saeed  commented on a post', 30, NULL, FALSE, FALSE, '2026-04-17T18:00:42.476953+00:00'),
  (157, 55, 'comment', 'New Comment', 'Uman Saeed  commented on a post', 30, NULL, FALSE, FALSE, '2026-04-17T18:00:42.476953+00:00'),
  (158, 65, 'comment', 'New Comment', 'Uman Saeed  commented on a post', 30, NULL, FALSE, FALSE, '2026-04-17T18:00:42.476953+00:00'),
  (159, 66, 'comment', 'New Comment', 'Uman Saeed  commented on a post', 30, NULL, FALSE, FALSE, '2026-04-17T18:00:42.476953+00:00'),
  (160, 67, 'comment', 'New Comment', 'Uman Saeed  commented on a post', 30, NULL, FALSE, FALSE, '2026-04-17T18:00:42.476953+00:00'),
  (162, 70, 'comment', 'New Comment', 'Uman Saeed  commented on a post', 30, NULL, FALSE, FALSE, '2026-04-17T18:00:42.476953+00:00'),
  (164, 72, 'comment', 'New Comment', 'Uman Saeed  commented on a post', 30, NULL, FALSE, FALSE, '2026-04-17T18:00:42.476953+00:00'),
  (165, 87, 'comment', 'New Comment', 'Uman Saeed  commented on a post', 30, NULL, FALSE, FALSE, '2026-04-17T18:00:42.476953+00:00'),
  (168, 74, 'comment', 'New Comment', 'Uman Saeed  commented on a post', 30, NULL, FALSE, FALSE, '2026-04-17T18:00:42.476953+00:00'),
  (172, 84, 'comment', 'New Comment', 'Uman Saeed  commented on a post', 30, NULL, FALSE, FALSE, '2026-04-17T18:00:42.476953+00:00'),
  (173, 92, 'comment', 'New Comment', 'Uman Saeed  commented on a post', 30, NULL, FALSE, FALSE, '2026-04-17T18:00:42.476953+00:00'),
  (174, 97, 'comment', 'New Comment', 'Uman Saeed  commented on a post', 30, NULL, FALSE, FALSE, '2026-04-17T18:00:42.476953+00:00'),
  (163, 90, 'comment', 'New Comment', 'Uman Saeed  commented on a post', 30, NULL, TRUE, FALSE, '2026-04-17T18:00:42.476953+00:00'),
  (166, 73, 'comment', 'New Comment', 'Uman Saeed  commented on a post', 30, NULL, TRUE, FALSE, '2026-04-17T18:00:42.476953+00:00'),
  (150, 57, 'comment', 'New Comment', 'Uman Saeed  commented on a post', 30, NULL, TRUE, FALSE, '2026-04-17T18:00:42.476953+00:00'),
  (196, 84, 'comment', 'New Comment', 'Mudassir Akhtar commented on a post', 30, NULL, FALSE, FALSE, '2026-04-18T07:21:07.879363+00:00'),
  (198, 92, 'comment', 'New Comment', 'Mudassir Akhtar commented on a post', 30, NULL, FALSE, FALSE, '2026-04-18T07:21:07.879363+00:00'),
  (201, 113, 'comment', 'New Comment', 'Mudassir Akhtar commented on a post', 30, NULL, FALSE, FALSE, '2026-04-18T07:21:07.879363+00:00'),
  (202, 101, 'comment', 'New Comment', 'Mudassir Akhtar commented on a post', 30, NULL, FALSE, FALSE, '2026-04-18T07:21:07.879363+00:00'),
  (203, 103, 'comment', 'New Comment', 'Mudassir Akhtar commented on a post', 30, NULL, FALSE, FALSE, '2026-04-18T07:21:07.879363+00:00'),
  (161, 69, 'comment', 'New Comment', 'Uman Saeed  commented on a post', 30, NULL, TRUE, FALSE, '2026-04-17T18:00:42.476953+00:00'),
  (152, 58, 'comment', 'New Comment', 'Uman Saeed  commented on a post', 30, NULL, TRUE, FALSE, '2026-04-17T18:00:42.476953+00:00'),
  (200, 97, 'comment', 'New Comment', 'Mudassir Akhtar commented on a post', 30, NULL, TRUE, FALSE, '2026-04-18T07:21:07.879363+00:00'),
  (197, 73, 'comment', 'New Comment', 'Mudassir Akhtar commented on a post', 30, NULL, TRUE, FALSE, '2026-04-18T07:21:07.879363+00:00'),
  (169, 64, 'comment', 'New Comment', 'Uman Saeed  commented on a post', 30, NULL, TRUE, FALSE, '2026-04-17T18:00:42.476953+00:00'),
  (204, 57, 'admin_post', 'New VIP Post ⭐', 'Agent Numan: 1- Click on link
2-Redeem offer
3-Use any sadapay in which you have no any ammou…', 31, NULL, FALSE, TRUE, '2026-04-18T14:52:01.966145+00:00'),
  (205, 59, 'admin_post', 'New VIP Post ⭐', 'Agent Numan: 1- Click on link
2-Redeem offer
3-Use any sadapay in which you have no any ammou…', 31, NULL, FALSE, TRUE, '2026-04-18T14:52:01.966145+00:00'),
  (208, 95, 'admin_post', 'New VIP Post ⭐', 'Agent Numan: 1- Click on link
2-Redeem offer
3-Use any sadapay in which you have no any ammou…', 31, NULL, FALSE, TRUE, '2026-04-18T14:52:01.966145+00:00'),
  (209, 89, 'admin_post', 'New VIP Post ⭐', 'Agent Numan: 1- Click on link
2-Redeem offer
3-Use any sadapay in which you have no any ammou…', 31, NULL, FALSE, TRUE, '2026-04-18T14:52:01.966145+00:00'),
  (210, 91, 'admin_post', 'New VIP Post ⭐', 'Agent Numan: 1- Click on link
2-Redeem offer
3-Use any sadapay in which you have no any ammou…', 31, NULL, FALSE, TRUE, '2026-04-18T14:52:01.966145+00:00'),
  (211, 55, 'admin_post', 'New VIP Post ⭐', 'Agent Numan: 1- Click on link
2-Redeem offer
3-Use any sadapay in which you have no any ammou…', 31, NULL, FALSE, TRUE, '2026-04-18T14:52:01.966145+00:00'),
  (212, 65, 'admin_post', 'New VIP Post ⭐', 'Agent Numan: 1- Click on link
2-Redeem offer
3-Use any sadapay in which you have no any ammou…', 31, NULL, FALSE, TRUE, '2026-04-18T14:52:01.966145+00:00'),
  (213, 66, 'admin_post', 'New VIP Post ⭐', 'Agent Numan: 1- Click on link
2-Redeem offer
3-Use any sadapay in which you have no any ammou…', 31, NULL, FALSE, TRUE, '2026-04-18T14:52:01.966145+00:00'),
  (214, 67, 'admin_post', 'New VIP Post ⭐', 'Agent Numan: 1- Click on link
2-Redeem offer
3-Use any sadapay in which you have no any ammou…', 31, NULL, FALSE, TRUE, '2026-04-18T14:52:01.966145+00:00'),
  (215, 69, 'admin_post', 'New VIP Post ⭐', 'Agent Numan: 1- Click on link
2-Redeem offer
3-Use any sadapay in which you have no any ammou…', 31, NULL, FALSE, TRUE, '2026-04-18T14:52:01.966145+00:00'),
  (207, 71, 'admin_post', 'New VIP Post ⭐', 'Agent Numan: 1- Click on link
2-Redeem offer
3-Use any sadapay in which you have no any ammou…', 31, NULL, TRUE, TRUE, '2026-04-18T14:52:01.966145+00:00'),
  (216, 70, 'admin_post', 'New VIP Post ⭐', 'Agent Numan: 1- Click on link
2-Redeem offer
3-Use any sadapay in which you have no any ammou…', 31, NULL, TRUE, TRUE, '2026-04-18T14:52:01.966145+00:00'),
  (167, 28, 'comment', 'New Comment', 'Uman Saeed  commented on a post', 30, NULL, TRUE, FALSE, '2026-04-17T18:00:42.476953+00:00'),
  (206, 58, 'admin_post', 'New VIP Post ⭐', 'Agent Numan: 1- Click on link
2-Redeem offer
3-Use any sadapay in which you have no any ammou…', 31, NULL, TRUE, TRUE, '2026-04-18T14:52:01.966145+00:00'),
  (218, 72, 'admin_post', 'New VIP Post ⭐', 'Agent Numan: 1- Click on link
2-Redeem offer
3-Use any sadapay in which you have no any ammou…', 31, NULL, FALSE, TRUE, '2026-04-18T14:52:01.966145+00:00'),
  (219, 93, 'admin_post', 'New VIP Post ⭐', 'Agent Numan: 1- Click on link
2-Redeem offer
3-Use any sadapay in which you have no any ammou…', 31, NULL, FALSE, TRUE, '2026-04-18T14:52:01.966145+00:00'),
  (221, 87, 'admin_post', 'New VIP Post ⭐', 'Agent Numan: 1- Click on link
2-Redeem offer
3-Use any sadapay in which you have no any ammou…', 31, NULL, FALSE, TRUE, '2026-04-18T14:52:01.966145+00:00'),
  (222, 97, 'admin_post', 'New VIP Post ⭐', 'Agent Numan: 1- Click on link
2-Redeem offer
3-Use any sadapay in which you have no any ammou…', 31, NULL, FALSE, TRUE, '2026-04-18T14:52:01.966145+00:00'),
  (223, 74, 'admin_post', 'New VIP Post ⭐', 'Agent Numan: 1- Click on link
2-Redeem offer
3-Use any sadapay in which you have no any ammou…', 31, NULL, FALSE, TRUE, '2026-04-18T14:52:01.966145+00:00'),
  (229, 113, 'admin_post', 'New VIP Post ⭐', 'Agent Numan: 1- Click on link
2-Redeem offer
3-Use any sadapay in which you have no any ammou…', 31, NULL, FALSE, TRUE, '2026-04-18T14:52:01.966145+00:00'),
  (231, 103, 'admin_post', 'New VIP Post ⭐', 'Agent Numan: 1- Click on link
2-Redeem offer
3-Use any sadapay in which you have no any ammou…', 31, NULL, FALSE, TRUE, '2026-04-18T14:52:01.966145+00:00'),
  (232, 84, 'admin_post', 'New VIP Post ⭐', 'Agent Numan: 1- Click on link
2-Redeem offer
3-Use any sadapay in which you have no any ammou…', 31, NULL, FALSE, TRUE, '2026-04-18T14:52:01.966145+00:00'),
  (226, 73, 'admin_post', 'New VIP Post ⭐', 'Agent Numan: 1- Click on link
2-Redeem offer
3-Use any sadapay in which you have no any ammou…', 31, NULL, TRUE, TRUE, '2026-04-18T14:52:01.966145+00:00'),
  (227, 92, 'admin_post', 'New VIP Post ⭐', 'Agent Numan: 1- Click on link
2-Redeem offer
3-Use any sadapay in which you have no any ammou…', 31, NULL, TRUE, TRUE, '2026-04-18T14:52:01.966145+00:00'),
  (217, 90, 'admin_post', 'New VIP Post ⭐', 'Agent Numan: 1- Click on link
2-Redeem offer
3-Use any sadapay in which you have no any ammou…', 31, NULL, TRUE, TRUE, '2026-04-18T14:52:01.966145+00:00'),
  (230, 101, 'admin_post', 'New VIP Post ⭐', 'Agent Numan: 1- Click on link
2-Redeem offer
3-Use any sadapay in which you have no any ammou…', 31, NULL, TRUE, TRUE, '2026-04-18T14:52:01.966145+00:00'),
  (220, 98, 'admin_post', 'New VIP Post ⭐', 'Agent Numan: 1- Click on link
2-Redeem offer
3-Use any sadapay in which you have no any ammou…', 31, NULL, TRUE, TRUE, '2026-04-18T14:52:01.966145+00:00'),
  (233, 57, 'admin_post', 'New VIP Post ⭐', 'Agent Numan: Follow the below steps
1-Open the LInk
2-Select any Annual Plan & Past coupon co…', 32, NULL, FALSE, TRUE, '2026-04-20T05:11:59.972463+00:00'),
  (234, 59, 'admin_post', 'New VIP Post ⭐', 'Agent Numan: Follow the below steps
1-Open the LInk
2-Select any Annual Plan & Past coupon co…', 32, NULL, FALSE, TRUE, '2026-04-20T05:11:59.972463+00:00'),
  (235, 58, 'admin_post', 'New VIP Post ⭐', 'Agent Numan: Follow the below steps
1-Open the LInk
2-Select any Annual Plan & Past coupon co…', 32, NULL, FALSE, TRUE, '2026-04-20T05:11:59.972463+00:00'),
  (236, 95, 'admin_post', 'New VIP Post ⭐', 'Agent Numan: Follow the below steps
1-Open the LInk
2-Select any Annual Plan & Past coupon co…', 32, NULL, FALSE, TRUE, '2026-04-20T05:11:59.972463+00:00'),
  (237, 89, 'admin_post', 'New VIP Post ⭐', 'Agent Numan: Follow the below steps
1-Open the LInk
2-Select any Annual Plan & Past coupon co…', 32, NULL, FALSE, TRUE, '2026-04-20T05:11:59.972463+00:00'),
  (238, 91, 'admin_post', 'New VIP Post ⭐', 'Agent Numan: Follow the below steps
1-Open the LInk
2-Select any Annual Plan & Past coupon co…', 32, NULL, FALSE, TRUE, '2026-04-20T05:11:59.972463+00:00'),
  (239, 55, 'admin_post', 'New VIP Post ⭐', 'Agent Numan: Follow the below steps
1-Open the LInk
2-Select any Annual Plan & Past coupon co…', 32, NULL, FALSE, TRUE, '2026-04-20T05:11:59.972463+00:00'),
  (241, 66, 'admin_post', 'New VIP Post ⭐', 'Agent Numan: Follow the below steps
1-Open the LInk
2-Select any Annual Plan & Past coupon co…', 32, NULL, FALSE, TRUE, '2026-04-20T05:11:59.972463+00:00'),
  (242, 67, 'admin_post', 'New VIP Post ⭐', 'Agent Numan: Follow the below steps
1-Open the LInk
2-Select any Annual Plan & Past coupon co…', 32, NULL, FALSE, TRUE, '2026-04-20T05:11:59.972463+00:00'),
  (243, 69, 'admin_post', 'New VIP Post ⭐', 'Agent Numan: Follow the below steps
1-Open the LInk
2-Select any Annual Plan & Past coupon co…', 32, NULL, FALSE, TRUE, '2026-04-20T05:11:59.972463+00:00'),
  (244, 70, 'admin_post', 'New VIP Post ⭐', 'Agent Numan: Follow the below steps
1-Open the LInk
2-Select any Annual Plan & Past coupon co…', 32, NULL, FALSE, TRUE, '2026-04-20T05:11:59.972463+00:00'),
  (245, 90, 'admin_post', 'New VIP Post ⭐', 'Agent Numan: Follow the below steps
1-Open the LInk
2-Select any Annual Plan & Past coupon co…', 32, NULL, FALSE, TRUE, '2026-04-20T05:11:59.972463+00:00'),
  (246, 72, 'admin_post', 'New VIP Post ⭐', 'Agent Numan: Follow the below steps
1-Open the LInk
2-Select any Annual Plan & Past coupon co…', 32, NULL, FALSE, TRUE, '2026-04-20T05:11:59.972463+00:00'),
  (247, 93, 'admin_post', 'New VIP Post ⭐', 'Agent Numan: Follow the below steps
1-Open the LInk
2-Select any Annual Plan & Past coupon co…', 32, NULL, FALSE, TRUE, '2026-04-20T05:11:59.972463+00:00'),
  (248, 98, 'admin_post', 'New VIP Post ⭐', 'Agent Numan: Follow the below steps
1-Open the LInk
2-Select any Annual Plan & Past coupon co…', 32, NULL, FALSE, TRUE, '2026-04-20T05:11:59.972463+00:00'),
  (250, 97, 'admin_post', 'New VIP Post ⭐', 'Agent Numan: Follow the below steps
1-Open the LInk
2-Select any Annual Plan & Past coupon co…', 32, NULL, FALSE, TRUE, '2026-04-20T05:11:59.972463+00:00'),
  (251, 138, 'admin_post', 'New VIP Post ⭐', 'Agent Numan: Follow the below steps
1-Open the LInk
2-Select any Annual Plan & Past coupon co…', 32, NULL, FALSE, TRUE, '2026-04-20T05:11:59.972463+00:00'),
  (252, 74, 'admin_post', 'New VIP Post ⭐', 'Agent Numan: Follow the below steps
1-Open the LInk
2-Select any Annual Plan & Past coupon co…', 32, NULL, FALSE, TRUE, '2026-04-20T05:11:59.972463+00:00'),
  (224, 64, 'admin_post', 'New VIP Post ⭐', 'Agent Numan: 1- Click on link
2-Redeem offer
3-Use any sadapay in which you have no any ammou…', 31, NULL, TRUE, TRUE, '2026-04-18T14:52:01.966145+00:00'),
  (253, 64, 'admin_post', 'New VIP Post ⭐', 'Agent Numan: Follow the below steps
1-Open the LInk
2-Select any Annual Plan & Past coupon co…', 32, NULL, TRUE, TRUE, '2026-04-20T05:11:59.972463+00:00'),
  (240, 65, 'admin_post', 'New VIP Post ⭐', 'Agent Numan: Follow the below steps
1-Open the LInk
2-Select any Annual Plan & Past coupon co…', 32, NULL, TRUE, TRUE, '2026-04-20T05:11:59.972463+00:00'),
  (249, 87, 'admin_post', 'New VIP Post ⭐', 'Agent Numan: Follow the below steps
1-Open the LInk
2-Select any Annual Plan & Past coupon co…', 32, NULL, TRUE, TRUE, '2026-04-20T05:11:59.972463+00:00'),
  (254, 132, 'admin_post', 'New VIP Post ⭐', 'Agent Numan: Follow the below steps
1-Open the LInk
2-Select any Annual Plan & Past coupon co…', 32, NULL, FALSE, TRUE, '2026-04-20T05:11:59.972463+00:00'),
  (256, 92, 'admin_post', 'New VIP Post ⭐', 'Agent Numan: Follow the below steps
1-Open the LInk
2-Select any Annual Plan & Past coupon co…', 32, NULL, FALSE, TRUE, '2026-04-20T05:11:59.972463+00:00'),
  (257, 177, 'admin_post', 'New VIP Post ⭐', 'Agent Numan: Follow the below steps
1-Open the LInk
2-Select any Annual Plan & Past coupon co…', 32, NULL, FALSE, TRUE, '2026-04-20T05:11:59.972463+00:00'),
  (258, 113, 'admin_post', 'New VIP Post ⭐', 'Agent Numan: Follow the below steps
1-Open the LInk
2-Select any Annual Plan & Past coupon co…', 32, NULL, FALSE, TRUE, '2026-04-20T05:11:59.972463+00:00'),
  (259, 101, 'admin_post', 'New VIP Post ⭐', 'Agent Numan: Follow the below steps
1-Open the LInk
2-Select any Annual Plan & Past coupon co…', 32, NULL, FALSE, TRUE, '2026-04-20T05:11:59.972463+00:00'),
  (260, 103, 'admin_post', 'New VIP Post ⭐', 'Agent Numan: Follow the below steps
1-Open the LInk
2-Select any Annual Plan & Past coupon co…', 32, NULL, FALSE, TRUE, '2026-04-20T05:11:59.972463+00:00'),
  (263, 84, 'admin_post', 'New VIP Post ⭐', 'Agent Numan: Follow the below steps
1-Open the LInk
2-Select any Annual Plan & Past coupon co…', 32, NULL, FALSE, TRUE, '2026-04-20T05:11:59.972463+00:00'),
  (264, 71, 'admin_post', 'New VIP Post ⭐', 'Agent Numan: Follow the below steps
1-Open the LInk
2-Select any Annual Plan & Past coupon co…', 32, NULL, FALSE, TRUE, '2026-04-20T05:11:59.972463+00:00'),
  (266, 57, 'comment', 'New Comment', 'Muhammad Ahmed commented on a post', 32, NULL, FALSE, FALSE, '2026-04-20T05:42:33.431751+00:00'),
  (267, 59, 'comment', 'New Comment', 'Muhammad Ahmed commented on a post', 32, NULL, FALSE, FALSE, '2026-04-20T05:42:33.431751+00:00'),
  (268, 58, 'comment', 'New Comment', 'Muhammad Ahmed commented on a post', 32, NULL, FALSE, FALSE, '2026-04-20T05:42:33.431751+00:00'),
  (269, 95, 'comment', 'New Comment', 'Muhammad Ahmed commented on a post', 32, NULL, FALSE, FALSE, '2026-04-20T05:42:33.431751+00:00'),
  (270, 89, 'comment', 'New Comment', 'Muhammad Ahmed commented on a post', 32, NULL, FALSE, FALSE, '2026-04-20T05:42:33.431751+00:00'),
  (271, 91, 'comment', 'New Comment', 'Muhammad Ahmed commented on a post', 32, NULL, FALSE, FALSE, '2026-04-20T05:42:33.431751+00:00'),
  (272, 55, 'comment', 'New Comment', 'Muhammad Ahmed commented on a post', 32, NULL, FALSE, FALSE, '2026-04-20T05:42:33.431751+00:00'),
  (273, 65, 'comment', 'New Comment', 'Muhammad Ahmed commented on a post', 32, NULL, FALSE, FALSE, '2026-04-20T05:42:33.431751+00:00'),
  (274, 66, 'comment', 'New Comment', 'Muhammad Ahmed commented on a post', 32, NULL, FALSE, FALSE, '2026-04-20T05:42:33.431751+00:00'),
  (275, 67, 'comment', 'New Comment', 'Muhammad Ahmed commented on a post', 32, NULL, FALSE, FALSE, '2026-04-20T05:42:33.431751+00:00'),
  (276, 69, 'comment', 'New Comment', 'Muhammad Ahmed commented on a post', 32, NULL, FALSE, FALSE, '2026-04-20T05:42:33.431751+00:00'),
  (277, 70, 'comment', 'New Comment', 'Muhammad Ahmed commented on a post', 32, NULL, FALSE, FALSE, '2026-04-20T05:42:33.431751+00:00'),
  (278, 90, 'comment', 'New Comment', 'Muhammad Ahmed commented on a post', 32, NULL, FALSE, FALSE, '2026-04-20T05:42:33.431751+00:00'),
  (279, 72, 'comment', 'New Comment', 'Muhammad Ahmed commented on a post', 32, NULL, FALSE, FALSE, '2026-04-20T05:42:33.431751+00:00'),
  (280, 93, 'comment', 'New Comment', 'Muhammad Ahmed commented on a post', 32, NULL, FALSE, FALSE, '2026-04-20T05:42:33.431751+00:00'),
  (281, 98, 'comment', 'New Comment', 'Muhammad Ahmed commented on a post', 32, NULL, FALSE, FALSE, '2026-04-20T05:42:33.431751+00:00'),
  (282, 87, 'comment', 'New Comment', 'Muhammad Ahmed commented on a post', 32, NULL, FALSE, FALSE, '2026-04-20T05:42:33.431751+00:00'),
  (283, 97, 'comment', 'New Comment', 'Muhammad Ahmed commented on a post', 32, NULL, FALSE, FALSE, '2026-04-20T05:42:33.431751+00:00'),
  (284, 138, 'comment', 'New Comment', 'Muhammad Ahmed commented on a post', 32, NULL, FALSE, FALSE, '2026-04-20T05:42:33.431751+00:00'),
  (285, 74, 'comment', 'New Comment', 'Muhammad Ahmed commented on a post', 32, NULL, FALSE, FALSE, '2026-04-20T05:42:33.431751+00:00'),
  (287, 132, 'comment', 'New Comment', 'Muhammad Ahmed commented on a post', 32, NULL, FALSE, FALSE, '2026-04-20T05:42:33.431751+00:00'),
  (288, 73, 'comment', 'New Comment', 'Muhammad Ahmed commented on a post', 32, NULL, FALSE, FALSE, '2026-04-20T05:42:33.431751+00:00'),
  (289, 92, 'comment', 'New Comment', 'Muhammad Ahmed commented on a post', 32, NULL, FALSE, FALSE, '2026-04-20T05:42:33.431751+00:00'),
  (290, 177, 'comment', 'New Comment', 'Muhammad Ahmed commented on a post', 32, NULL, FALSE, FALSE, '2026-04-20T05:42:33.431751+00:00'),
  (291, 113, 'comment', 'New Comment', 'Muhammad Ahmed commented on a post', 32, NULL, FALSE, FALSE, '2026-04-20T05:42:33.431751+00:00'),
  (292, 101, 'comment', 'New Comment', 'Muhammad Ahmed commented on a post', 32, NULL, FALSE, FALSE, '2026-04-20T05:42:33.431751+00:00'),
  (293, 103, 'comment', 'New Comment', 'Muhammad Ahmed commented on a post', 32, NULL, FALSE, FALSE, '2026-04-20T05:42:33.431751+00:00'),
  (295, 84, 'comment', 'New Comment', 'Muhammad Ahmed commented on a post', 32, NULL, FALSE, FALSE, '2026-04-20T05:42:33.431751+00:00'),
  (297, 71, 'comment', 'New Comment', 'Muhammad Ahmed commented on a post', 32, NULL, FALSE, FALSE, '2026-04-20T05:42:33.431751+00:00'),
  (298, 166, 'comment', 'New Comment', 'Muhammad Ahmed commented on a post', 32, NULL, FALSE, FALSE, '2026-04-20T05:42:33.431751+00:00'),
  (299, 57, 'comment', 'New Comment', 'Agent Numan commented on a post', 32, NULL, FALSE, FALSE, '2026-04-20T05:52:56.133303+00:00'),
  (300, 59, 'comment', 'New Comment', 'Agent Numan commented on a post', 32, NULL, FALSE, FALSE, '2026-04-20T05:52:56.133303+00:00'),
  (301, 58, 'comment', 'New Comment', 'Agent Numan commented on a post', 32, NULL, FALSE, FALSE, '2026-04-20T05:52:56.133303+00:00'),
  (302, 95, 'comment', 'New Comment', 'Agent Numan commented on a post', 32, NULL, FALSE, FALSE, '2026-04-20T05:52:56.133303+00:00'),
  (303, 89, 'comment', 'New Comment', 'Agent Numan commented on a post', 32, NULL, FALSE, FALSE, '2026-04-20T05:52:56.133303+00:00'),
  (304, 91, 'comment', 'New Comment', 'Agent Numan commented on a post', 32, NULL, FALSE, FALSE, '2026-04-20T05:52:56.133303+00:00'),
  (305, 55, 'comment', 'New Comment', 'Agent Numan commented on a post', 32, NULL, FALSE, FALSE, '2026-04-20T05:52:56.133303+00:00'),
  (306, 65, 'comment', 'New Comment', 'Agent Numan commented on a post', 32, NULL, FALSE, FALSE, '2026-04-20T05:52:56.133303+00:00'),
  (307, 66, 'comment', 'New Comment', 'Agent Numan commented on a post', 32, NULL, FALSE, FALSE, '2026-04-20T05:52:56.133303+00:00'),
  (308, 67, 'comment', 'New Comment', 'Agent Numan commented on a post', 32, NULL, FALSE, FALSE, '2026-04-20T05:52:56.133303+00:00'),
  (309, 69, 'comment', 'New Comment', 'Agent Numan commented on a post', 32, NULL, FALSE, FALSE, '2026-04-20T05:52:56.133303+00:00'),
  (310, 70, 'comment', 'New Comment', 'Agent Numan commented on a post', 32, NULL, FALSE, FALSE, '2026-04-20T05:52:56.133303+00:00'),
  (311, 90, 'comment', 'New Comment', 'Agent Numan commented on a post', 32, NULL, FALSE, FALSE, '2026-04-20T05:52:56.133303+00:00'),
  (312, 72, 'comment', 'New Comment', 'Agent Numan commented on a post', 32, NULL, FALSE, FALSE, '2026-04-20T05:52:56.133303+00:00'),
  (313, 93, 'comment', 'New Comment', 'Agent Numan commented on a post', 32, NULL, FALSE, FALSE, '2026-04-20T05:52:56.133303+00:00'),
  (314, 98, 'comment', 'New Comment', 'Agent Numan commented on a post', 32, NULL, FALSE, FALSE, '2026-04-20T05:52:56.133303+00:00'),
  (315, 87, 'comment', 'New Comment', 'Agent Numan commented on a post', 32, NULL, FALSE, FALSE, '2026-04-20T05:52:56.133303+00:00'),
  (261, 151, 'admin_post', 'New VIP Post ⭐', 'Agent Numan: Follow the below steps
1-Open the LInk
2-Select any Annual Plan & Past coupon co…', 32, NULL, TRUE, TRUE, '2026-04-20T05:11:59.972463+00:00'),
  (262, 156, 'admin_post', 'New VIP Post ⭐', 'Agent Numan: Follow the below steps
1-Open the LInk
2-Select any Annual Plan & Past coupon co…', 32, NULL, TRUE, TRUE, '2026-04-20T05:11:59.972463+00:00'),
  (286, 64, 'comment', 'New Comment', 'Muhammad Ahmed commented on a post', 32, NULL, TRUE, FALSE, '2026-04-20T05:42:33.431751+00:00'),
  (255, 73, 'admin_post', 'New VIP Post ⭐', 'Agent Numan: Follow the below steps
1-Open the LInk
2-Select any Annual Plan & Past coupon co…', 32, NULL, TRUE, TRUE, '2026-04-20T05:11:59.972463+00:00'),
  (265, 166, 'admin_post', 'New VIP Post ⭐', 'Agent Numan: Follow the below steps
1-Open the LInk
2-Select any Annual Plan & Past coupon co…', 32, NULL, TRUE, TRUE, '2026-04-20T05:11:59.972463+00:00'),
  (317, 138, 'comment', 'New Comment', 'Agent Numan commented on a post', 32, NULL, FALSE, FALSE, '2026-04-20T05:52:56.133303+00:00'),
  (318, 74, 'comment', 'New Comment', 'Agent Numan commented on a post', 32, NULL, FALSE, FALSE, '2026-04-20T05:52:56.133303+00:00'),
  (320, 132, 'comment', 'New Comment', 'Agent Numan commented on a post', 32, NULL, FALSE, FALSE, '2026-04-20T05:52:56.133303+00:00'),
  (321, 73, 'comment', 'New Comment', 'Agent Numan commented on a post', 32, NULL, FALSE, FALSE, '2026-04-20T05:52:56.133303+00:00'),
  (322, 92, 'comment', 'New Comment', 'Agent Numan commented on a post', 32, NULL, FALSE, FALSE, '2026-04-20T05:52:56.133303+00:00'),
  (323, 177, 'comment', 'New Comment', 'Agent Numan commented on a post', 32, NULL, FALSE, FALSE, '2026-04-20T05:52:56.133303+00:00'),
  (324, 113, 'comment', 'New Comment', 'Agent Numan commented on a post', 32, NULL, FALSE, FALSE, '2026-04-20T05:52:56.133303+00:00'),
  (325, 101, 'comment', 'New Comment', 'Agent Numan commented on a post', 32, NULL, FALSE, FALSE, '2026-04-20T05:52:56.133303+00:00'),
  (326, 103, 'comment', 'New Comment', 'Agent Numan commented on a post', 32, NULL, FALSE, FALSE, '2026-04-20T05:52:56.133303+00:00'),
  (329, 84, 'comment', 'New Comment', 'Agent Numan commented on a post', 32, NULL, FALSE, FALSE, '2026-04-20T05:52:56.133303+00:00'),
  (330, 71, 'comment', 'New Comment', 'Agent Numan commented on a post', 32, NULL, FALSE, FALSE, '2026-04-20T05:52:56.133303+00:00'),
  (331, 166, 'comment', 'New Comment', 'Agent Numan commented on a post', 32, NULL, FALSE, FALSE, '2026-04-20T05:52:56.133303+00:00'),
  (296, 28, 'comment', 'New Comment', 'Muhammad Ahmed commented on a post', 32, NULL, TRUE, FALSE, '2026-04-20T05:42:33.431751+00:00'),
  (316, 97, 'comment', 'New Comment', 'Agent Numan commented on a post', 32, NULL, TRUE, FALSE, '2026-04-20T05:52:56.133303+00:00'),
  (333, 59, 'post', 'New Post', 'M. Usman: Prompts used today

Create smooth cinematic flow between sections:
Hero Page Loa…', 33, NULL, FALSE, FALSE, '2026-04-20T06:21:53.581782+00:00'),
  (334, 58, 'post', 'New Post', 'M. Usman: Prompts used today

Create smooth cinematic flow between sections:
Hero Page Loa…', 33, NULL, FALSE, FALSE, '2026-04-20T06:21:53.581782+00:00'),
  (335, 95, 'post', 'New Post', 'M. Usman: Prompts used today

Create smooth cinematic flow between sections:
Hero Page Loa…', 33, NULL, FALSE, FALSE, '2026-04-20T06:21:53.581782+00:00'),
  (337, 91, 'post', 'New Post', 'M. Usman: Prompts used today

Create smooth cinematic flow between sections:
Hero Page Loa…', 33, NULL, FALSE, FALSE, '2026-04-20T06:21:53.581782+00:00'),
  (338, 55, 'post', 'New Post', 'M. Usman: Prompts used today

Create smooth cinematic flow between sections:
Hero Page Loa…', 33, NULL, FALSE, FALSE, '2026-04-20T06:21:53.581782+00:00'),
  (339, 65, 'post', 'New Post', 'M. Usman: Prompts used today

Create smooth cinematic flow between sections:
Hero Page Loa…', 33, NULL, FALSE, FALSE, '2026-04-20T06:21:53.581782+00:00'),
  (340, 66, 'post', 'New Post', 'M. Usman: Prompts used today

Create smooth cinematic flow between sections:
Hero Page Loa…', 33, NULL, FALSE, FALSE, '2026-04-20T06:21:53.581782+00:00'),
  (341, 67, 'post', 'New Post', 'M. Usman: Prompts used today

Create smooth cinematic flow between sections:
Hero Page Loa…', 33, NULL, FALSE, FALSE, '2026-04-20T06:21:53.581782+00:00'),
  (342, 69, 'post', 'New Post', 'M. Usman: Prompts used today

Create smooth cinematic flow between sections:
Hero Page Loa…', 33, NULL, FALSE, FALSE, '2026-04-20T06:21:53.581782+00:00'),
  (343, 70, 'post', 'New Post', 'M. Usman: Prompts used today

Create smooth cinematic flow between sections:
Hero Page Loa…', 33, NULL, FALSE, FALSE, '2026-04-20T06:21:53.581782+00:00'),
  (344, 90, 'post', 'New Post', 'M. Usman: Prompts used today

Create smooth cinematic flow between sections:
Hero Page Loa…', 33, NULL, FALSE, FALSE, '2026-04-20T06:21:53.581782+00:00'),
  (345, 72, 'post', 'New Post', 'M. Usman: Prompts used today

Create smooth cinematic flow between sections:
Hero Page Loa…', 33, NULL, FALSE, FALSE, '2026-04-20T06:21:53.581782+00:00'),
  (346, 93, 'post', 'New Post', 'M. Usman: Prompts used today

Create smooth cinematic flow between sections:
Hero Page Loa…', 33, NULL, FALSE, FALSE, '2026-04-20T06:21:53.581782+00:00'),
  (347, 98, 'post', 'New Post', 'M. Usman: Prompts used today

Create smooth cinematic flow between sections:
Hero Page Loa…', 33, NULL, FALSE, FALSE, '2026-04-20T06:21:53.581782+00:00'),
  (348, 87, 'post', 'New Post', 'M. Usman: Prompts used today

Create smooth cinematic flow between sections:
Hero Page Loa…', 33, NULL, FALSE, FALSE, '2026-04-20T06:21:53.581782+00:00'),
  (349, 97, 'post', 'New Post', 'M. Usman: Prompts used today

Create smooth cinematic flow between sections:
Hero Page Loa…', 33, NULL, FALSE, FALSE, '2026-04-20T06:21:53.581782+00:00'),
  (350, 138, 'post', 'New Post', 'M. Usman: Prompts used today

Create smooth cinematic flow between sections:
Hero Page Loa…', 33, NULL, FALSE, FALSE, '2026-04-20T06:21:53.581782+00:00'),
  (351, 74, 'post', 'New Post', 'M. Usman: Prompts used today

Create smooth cinematic flow between sections:
Hero Page Loa…', 33, NULL, FALSE, FALSE, '2026-04-20T06:21:53.581782+00:00'),
  (352, 132, 'post', 'New Post', 'M. Usman: Prompts used today

Create smooth cinematic flow between sections:
Hero Page Loa…', 33, NULL, FALSE, FALSE, '2026-04-20T06:21:53.581782+00:00'),
  (353, 73, 'post', 'New Post', 'M. Usman: Prompts used today

Create smooth cinematic flow between sections:
Hero Page Loa…', 33, NULL, FALSE, FALSE, '2026-04-20T06:21:53.581782+00:00'),
  (354, 92, 'post', 'New Post', 'M. Usman: Prompts used today

Create smooth cinematic flow between sections:
Hero Page Loa…', 33, NULL, FALSE, FALSE, '2026-04-20T06:21:53.581782+00:00'),
  (355, 177, 'post', 'New Post', 'M. Usman: Prompts used today

Create smooth cinematic flow between sections:
Hero Page Loa…', 33, NULL, FALSE, FALSE, '2026-04-20T06:21:53.581782+00:00'),
  (356, 113, 'post', 'New Post', 'M. Usman: Prompts used today

Create smooth cinematic flow between sections:
Hero Page Loa…', 33, NULL, FALSE, FALSE, '2026-04-20T06:21:53.581782+00:00'),
  (357, 101, 'post', 'New Post', 'M. Usman: Prompts used today

Create smooth cinematic flow between sections:
Hero Page Loa…', 33, NULL, FALSE, FALSE, '2026-04-20T06:21:53.581782+00:00'),
  (358, 103, 'post', 'New Post', 'M. Usman: Prompts used today

Create smooth cinematic flow between sections:
Hero Page Loa…', 33, NULL, FALSE, FALSE, '2026-04-20T06:21:53.581782+00:00'),
  (361, 84, 'post', 'New Post', 'M. Usman: Prompts used today

Create smooth cinematic flow between sections:
Hero Page Loa…', 33, NULL, FALSE, FALSE, '2026-04-20T06:21:53.581782+00:00'),
  (362, 28, 'post', 'New Post', 'M. Usman: Prompts used today

Create smooth cinematic flow between sections:
Hero Page Loa…', 33, NULL, FALSE, FALSE, '2026-04-20T06:21:53.581782+00:00'),
  (363, 71, 'post', 'New Post', 'M. Usman: Prompts used today

Create smooth cinematic flow between sections:
Hero Page Loa…', 33, NULL, FALSE, FALSE, '2026-04-20T06:21:53.581782+00:00'),
  (364, 166, 'post', 'New Post', 'M. Usman: Prompts used today

Create smooth cinematic flow between sections:
Hero Page Loa…', 33, NULL, FALSE, FALSE, '2026-04-20T06:21:53.581782+00:00'),
  (366, 59, 'comment', 'New Comment', 'Muhammad Ahmed commented on a post', 32, NULL, FALSE, FALSE, '2026-04-20T07:08:42.531641+00:00'),
  (367, 58, 'comment', 'New Comment', 'Muhammad Ahmed commented on a post', 32, NULL, FALSE, FALSE, '2026-04-20T07:08:42.531641+00:00'),
  (368, 95, 'comment', 'New Comment', 'Muhammad Ahmed commented on a post', 32, NULL, FALSE, FALSE, '2026-04-20T07:08:42.531641+00:00'),
  (328, 156, 'comment', 'New Comment', 'Agent Numan commented on a post', 32, NULL, TRUE, FALSE, '2026-04-20T05:52:56.133303+00:00'),
  (360, 156, 'post', 'New Post', 'M. Usman: Prompts used today

Create smooth cinematic flow between sections:
Hero Page Loa…', 33, NULL, TRUE, FALSE, '2026-04-20T06:21:53.581782+00:00'),
  (319, 64, 'comment', 'New Comment', 'Agent Numan commented on a post', 32, NULL, TRUE, FALSE, '2026-04-20T05:52:56.133303+00:00'),
  (336, 89, 'post', 'New Post', 'M. Usman: Prompts used today

Create smooth cinematic flow between sections:
Hero Page Loa…', 33, NULL, TRUE, FALSE, '2026-04-20T06:21:53.581782+00:00'),
  (365, 57, 'comment', 'New Comment', 'Muhammad Ahmed commented on a post', 32, NULL, TRUE, FALSE, '2026-04-20T07:08:42.531641+00:00'),
  (332, 57, 'post', 'New Post', 'M. Usman: Prompts used today

Create smooth cinematic flow between sections:
Hero Page Loa…', 33, NULL, TRUE, FALSE, '2026-04-20T06:21:53.581782+00:00'),
  (370, 91, 'comment', 'New Comment', 'Muhammad Ahmed commented on a post', 32, NULL, FALSE, FALSE, '2026-04-20T07:08:42.531641+00:00'),
  (371, 55, 'comment', 'New Comment', 'Muhammad Ahmed commented on a post', 32, NULL, FALSE, FALSE, '2026-04-20T07:08:42.531641+00:00'),
  (373, 66, 'comment', 'New Comment', 'Muhammad Ahmed commented on a post', 32, NULL, FALSE, FALSE, '2026-04-20T07:08:42.531641+00:00'),
  (375, 69, 'comment', 'New Comment', 'Muhammad Ahmed commented on a post', 32, NULL, FALSE, FALSE, '2026-04-20T07:08:42.531641+00:00'),
  (376, 70, 'comment', 'New Comment', 'Muhammad Ahmed commented on a post', 32, NULL, FALSE, FALSE, '2026-04-20T07:08:42.531641+00:00'),
  (377, 90, 'comment', 'New Comment', 'Muhammad Ahmed commented on a post', 32, NULL, FALSE, FALSE, '2026-04-20T07:08:42.531641+00:00'),
  (378, 72, 'comment', 'New Comment', 'Muhammad Ahmed commented on a post', 32, NULL, FALSE, FALSE, '2026-04-20T07:08:42.531641+00:00'),
  (379, 93, 'comment', 'New Comment', 'Muhammad Ahmed commented on a post', 32, NULL, FALSE, FALSE, '2026-04-20T07:08:42.531641+00:00'),
  (380, 98, 'comment', 'New Comment', 'Muhammad Ahmed commented on a post', 32, NULL, FALSE, FALSE, '2026-04-20T07:08:42.531641+00:00'),
  (382, 97, 'comment', 'New Comment', 'Muhammad Ahmed commented on a post', 32, NULL, FALSE, FALSE, '2026-04-20T07:08:42.531641+00:00'),
  (383, 138, 'comment', 'New Comment', 'Muhammad Ahmed commented on a post', 32, NULL, FALSE, FALSE, '2026-04-20T07:08:42.531641+00:00'),
  (384, 74, 'comment', 'New Comment', 'Muhammad Ahmed commented on a post', 32, NULL, FALSE, FALSE, '2026-04-20T07:08:42.531641+00:00'),
  (386, 132, 'comment', 'New Comment', 'Muhammad Ahmed commented on a post', 32, NULL, FALSE, FALSE, '2026-04-20T07:08:42.531641+00:00'),
  (387, 73, 'comment', 'New Comment', 'Muhammad Ahmed commented on a post', 32, NULL, FALSE, FALSE, '2026-04-20T07:08:42.531641+00:00'),
  (388, 92, 'comment', 'New Comment', 'Muhammad Ahmed commented on a post', 32, NULL, FALSE, FALSE, '2026-04-20T07:08:42.531641+00:00'),
  (389, 177, 'comment', 'New Comment', 'Muhammad Ahmed commented on a post', 32, NULL, FALSE, FALSE, '2026-04-20T07:08:42.531641+00:00'),
  (390, 113, 'comment', 'New Comment', 'Muhammad Ahmed commented on a post', 32, NULL, FALSE, FALSE, '2026-04-20T07:08:42.531641+00:00'),
  (391, 101, 'comment', 'New Comment', 'Muhammad Ahmed commented on a post', 32, NULL, FALSE, FALSE, '2026-04-20T07:08:42.531641+00:00'),
  (392, 103, 'comment', 'New Comment', 'Muhammad Ahmed commented on a post', 32, NULL, FALSE, FALSE, '2026-04-20T07:08:42.531641+00:00'),
  (394, 84, 'comment', 'New Comment', 'Muhammad Ahmed commented on a post', 32, NULL, FALSE, FALSE, '2026-04-20T07:08:42.531641+00:00'),
  (395, 28, 'comment', 'New Comment', 'Muhammad Ahmed commented on a post', 32, NULL, FALSE, FALSE, '2026-04-20T07:08:42.531641+00:00'),
  (396, 71, 'comment', 'New Comment', 'Muhammad Ahmed commented on a post', 32, NULL, FALSE, FALSE, '2026-04-20T07:08:42.531641+00:00'),
  (397, 166, 'comment', 'New Comment', 'Muhammad Ahmed commented on a post', 32, NULL, FALSE, FALSE, '2026-04-20T07:08:42.531641+00:00'),
  (294, 151, 'comment', 'New Comment', 'Muhammad Ahmed commented on a post', 32, NULL, TRUE, FALSE, '2026-04-20T05:42:33.431751+00:00'),
  (327, 151, 'comment', 'New Comment', 'Agent Numan commented on a post', 32, NULL, TRUE, FALSE, '2026-04-20T05:52:56.133303+00:00'),
  (359, 151, 'post', 'New Post', 'M. Usman: Prompts used today

Create smooth cinematic flow between sections:
Hero Page Loa…', 33, NULL, TRUE, FALSE, '2026-04-20T06:21:53.581782+00:00'),
  (393, 151, 'comment', 'New Comment', 'Muhammad Ahmed commented on a post', 32, NULL, TRUE, FALSE, '2026-04-20T07:08:42.531641+00:00'),
  (369, 89, 'comment', 'New Comment', 'Muhammad Ahmed commented on a post', 32, NULL, TRUE, FALSE, '2026-04-20T07:08:42.531641+00:00'),
  (385, 64, 'comment', 'New Comment', 'Muhammad Ahmed commented on a post', 32, NULL, TRUE, FALSE, '2026-04-20T07:08:42.531641+00:00'),
  (374, 67, 'comment', 'New Comment', 'Muhammad Ahmed commented on a post', 32, NULL, TRUE, FALSE, '2026-04-20T07:08:42.531641+00:00'),
  (372, 65, 'comment', 'New Comment', 'Muhammad Ahmed commented on a post', 32, NULL, TRUE, FALSE, '2026-04-20T07:08:42.531641+00:00'),
  (381, 87, 'comment', 'New Comment', 'Muhammad Ahmed commented on a post', 32, NULL, TRUE, FALSE, '2026-04-20T07:08:42.531641+00:00');
SELECT setval(pg_get_serial_sequence('notifications', 'id'), COALESCE((SELECT MAX(id) FROM notifications), 1));

-- ─────────────────────────────────────
-- site_settings (1 rows)
-- ─────────────────────────────────────
INSERT INTO site_settings ("id", "key", "value", "created_at", "updated_at") VALUES
  (4, 'default_enrollment_mode', 'approval_required', '2026-04-17T08:22:46.702596+00:00', '2026-04-17T08:22:46.639+00:00');
SELECT setval(pg_get_serial_sequence('site_settings', 'id'), COALESCE((SELECT MAX(id) FROM site_settings), 1));

-- tools: empty

-- tool_requests: empty

-- followers: empty

-- Re-enable triggers
SET session_replication_role = DEFAULT;
