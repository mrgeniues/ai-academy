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
ALTER TABLE comments ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS video_url TEXT;

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
