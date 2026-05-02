import { Router, type IRouter } from "express";
import { supabase } from "../lib/supabase";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

// ── List all tools (any authenticated user) ───────────────────────────────
router.get("/tools", requireAuth, async (_req, res): Promise<void> => {
  const { data, error } = await supabase
    .from("tools")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    res.status(500).json({ error: "Failed to fetch tools" });
    return;
  }

  res.json((data ?? []).map(t => ({
    id: t.id,
    title: t.title,
    description: t.description ?? null,
    imageUrl: t.image_url ?? null,
    videoUrl: t.video_url ?? null,
    toolUrl: t.tool_url ?? null,
    createdBy: t.created_by,
    createdAt: t.created_at,
  })));
});

// ── Create a tool (admin only) ────────────────────────────────────────────
router.post("/tools", requireAuth, async (req, res): Promise<void> => {
  if (req.userRole !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  const { title, description, imageUrl, videoUrl, toolUrl } = req.body as {
    title: string;
    description?: string;
    imageUrl?: string;
    videoUrl?: string;
    toolUrl?: string;
  };

  if (!title?.trim()) {
    res.status(400).json({ error: "Title is required" });
    return;
  }

  const { data, error } = await supabase
    .from("tools")
    .insert({
      title: title.trim(),
      description: description?.trim() ?? null,
      image_url: imageUrl ?? null,
      video_url: videoUrl ?? null,
      tool_url: toolUrl?.trim() ?? null,
      created_by: req.userId!,
    })
    .select()
    .single();

  if (error || !data) {
    res.status(500).json({ error: "Failed to create tool" });
    return;
  }

  const created = {
    id: data.id,
    title: data.title,
    description: data.description ?? null,
    imageUrl: data.image_url ?? null,
    videoUrl: data.video_url ?? null,
    toolUrl: data.tool_url ?? null,
    createdBy: data.created_by,
    createdAt: data.created_at,
  };

  res.status(201).json(created);

  // Broadcast a notification to every user (fire-and-forget, don't block response)
  void (async () => {
    try {
      const { data: users } = await supabase.from("users").select("id");
      if (!users || users.length === 0) return;
      await supabase.from("notifications").insert(
        users.map(u => ({
          user_id: u.id,
          type: "tool",
          title: "New AI Tool Available 🛠️",
          message: `"${created.title}" has been added to AI Tools — go check it out!`,
          is_read: false,
          is_vip: false,
        }))
      );
    } catch (e) {
      console.error("[POST /tools] Failed to broadcast notification:", e);
    }
  })();
});

// ── Get a single tool ─────────────────────────────────────────────────────
router.get("/tools/:id", requireAuth, async (req, res): Promise<void> => {
  const toolId = parseInt(req.params.id, 10);
  if (isNaN(toolId)) { res.status(400).json({ error: "Invalid tool id" }); return; }

  const { data, error } = await supabase
    .from("tools")
    .select("*")
    .eq("id", toolId)
    .single();

  if (error || !data) {
    res.status(404).json({ error: "Tool not found" });
    return;
  }

  res.json({
    id: data.id,
    title: data.title,
    description: data.description ?? null,
    imageUrl: data.image_url ?? null,
    videoUrl: data.video_url ?? null,
    toolUrl: data.tool_url ?? null,
    createdBy: data.created_by,
    createdAt: data.created_at,
  });
});

// ── Update a tool (admin only) ────────────────────────────────────────────
router.patch("/tools/:id", requireAuth, async (req, res): Promise<void> => {
  if (req.userRole !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  const toolId = parseInt(req.params.id, 10);
  if (isNaN(toolId)) { res.status(400).json({ error: "Invalid tool id" }); return; }

  const { title, description, imageUrl, videoUrl, toolUrl } = req.body as {
    title?: string; description?: string | null; imageUrl?: string | null;
    videoUrl?: string | null; toolUrl?: string | null;
  };

  const updates: Record<string, unknown> = {};
  if (title !== undefined) updates.title = title.trim();
  if (description !== undefined) updates.description = description;
  if (imageUrl !== undefined) updates.image_url = imageUrl;
  if (videoUrl !== undefined) updates.video_url = videoUrl;
  if (toolUrl !== undefined) updates.tool_url = toolUrl;

  const { data, error } = await supabase
    .from("tools")
    .update(updates)
    .eq("id", toolId)
    .select()
    .single();

  if (error || !data) {
    res.status(500).json({ error: "Failed to update tool" });
    return;
  }

  res.json({
    id: data.id,
    title: data.title,
    description: data.description ?? null,
    imageUrl: data.image_url ?? null,
    videoUrl: data.video_url ?? null,
    toolUrl: data.tool_url ?? null,
    createdBy: data.created_by,
    createdAt: data.created_at,
  });
});

// ── Delete a tool (admin only) ────────────────────────────────────────────
router.delete("/tools/:id", requireAuth, async (req, res): Promise<void> => {
  if (req.userRole !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  const toolId = parseInt(req.params.id, 10);
  if (isNaN(toolId)) { res.status(400).json({ error: "Invalid tool id" }); return; }

  await supabase.from("tool_requests").delete().eq("tool_id", toolId);
  const { error } = await supabase.from("tools").delete().eq("id", toolId);

  if (error) { res.status(500).json({ error: "Failed to delete tool" }); return; }
  res.status(204).send();
});

// ── Request access to a tool ──────────────────────────────────────────────
router.post("/tools/:id/request", requireAuth, async (req, res): Promise<void> => {
  const toolId = parseInt(req.params.id, 10);
  if (isNaN(toolId)) { res.status(400).json({ error: "Invalid tool id" }); return; }

  // Check tool exists
  const { data: tool } = await supabase.from("tools").select("id").eq("id", toolId).maybeSingle();
  if (!tool) { res.status(404).json({ error: "Tool not found" }); return; }

  // Check if already requested
  const { data: existing } = await supabase
    .from("tool_requests")
    .select("id, is_approved")
    .eq("user_id", req.userId!)
    .eq("tool_id", toolId)
    .maybeSingle();

  if (existing) {
    res.status(400).json({ error: "Already requested", isApproved: existing.is_approved });
    return;
  }

  const { data, error } = await supabase
    .from("tool_requests")
    .insert({ user_id: req.userId!, tool_id: toolId, is_approved: false })
    .select()
    .single();

  if (error || !data) {
    res.status(500).json({ error: "Failed to submit request" });
    return;
  }

  res.status(201).json({
    id: data.id,
    userId: data.user_id,
    toolId: data.tool_id,
    isApproved: data.is_approved,
    createdAt: data.created_at,
  });
});

// ── Get my tool requests ──────────────────────────────────────────────────
router.get("/tool-requests/my", requireAuth, async (req, res): Promise<void> => {
  const { data, error } = await supabase
    .from("tool_requests")
    .select("id, tool_id, is_approved, created_at")
    .eq("user_id", req.userId!);

  if (error) { res.status(500).json({ error: "Failed to fetch requests" }); return; }

  res.json((data ?? []).map(r => ({
    id: r.id,
    toolId: r.tool_id,
    isApproved: r.is_approved,
    createdAt: r.created_at,
  })));
});

// ── Admin: list pending tool requests ─────────────────────────────────────
router.get("/tool-requests/pending", requireAuth, async (req, res): Promise<void> => {
  if (req.userRole !== "admin") { res.status(403).json({ error: "Admin access required" }); return; }

  const { data, error } = await supabase
    .from("tool_requests")
    .select("id, user_id, tool_id, created_at")
    .eq("is_approved", false)
    .order("created_at", { ascending: true });

  if (error) {
    res.json([]);
    return;
  }

  const enriched = await Promise.all((data ?? []).map(async r => {
    const [{ data: user }, { data: tool }] = await Promise.all([
      supabase.from("users").select("id, name, email").eq("id", r.user_id).maybeSingle(),
      supabase.from("tools").select("id, title").eq("id", r.tool_id).maybeSingle(),
    ]);
    return {
      id: r.id,
      userId: r.user_id,
      toolId: r.tool_id,
      createdAt: r.created_at,
      user: { id: user?.id ?? r.user_id, name: user?.name ?? "Unknown", email: user?.email ?? "" },
      tool: { id: tool?.id ?? r.tool_id, title: tool?.title ?? "Unknown Tool" },
    };
  }));

  res.json(enriched);
});

// ── Admin: approve a tool request ─────────────────────────────────────────
router.patch("/tool-requests/:id/approve", requireAuth, async (req, res): Promise<void> => {
  if (req.userRole !== "admin") { res.status(403).json({ error: "Admin access required" }); return; }

  const requestId = parseInt(req.params.id, 10);
  if (isNaN(requestId)) { res.status(400).json({ error: "Invalid request id" }); return; }

  const { data, error } = await supabase
    .from("tool_requests")
    .update({ is_approved: true })
    .eq("id", requestId)
    .select()
    .single();

  if (error || !data) { res.status(500).json({ error: "Failed to approve request" }); return; }

  res.json({ id: data.id, isApproved: data.is_approved });
});

export default router;
