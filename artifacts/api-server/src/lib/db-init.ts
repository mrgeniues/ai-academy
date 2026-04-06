import { supabase } from "./supabase";
import { logger } from "./logger";
import bcrypt from "bcryptjs";

const SCHEMA_SQL = `
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

CREATE TABLE IF NOT EXISTS courses (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail TEXT,
  created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lessons (
  id SERIAL PRIMARY KEY,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  video_url TEXT,
  content TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS enrollments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  progress INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS posts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS comments (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS likes (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

async function runSchemaSql(): Promise<boolean> {
  const { error } = await (supabase as any).rpc("exec_ddl", { sql: SCHEMA_SQL });
  if (error) {
    logger.warn({ code: error.code }, "exec_ddl RPC not available, skipping auto-migration");
    return false;
  }
  return true;
}

async function tablesExist(): Promise<boolean> {
  const { data, error } = await supabase.from("users").select("id").limit(1);
  return !error;
}

async function seedDemoData(): Promise<void> {
  const hash = await bcrypt.hash("password123", 10);

  const { data: existingAdmin } = await supabase
    .from("users")
    .select("id")
    .eq("email", "admin@lms.com")
    .maybeSingle();

  if (existingAdmin) {
    logger.info("Seed data already present, skipping");
    return;
  }

  const { data: users, error: userErr } = await supabase
    .from("users")
    .insert([
      { email: "admin@lms.com", password_hash: hash, name: "Admin User", role: "admin" },
      { email: "alice@example.com", password_hash: hash, name: "Alice Johnson", role: "creator" },
      { email: "bob@example.com", password_hash: hash, name: "Bob Smith", role: "member" },
    ])
    .select();

  if (userErr || !users) {
    logger.warn({ err: userErr?.message }, "Failed to seed users");
    return;
  }

  const [admin, alice] = users;

  const { data: courses, error: courseErr } = await supabase
    .from("courses")
    .insert([
      {
        title: "Introduction to Web Development",
        description: "Learn HTML, CSS, and JavaScript from scratch. Build your first website.",
        thumbnail: "https://images.unsplash.com/photo-1593720213428-28a5b9e94613?w=640",
        created_by: alice.id,
      },
      {
        title: "Advanced React Patterns",
        description: "Deep dive into React hooks, context, performance optimization and design patterns.",
        thumbnail: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=640",
        created_by: alice.id,
      },
      {
        title: "Node.js & Express API Design",
        description: "Build production-ready REST APIs with Node.js, Express, authentication and databases.",
        thumbnail: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=640",
        created_by: admin.id,
      },
    ])
    .select();

  if (courseErr || !courses) {
    logger.warn({ err: courseErr?.message }, "Failed to seed courses");
    return;
  }

  const [c1, c2, c3] = courses;

  await supabase.from("lessons").insert([
    { course_id: c1.id, title: "HTML Fundamentals", content: "Learn the building blocks of web pages.", order: 1 },
    { course_id: c1.id, title: "CSS Styling Basics", content: "Style your HTML with colors, fonts and layout.", order: 2 },
    { course_id: c1.id, title: "JavaScript Essentials", content: "Variables, functions, DOM manipulation and events.", order: 3 },
    { course_id: c1.id, title: "Building Your First Website", content: "Put it all together and deploy.", order: 4 },
    { course_id: c2.id, title: "Custom Hooks Deep Dive", content: "Extract stateful logic into reusable custom hooks.", order: 1 },
    { course_id: c2.id, title: "Context API & State Management", content: "Manage global state without Redux.", order: 2 },
    { course_id: c2.id, title: "Performance Optimization", content: "useMemo, useCallback, React.memo and code splitting.", order: 3 },
    { course_id: c3.id, title: "Express Routing & Middleware", content: "Design RESTful routes and build custom middleware.", order: 1 },
    { course_id: c3.id, title: "JWT Authentication", content: "Implement secure JWT-based authentication.", order: 2 },
    { course_id: c3.id, title: "Database Integration", content: "Connect to PostgreSQL and write type-safe queries.", order: 3 },
  ]);

  const { data: posts } = await supabase.from("posts").insert([
    { user_id: alice.id, content: "Welcome to LearnHub! I just uploaded 3 new courses. Check them out!" },
    { user_id: users[2].id, content: "Just finished the Introduction to Web Development course. Absolutely loved it!" },
    { user_id: admin.id, content: "Platform update: We've added progress tracking and new community features. 💡" },
  ]).select();

  logger.info("Demo data seeded successfully");
}

export async function initializeDatabase(): Promise<void> {
  logger.info("Checking database connectivity...");

  const exists = await tablesExist();

  if (!exists) {
    logger.info("Tables not found, attempting auto-migration via RPC...");
    const migrated = await runSchemaSql();

    if (!migrated) {
      logger.warn(
        "Auto-migration failed. Please run supabase-setup.sql in the Supabase SQL Editor:\n" +
        "https://supabase.com/dashboard/project/hpntmfiurmnkvtysbqio/sql/new\n" +
        "File: artifacts/api-server/supabase-setup.sql"
      );
      return;
    }

    logger.info("Schema created, seeding demo data...");
    await seedDemoData();
    logger.info("Database initialization complete");
  } else {
    logger.info("Database tables verified ✓");
  }
}
