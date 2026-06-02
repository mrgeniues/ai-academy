import { Router, type IRouter } from "express";
import { supabase } from "../lib/supabase";

const router: IRouter = Router();

router.get("/public/stats", async (_req, res): Promise<void> => {
  const [
    { count: totalCourses },
    { count: totalUsers },
    { count: totalLessons },
  ] = await Promise.all([
    supabase.from("courses").select("*", { count: "exact", head: true }).eq("visibility", "public"),
    supabase.from("users").select("*", { count: "exact", head: true }),
    supabase.from("lessons").select("*", { count: "exact", head: true }),
  ]);

  res.json({
    totalCourses: totalCourses ?? 0,
    totalMembers: totalUsers ?? 0,
    totalLessons: totalLessons ?? 0,
  });
});

router.get("/public/courses", async (_req, res): Promise<void> => {
  const { data: courses, error } = await supabase
    .from("courses")
    .select("id, title, description, thumbnail, visibility, enrollment_mode")
    .eq("visibility", "public")
    .order("created_at", { ascending: true })
    .limit(6);

  if (error) {
    res.status(500).json({ error: "Failed to fetch courses" });
    return;
  }

  const courseIds = (courses ?? []).map((c) => c.id as number);

  const [{ data: lessonCounts }, { data: enrollmentCounts }] = await Promise.all([
    supabase
      .from("lessons")
      .select("course_id")
      .in("course_id", courseIds.length ? courseIds : [0]),
    supabase
      .from("enrollments")
      .select("course_id")
      .in("course_id", courseIds.length ? courseIds : [0]),
  ]);

  const lessonMap = (lessonCounts ?? []).reduce<Record<number, number>>((acc, l) => {
    acc[l.course_id] = (acc[l.course_id] ?? 0) + 1;
    return acc;
  }, {});

  const enrollmentMap = (enrollmentCounts ?? []).reduce<Record<number, number>>((acc, e) => {
    acc[e.course_id] = (acc[e.course_id] ?? 0) + 1;
    return acc;
  }, {});

  const result = (courses ?? []).map((c) => ({
    id: c.id,
    title: c.title,
    description: c.description ?? null,
    thumbnail: c.thumbnail ?? null,
    enrollmentMode: (c.enrollment_mode ?? "approval_required") as "open" | "approval_required",
    lessonCount: lessonMap[c.id as number] ?? 0,
    enrollmentCount: enrollmentMap[c.id as number] ?? 0,
  }));

  res.json(result);
});

export default router;
