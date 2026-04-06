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
  created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Lessons table
CREATE TABLE IF NOT EXISTS lessons (
  id SERIAL PRIMARY KEY,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
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

-- Disable Row Level Security for all tables (backend uses service role)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE courses DISABLE ROW LEVEL SECURITY;
ALTER TABLE lessons DISABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments DISABLE ROW LEVEL SECURITY;
ALTER TABLE posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE likes DISABLE ROW LEVEL SECURITY;

-- Seed demo data
-- Password hash for "password123" (bcrypt, 10 rounds)
INSERT INTO users (email, password_hash, name, role) VALUES
  ('admin@lms.com', '$2b$10$kJnu2jmgF5a9RsKtsGDEhOSDowhs3t.fGIagheU95AW09hIcmbhHy', 'Admin User', 'admin'),
  ('alice@example.com', '$2b$10$kJnu2jmgF5a9RsKtsGDEhOSDowhs3t.fGIagheU95AW09hIcmbhHy', 'Alice Johnson', 'creator'),
  ('bob@example.com', '$2b$10$kJnu2jmgF5a9RsKtsGDEhOSDowhs3t.fGIagheU95AW09hIcmbhHy', 'Bob Smith', 'member')
ON CONFLICT (email) DO NOTHING;

-- Sample courses (using alice's id = 2)
INSERT INTO courses (title, description, thumbnail, created_by) VALUES
  ('Introduction to Web Development', 'Learn HTML, CSS, and JavaScript from scratch. Build your first website in this comprehensive beginner course.', 'https://images.unsplash.com/photo-1593720213428-28a5b9e94613?w=640', 2),
  ('Advanced React Patterns', 'Deep dive into React hooks, context, performance optimization, and design patterns for scalable applications.', 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=640', 2),
  ('Node.js & Express API Design', 'Build production-ready REST APIs with Node.js, Express, authentication, and database integration.', 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=640', 1)
ON CONFLICT DO NOTHING;

-- Sample lessons for course 1
INSERT INTO lessons (course_id, title, content, "order") VALUES
  (1, 'HTML Fundamentals', 'Learn the building blocks of web pages — tags, attributes, and document structure.', 1),
  (1, 'CSS Styling Basics', 'Style your HTML with colors, fonts, layout, and the box model.', 2),
  (1, 'JavaScript Essentials', 'Variables, functions, DOM manipulation, and event handling.', 3),
  (1, 'Building Your First Website', 'Put it all together and deploy your first responsive website.', 4);

-- Sample lessons for course 2
INSERT INTO lessons (course_id, title, content, "order") VALUES
  (2, 'Custom Hooks Deep Dive', 'Extract stateful logic into reusable custom hooks with real-world examples.', 1),
  (2, 'Context API & State Management', 'Manage global state without Redux using React Context and useReducer.', 2),
  (2, 'Performance Optimization', 'useMemo, useCallback, React.memo, and code splitting strategies.', 3);

-- Sample lessons for course 3
INSERT INTO lessons (course_id, title, content, "order") VALUES
  (3, 'Express Routing & Middleware', 'Design RESTful routes and build custom middleware for logging, auth, and validation.', 1),
  (3, 'JWT Authentication', 'Implement secure JWT-based authentication with refresh tokens.', 2),
  (3, 'Database Integration with Drizzle', 'Connect to PostgreSQL with Drizzle ORM and write type-safe queries.', 3);

-- Sample community posts (user id 1 = admin, 2 = alice, 3 = bob)
INSERT INTO posts (user_id, content) VALUES
  (2, 'Welcome to LearnHub! I just uploaded 3 new courses. Check them out and let me know what topics you''d like to see next! 🎉'),
  (3, 'Just finished the Introduction to Web Development course. Absolutely loved it — the HTML and CSS sections were super clear. Thank you Alice!'),
  (1, 'Platform update: We''ve added progress tracking and new community features. Keep learning and stay curious! 💡');
