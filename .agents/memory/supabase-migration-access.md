---
name: Supabase migration access
description: External Supabase schema migrations may need to be applied through the provider SQL Editor when workspace database networking cannot resolve the direct Postgres host.
---

The workspace can reach the Supabase REST API but may not be able to resolve the external direct PostgreSQL host from shell commands. In that case, schema DDL should be applied through the Supabase SQL Editor using the prepared migration SQL, then verified from the app.

**Why:** A direct `psql` migration can fail at DNS resolution even while the running API can use Supabase REST, and REST can verify table existence but cannot execute arbitrary DDL.

**How to apply:** Prefer an idempotent migration block and confirm the new table through the Admin Tracker migration notice and API startup check.