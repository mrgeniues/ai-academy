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

export default router;
