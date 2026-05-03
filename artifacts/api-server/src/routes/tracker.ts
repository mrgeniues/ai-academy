import { Router, type IRouter } from "express";
import { requireAuth, requireAdmin } from "../lib/auth";
import { supabase } from "../lib/supabase";

const router: IRouter = Router();

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
