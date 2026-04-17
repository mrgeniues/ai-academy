import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
import { z } from "zod";
import { broadcastNotification } from "../lib/notifications";

const router: IRouter = Router();

const CreateCourseBodyExtended = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  thumbnail: z.string().optional().nullable(),
  externalUrl: z.string().optional().nullable(),
  visibility: z.enum(["public", "private"]).default("public"),
  enrollmentMode: z.enum(["open", "approval_required"]).default("approval_required"),
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
  enrollmentMode: z.enum(["open", "approval_required"]).optional(),
});

type DbCourse = {
  id: number;
  title: string;
  description: string | null;
  thumbnail: string | null;
  external_url: string | null;
  visibility: string;
  enrollment_mode: string | null;
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
    enrollmentMode: (course.enrollment_mode ?? "approval_required") as "open" | "approval_required",
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

  const { title, description, thumbnail, externalUrl, visibility, enrollmentMode, lessons } = parsed.data;

  // Build insert payload dynamically so missing optional columns don't crash the insert
  const coursePayload: Record<string, unknown> = {
    title,
    description: description ?? null,
    created_by: req.userId!,
  };
  if (thumbnail != null) coursePayload.thumbnail = thumbnail;
  if (externalUrl != null) coursePayload.external_url = externalUrl;
  coursePayload.visibility = visibility;
  coursePayload.enrollment_mode = enrollmentMode;

  let { data: course, error } = await supabase
    .from("courses")
    .insert(coursePayload)
    .select()
    .single();

  // If optional columns don't exist yet (pending migration), retry with only the core columns
  if (error && (error.message.includes("visibility") || error.message.includes("external_url") || error.message.includes("enrollment_mode"))) {
    console.warn("[POST /courses] Optional column missing, retrying with core fields only:", error.message);
    const fallbackPayload = {
      title: coursePayload.title,
      description: coursePayload.description,
      created_by: coursePayload.created_by,
      ...(coursePayload.thumbnail != null ? { thumbnail: coursePayload.thumbnail } : {}),
    };
    const retry = await supabase.from("courses").insert(fallbackPayload).select().single();
    course = retry.data;
    error = retry.error;
  }

  if (error || !course) {
    console.error("[POST /courses] Supabase error:", error?.message, error?.details, error?.hint);
    res.status(500).json({ error: error?.message ?? "Failed to create course" });
    return;
  }

  type LessonInput = { title: string; description?: string | null; videoUrl?: string | null };
  if (lessons && lessons.length > 0) {
    const lessonPayload = (lessons as LessonInput[]).map((l, i) => {
      const row: Record<string, unknown> = {
        course_id: course.id,
        title: l.title,
        order: i + 1,
      };
      // Map description → content (more widely supported column in existing DBs)
      // Only include when non-empty to avoid PGRST204 on missing columns
      if (l.description) row.content = l.description;
      if (l.videoUrl) row.video_url = l.videoUrl;
      return row;
    });
    const { error: lessonError } = await supabase.from("lessons").insert(lessonPayload);
    if (lessonError) {
      console.error("[POST /courses] Lesson insert error:", lessonError.message, lessonError.details, lessonError.hint, lessonError.code);
    }
  }

  broadcastNotification({
    type: "admin_course",
    title: "New Course Available",
    message: `Admin added a new course: ${title}`,
    courseId: course.id,
    isVip: true,
    excludeUserId: req.userId!,
  }).catch(err => console.error("[broadcastNotification] Failed:", err));

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

  const isAdminUser = req.userRole === "admin";
  const enrollmentRecord = enrollment as Record<string, unknown> | null;
  const enrollmentApproved = enrollmentRecord && enrollmentRecord.is_approved !== false;
  const canSeePrivate = isAdminUser || !!enrollmentApproved;

  const visibleLessons = canSeePrivate
    ? (lessons ?? [])
    : (lessons ?? []).filter(l => l.is_public !== false);

  res.json({
    ...formatCourse(course as DbCourse, lessonCount ?? 0, enrollmentCount ?? 0),
    lessons: visibleLessons.map(l => {
      const lessonIsPrivate = l.is_public === false;
      // Non-admins never receive the sensitive fields of private lessons
      const stripContent = lessonIsPrivate && !isAdminUser;
      return {
        id: l.id,
        courseId: l.course_id,
        title: l.title,
        description: stripContent ? null : (l.description ?? null),
        videoUrl: stripContent ? null : (l.video_url ?? null),
        content: stripContent ? null : (l.content ?? null),
        order: l.order,
        isPublic: l.is_public ?? true,
        isCompleted: completedLessonIds.includes(l.id),
        createdAt: l.created_at,
      };
    }),
    isEnrolled: !!enrollment,
    enrollmentApproved: enrollment ? ((enrollment as Record<string, unknown>).is_approved ?? true) : null,
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

  // Fetch current course state before updating so we can detect a real mode transition
  const { data: existingCourse } = await supabase
    .from("courses")
    .select("enrollment_mode")
    .eq("id", id)
    .maybeSingle();

  if (!existingCourse) { res.status(404).json({ error: "Course not found" }); return; }

  const updates: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) updates.title = parsed.data.title;
  if (parsed.data.description !== undefined) updates.description = parsed.data.description;
  if (parsed.data.thumbnail !== undefined) updates.thumbnail = parsed.data.thumbnail;
  if (parsed.data.externalUrl !== undefined) updates.external_url = parsed.data.externalUrl;
  if (parsed.data.visibility !== undefined) updates.visibility = parsed.data.visibility;
  if (parsed.data.enrollmentMode !== undefined) updates.enrollment_mode = parsed.data.enrollmentMode;

  const { error: updateError } = await supabase.from("courses").update(updates).eq("id", id);

  // If enrollment_mode column doesn't exist yet, retry without it
  let updateSucceeded = !updateError;
  if (updateError && updateError.message.includes("enrollment_mode")) {
    const { enrollment_mode: _omit, ...fallbackUpdates } = updates as Record<string, unknown> & { enrollment_mode?: unknown };
    const { error: fallbackError } = await supabase.from("courses").update(fallbackUpdates).eq("id", id);
    updateSucceeded = !fallbackError;
  }

  // Auto-approve pending enrollments only when the course actually transitioned to open enrollment
  const previousMode = (existingCourse as Record<string, unknown>).enrollment_mode ?? "approval_required";
  const switchingToOpen = parsed.data.enrollmentMode === "open" && previousMode !== "open";
  if (updateSucceeded && switchingToOpen) {
    const { error: approveError } = await supabase
      .from("enrollments")
      .update({ is_approved: true })
      .eq("course_id", id)
      .eq("is_approved", false);
    if (approveError) {
      console.error("[PATCH /courses/:id] Failed to auto-approve pending enrollments:", approveError.message);
    }
  }

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
