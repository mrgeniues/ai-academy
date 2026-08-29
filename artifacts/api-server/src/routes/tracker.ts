import { Router, type IRouter } from "express";
import { requireAuth, requireAdmin } from "../lib/auth";
import { supabase } from "../lib/supabase";
import { isFreshPresence, PRESENCE_STALE_MS } from "../lib/presence";

const router: IRouter = Router();

type PresenceUser = {
  id: number;
  name: string;
  email: string;
  avatar: string | null;
  role: string;
  is_online: boolean | null;
  last_seen: string | null;
  last_login: string | null;
  last_logout: string | null;
  created_at: string;
};

type PresenceSession = {
  id: number;
  user_id: number;
  started_at: string;
  last_seen: string;
  ended_at: string | null;
};

function toSeconds(start: string, end: string, rangeStart: number, rangeEnd: number): number {
  const from = Math.max(new Date(start).getTime(), rangeStart);
  const until = Math.min(new Date(end).getTime(), rangeEnd);
  return until > from ? Math.floor((until - from) / 1000) : 0;
}

function mergeIntervals(intervals: Array<[number, number]>): number {
  const sorted = intervals.filter(([start, end]) => end > start).sort((a, b) => a[0] - b[0]);
  let total = 0;
  let current: [number, number] | null = null;
  for (const interval of sorted) {
    if (!current) {
      current = interval;
    } else if (interval[0] <= current[1]) {
      current[1] = Math.max(current[1], interval[1]);
    } else {
      total += current[1] - current[0];
      current = interval;
    }
  }
  if (current) total += current[1] - current[0];
  return Math.floor(total / 1000);
}

// GET /api/tracker/presence — live users plus today's online/offline totals (admin only)
router.get("/tracker/presence", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const dayStartMs = dayStart.getTime();
  const staleBefore = new Date(now - PRESENCE_STALE_MS).toISOString();

  const [{ data: rawUsers, error: usersError }, { data: rawSessions, error: sessionsError }] = await Promise.all([
    supabase
      .from("users")
      .select("id, name, email, avatar, role, is_online, last_seen, last_login, last_logout, created_at")
      .order("name", { ascending: true }),
    supabase
      .from("user_presence_sessions")
      .select("id, user_id, started_at, last_seen, ended_at")
      .gte("last_seen", dayStart.toISOString())
      .order("started_at", { ascending: true }),
  ]);

  if (usersError) {
    req.log.error({ error: usersError.message }, "Failed to fetch presence users");
    res.status(500).json({ error: "Failed to fetch presence data" });
    return;
  }

  const users = (rawUsers ?? []) as PresenceUser[];
  const trackingAvailable = !sessionsError;
  const sessions = trackingAvailable ? ((rawSessions ?? []) as PresenceSession[]) : [];
  const sessionsByUser = new Map<number, PresenceSession[]>();
  for (const session of sessions) {
    const existing = sessionsByUser.get(session.user_id) ?? [];
    existing.push(session);
    sessionsByUser.set(session.user_id, existing);
  }

  const liveUsers: Array<{
    id: number; name: string; email: string; avatar: string | null; role: string;
    startedAt: string; lastSeen: string; currentSeconds: number;
  }> = [];
  const summaries = users.map((u) => {
    const userSessions = sessionsByUser.get(u.id) ?? [];
    const liveSessions = userSessions.filter((session) =>
      !session.ended_at && new Date(session.last_seen).getTime() >= now - PRESENCE_STALE_MS
    );
    const legacyLive = liveSessions.length === 0 && !trackingAvailable && Boolean(u.is_online) && isFreshPresence(u.last_seen, now);
    const isOnline = liveSessions.length > 0 || legacyLive;
    const onlineIntervals: Array<[number, number]> = [];
    for (const session of userSessions) {
      const started = new Date(session.started_at).getTime();
      const ended = session.ended_at
        ? new Date(session.ended_at).getTime()
        : Math.min(new Date(session.last_seen).getTime(), now);
      onlineIntervals.push([Math.max(started, dayStartMs), Math.min(ended, now)]);
    }
    const onlineSecondsToday = mergeIntervals(onlineIntervals);
    const accountStart = Math.max(dayStartMs, new Date(u.created_at).getTime());
    const offlineSecondsToday = Math.max(0, Math.floor((now - accountStart) / 1000) - onlineSecondsToday);
    const latestSession = userSessions[userSessions.length - 1];
    const lastSeen = u.last_seen ?? latestSession?.last_seen ?? null;
    const lastOnlineAt = userSessions.length > 0
      ? userSessions.reduce((latest, session) => session.started_at > latest ? session.started_at : latest, userSessions[0].started_at)
      : u.last_login;
    const lastOfflineAt = userSessions
      .filter((session) => session.ended_at)
      .reduce<string | null>((latest, session) =>
        !latest || session.ended_at! > latest ? session.ended_at : latest, u.last_logout);

    if (isOnline) {
      const startedAt = liveSessions.length > 0
        ? liveSessions.reduce((earliest, session) => session.started_at < earliest ? session.started_at : earliest, liveSessions[0].started_at)
        : u.last_login ?? lastSeen ?? nowIso;
      const liveLastSeen = liveSessions.length > 0
        ? liveSessions.reduce((latest, session) => session.last_seen > latest ? session.last_seen : latest, liveSessions[0].last_seen)
        : lastSeen ?? nowIso;
      liveUsers.push({
        id: u.id,
        name: u.name,
        email: u.email,
        avatar: u.avatar,
        role: u.role,
        startedAt,
        lastSeen: liveLastSeen,
        currentSeconds: Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000)),
      });
    }

    return {
      id: u.id,
      name: u.name,
      email: u.email,
      avatar: u.avatar,
      role: u.role,
      isOnline,
      lastSeen,
      lastOnlineAt,
      lastOfflineAt,
      onlineSecondsToday,
      offlineSecondsToday,
      sessionsToday: userSessions.length,
    };
  });

  // Keep the legacy user flag accurate for the rest of the app after a missed unload event.
  void Promise.all(users.filter((u) => u.is_online && !liveUsers.some((live) => live.id === u.id)).map((u) =>
    supabase.from("users").update({ is_online: false }).eq("id", u.id).lt("last_seen", staleBefore)
  ));

  if (sessionsError) {
    req.log.warn({ error: sessionsError.message }, "Presence sessions table is unavailable; showing legacy presence only");
  }

  liveUsers.sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime());
  res.json({
    onlineCount: liveUsers.length,
    totalUsers: users.length,
    trackedToday: summaries.filter((summary) => summary.sessionsToday > 0).length,
    asOf: nowIso,
    trackingAvailable,
    migrationRequired: !trackingAvailable,
    liveUsers,
    users: summaries,
  });
});

// GET /api/tracker/overview — full platform snapshot (admin only)
router.get("/tracker/overview", requireAuth, requireAdmin, async (_req, res): Promise<void> => {
  const [
    { count: totalUsers },
    { count: pendingUsers },
    { count: totalCourses },
    { count: totalEnrollments },
    { count: pendingEnrollments },
    { count: totalPosts },
    { count: totalCommunities },
    { count: pendingCommunities },
    { count: approvedCommunities },
    { count: totalPayments },
    { count: pendingPayments },
    { count: approvedPayments },
    { count: totalMessages },
    { count: totalTools },
  ] = await Promise.all([
    supabase.from("users").select("*", { count: "exact", head: true }),
    supabase.from("users").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("courses").select("*", { count: "exact", head: true }),
    supabase.from("enrollments").select("*", { count: "exact", head: true }),
    supabase.from("enrollments").select("*", { count: "exact", head: true }).eq("is_approved", false),
    supabase.from("posts").select("*", { count: "exact", head: true }),
    supabase.from("communities").select("*", { count: "exact", head: true }),
    supabase.from("communities").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("communities").select("*", { count: "exact", head: true }).eq("status", "approved"),
    supabase.from("community_payments").select("*", { count: "exact", head: true }),
    supabase.from("community_payments").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("community_payments").select("*", { count: "exact", head: true }).eq("status", "approved"),
    supabase.from("messages").select("*", { count: "exact", head: true }),
    supabase.from("tools").select("*", { count: "exact", head: true }),
  ]);

  res.json({
    users: { total: totalUsers ?? 0, pending: pendingUsers ?? 0 },
    courses: { total: totalCourses ?? 0 },
    enrollments: { total: totalEnrollments ?? 0, pending: pendingEnrollments ?? 0 },
    posts: { total: totalPosts ?? 0 },
    communities: { total: totalCommunities ?? 0, pending: pendingCommunities ?? 0, approved: approvedCommunities ?? 0 },
    payments: { total: totalPayments ?? 0, pending: pendingPayments ?? 0, approved: approvedPayments ?? 0 },
    messages: { total: totalMessages ?? 0 },
    tools: { total: totalTools ?? 0 },
  });
});

// GET /api/tracker/activity — recent activity across all sources (admin only)
router.get("/tracker/activity", requireAuth, requireAdmin, async (_req, res): Promise<void> => {
  const [
    { data: recentUsers },
    { data: recentEnrollments },
    { data: recentPosts },
    { data: recentCommunities },
    { data: recentPayments },
  ] = await Promise.all([
    supabase.from("users").select("id, name, email, created_at, status").order("created_at", { ascending: false }).limit(10),
    supabase.from("enrollments").select("id, created_at, is_approved, member:users(name), course:courses(title)").order("created_at", { ascending: false }).limit(10),
    supabase.from("posts").select("id, created_at, author:users(name)").order("created_at", { ascending: false }).limit(10),
    supabase.from("communities").select("id, name, status, created_at, owner:users(name)").order("created_at", { ascending: false }).limit(10),
    supabase.from("community_payments").select("id, plan, payment_method, status, created_at, user:users(name), community:communities(name)").order("created_at", { ascending: false }).limit(10),
  ]);

  type ActivityItem = { id: string; type: string; message: string; detail: string; status: string; createdAt: string };
  const activity: ActivityItem[] = [];

  for (const u of recentUsers ?? []) {
    activity.push({ id: `user-${u.id}`, type: "user", message: `${u.name} registered`, detail: u.email, status: u.status ?? "active", createdAt: u.created_at });
  }
  for (const e of recentEnrollments ?? []) {
    const member = Array.isArray(e.member) ? e.member[0] : e.member;
    const course = Array.isArray(e.course) ? e.course[0] : e.course;
    activity.push({ id: `enrollment-${e.id}`, type: "enrollment", message: `${(member as {name:string}|null)?.name ?? "Someone"} enrolled in ${(course as {title:string}|null)?.title ?? "a course"}`, detail: "", status: e.is_approved ? "approved" : "pending", createdAt: e.created_at });
  }
  for (const p of recentPosts ?? []) {
    const author = Array.isArray(p.author) ? p.author[0] : p.author;
    activity.push({ id: `post-${p.id}`, type: "post", message: `${(author as {name:string}|null)?.name ?? "Someone"} published a post`, detail: "", status: "active", createdAt: p.created_at });
  }
  for (const c of recentCommunities ?? []) {
    const owner = Array.isArray(c.owner) ? c.owner[0] : c.owner;
    activity.push({ id: `community-${c.id}`, type: "community", message: `Community "${c.name}" created by ${(owner as {name:string}|null)?.name ?? "Unknown"}`, detail: "", status: c.status ?? "pending", createdAt: c.created_at });
  }
  for (const pay of recentPayments ?? []) {
    const user = Array.isArray(pay.user) ? pay.user[0] : pay.user;
    const community = Array.isArray(pay.community) ? pay.community[0] : pay.community;
    activity.push({ id: `payment-${pay.id}`, type: "payment", message: `${(user as {name:string}|null)?.name ?? "Someone"} paid for "${(community as {name:string}|null)?.name ?? "community"}"`, detail: `${pay.plan} · ${pay.payment_method ?? ""}`, status: pay.status ?? "pending", createdAt: pay.created_at });
  }

  activity.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json(activity.slice(0, 40));
});

// GET /api/tracker/users — full user list with stats (admin only)
router.get("/tracker/users", requireAuth, requireAdmin, async (_req, res): Promise<void> => {
  const { data: users } = await supabase
    .from("users")
    .select("id, name, email, role, status, created_at")
    .order("created_at", { ascending: false });

  const { data: enrollmentCounts } = await supabase
    .from("enrollments")
    .select("user_id");

  const { data: postCounts } = await supabase
    .from("posts")
    .select("user_id");

  const enrollMap: Record<number, number> = {};
  for (const e of enrollmentCounts ?? []) {
    enrollMap[e.user_id] = (enrollMap[e.user_id] ?? 0) + 1;
  }
  const postMap: Record<number, number> = {};
  for (const p of postCounts ?? []) {
    postMap[p.user_id] = (postMap[p.user_id] ?? 0) + 1;
  }

  res.json((users ?? []).map(u => ({
    ...u,
    enrollments: enrollMap[u.id] ?? 0,
    posts: postMap[u.id] ?? 0,
  })));
});

// GET /api/tracker/growth — signups per day for last 30 days (admin only)
router.get("/tracker/growth", requireAuth, requireAdmin, async (_req, res): Promise<void> => {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: users } = await supabase
    .from("users")
    .select("created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: true });

  const dayMap: Record<string, number> = {};
  for (const u of users ?? []) {
    const day = u.created_at.slice(0, 10);
    dayMap[day] = (dayMap[day] ?? 0) + 1;
  }

  const result = Object.entries(dayMap).map(([date, count]) => ({ date, count }));
  res.json(result);
});

export default router;
