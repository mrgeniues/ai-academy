# LearnHub LMS Platform

A full-stack SaaS Learning Management System (LMS) similar to Skool.com, built on a pnpm monorepo.

## Architecture

- **Monorepo**: pnpm workspace at `/home/runner/workspace`
- **Frontend**: React + Vite (`artifacts/lms`) — served at path `/`
- **Backend**: Express 5 + Node.js (`artifacts/api-server`) — runs on port 8080
- **Database**: Supabase (PostgreSQL via `@supabase/supabase-js` service role client)
- **API client**: Auto-generated React Query hooks from OpenAPI spec (`lib/api-client-react`)

## Key Technologies

- **Frontend**: React 19, Vite 7, TailwindCSS v4, shadcn/ui, React Query, Wouter, Zod, date-fns, react-icons
- **Backend**: Express 5, jsonwebtoken (JWT auth), bcryptjs (password hashing), Pino logging, @supabase/supabase-js
- **DB**: Supabase PostgreSQL (accessed via service role REST API, NOT direct pg connection)

## Workflows

- `artifacts/lms: web` — Frontend dev server (Vite, port assigned via PORT env var)
- `artifacts/api-server: API Server` — Backend API (port 8080)

The frontend proxies `/api/*` requests to `http://localhost:8080` via Vite dev proxy.

## Authentication

- JWT-based, stored in `localStorage` as `lms_token`
- Token is injected as `Authorization: Bearer <token>` header via `setAuthTokenGetter` in the API client
- Three roles: `member`, `creator`, `admin`

## Database Setup

Supabase is used as the database backend. Tables are accessed via the Supabase JS SDK (service role key).

> **IMPORTANT**: Direct PostgreSQL connections to Supabase are blocked from Replit's network (IPv6 only for direct host, pooler blocked). All DB access uses the Supabase REST API via `@supabase/supabase-js`.

### To create tables + seed data:
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard) and open your project
2. Navigate to **SQL Editor**
3. Run the contents of `artifacts/api-server/supabase-setup.sql`

The API server startup logs the SQL Editor URL derived from `SUPABASE_URL` automatically if tables are missing.

### Pending migrations — run in Supabase Dashboard SQL Editor:

**Online Status columns** (shows green dots on user avatars):
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_online boolean DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen timestamptz DEFAULT now();
```

**Unread Messages column** (shows unread badge in sidebar):
```sql
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_read boolean NOT NULL DEFAULT false;
```

Until these are added, the app degrades gracefully (offline status / badge hidden).

### Demo users (password: `password123`):
- `admin@lms.com` — admin role
- `alice@example.com` — creator role
- `bob@example.com` — member role

## Environment Variables / Secrets

### Required at runtime (API server will fail fast if missing):
- `SUPABASE_URL` — Supabase project URL (e.g. `https://<ref>.supabase.co`)
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (backend-only, never exposed to client)
- `SESSION_SECRET` — used for signing JWT tokens (as `JWT_SECRET` in api-server)

### Optional / future use:
- `SUPABASE_ANON_KEY` — Supabase anon key (available if frontend ever calls Supabase directly)
- `SUPABASE_DATABASE_URL` — Direct PostgreSQL connection string (wired in lib/db for Drizzle push, blocked from Replit at runtime)
- `SUPABASE_DB_PASSWORD` — Database password
- `PORT` — auto-assigned by Replit per artifact
- `BASE_PATH` — auto-assigned by Replit per artifact

## Pages

| Route | Description | Access |
|-------|-------------|--------|
| `/login` | Login page | Public |
| `/signup` | Registration | Public |
| `/dashboard` | Stats + activity feed | All logged-in |
| `/courses` | Browse + enroll courses | All logged-in |
| `/courses/:id` | Course detail + lessons | All logged-in |
| `/community` | Posts + comments + likes | All logged-in |
| `/profile` | Edit profile + social links | All logged-in |
| `/admin` | User management + analytics | Admin only |

## API Routes (prefix: `/api`)

- `POST /auth/signup`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`
- `GET /users`, `GET /users/:id`, `PATCH /users/:id`, `PATCH /users/:id/role`
- `GET /courses`, `POST /courses`, `GET /courses/:id`, `DELETE /courses/:id`
- `GET /courses/:id/lessons`, `POST /courses/:id/lessons`, `DELETE /lessons/:id`
- `GET /enrollments`, `POST /enrollments`, `PATCH /enrollments/:courseId/progress`
- `GET /posts`, `POST /posts`, `DELETE /posts/:id`, `POST /posts/:id/like`
- `GET /posts/:id/comments`, `POST /posts/:id/comments`, `DELETE /comments/:id`
- `GET /dashboard/stats`, `GET /dashboard/activity`
- `GET /notifications`, `GET /notifications/unread-count`
- `PATCH /notifications/:id/read`, `PATCH /notifications/read-all`

## Design

- Purple primary: `hsl(258, 89%, 66%)`
- Deep navy sidebar: `hsl(222, 47%, 11%)`
- Font: Inter (Google Fonts)
- Light/dark mode toggle in sidebar footer
- Fully responsive (mobile hamburger menu)

## File Structure

```
artifacts/
  lms/                    # Frontend React Vite app
    src/
      pages/              # login, signup, dashboard, courses, course-detail, community, profile, admin
      components/         # layout.tsx, ui/ (shadcn components)
      lib/                # auth.tsx, theme.tsx, init-api.ts, utils.ts
  api-server/
    src/
      routes/             # auth, users, courses, lessons, enrollments, posts, dashboard
      lib/                # auth (JWT middleware), supabase (client), logger
    supabase-setup.sql    # SQL to create tables + seed demo data in Supabase Dashboard
lib/
  api-spec/               # OpenAPI YAML spec
  api-client-react/       # Generated React Query hooks (orval)
  api-zod/                # Generated Zod schemas
  db/                     # Drizzle schema (kept as reference, no longer used at runtime)
```
