import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { CreateCourseBody, UpdateCourseBody } from "@workspace/api-zod";
import { supabase } from "../lib/supabase";

const router: IRouter = Router();

type DbCourse = {
  id: number;
  title: string;
  description: string | null;
  thumbnail: string | null;
  created_by: number;
  created_at: string;
  updated_at: string;
};

function formatCourse(
  course: DbCourse,
  lessonCount: number,
  enrollmentCount: number,
) {
  return {
    id: course.id,
    title: course.title,
    description: course.description ?? null,
    thumbnail: course.thumbnail ?? null,
    createdBy: course.created_by,
    lessonCount,
    enrollmentCount,
    createdAt: course.created_at,
    updatedAt: course.updated_at,
  };
}

router.get("/courses", requireAuth, async (_req, res): Promise<void> => {
  const { data: courses, error } = await supabase
    .from("courses")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    res.status(500).json({ error: "Failed to fetch courses" });
    return;
  }

  const courseIds = (courses ?? []).map(c => c.id);

  if (courseIds.length === 0) {
    res.json([]);
    return;
  }

  const [{ data: lessonRows }, { data: enrollmentRows }] = await Promise.all([
    supabase.from("lessons").select("course_id").in("course_id", courseIds),
    supabase.from("enrollments").select("course_id").in("course_id", courseIds),
  ]);

  const lessonCountMap = new Map<number, number>();
  const enrollmentCountMap = new Map<number, number>();
  for (const l of lessonRows ?? []) {
    lessonCountMap.set(l.course_id, (lessonCountMap.get(l.course_id) ?? 0) + 1);
  }
  for (const e of enrollmentRows ?? []) {
    enrollmentCountMap.set(e.course_id, (enrollmentCountMap.get(e.course_id) ?? 0) + 1);
  }

  const enriched = (courses ?? []).map(course =>
    formatCourse(
      course as DbCourse,
      lessonCountMap.get(course.id) ?? 0,
      enrollmentCountMap.get(course.id) ?? 0,
    )
  );

  res.json(enriched);
});

router.post("/courses", requireAuth, async (req, res): Promise<void> => {
  if (req.userRole !== "admin" && req.userRole !== "creator") {
    res.status(403).json({ error: "Only admins or creators can create courses" });
    return;
  }

  const parsed = CreateCourseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { data: course, error } = await supabase
    .from("courses")
    .insert({
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      thumbnail: parsed.data.thumbnail ?? null,
      created_by: req.userId!,
    })
    .select()
    .single();

  if (error || !course) {
    res.status(500).json({ error: "Failed to create course" });
    return;
  }

  res.status(201).json(formatCourse(course as DbCourse, 0, 0));
});

router.get("/courses/:id", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid course id" });
    return;
  }

  const [
    { data: course },
    { data: lessons },
    { data: enrollment },
    { count: lessonCount },
    { count: enrollmentCount },
  ] = await Promise.all([
    supabase.from("courses").select("*").eq("id", id).maybeSingle(),
    supabase.from("lessons").select("*").eq("course_id", id).order("order", { ascending: true }),
    supabase.from("enrollments").select("*").eq("course_id", id).eq("user_id", req.userId!).maybeSingle(),
    supabase.from("lessons").select("*", { count: "exact", head: true }).eq("course_id", id),
    supabase.from("enrollments").select("*", { count: "exact", head: true }).eq("course_id", id),
  ]);

  if (!course) {
    res.status(404).json({ error: "Course not found" });
    return;
  }

  res.json({
    ...formatCourse(course as DbCourse, lessonCount ?? 0, enrollmentCount ?? 0),
    lessons: (lessons ?? []).map(l => ({
      id: l.id,
      courseId: l.course_id,
      title: l.title,
      videoUrl: l.video_url ?? null,
      content: l.content ?? null,
      order: l.order,
      createdAt: l.created_at,
    })),
    isEnrolled: !!enrollment,
    progress: enrollment?.progress ?? null,
  });
});

router.patch("/courses/:id", requireAuth, async (req, res): Promise<void> => {
  if (req.userRole !== "admin" && req.userRole !== "creator") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid course id" });
    return;
  }

  const parsed = UpdateCourseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) updates.title = parsed.data.title;
  if (parsed.data.description !== undefined) updates.description = parsed.data.description;
  if (parsed.data.thumbnail !== undefined) updates.thumbnail = parsed.data.thumbnail;

  await supabase.from("courses").update(updates).eq("id", id);

  const [{ data: updated }, { count: lc }, { count: ec }] = await Promise.all([
    supabase.from("courses").select("*").eq("id", id).maybeSingle(),
    supabase.from("lessons").select("*", { count: "exact", head: true }).eq("course_id", id),
    supabase.from("enrollments").select("*", { count: "exact", head: true }).eq("course_id", id),
  ]);

  if (!updated) {
    res.status(404).json({ error: "Course not found" });
    return;
  }

  res.json(formatCourse(updated as DbCourse, lc ?? 0, ec ?? 0));
});

router.delete("/courses/:id", requireAuth, async (req, res): Promise<void> => {
  if (req.userRole !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid course id" });
    return;
  }

  await supabase.from("courses").delete().eq("id", id);
  res.sendStatus(204);
});

export default router;
