import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";

const router: IRouter = Router();

router.get("/dashboard/stats", requireAuth, async (req, res): Promise<void> => {
  const { count: totalUsers } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true });

  const { count: totalCourses } = await supabase
    .from("courses")
    .select("*", { count: "exact", head: true });

  const { count: totalEnrollments } = await supabase
    .from("enrollments")
    .select("*", { count: "exact", head: true });

  const { count: totalPosts } = await supabase
    .from("posts")
    .select("*", { count: "exact", head: true });

  const { data: myEnrollments } = await supabase
    .from("enrollments")
    .select("progress")
    .eq("user_id", req.userId!);

  const myEnrollmentList = myEnrollments ?? [];
  const myProgress = myEnrollmentList.length > 0
    ? Math.round(myEnrollmentList.reduce((sum, e) => sum + e.progress, 0) / myEnrollmentList.length)
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
  const { data: recentPosts } = await supabase
    .from("posts")
    .select("id, user_id, created_at")
    .order("created_at", { ascending: true })
    .limit(10);

  const { data: recentEnrollments } = await supabase
    .from("enrollments")
    .select("id, user_id, course_id, created_at")
    .order("created_at", { ascending: true })
    .limit(10);

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
    const { data: user } = await supabase
      .from("users")
      .select("name, avatar")
      .eq("id", post.user_id)
      .maybeSingle();

    activity.push({
      id: post.id,
      type: "post",
      message: `${user?.name ?? "Someone"} shared a new post`,
      createdAt: post.created_at,
      userId: post.user_id,
      userName: user?.name ?? "Unknown",
      userAvatar: user?.avatar ?? null,
    });
  }

  for (const enrollment of recentEnrollments ?? []) {
    const { data: user } = await supabase
      .from("users")
      .select("name, avatar")
      .eq("id", enrollment.user_id)
      .maybeSingle();

    const { data: course } = await supabase
      .from("courses")
      .select("title")
      .eq("id", enrollment.course_id)
      .maybeSingle();

    activity.push({
      id: enrollment.id + 100000,
      type: "enrollment",
      message: `${user?.name ?? "Someone"} enrolled in ${course?.title ?? "a course"}`,
      createdAt: enrollment.created_at,
      userId: enrollment.user_id,
      userName: user?.name ?? "Unknown",
      userAvatar: user?.avatar ?? null,
    });
  }

  activity.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json(activity.slice(0, 15));
});

export default router;
