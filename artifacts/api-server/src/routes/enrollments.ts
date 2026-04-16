import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { EnrollInCourseBody, UpdateProgressBody } from "@workspace/api-zod";
import { supabase } from "../lib/supabase";
import { sendEnrollmentApprovedEmail } from "../lib/email";

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
      isApproved: (enrollment as Record<string, unknown>).is_approved ?? true,
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

// Admin: list pending (unapproved) enrollment requests
router.get("/enrollments/pending", requireAuth, async (req, res): Promise<void> => {
  if (req.userRole !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  const { data: enrollments, error } = await supabase
    .from("enrollments")
    .select("*")
    .eq("is_approved", false)
    .order("created_at", { ascending: true });

  // If is_approved column doesn't exist yet, return empty list
  if (error) {
    if (error.message.includes("is_approved") || error.code === "42703" || error.code === "PGRST204") {
      res.json([]);
      return;
    }
    res.status(500).json({ error: "Failed to fetch pending enrollments" });
    return;
  }

  const enriched = (await Promise.all((enrollments ?? []).map(async (enrollment) => {
    const [{ data: user }, { data: courseWithMode, error: courseError }] = await Promise.all([
      supabase.from("users").select("id, name, email, avatar").eq("id", enrollment.user_id).maybeSingle(),
      supabase.from("courses").select("id, title, enrollment_mode").eq("id", enrollment.course_id).maybeSingle(),
    ]);

    if (!user) return null;

    // If the enrollment_mode column doesn't exist yet, fall back to fetching without it
    // and treat the course as approval_required (safe default — show enrollment as pending)
    let course = courseWithMode;
    let enrollmentMode: string = "approval_required";
    if (courseError && (courseError.message.includes("enrollment_mode") || courseError.code === "42703" || courseError.code === "PGRST204")) {
      const { data: courseBasic } = await supabase
        .from("courses")
        .select("id, title")
        .eq("id", enrollment.course_id)
        .maybeSingle();
      course = courseBasic as typeof courseWithMode;
    } else if (course) {
      enrollmentMode = (course as Record<string, unknown>).enrollment_mode as string ?? "approval_required";
    }

    if (!course) return null;

    // Only include enrollments from courses that require approval
    if (enrollmentMode === "open") return null;

    return {
      id: enrollment.id,
      userId: enrollment.user_id,
      courseId: enrollment.course_id,
      createdAt: enrollment.created_at,
      user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar ?? null },
      course: { id: course.id, title: course.title },
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

  // Check the course's enrollment_mode to decide if auto-approval applies
  const { data: course, error: courseLookupError } = await supabase
    .from("courses")
    .select("enrollment_mode")
    .eq("id", courseId)
    .maybeSingle();

  if (courseLookupError && !courseLookupError.message.includes("enrollment_mode") && courseLookupError.code !== "42703") {
    // Non-column-missing error (network issue, permission error, etc.): log and default to approval_required
    console.error("[POST /enrollments] Failed to fetch course enrollment_mode for course", courseId, ":", courseLookupError.message, "— defaulting to approval_required");
  }

  const isOpen = (course as Record<string, unknown> | null)?.enrollment_mode === "open";

  let { data: enrollment, error } = await supabase
    .from("enrollments")
    .insert({ user_id: req.userId!, course_id: courseId, progress: 0, is_approved: isOpen })
    .select()
    .single();

  // If is_approved column doesn't exist yet, retry without it
  if (error && (error.message.includes("is_approved") || error.code === "42703")) {
    const retry = await supabase
      .from("enrollments")
      .insert({ user_id: req.userId!, course_id: courseId, progress: 0 })
      .select()
      .single();
    enrollment = retry.data;
    error = retry.error;
  }

  if (error || !enrollment) {
    res.status(500).json({ error: "Failed to enroll" });
    return;
  }

  res.status(201).json({
    id: enrollment.id,
    userId: enrollment.user_id,
    courseId: enrollment.course_id,
    progress: enrollment.progress,
    isApproved: (enrollment as Record<string, unknown>).is_approved ?? true,
    createdAt: enrollment.created_at,
  });
});

// Admin: approve an enrollment
router.patch("/enrollments/:id/approve", requireAuth, async (req, res): Promise<void> => {
  if (req.userRole !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid enrollment id" }); return; }

  const { data: enrollment, error } = await supabase
    .from("enrollments")
    .update({ is_approved: true })
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error || !enrollment) {
    res.status(404).json({ error: "Enrollment not found" });
    return;
  }

  const [{ data: enrolledUser }, { data: enrolledCourse }] = await Promise.all([
    supabase.from("users").select("email, name").eq("id", enrollment.user_id).maybeSingle(),
    supabase.from("courses").select("title").eq("id", enrollment.course_id).maybeSingle(),
  ]);

  if (enrolledUser && enrolledCourse) {
    sendEnrollmentApprovedEmail(enrolledUser.email, enrolledUser.name, enrolledCourse.title).catch((err) => {
      console.error("[enrollments] Failed to send approval email for enrollment", id, err);
    });
  }

  res.json({
    id: enrollment.id,
    userId: enrollment.user_id,
    courseId: enrollment.course_id,
    isApproved: true,
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
    isApproved: enrollment.is_approved ?? false,
    createdAt: enrollment.created_at,
  });
});

export default router;
