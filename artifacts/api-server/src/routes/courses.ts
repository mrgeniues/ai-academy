import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
import { z } from "zod";

const router: IRouter = Router();

const CreateCourseBodyExtended = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  thumbnail: z.string().optional().nullable(),
  externalUrl: z.string().optional().nullable(),
  visibility: z.enum(["public", "private"]).default("public"),
  lessons: z.array(z.object({
    title: z.string().min(1),
    description: z.string().optional().nullable(),
    videoUrl: z.string().optional().nullable(),
  })).optional().default([]),
});

const UpdateCourseBodyExtended = z.object({
  title: z.string().optional(),
  description: z.string().optional().nullable(),
  thumbnail: z.string().optional().nullable(),
  externalUrl: z.string().optional().nullable(),
  visibility: z.enum(["public", "private"]).optional(),
});

type DbCourse = {
  id: number;
  title: string;
  description: string | null;
  thumbnail: string | null;
  external_url: string | null;
  visibility: string;
  created_by: number;
  created_at: string;
  updated_at: string;
};

function formatCourse(course: DbCourse, lessonCount: number, enrollmentCount: number) {
  return {
    id: course.id,
    title: course.title,
    description: course.description ?? null,
    thumbnail: course.thumbnail ?? null,
    externalUrl: course.external_url ?? null,
    visibility: course.visibility ?? "public",
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
  if (courseIds.length === 0) { res.json([]); return; }

  const [{ data: lessonRows }, { data: enrollmentRows }] = await Promise.all([
    supabase.from("lessons").select("course_id").in("course_id", courseIds),
    supabase.from("enrollments").select("course_id").in("course_id", courseIds),
  ]);

  const lessonCountMap = new Map<number, number>();
  const enrollmentCountMap = new Map<number, number>();
  for (const l of lessonRows ?? []) lessonCountMap.set(l.course_id, (lessonCountMap.get(l.course_id) ?? 0) + 1);
  for (const e of enrollmentRows ?? []) enrollmentCountMap.set(e.course_id, (enrollmentCountMap.get(e.course_id) ?? 0) + 1);

  res.json((courses ?? []).map(c => formatCourse(c as DbCourse, lessonCountMap.get(c.id) ?? 0, enrollmentCountMap.get(c.id) ?? 0)));
});

router.post("/courses", requireAuth, async (req, res): Promise<void> => {
  if (req.userRole !== "admin") {
    res.status(403).json({ error: "Only admins can create courses" });
    return;
  }

  const parsed = CreateCourseBodyExtended.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { title, description, thumbnail, externalUrl, visibility, lessons } = parsed.data;

  const { data: course, error } = await supabase
    .from("courses")
    .insert({ title, description: description ?? null, thumbnail: thumbnail ?? null, external_url: externalUrl ?? null, visibility, created_by: req.userId! })
    .select()
    .single();

  if (error || !course) {
    res.status(500).json({ error: "Failed to create course" });
    return;
  }

  type LessonInput = { title: string; description?: string | null; videoUrl?: string | null };
  if (lessons && lessons.length > 0) {
    await supabase.from("lessons").insert(
      (lessons as LessonInput[]).map((l, i) => ({
        course_id: course.id,
        title: l.title,
        description: l.description ?? null,
        video_url: l.videoUrl ?? null,
        order: i + 1,
      }))
    );
  }

  res.status(201).json(formatCourse(course as DbCourse, lessons?.length ?? 0, 0));
});

router.get("/courses/:id", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid course id" }); return; }

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

  if (!course) { res.status(404).json({ error: "Course not found" }); return; }

  // Get completed lessons for this user in this course
  const lessonIds = (lessons ?? []).map(l => l.id);
  let completedLessonIds: number[] = [];
  if (lessonIds.length > 0 && enrollment) {
    const { data: completions } = await supabase
      .from("lesson_completions")
      .select("lesson_id")
      .eq("user_id", req.userId!)
      .in("lesson_id", lessonIds);
    completedLessonIds = (completions ?? []).map(c => c.lesson_id);
  }

  res.json({
    ...formatCourse(course as DbCourse, lessonCount ?? 0, enrollmentCount ?? 0),
    lessons: (lessons ?? []).map(l => ({
      id: l.id,
      courseId: l.course_id,
      title: l.title,
      description: l.description ?? null,
      videoUrl: l.video_url ?? null,
      content: l.content ?? null,
      order: l.order,
      isCompleted: completedLessonIds.includes(l.id),
      createdAt: l.created_at,
    })),
    isEnrolled: !!enrollment,
    progress: enrollment?.progress ?? null,
    completedLessons: completedLessonIds.length,
  });
});

router.patch("/courses/:id", requireAuth, async (req, res): Promise<void> => {
  if (req.userRole !== "admin") {
    res.status(403).json({ error: "Only admins can edit courses" });
    return;
  }

  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid course id" }); return; }

  const parsed = UpdateCourseBodyExtended.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const updates: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) updates.title = parsed.data.title;
  if (parsed.data.description !== undefined) updates.description = parsed.data.description;
  if (parsed.data.thumbnail !== undefined) updates.thumbnail = parsed.data.thumbnail;
  if (parsed.data.externalUrl !== undefined) updates.external_url = parsed.data.externalUrl;
  if (parsed.data.visibility !== undefined) updates.visibility = parsed.data.visibility;

  await supabase.from("courses").update(updates).eq("id", id);

  const [{ data: updated }, { count: lc }, { count: ec }] = await Promise.all([
    supabase.from("courses").select("*").eq("id", id).maybeSingle(),
    supabase.from("lessons").select("*", { count: "exact", head: true }).eq("course_id", id),
    supabase.from("enrollments").select("*", { count: "exact", head: true }).eq("course_id", id),
  ]);

  if (!updated) { res.status(404).json({ error: "Course not found" }); return; }
  res.json(formatCourse(updated as DbCourse, lc ?? 0, ec ?? 0));
});

router.delete("/courses/:id", requireAuth, async (req, res): Promise<void> => {
  if (req.userRole !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid course id" }); return; }

  await supabase.from("courses").delete().eq("id", id);
  res.sendStatus(204);
});

export default router;
