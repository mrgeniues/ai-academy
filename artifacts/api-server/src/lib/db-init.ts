import { supabase } from "./supabase";
import { logger } from "./logger";
import bcrypt from "bcryptjs";

async function tablesExist(): Promise<boolean> {
  const { error } = await supabase.from("users").select("id").limit(1);
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

  const [admin, alice, bob] = users;

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

  await supabase.from("posts").insert([
    { user_id: alice.id, content: "Welcome to LearnHub! I just uploaded 3 new courses. Check them out!" },
    { user_id: bob.id, content: "Just finished the Introduction to Web Development course. Absolutely loved it!" },
    { user_id: admin.id, content: "Platform update: We've added progress tracking and new community features. 💡" },
  ]);

  logger.info("Demo data seeded successfully");
}

async function checkAuditTable(): Promise<void> {
  const { error } = await supabase.from("admin_actions").select("id").limit(1);
  if (error && (error.message.includes("admin_actions") || error.code === "42P01")) {
    logger.warn(
      "admin_actions table not found — audit logging is disabled. " +
      "Run the latest SQL in artifacts/api-server/supabase-setup.sql to enable it."
    );
  }
}

async function checkRejectionTables(): Promise<void> {
  const { error } = await supabase.from("rejected_enrollments").select("id").limit(1);
  if (error && (error.code === "42P01" || error.message.includes("rejected_enrollments"))) {
    logger.warn(
      "rejected_enrollments table not found — enrollment rejection reasons will not be stored in-app. " +
      "Run the latest SQL in artifacts/api-server/supabase-setup.sql to enable it."
    );
  }
}

export async function initializeDatabase(): Promise<void> {
  logger.info("Checking database connectivity...");

  const exists = await tablesExist();

  if (!exists) {
    const projectRef = (process.env.SUPABASE_URL ?? "")
      .replace("https://", "")
      .split(".")[0];
    const sqlEditorUrl = projectRef
      ? `https://supabase.com/dashboard/project/${projectRef}/sql/new`
      : "https://supabase.com/dashboard (open your project > SQL Editor)";
    logger.warn(
      "Database tables not found. Please run the SQL setup script in the Supabase SQL Editor:\n" +
        `  URL: ${sqlEditorUrl}\n` +
        "  File: artifacts/api-server/supabase-setup.sql",
    );
    return;
  }

  await seedDemoData();
  await checkAuditTable();
  await checkRejectionTables();
  logger.info("Database ready ✓");
}
