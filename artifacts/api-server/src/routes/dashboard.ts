import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";

const router: IRouter = Router();

router.get("/dashboard/stats", requireAuth, async (req, res): Promise<void> => {
  const [
    { count: totalUsers },
    { count: totalCourses },
    { count: totalEnrollments },
    { count: totalPosts },
    { data: myEnrollments },
  ] = await Promise.all([
    supabase.from("users").select("*", { count: "exact", head: true }),
    supabase.from("courses").select("*", { count: "exact", head: true }),
    supabase.from("enrollments").select("*", { count: "exact", head: true }),
    supabase.from("posts").select("*", { count: "exact", head: true }),
    supabase.from("enrollments").select("progress").eq("user_id", req.userId!),
  ]);

  const myEnrollmentList = myEnrollments ?? [];
  const myProgress =
    myEnrollmentList.length > 0
      ? Math.round(
          myEnrollmentList.reduce((sum, e) => sum + e.progress, 0) /
            myEnrollmentList.length,
        )
      : 0;

  res.json({
    totalUsers: totalUsers ?? 0,
    totalCourses: totalCourses ?? 0,
    totalEnrollments: totalEnrollments ?? 0,
    totalPosts: totalPosts ?? 0,
    myEnrollments: myEnrollmentList.length,
    myProgress,
  });
});

router.get("/dashboard/activity", requireAuth, async (_req, res): Promise<void> => {
  const [{ data: recentPosts }, { data: recentEnrollments }] = await Promise.all([
    supabase
      .from("posts")
      .select("id, user_id, created_at, author:users(name, avatar)")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("enrollments")
      .select("id, user_id, course_id, created_at, member:users(name, avatar), course:courses(title)")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const activity: Array<{
    id: number;
    type: string;
    message: string;
    createdAt: string;
    userId: number;
    userName: string;
    userAvatar: string | null;
  }> = [];

  for (const post of recentPosts ?? []) {
    const author = Array.isArray(post.author) ? post.author[0] : post.author;
    activity.push({
      id: post.id,
      type: "post",
      message: `${author?.name ?? "Someone"} shared a new post`,
      createdAt: post.created_at,
      userId: post.user_id,
      userName: author?.name ?? "Unknown",
      userAvatar: author?.avatar ?? null,
    });
  }

  for (const enrollment of recentEnrollments ?? []) {
    const member = Array.isArray(enrollment.member) ? enrollment.member[0] : enrollment.member;
    const course = Array.isArray(enrollment.course) ? enrollment.course[0] : enrollment.course;
    activity.push({
      id: enrollment.id + 100000,
      type: "enrollment",
      message: `${member?.name ?? "Someone"} enrolled in ${course?.title ?? "a course"}`,
      createdAt: enrollment.created_at,
      userId: enrollment.user_id,
      userName: member?.name ?? "Unknown",
      userAvatar: member?.avatar ?? null,
    });
  }

  activity.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  res.json(activity.slice(0, 15));
});

// Role-based member list
// Admin: name + email + createdAt; User: name only
router.get("/dashboard/members", requireAuth, async (req, res): Promise<void> => {
  const isAdmin = req.userRole === "admin";

  if (isAdmin) {
    const { data, error } = await supabase
      .from("users")
      .select("id, name, email, created_at")
      .order("created_at", { ascending: true });

    if (error) { res.status(500).json({ error: "Failed to fetch members" }); return; }

    res.json((data ?? []).map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      createdAt: u.created_at,
    })));
  } else {
    const { data, error } = await supabase
      .from("users")
      .select("id, name")
      .order("name", { ascending: true });

    if (error) { res.status(500).json({ error: "Failed to fetch members" }); return; }

    res.json((data ?? []).map(u => ({ id: u.id, name: u.name })));
  }
});

// Enrollment details — role-based
// Admin: all users with their enrollments + progress
// User: own enrollments with course info + progress
router.get("/dashboard/enrollments", requireAuth, async (req, res): Promise<void> => {
  const isAdmin = req.userRole === "admin";

  if (isAdmin) {
    const { data: enrollments, error } = await supabase
      .from("enrollments")
      .select("user_id, progress, course:courses(id, title), member:users(id, name)")
      .order("user_id", { ascending: true });

    if (error) { res.status(500).json({ error: "Failed to fetch enrollments" }); return; }

    // Group by user
    const userMap = new Map<number, { userId: number; userName: string; courses: { title: string; progress: number }[] }>();

    for (const e of enrollments ?? []) {
      const member = Array.isArray(e.member) ? e.member[0] : e.member;
      const course = Array.isArray(e.course) ? e.course[0] : e.course;
      if (!member || !course) continue;

      const uid = member.id as number;
      if (!userMap.has(uid)) {
        userMap.set(uid, { userId: uid, userName: member.name as string, courses: [] });
      }
      userMap.get(uid)!.courses.push({ title: course.title as string, progress: e.progress });
    }

    res.json(Array.from(userMap.values()));
  } else {
    const { data: enrollments, error } = await supabase
      .from("enrollments")
      .select("progress, is_approved, course:courses(id, title)")
      .eq("user_id", req.userId!)
      .order("created_at", { ascending: true });

    if (error) { res.status(500).json({ error: "Failed to fetch enrollments" }); return; }

    res.json((enrollments ?? []).map(e => {
      const course = Array.isArray(e.course) ? e.course[0] : e.course;
      return { title: course?.title ?? "Unknown Course", progress: e.progress, isApproved: e.is_approved };
    }));
  }
});

// Average progress details — role-based
// Admin: own avg + all users' averages
// User: own avg per course
router.get("/dashboard/progress", requireAuth, async (req, res): Promise<void> => {
  const isAdmin = req.userRole === "admin";

  if (isAdmin) {
    // Own progress
    const { data: myEnrollments } = await supabase
      .from("enrollments")
      .select("progress, course:courses(title)")
      .eq("user_id", req.userId!);

    const myAvg = myEnrollments && myEnrollments.length > 0
      ? Math.round(myEnrollments.reduce((s, e) => s + e.progress, 0) / myEnrollments.length)
      : 0;

    // All users' average
    const { data: allEnrollments } = await supabase
      .from("enrollments")
      .select("user_id, progress, member:users(name)")
      .order("user_id", { ascending: true });

    const userAvgMap = new Map<number, { name: string; total: number; count: number }>();
    for (const e of allEnrollments ?? []) {
      const member = Array.isArray(e.member) ? e.member[0] : e.member;
      if (!member) continue;
      const uid = e.user_id as number;
      if (!userAvgMap.has(uid)) {
        userAvgMap.set(uid, { name: member.name as string, total: 0, count: 0 });
      }
      const entry = userAvgMap.get(uid)!;
      entry.total += e.progress;
      entry.count += 1;
    }

    const allUsersProgress = Array.from(userAvgMap.entries()).map(([, v]) => ({
      name: v.name,
      avgProgress: v.count > 0 ? Math.round(v.total / v.count) : 0,
    })).sort((a, b) => b.avgProgress - a.avgProgress);

    const myCourses = (myEnrollments ?? []).map(e => {
      const course = Array.isArray(e.course) ? e.course[0] : e.course;
      return { title: course?.title ?? "Unknown", progress: e.progress };
    });

    res.json({ myAvg, myCourses, allUsersProgress });
  } else {
    const { data: enrollments } = await supabase
      .from("enrollments")
      .select("progress, course:courses(title)")
      .eq("user_id", req.userId!);

    const courses = (enrollments ?? []).map(e => {
      const course = Array.isArray(e.course) ? e.course[0] : e.course;
      return { title: course?.title ?? "Unknown", progress: e.progress };
    });

    const avgProgress = courses.length > 0
      ? Math.round(courses.reduce((s, c) => s + c.progress, 0) / courses.length)
      : 0;

    res.json({ avgProgress, courses });
  }
});

export default router;
