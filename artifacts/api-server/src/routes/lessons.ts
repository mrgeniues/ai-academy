import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
import { z } from "zod";

const router: IRouter = Router();

const CreateLessonBodyExt = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  videoUrl: z.string().optional().nullable(),
  content: z.string().optional().nullable(),
  order: z.number().optional(),
});

function formatLesson(lesson: Record<string, unknown>, isCompleted = false) {
  return {
    id: lesson.id,
    courseId: lesson.course_id,
    title: lesson.title,
    description: (lesson.description as string) ?? null,
    videoUrl: (lesson.video_url as string) ?? null,
    content: (lesson.content as string) ?? null,
    order: lesson.order,
    isCompleted,
    createdAt: lesson.created_at,
  };
}

router.get("/courses/:courseId/lessons", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.courseId) ? req.params.courseId[0] : req.params.courseId;
  const courseId = parseInt(rawId, 10);
  if (isNaN(courseId)) { res.status(400).json({ error: "Invalid course id" }); return; }

  if (req.userRole !== "admin") {
    const { data: enrollment } = await supabase
      .from("enrollments")
      .select("id, is_approved")
      .eq("user_id", req.userId!)
      .eq("course_id", courseId)
      .maybeSingle();

    if (!enrollment) {
      res.status(403).json({ error: "Not enrolled in this course" });
      return;
    }

    const approved = (enrollment as Record<string, unknown>).is_approved;
    if (approved === false) {
      res.status(403).json({ error: "Enrollment pending approval" });
      return;
    }
  }

  const { data: lessons } = await supabase
    .from("lessons")
    .select("*")
    .eq("course_id", courseId)
    .order("order", { ascending: true });

  const lessonIds = (lessons ?? []).map(l => l.id);
  const { data: completions } = lessonIds.length > 0
    ? await supabase.from("lesson_completions").select("lesson_id").eq("user_id", req.userId!).in("lesson_id", lessonIds)
    : { data: [] };

  const completedSet = new Set((completions ?? []).map(c => c.lesson_id));
  res.json((lessons ?? []).map(l => formatLesson(l, completedSet.has(l.id))));
});

router.post("/courses/:courseId/lessons", requireAuth, async (req, res): Promise<void> => {
  if (req.userRole !== "admin") { res.status(403).json({ error: "Only admins can add lessons" }); return; }

  const rawId = Array.isArray(req.params.courseId) ? req.params.courseId[0] : req.params.courseId;
  const courseId = parseInt(rawId, 10);
  if (isNaN(courseId)) { res.status(400).json({ error: "Invalid course id" }); return; }

  const parsed = CreateLessonBodyExt.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { count: existingCount } = await supabase
    .from("lessons")
    .select("*", { count: "exact", head: true })
    .eq("course_id", courseId);

  const lessonRow: Record<string, unknown> = {
    course_id: courseId,
    title: parsed.data.title,
    order: parsed.data.order ?? (existingCount ?? 0) + 1,
  };
  if (parsed.data.description != null) lessonRow.description = parsed.data.description;
  if (parsed.data.videoUrl != null) lessonRow.video_url = parsed.data.videoUrl;
  if (parsed.data.content != null) lessonRow.content = parsed.data.content;

  const { data: lesson, error } = await supabase
    .from("lessons")
    .insert(lessonRow)
    .select()
    .single();

  if (error || !lesson) {
    console.error("[POST /courses/:courseId/lessons] Supabase error:", error?.message, error?.details, error?.hint, error?.code);
    res.status(500).json({ error: error?.message ?? "Failed to create lesson" });
    return;
  }
  res.status(201).json(formatLesson(lesson));
});

async function recalculateProgress(userId: number, courseId: number): Promise<{ progress: number; completedLessons: number; totalLessons: number }> {
  const { data: allLessons } = await supabase.from("lessons").select("id").eq("course_id", courseId);
  const lessonIds = (allLessons ?? []).map(l => l.id);
  const total = lessonIds.length;

  let completed = 0;
  if (total > 0) {
    const { count, error: countErr } = await supabase
      .from("lesson_completions")
      .select("lesson_id", { count: "exact", head: true })
      .eq("user_id", userId)
      .in("lesson_id", lessonIds);
    if (countErr) console.error("[recalculateProgress] lesson_completions query error:", countErr.message, countErr.code);
    completed = count ?? 0;
  }

  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
  const { error: updateErr } = await supabase
    .from("enrollments")
    .update({ progress })
    .eq("user_id", userId)
    .eq("course_id", courseId);
  if (updateErr) console.error("[recalculateProgress] enrollments update error:", updateErr.message, updateErr.code);

  return { progress, completedLessons: completed, totalLessons: total };
}

// Mark a lesson as complete
router.post("/lessons/:id/complete", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const lessonId = parseInt(rawId, 10);
  if (isNaN(lessonId)) { res.status(400).json({ error: "Invalid lesson id" }); return; }

  const { data: lesson, error: lessonErr } = await supabase.from("lessons").select("course_id").eq("id", lessonId).maybeSingle();
  if (lessonErr) console.error("[POST /complete] lesson fetch error:", lessonErr.message);
  if (!lesson) { res.status(404).json({ error: "Lesson not found" }); return; }

  const { data: enrollment, error: enrollErr } = await supabase
    .from("enrollments")
    .select("id, is_approved")
    .eq("user_id", req.userId!)
    .eq("course_id", lesson.course_id)
    .maybeSingle();
  if (enrollErr) console.error("[POST /complete] enrollment check error:", enrollErr.message);
  if (!enrollment) { res.status(403).json({ error: "Not enrolled in this course" }); return; }
  if ((enrollment as Record<string, unknown>).is_approved === false) {
    res.status(403).json({ error: "Enrollment pending approval" });
    return;
  }

  const { error: upsertErr } = await supabase
    .from("lesson_completions")
    .upsert({ user_id: req.userId!, lesson_id: lessonId }, { onConflict: "user_id,lesson_id" });
  if (upsertErr) {
    console.error("[POST /complete] lesson_completions upsert error:", upsertErr.message, upsertErr.code);
    res.status(500).json({ error: "Failed to mark lesson complete. Make sure lesson_completions table exists in Supabase." });
    return;
  }

  const result = await recalculateProgress(req.userId!, lesson.course_id);
  res.json(result);
});

// Undo lesson completion
router.delete("/lessons/:id/complete", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const lessonId = parseInt(rawId, 10);
  if (isNaN(lessonId)) { res.status(400).json({ error: "Invalid lesson id" }); return; }

  const { data: lesson, error: lessonErr } = await supabase.from("lessons").select("course_id").eq("id", lessonId).maybeSingle();
  if (lessonErr) console.error("[DELETE /complete] lesson fetch error:", lessonErr.message);
  if (!lesson) { res.status(404).json({ error: "Lesson not found" }); return; }

  const { error: deleteErr } = await supabase
    .from("lesson_completions")
    .delete()
    .eq("user_id", req.userId!)
    .eq("lesson_id", lessonId);
  if (deleteErr) {
    console.error("[DELETE /complete] lesson_completions delete error:", deleteErr.message, deleteErr.code);
    res.status(500).json({ error: "Failed to undo lesson completion. Make sure lesson_completions table exists in Supabase." });
    return;
  }

  const result = await recalculateProgress(req.userId!, lesson.course_id);
  res.json(result);
});

router.patch("/lessons/:id", requireAuth, async (req, res): Promise<void> => {
  if (req.userRole !== "admin") { res.status(403).json({ error: "Only admins can edit lessons" }); return; }

  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid lesson id" }); return; }

  const updates: Record<string, unknown> = {};
  const body = req.body as Record<string, unknown>;
  if (body.title !== undefined) updates.title = body.title;
  if (body.description !== undefined) updates.description = body.description;
  if (body.videoUrl !== undefined) updates.video_url = body.videoUrl;
  if (body.content !== undefined) updates.content = body.content;
  if (body.order !== undefined) updates.order = body.order;

  const { data: lesson, error } = await supabase.from("lessons").update(updates).eq("id", id).select().maybeSingle();
  if (error || !lesson) { res.status(404).json({ error: "Lesson not found" }); return; }
  res.json(formatLesson(lesson));
});

router.delete("/lessons/:id", requireAuth, async (req, res): Promise<void> => {
  if (req.userRole !== "admin") { res.status(403).json({ error: "Only admins can delete lessons" }); return; }

  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid lesson id" }); return; }

  await supabase.from("lessons").delete().eq("id", id);
  res.sendStatus(204);
});

export default router;
