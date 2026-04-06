import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { CreateLessonBody, UpdateLessonBody } from "@workspace/api-zod";
import { supabase } from "../lib/supabase";

const router: IRouter = Router();

function formatLesson(lesson: Record<string, unknown>) {
  return {
    id: lesson.id,
    courseId: lesson.course_id,
    title: lesson.title,
    videoUrl: (lesson.video_url as string) ?? null,
    content: (lesson.content as string) ?? null,
    order: lesson.order,
    createdAt: lesson.created_at,
  };
}

router.get("/courses/:courseId/lessons", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.courseId) ? req.params.courseId[0] : req.params.courseId;
  const courseId = parseInt(rawId, 10);
  if (isNaN(courseId)) {
    res.status(400).json({ error: "Invalid course id" });
    return;
  }

  const { data: lessons } = await supabase
    .from("lessons")
    .select("*")
    .eq("course_id", courseId)
    .order("order", { ascending: true });

  res.json((lessons ?? []).map(formatLesson));
});

router.post("/courses/:courseId/lessons", requireAuth, async (req, res): Promise<void> => {
  if (req.userRole !== "admin" && req.userRole !== "creator") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const rawId = Array.isArray(req.params.courseId) ? req.params.courseId[0] : req.params.courseId;
  const courseId = parseInt(rawId, 10);
  if (isNaN(courseId)) {
    res.status(400).json({ error: "Invalid course id" });
    return;
  }

  const parsed = CreateLessonBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { data: lesson, error } = await supabase
    .from("lessons")
    .insert({
      course_id: courseId,
      title: parsed.data.title,
      video_url: parsed.data.videoUrl ?? null,
      content: parsed.data.content ?? null,
      order: parsed.data.order ?? 0,
    })
    .select()
    .single();

  if (error || !lesson) {
    res.status(500).json({ error: "Failed to create lesson" });
    return;
  }

  res.status(201).json(formatLesson(lesson));
});

router.patch("/lessons/:id", requireAuth, async (req, res): Promise<void> => {
  if (req.userRole !== "admin" && req.userRole !== "creator") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid lesson id" });
    return;
  }

  const parsed = UpdateLessonBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) updates.title = parsed.data.title;
  if (parsed.data.videoUrl !== undefined) updates.video_url = parsed.data.videoUrl;
  if (parsed.data.content !== undefined) updates.content = parsed.data.content;
  if (parsed.data.order !== undefined) updates.order = parsed.data.order;

  const { data: lesson, error } = await supabase
    .from("lessons")
    .update(updates)
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error || !lesson) {
    res.status(404).json({ error: "Lesson not found" });
    return;
  }

  res.json(formatLesson(lesson));
});

router.delete("/lessons/:id", requireAuth, async (req, res): Promise<void> => {
  if (req.userRole !== "admin" && req.userRole !== "creator") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid lesson id" });
    return;
  }

  await supabase.from("lessons").delete().eq("id", id);
  res.sendStatus(204);
});

export default router;
