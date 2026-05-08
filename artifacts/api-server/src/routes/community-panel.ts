import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
import { z } from "zod";

const router: IRouter = Router();

// ── Helper: resolve membership for current user in a community ─────────────
async function getMembership(communityId: number, userId: number) {
  const { data: community } = await supabase
    .from("communities")
    .select("id, name, description, status, owner_id, invite_code")
    .eq("id", communityId)
    .single();

  if (!community) return { community: null, isOwner: false, memberStatus: null };

  const isOwner = community.owner_id === userId;
  if (isOwner) return { community, isOwner: true, memberStatus: "approved" as const };

  const { data: membership } = await supabase
    .from("community_members")
    .select("status")
    .eq("community_id", communityId)
    .eq("user_id", userId)
    .maybeSingle();

  return {
    community,
    isOwner: false,
    memberStatus: membership?.status ?? null,
  };
}

// ── GET /api/communities/:id/panel ── community details + my membership ─────
router.get("/communities/:id/panel", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params["id"] as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { community, isOwner, memberStatus } = await getMembership(id, req.userId!);
  if (!community) { res.status(404).json({ error: "Community not found" }); return; }
  if (community.status !== "approved") { res.status(403).json({ error: "Community not yet approved" }); return; }

  // Lazy-generate a unique invite_code if this community doesn't have one yet
  let inviteCode = (community as Record<string, unknown>)["invite_code"] as string | null ?? null;
  if (!inviteCode) {
    inviteCode = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
    await supabase
      .from("communities")
      .update({ invite_code: inviteCode })
      .eq("id", id);
  }

  // owner info
  const { data: owner } = await supabase
    .from("users").select("id, name, avatar").eq("id", community.owner_id).single();

  res.json({ ...community, invite_code: inviteCode, isOwner, memberStatus, owner });
});

// ── POST /api/communities/:id/join ── request to join ───────────────────────
router.post("/communities/:id/join", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params["id"] as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { community, isOwner, memberStatus } = await getMembership(id, req.userId!);
  if (!community || community.status !== "approved") { res.status(404).json({ error: "Community not found" }); return; }
  if (isOwner) { res.status(400).json({ error: "You are the owner" }); return; }
  if (memberStatus) { res.status(400).json({ error: "Already a member or requested" }); return; }

  const { error } = await supabase
    .from("community_members")
    .insert({ community_id: id, user_id: req.userId!, status: "pending" });

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ ok: true });
});

// ── GET /api/communities/:id/members ── list members (owner/approved) ────────
router.get("/communities/:id/members", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params["id"] as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { community, isOwner, memberStatus } = await getMembership(id, req.userId!);
  if (!community || community.status !== "approved") { res.status(404).json({ error: "Not found" }); return; }
  if (!isOwner && memberStatus !== "approved") { res.status(403).json({ error: "Access denied" }); return; }

  const { data, error } = await supabase
    .from("community_members")
    .select("id, status, created_at, user_id, users!community_members_user_id_fkey(id, name, email, avatar)")
    .eq("community_id", id)
    .order("created_at", { ascending: true });

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data ?? []);
});

// ── PATCH /api/communities/:id/members/:userId ── approve/reject (owner only)
router.patch("/communities/:id/members/:userId", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params["id"] as string, 10);
  const targetId = parseInt(req.params["userId"] as string, 10);
  if (isNaN(id) || isNaN(targetId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { community, isOwner } = await getMembership(id, req.userId!);
  if (!community || community.status !== "approved") { res.status(404).json({ error: "Not found" }); return; }
  if (!isOwner) { res.status(403).json({ error: "Owner only" }); return; }

  const parsed = z.object({ status: z.enum(["approved", "rejected"]) }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "status must be approved or rejected" }); return; }

  const { data, error } = await supabase
    .from("community_members")
    .update({ status: parsed.data.status })
    .eq("community_id", id)
    .eq("user_id", targetId)
    .select()
    .single();

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data);
});

// ── GET /api/communities/:id/posts ── community posts ───────────────────────
router.get("/communities/:id/posts", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params["id"] as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { community, isOwner, memberStatus } = await getMembership(id, req.userId!);
  if (!community || community.status !== "approved") { res.status(404).json({ error: "Not found" }); return; }
  if (!isOwner && memberStatus !== "approved") { res.status(403).json({ error: "Access denied" }); return; }

  const { data, error } = await supabase
    .from("community_posts")
    .select("id, content, created_at, user_id, users!community_posts_user_id_fkey(id, name, avatar)")
    .eq("community_id", id)
    .order("created_at", { ascending: false });

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data ?? []);
});

// ── POST /api/communities/:id/posts ── create post ───────────────────────────
router.post("/communities/:id/posts", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params["id"] as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { community, isOwner, memberStatus } = await getMembership(id, req.userId!);
  if (!community || community.status !== "approved") { res.status(404).json({ error: "Not found" }); return; }
  if (!isOwner && memberStatus !== "approved") { res.status(403).json({ error: "Access denied" }); return; }

  const parsed = z.object({ content: z.string().min(1).max(5000) }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Content required" }); return; }

  const { data, error } = await supabase
    .from("community_posts")
    .insert({ community_id: id, user_id: req.userId!, content: parsed.data.content.trim() })
    .select()
    .single();

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.status(201).json(data);
});

// ── DELETE /api/communities/:id/posts/:postId ── delete post (owner or author)
router.delete("/communities/:id/posts/:postId", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params["id"] as string, 10);
  const postId = parseInt(req.params["postId"] as string, 10);
  if (isNaN(id) || isNaN(postId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { community, isOwner } = await getMembership(id, req.userId!);
  if (!community || community.status !== "approved") { res.status(404).json({ error: "Not found" }); return; }

  const { data: post } = await supabase.from("community_posts").select("user_id").eq("id", postId).single();
  if (!post) { res.status(404).json({ error: "Post not found" }); return; }
  if (!isOwner && post.user_id !== req.userId) { res.status(403).json({ error: "Not allowed" }); return; }

  await supabase.from("community_posts").delete().eq("id", postId);
  res.json({ ok: true });
});

// ── GET /api/communities/:id/courses ── list linked courses ──────────────────
router.get("/communities/:id/courses", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params["id"] as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { community, isOwner, memberStatus } = await getMembership(id, req.userId!);
  if (!community || community.status !== "approved") { res.status(404).json({ error: "Not found" }); return; }
  if (!isOwner && memberStatus !== "approved") { res.status(403).json({ error: "Access denied" }); return; }

  const { data, error } = await supabase
    .from("community_courses")
    .select("id, course_id, created_at, courses!community_courses_course_id_fkey(id, title, description, thumbnail)")
    .eq("community_id", id)
    .order("created_at", { ascending: false });

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data ?? []);
});

// ── POST /api/communities/:id/courses ── add course (owner only) ─────────────
router.post("/communities/:id/courses", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params["id"] as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { community, isOwner } = await getMembership(id, req.userId!);
  if (!community || community.status !== "approved") { res.status(404).json({ error: "Not found" }); return; }
  if (!isOwner) { res.status(403).json({ error: "Owner only" }); return; }

  const parsed = z.object({ courseId: z.number().int().positive() }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "courseId required" }); return; }

  const { error } = await supabase
    .from("community_courses")
    .insert({ community_id: id, course_id: parsed.data.courseId });

  if (error?.code === "23505") { res.status(409).json({ error: "Course already added" }); return; }
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.status(201).json({ ok: true });
});

// ── POST /api/communities/:id/courses/create ── create course scoped to community ──
router.post("/communities/:id/courses/create", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params["id"] as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { community, isOwner } = await getMembership(id, req.userId!);
  if (!community || community.status !== "approved") { res.status(404).json({ error: "Not found" }); return; }
  if (!isOwner) { res.status(403).json({ error: "Owner only" }); return; }

  const parsed = z.object({
    title: z.string().min(1).max(200),
    description: z.string().max(2000).optional().nullable(),
    thumbnail: z.string().optional().nullable(),
    externalUrl: z.string().optional().nullable(),
    visibility: z.enum(["public", "private"]).optional().default("public"),
    enrollmentMode: z.enum(["open", "approval_required"]).optional().default("approval_required"),
    lessons: z.array(z.object({
      title: z.string().min(1),
      description: z.string().optional().nullable(),
      videoUrl: z.string().optional().nullable(),
    })).optional(),
  }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Title is required" }); return; }

  const { title, description, thumbnail, externalUrl, visibility, enrollmentMode, lessons } = parsed.data;

  const payload: Record<string, unknown> = {
    title, description: description ?? null, created_by: req.userId!, community_id: id,
    visibility, enrollment_mode: enrollmentMode,
  };
  if (thumbnail) payload.thumbnail = thumbnail;
  if (externalUrl) payload.external_url = externalUrl;

  let { data: course, error } = await supabase.from("courses").insert(payload).select().single();

  // Graceful fallback if optional columns not yet migrated
  if (error && (error.message.includes("community_id") || error.message.includes("visibility") || error.message.includes("enrollment_mode") || error.message.includes("external_url"))) {
    const core: Record<string, unknown> = { title, description: description ?? null, created_by: req.userId! };
    if (thumbnail) core.thumbnail = thumbnail;
    const fallback = await supabase.from("courses").insert(core).select().single();
    course = fallback.data;
    error = fallback.error;
  }

  if (error || !course) { res.status(500).json({ error: error?.message ?? "Failed to create course" }); return; }

  // Insert lessons
  if (lessons && lessons.length > 0) {
    const validLessons = lessons.filter(l => l.title.trim());
    if (validLessons.length > 0) {
      const lessonRows = validLessons.map((l, i) => {
        const row: Record<string, unknown> = { course_id: course.id, title: l.title.trim(), order: i + 1 };
        if (l.description) row.content = l.description;
        if (l.videoUrl) row.video_url = l.videoUrl;
        return row;
      });
      await supabase.from("lessons").insert(lessonRows);
    }
  }

  // Auto-link to this community
  await supabase.from("community_courses").insert({ community_id: id, course_id: course.id });

  res.status(201).json(course);
});

// ── GET /api/communities/:id/course-enrollments/pending ───────────────────────
router.get("/communities/:id/course-enrollments/pending", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params["id"] as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { community, isOwner } = await getMembership(id, req.userId!);
  if (!community || community.status !== "approved") { res.status(404).json({ error: "Not found" }); return; }
  if (!isOwner) { res.status(403).json({ error: "Owner only" }); return; }

  const { data: links } = await supabase.from("community_courses").select("course_id").eq("community_id", id);
  const courseIds = (links ?? []).map(l => l.course_id);
  if (courseIds.length === 0) { res.json([]); return; }

  const { data: enrollments, error } = await supabase
    .from("enrollments")
    .select("id, user_id, course_id, created_at")
    .in("course_id", courseIds)
    .eq("is_approved", false)
    .order("created_at", { ascending: true });

  if (error) {
    if (error.message.includes("is_approved") || error.code === "42703") { res.json([]); return; }
    res.status(500).json({ error: error.message }); return;
  }

  const enriched = await Promise.all((enrollments ?? []).map(async (e) => {
    const [{ data: user }, { data: course }] = await Promise.all([
      supabase.from("users").select("id, name, email, avatar").eq("id", e.user_id).maybeSingle(),
      supabase.from("courses").select("id, title").eq("id", e.course_id).maybeSingle(),
    ]);
    if (!user || !course) return null;
    return {
      id: e.id, courseId: e.course_id, userId: e.user_id, createdAt: e.created_at,
      user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar ?? null },
      course: { id: course.id, title: course.title },
    };
  }));
  res.json(enriched.filter(Boolean));
});

// ── PATCH /api/communities/:id/course-enrollments/:enrollmentId/approve ───────
router.patch("/communities/:id/course-enrollments/:enrollmentId/approve", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params["id"] as string, 10);
  const enrollmentId = parseInt(req.params["enrollmentId"] as string, 10);
  if (isNaN(id) || isNaN(enrollmentId)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { community, isOwner } = await getMembership(id, req.userId!);
  if (!community || community.status !== "approved") { res.status(404).json({ error: "Not found" }); return; }
  if (!isOwner) { res.status(403).json({ error: "Owner only" }); return; }
  const { error } = await supabase.from("enrollments").update({ is_approved: true }).eq("id", enrollmentId);
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ ok: true });
});

// ── PATCH /api/communities/:id/course-enrollments/:enrollmentId/reject ────────
router.patch("/communities/:id/course-enrollments/:enrollmentId/reject", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params["id"] as string, 10);
  const enrollmentId = parseInt(req.params["enrollmentId"] as string, 10);
  if (isNaN(id) || isNaN(enrollmentId)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { community, isOwner } = await getMembership(id, req.userId!);
  if (!community || community.status !== "approved") { res.status(404).json({ error: "Not found" }); return; }
  if (!isOwner) { res.status(403).json({ error: "Owner only" }); return; }
  const { error } = await supabase.from("enrollments").delete().eq("id", enrollmentId);
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ ok: true });
});

// ── DELETE /api/communities/:id/courses/:courseId ── remove course ───────────
router.delete("/communities/:id/courses/:courseId", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params["id"] as string, 10);
  const courseId = parseInt(req.params["courseId"] as string, 10);
  if (isNaN(id) || isNaN(courseId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { community, isOwner } = await getMembership(id, req.userId!);
  if (!community || community.status !== "approved") { res.status(404).json({ error: "Not found" }); return; }
  if (!isOwner) { res.status(403).json({ error: "Owner only" }); return; }

  await supabase.from("community_courses").delete().eq("community_id", id).eq("course_id", courseId);
  res.json({ ok: true });
});

// ── GET /api/communities/:id/tools ── list linked tools ──────────────────────
router.get("/communities/:id/tools", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params["id"] as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { community, isOwner, memberStatus } = await getMembership(id, req.userId!);
  if (!community || community.status !== "approved") { res.status(404).json({ error: "Not found" }); return; }
  if (!isOwner && memberStatus !== "approved") { res.status(403).json({ error: "Access denied" }); return; }

  const { data, error } = await supabase
    .from("community_tools")
    .select("id, tool_id, created_at, tools!community_tools_tool_id_fkey(id, title, description, image_url, video_url, tool_url)")
    .eq("community_id", id)
    .order("created_at", { ascending: false });

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data ?? []);
});

// ── POST /api/communities/:id/tools/create ── create + link new tool ────────
router.post("/communities/:id/tools/create", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params["id"] as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { community, isOwner } = await getMembership(id, req.userId!);
  if (!community || community.status !== "approved") { res.status(404).json({ error: "Not found" }); return; }
  if (!isOwner) { res.status(403).json({ error: "Owner only" }); return; }

  const parsed = z.object({
    title: z.string().min(1),
    description: z.string().nullish(),
    imageUrl: z.string().url().nullish(),
    videoUrl: z.string().url().nullish(),
    toolUrl: z.string().url().nullish(),
  }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "title required" }); return; }

  const { title, description, imageUrl, videoUrl, toolUrl } = parsed.data;

  // Create tool
  const { data: tool, error: toolErr } = await supabase
    .from("tools")
    .insert({ title: title.trim(), description: description ?? null, image_url: imageUrl ?? null, video_url: videoUrl ?? null, tool_url: toolUrl ?? null })
    .select("id, title, description, image_url, video_url, tool_url")
    .single();

  if (toolErr || !tool) { res.status(500).json({ error: toolErr?.message ?? "Failed to create tool" }); return; }

  // Link to community
  await supabase.from("community_tools").insert({ community_id: id, tool_id: tool.id });

  res.status(201).json({ id: tool.id, title: tool.title, description: tool.description ?? null, image_url: tool.image_url ?? null, video_url: tool.video_url ?? null, tool_url: tool.tool_url ?? null });
});

// ── POST /api/communities/:id/tools ── add tool (owner only) ─────────────────
router.post("/communities/:id/tools", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params["id"] as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { community, isOwner } = await getMembership(id, req.userId!);
  if (!community || community.status !== "approved") { res.status(404).json({ error: "Not found" }); return; }
  if (!isOwner) { res.status(403).json({ error: "Owner only" }); return; }

  const parsed = z.object({ toolId: z.number().int().positive() }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "toolId required" }); return; }

  const { error } = await supabase
    .from("community_tools")
    .insert({ community_id: id, tool_id: parsed.data.toolId });

  if (error?.code === "23505") { res.status(409).json({ error: "Tool already added" }); return; }
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.status(201).json({ ok: true });
});

// ── DELETE /api/communities/:id/tools/:toolId ── remove tool ─────────────────
router.delete("/communities/:id/tools/:toolId", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params["id"] as string, 10);
  const toolId = parseInt(req.params["toolId"] as string, 10);
  if (isNaN(id) || isNaN(toolId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { community, isOwner } = await getMembership(id, req.userId!);
  if (!community || community.status !== "approved") { res.status(404).json({ error: "Not found" }); return; }
  if (!isOwner) { res.status(403).json({ error: "Owner only" }); return; }

  await supabase.from("community_tools").delete().eq("community_id", id).eq("tool_id", toolId);
  res.json({ ok: true });
});

// ── GET /api/communities/:id/messages ── group chat ──────────────────────────
router.get("/communities/:id/messages", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params["id"] as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { community, isOwner, memberStatus } = await getMembership(id, req.userId!);
  if (!community || community.status !== "approved") { res.status(404).json({ error: "Not found" }); return; }
  if (!isOwner && memberStatus !== "approved") { res.status(403).json({ error: "Access denied" }); return; }

  const { data, error } = await supabase
    .from("community_messages")
    .select("id, content, created_at, sender_id, users!community_messages_sender_id_fkey(id, name, avatar)")
    .eq("community_id", id)
    .order("created_at", { ascending: true })
    .limit(200);

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data ?? []);
});

// ── POST /api/communities/:id/messages ── send message ───────────────────────
router.post("/communities/:id/messages", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params["id"] as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { community, isOwner, memberStatus } = await getMembership(id, req.userId!);
  if (!community || community.status !== "approved") { res.status(404).json({ error: "Not found" }); return; }
  if (!isOwner && memberStatus !== "approved") { res.status(403).json({ error: "Access denied" }); return; }

  const parsed = z.object({ content: z.string().min(1).max(2000) }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Content required" }); return; }

  const { data, error } = await supabase
    .from("community_messages")
    .insert({ community_id: id, sender_id: req.userId!, content: parsed.data.content.trim() })
    .select()
    .single();

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.status(201).json(data);
});

// ── GET /api/communities/:id/vip-posts ── exclusive member-only posts ────────
router.get("/communities/:id/vip-posts", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params["id"] as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { community, isOwner, memberStatus } = await getMembership(id, req.userId!);
  if (!community || community.status !== "approved") { res.status(404).json({ error: "Not found" }); return; }
  if (!isOwner && memberStatus !== "approved") { res.status(403).json({ error: "Access denied" }); return; }

  const { data, error } = await supabase
    .from("community_vip_posts")
    .select("id, content, created_at, user_id, users!community_vip_posts_user_id_fkey(id, name, avatar)")
    .eq("community_id", id)
    .order("created_at", { ascending: false });

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data ?? []);
});

// ── POST /api/communities/:id/vip-posts ── create VIP post ───────────────────
router.post("/communities/:id/vip-posts", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params["id"] as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { community, isOwner, memberStatus } = await getMembership(id, req.userId!);
  if (!community || community.status !== "approved") { res.status(404).json({ error: "Not found" }); return; }
  if (!isOwner && memberStatus !== "approved") { res.status(403).json({ error: "Access denied" }); return; }

  const parsed = z.object({ content: z.string().min(1).max(5000) }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Content required" }); return; }

  const { data, error } = await supabase
    .from("community_vip_posts")
    .insert({ community_id: id, user_id: req.userId!, content: parsed.data.content.trim() })
    .select("id, content, created_at, user_id, users!community_vip_posts_user_id_fkey(id, name, avatar)")
    .single();

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.status(201).json(data);
});

// ── DELETE /api/communities/:id/vip-posts/:postId ── delete VIP post ─────────
router.delete("/communities/:id/vip-posts/:postId", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params["id"] as string, 10);
  const postId = parseInt(req.params["postId"] as string, 10);
  if (isNaN(id) || isNaN(postId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { community, isOwner } = await getMembership(id, req.userId!);
  if (!community || community.status !== "approved") { res.status(404).json({ error: "Not found" }); return; }

  const { data: post } = await supabase
    .from("community_vip_posts")
    .select("user_id")
    .eq("id", postId)
    .eq("community_id", id)
    .single();

  if (!post) { res.status(404).json({ error: "Post not found" }); return; }
  if (!isOwner && post.user_id !== req.userId) { res.status(403).json({ error: "Not allowed" }); return; }

  await supabase.from("community_vip_posts").delete().eq("id", postId);
  res.json({ ok: true });
});

export default router;
