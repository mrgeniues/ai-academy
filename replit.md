# LearnHub LMS Platform

A full-stack SaaS Learning Management System (LMS) similar to Skool.com, built on a pnpm monorepo.

## Architecture

- **Monorepo**: pnpm workspace at `/home/runner/workspace`
- **Frontend**: React + Vite (`artifacts/lms`) — served at path `/`
- **Backend**: Express 5 + Node.js (`artifacts/api-server`) — runs on port 8080
- **Database**: PostgreSQL + Drizzle ORM (`lib/db`)
- **API client**: Auto-generated React Query hooks from OpenAPI spec (`lib/api-client-react`)

## Key Technologies

- **Frontend**: React 19, Vite 7, TailwindCSS v4, shadcn/ui, React Query, Wouter, Zod, date-fns, react-icons
- **Backend**: Express 5, jsonwebtoken (JWT auth), bcryptjs (password hashing), Pino logging
- **DB**: Drizzle ORM, PostgreSQL

## Workflows

- `artifacts/lms: web` — Frontend dev server (Vite, port assigned via PORT env var)
- `artifacts/api-server: API Server` — Backend API (port 8080)

The frontend proxies `/api/*` requests to `http://localhost:8080` via Vite dev proxy.

## Authentication

- JWT-based, stored in `localStorage` as `lms_token`
- Token is injected as `Authorization: Bearer <token>` header via `setAuthTokenGetter` in the API client
- Three roles: `member`, `creator`, `admin`

## Database

Seeded users:
- `admin@lms.com` / `password123` — admin role
- `alice@example.com` / `password123` — member role  
- `bob@example.com` / `password123` — creator role

Seeded content: 3 courses, 10 lessons (on course 1), 3 community posts, 3 enrollments

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
- `GET /enrollments/me`, `POST /enrollments`, `PATCH /enrollments/:courseId/progress`
- `GET /posts`, `POST /posts`, `DELETE /posts/:id`, `POST /posts/:id/like`
- `GET /posts/:id/comments`, `POST /posts/:id/comments`, `DELETE /comments/:id`
- `GET /dashboard/stats`, `GET /dashboard/activity`

## Environment Variables

- `SESSION_SECRET` — used for signing JWT tokens (as `JWT_SECRET` in api-server)
- `DATABASE_URL` — PostgreSQL connection string
- `PORT` — auto-assigned by Replit per artifact
- `BASE_PATH` — auto-assigned by Replit per artifact

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
      lib/                # auth (JWT), logger
lib/
  api-spec/               # OpenAPI YAML spec
  api-client-react/       # Generated React Query hooks (orval)
  api-zod/                # Generated Zod schemas
  db/                     # Drizzle schema + migrations + seed
```
