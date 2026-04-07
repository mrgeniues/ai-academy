import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { EnrollInCourseBody, UpdateProgressBody } from "@workspace/api-zod";
import { supabase } from "../lib/supabase";

const router: IRouter = Router();

router.get("/enrollments", requireAuth, async (req, res): Promise<void> => {
  const { data: enrollments, error } = await supabase
    .from("enrollments")
    .select("*")
    .eq("user_id", req.userId!);

  if (error) {
    res.status(500).json({ error: "Failed to fetch enrollments" });
    return;
  }

  const enriched = (await Promise.all((enrollments ?? []).map(async (enrollment) => {
    const { data: course } = await supabase
      .from("courses")
      .select("*")
      .eq("id", enrollment.course_id)
      .maybeSingle();

    if (!course) return null;

    const { count: lessonCount } = await supabase
      .from("lessons")
      .select("*", { count: "exact", head: true })
      .eq("course_id", enrollment.course_id);

    const { count: enrollmentCount } = await supabase
      .from("enrollments")
      .select("*", { count: "exact", head: true })
      .eq("course_id", enrollment.course_id);

    return {
      id: enrollment.id,
      userId: enrollment.user_id,
      courseId: enrollment.course_id,
      progress: enrollment.progress,
      createdAt: enrollment.created_at,
      course: {
        ...course,
        description: course.description ?? null,
        thumbnail: course.thumbnail ?? null,
        lessonCount: lessonCount ?? 0,
        enrollmentCount: enrollmentCount ?? 0,
        createdAt: course.created_at,
        updatedAt: course.updated_at,
      },
    };
  }))).filter(Boolean);

  res.json(enriched);
});

router.post("/enrollments", requireAuth, async (req, res): Promise<void> => {
  const parsed = EnrollInCourseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { courseId } = parsed.data;

  const { data: existing } = await supabase
    .from("enrollments")
    .select("id")
    .eq("user_id", req.userId!)
    .eq("course_id", courseId)
    .maybeSingle();

  if (existing) {
    res.status(400).json({ error: "Already enrolled" });
    return;
  }

  const { data: enrollment, error } = await supabase
    .from("enrollments")
    .insert({ user_id: req.userId!, course_id: courseId, progress: 0 })
    .select()
    .single();

  if (error || !enrollment) {
    res.status(500).json({ error: "Failed to enroll" });
    return;
  }

  res.status(201).json({
    id: enrollment.id,
    userId: enrollment.user_id,
    courseId: enrollment.course_id,
    progress: enrollment.progress,
    createdAt: enrollment.created_at,
  });
});

router.patch("/enrollments/:courseId/progress", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.courseId) ? req.params.courseId[0] : req.params.courseId;
  const courseId = parseInt(rawId, 10);
  if (isNaN(courseId)) {
    res.status(400).json({ error: "Invalid course id" });
    return;
  }

  const parsed = UpdateProgressBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { data: enrollment, error } = await supabase
    .from("enrollments")
    .update({ progress: parsed.data.progress })
    .eq("user_id", req.userId!)
    .eq("course_id", courseId)
    .select()
    .maybeSingle();

  if (error || !enrollment) {
    res.status(404).json({ error: "Enrollment not found" });
    return;
  }

  res.json({
    id: enrollment.id,
    userId: enrollment.user_id,
    courseId: enrollment.course_id,
    progress: enrollment.progress,
    createdAt: enrollment.created_at,
  });
});

export default router;
