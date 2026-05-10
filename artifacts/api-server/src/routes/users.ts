import { Router, type IRouter } from "express";
import { requireAuth, requireAdmin } from "../lib/auth";
import { formatUser } from "./auth";
import { UpdateUserBody, UpdateUserRoleBody } from "@workspace/api-zod";
import { supabase } from "../lib/supabase";
import { sendUserApprovedEmail, sendUserRejectedEmail } from "../lib/email";
import { logAdminAction } from "../lib/audit";

const router: IRouter = Router();

router.get("/users", requireAdmin, async (_req, res): Promise<void> => {
  const { data: users, error } = await supabase
    .from("users")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    res.status(500).json({ error: "Failed to fetch users" });
    return;
  }

  const userList = users ?? [];

  // Fetch the most recent admin action per user (user-targeted actions only)
  let lastActionMap: Record<number, { action: string; actorName: string; createdAt: string }> = {};
  try {
    const userIds = userList.map(u => u.id);
    if (userIds.length > 0) {
      const { data: actions } = await supabase
        .from("admin_actions")
        .select("*")
        .eq("entity_type", "user")
        .in("target_user_id", userIds)
        .order("created_at", { ascending: false });

      if (actions && actions.length > 0) {
        // Keep only the most recent action per target_user_id
        const seenUserIds = new Set<number>();
        const recentActions: typeof actions = [];
        for (const a of actions) {
          if (a.target_user_id && !seenUserIds.has(a.target_user_id)) {
            seenUserIds.add(a.target_user_id);
            recentActions.push(a);
          }
        }

        // Fetch actor names
        const actorIds = [...new Set(recentActions.map(a => a.actor_id).filter(Boolean))];
        let actorMap: Record<number, string> = {};
        if (actorIds.length > 0) {
          const { data: actors } = await supabase
            .from("users")
            .select("id, name")
            .in("id", actorIds);
          for (const actor of actors ?? []) {
            actorMap[actor.id] = actor.name;
          }
        }

        for (const a of recentActions) {
          if (a.target_user_id) {
            lastActionMap[a.target_user_id] = {
              action: a.action,
              actorName: a.actor_id ? (actorMap[a.actor_id] ?? "Unknown") : "System",
              createdAt: a.created_at,
            };
          }
        }
      }
    }
  } catch (_err) {
    // admin_actions table may not exist yet — return users without lastAction
  }

  res.json(userList.map(u => ({
    ...formatUser(u),
    lastAction: lastActionMap[u.id] ?? null,
  })));
});

router.get("/users/:id", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid user id" });
    return;
  }

  const { data: user } = await supabase
    .from("users")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  let isFollowing = false;
  let followersCount = 0;
  let followingCount = 0;

  try {
    const [followerRes, followersCountRes, followingCountRes] = await Promise.all([
      req.userId && req.userId !== id
        ? supabase.from("followers").select("id").eq("follower_id", req.userId).eq("following_id", id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      supabase.from("followers").select("*", { count: "exact", head: true }).eq("following_id", id),
      supabase.from("followers").select("*", { count: "exact", head: true }).eq("follower_id", id),
    ]);

    if (!followerRes.error) isFollowing = !!followerRes.data;
    if (!followersCountRes.error) followersCount = followersCountRes.count ?? 0;
    if (!followingCountRes.error) followingCount = followingCountRes.count ?? 0;
  } catch (_err) {
    // followers table may not exist yet — return zero counts gracefully
  }

  res.json({ ...formatUser(user), isFollowing, followersCount, followingCount });
});

router.post("/users/:id/follow", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const followingId = parseInt(rawId, 10);
  if (isNaN(followingId)) { res.status(400).json({ error: "Invalid user id" }); return; }

  if (req.userId === followingId) {
    res.status(400).json({ error: "You cannot follow yourself" });
    return;
  }

  const { error } = await supabase
    .from("followers")
    .insert({ follower_id: req.userId!, following_id: followingId });

  if (error) {
    if (error.code === "23505") { res.json({ isFollowing: true }); return; }
    // PGRST205 = table not found in schema cache
    if (error.code === "PGRST205" || error.message?.includes("followers")) {
      res.status(503).json({ error: "Follow feature not available — run the SQL setup in Supabase first" });
      return;
    }
    console.error("[POST /follow] error:", error.message, error.code);
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({ isFollowing: true });
});

router.delete("/users/:id/follow", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const followingId = parseInt(rawId, 10);
  if (isNaN(followingId)) { res.status(400).json({ error: "Invalid user id" }); return; }

  const { error } = await supabase
    .from("followers")
    .delete()
    .eq("follower_id", req.userId!)
    .eq("following_id", followingId);

  if (error) console.error("[DELETE /follow] error:", error.message);

  res.json({ isFollowing: false });
});

// List users who follow :id
router.get("/users/:id/followers", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid user id" }); return; }

  const { data: follows, error } = await supabase
    .from("followers")
    .select("follower_id")
    .eq("following_id", id);

  if (error) { res.status(500).json({ error: error.message }); return; }

  const ids = (follows ?? []).map(f => f.follower_id);
  if (ids.length === 0) { res.json([]); return; }

  const { data: users } = await supabase.from("users").select("*").in("id", ids);
  res.json((users ?? []).map(formatUser));
});

// List users that :id follows
router.get("/users/:id/following", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid user id" }); return; }

  const { data: follows, error } = await supabase
    .from("followers")
    .select("following_id")
    .eq("follower_id", id);

  if (error) { res.status(500).json({ error: error.message }); return; }

  const ids = (follows ?? []).map(f => f.following_id);
  if (ids.length === 0) { res.json([]); return; }

  const { data: users } = await supabase.from("users").select("*").in("id", ids);
  res.json((users ?? []).map(formatUser));
});

router.patch("/users/:id", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid user id" });
    return;
  }

  if (req.userId !== id && req.userRole !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const parsed = UpdateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Optional columns — stripped out if the DB column doesn't exist yet
  const OPTIONAL_COLS: Record<string, string> = {
    theme:        "theme",
    bio:          "bio",
    avatar:       "avatar",
    social_links: "social_links",
  };

  const updates: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.avatar !== undefined) updates.avatar = parsed.data.avatar;
  if (parsed.data.bio !== undefined) updates.bio = parsed.data.bio;
  if (parsed.data.theme !== undefined) updates.theme = parsed.data.theme;
  if (parsed.data.socialLinks !== undefined) updates.social_links = parsed.data.socialLinks;

  // Try the update; if a column doesn't exist, drop it and retry (up to N times)
  let currentUpdates = { ...updates };
  let user: Record<string, unknown> | null = null;
  let lastError: { message?: string; code?: string } | null = null;

  for (let attempt = 0; attempt <= Object.keys(OPTIONAL_COLS).length; attempt++) {
    if (Object.keys(currentUpdates).length === 0) break;

    const result = await supabase
      .from("users")
      .update(currentUpdates)
      .eq("id", id)
      .select()
      .maybeSingle();

    if (!result.error) {
      user = result.data as Record<string, unknown> | null;
      lastError = null;
      break;
    }

    lastError = result.error;
    const msg = result.error.message ?? "";
    const code = result.error.code ?? "";

    // Detect missing-column error (Supabase REST = PGRST204, Postgres = 42703)
    const isMissingCol = code === "PGRST204" || code === "42703" || msg.includes("does not exist");
    if (!isMissingCol) break; // real error — stop retrying

    // Find which optional column caused the error and strip it
    const badCol = Object.keys(OPTIONAL_COLS).find(col => msg.includes(col));
    if (!badCol) break; // unknown column — can't fix automatically

    const { [badCol]: _dropped, ...rest } = currentUpdates;
    void _dropped;
    currentUpdates = rest;
  }

  // If all columns were stripped, just return the current user without error
  if (Object.keys(currentUpdates).length === 0 || (lastError === null && !user)) {
    const { data: currentUser } = await supabase.from("users").select("*").eq("id", id).maybeSingle();
    if (currentUser) {
      res.json(formatUser(currentUser as Parameters<typeof formatUser>[0]));
      return;
    }
  }

  if (lastError || !user) {
    res.status(500).json({ error: lastError?.message ?? "Failed to update user" });
    return;
  }

  res.json(formatUser(user as Parameters<typeof formatUser>[0]));
});

router.patch("/users/:id/block", requireAdmin, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid user id" }); return; }

  if (id === req.userId) {
    res.status(400).json({ error: "You cannot block yourself" });
    return;
  }

  const { blocked, reason } = req.body as { blocked?: boolean; reason?: string };
  if (typeof blocked !== "boolean") {
    res.status(400).json({ error: "blocked field (boolean) is required" });
    return;
  }
  const rejectionReason = typeof reason === "string" && reason.trim() ? reason.trim() : undefined;

  const blockUpdate: Record<string, unknown> = { is_blocked: blocked };
  if (blocked) {
    blockUpdate.rejection_reason = rejectionReason ?? null;
  } else {
    blockUpdate.rejection_reason = null;
  }

  let { data: user, error } = await supabase
    .from("users")
    .update(blockUpdate)
    .eq("id", id)
    .select()
    .maybeSingle();

  // Graceful fallback: rejection_reason column may not exist yet — retry without it
  if (error?.message?.includes("rejection_reason")) {
    const retryUpdate: Record<string, unknown> = { is_blocked: blocked };
    const retry = await supabase
      .from("users")
      .update(retryUpdate)
      .eq("id", id)
      .select()
      .maybeSingle();
    user = retry.data;
    error = retry.error;
  }

  // Graceful fallback: if column doesn't exist yet, tell the admin to run migration
  if (error?.message?.includes("is_blocked")) {
    res.status(422).json({
      error: "Database column missing. Run this SQL in Supabase:\nALTER TABLE users ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN NOT NULL DEFAULT FALSE;"
    });
    return;
  }

  if (error || !user) {
    res.status(500).json({ error: error?.message ?? "Failed to update user" });
    return;
  }

  if (blocked) {
    sendUserRejectedEmail(user.email, user.name, rejectionReason).catch((err) => {
      console.error("[users] Failed to send rejection email for user", id, err);
    });
  }

  logAdminAction({
    actorId: req.userId!,
    targetUserId: id,
    action: blocked ? "user_rejected" : "user_unblocked",
    entityType: "user",
    entityId: id,
    reason: blocked ? (rejectionReason ?? null) : null,
  }).catch((err: unknown) => { console.error("[audit] logAdminAction fire-and-forget failed:", err); });

  res.json(formatUser(user));
});

router.patch("/users/:id/approve", requireAdmin, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid user id" });
    return;
  }

  const { data: user, error } = await supabase
    .from("users")
    .update({ is_approved: true })
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error?.message?.includes("is_approved")) {
    res.status(422).json({
      error: "Database column missing. Run this SQL in Supabase:\nALTER TABLE users ADD COLUMN IF NOT EXISTS is_approved BOOLEAN NOT NULL DEFAULT FALSE;"
    });
    return;
  }

  if (error || !user) {
    res.status(500).json({ error: error?.message ?? "Failed to approve user" });
    return;
  }

  sendUserApprovedEmail(user.email, user.name).catch((err) => {
    console.error("[users] Failed to send approval email for user", id, err);
  });

  logAdminAction({
    actorId: req.userId!,
    targetUserId: id,
    action: "user_approved",
    entityType: "user",
    entityId: id,
  }).catch((err: unknown) => { console.error("[audit] logAdminAction fire-and-forget failed:", err); });

  res.json(formatUser(user));
});

router.post("/users/bulk-action", requireAdmin, async (req, res): Promise<void> => {
  const { userIds, action, reason } = req.body as { userIds?: unknown; action?: unknown; reason?: string };
  const bulkRejectionReason = typeof reason === "string" && reason.trim() ? reason.trim() : undefined;

  if (!Array.isArray(userIds) || userIds.length === 0) {
    res.status(400).json({ error: "userIds must be a non-empty array" });
    return;
  }
  if (action !== "approve" && action !== "reject") {
    res.status(400).json({ error: "action must be 'approve' or 'reject'" });
    return;
  }

  const ids = userIds.map(Number).filter(n => !isNaN(n));
  if (ids.length === 0) {
    res.status(400).json({ error: "No valid user IDs provided" });
    return;
  }

  if (action === "approve") {
    const { data: updatedUsers, error } = await supabase
      .from("users")
      .update({ is_approved: true })
      .in("id", ids)
      .select();

    if (error) {
      res.status(500).json({ error: error.message ?? "Failed to approve users" });
      return;
    }

    for (const u of updatedUsers ?? []) {
      sendUserApprovedEmail(u.email, u.name).catch((err) => {
        console.error("[users] Failed to send approval email for user", u.id, err);
      });
      logAdminAction({
        actorId: req.userId!,
        targetUserId: u.id,
        action: "user_approved",
        entityType: "user",
        entityId: u.id,
      }).catch((err: unknown) => { console.error("[audit] logAdminAction fire-and-forget failed:", err); });
    }

    res.json({ updated: (updatedUsers ?? []).length, updatedIds: (updatedUsers ?? []).map(u => u.id) });
  } else {
    const bulkBlockUpdate: Record<string, unknown> = {
      is_blocked: true,
      rejection_reason: bulkRejectionReason ?? null,
    };
    let { data: updatedUsers, error } = await supabase
      .from("users")
      .update(bulkBlockUpdate)
      .in("id", ids)
      .select();

    // Graceful fallback: rejection_reason column may not exist yet
    if (error?.message?.includes("rejection_reason")) {
      const retry = await supabase
        .from("users")
        .update({ is_blocked: true })
        .in("id", ids)
        .select();
      updatedUsers = retry.data;
      error = retry.error;
    }

    if (error) {
      res.status(500).json({ error: error.message ?? "Failed to reject users" });
      return;
    }

    for (const u of updatedUsers ?? []) {
      sendUserRejectedEmail(u.email, u.name, bulkRejectionReason).catch((err) => {
        console.error("[users] Failed to send rejection email for user", u.id, err);
      });
      logAdminAction({
        actorId: req.userId!,
        targetUserId: u.id,
        action: "user_rejected",
        entityType: "user",
        entityId: u.id,
        reason: bulkRejectionReason ?? null,
      }).catch((err: unknown) => { console.error("[audit] logAdminAction fire-and-forget failed:", err); });
    }

    res.json({ updated: (updatedUsers ?? []).length, updatedIds: (updatedUsers ?? []).map(u => u.id) });
  }
});

router.post("/users/bulk-undo", requireAdmin, async (req, res): Promise<void> => {
  const { userIds, action } = req.body as { userIds?: unknown; action?: unknown };

  if (!Array.isArray(userIds) || userIds.length === 0) {
    res.status(400).json({ error: "userIds must be a non-empty array" });
    return;
  }
  if (action !== "approve" && action !== "reject") {
    res.status(400).json({ error: "action must be 'approve' or 'reject'" });
    return;
  }

  const ids = userIds.map(Number).filter(n => !isNaN(n));
  if (ids.length === 0) {
    res.status(400).json({ error: "No valid user IDs provided" });
    return;
  }

  if (action === "approve") {
    const { data: updatedUsers, error } = await supabase
      .from("users")
      .update({ is_approved: false })
      .in("id", ids)
      .select();

    if (error) {
      res.status(500).json({ error: error.message ?? "Failed to undo approval" });
      return;
    }

    for (const u of updatedUsers ?? []) {
      logAdminAction({
        actorId: req.userId!,
        targetUserId: u.id,
        action: "user_approval_undone",
        entityType: "user",
        entityId: u.id,
      }).catch((err: unknown) => { console.error("[audit] logAdminAction fire-and-forget failed:", err); });
    }

    res.json({ updated: (updatedUsers ?? []).length });
  } else {
    const undoRejectUpdate: Record<string, unknown> = { is_blocked: false, rejection_reason: null };
    let { data: updatedUsers, error } = await supabase
      .from("users")
      .update(undoRejectUpdate)
      .in("id", ids)
      .select();

    // Graceful fallback: rejection_reason column may not exist yet
    if (error?.message?.includes("rejection_reason")) {
      const retry = await supabase
        .from("users")
        .update({ is_blocked: false })
        .in("id", ids)
        .select();
      updatedUsers = retry.data;
      error = retry.error;
    }

    if (error) {
      res.status(500).json({ error: error.message ?? "Failed to undo rejection" });
      return;
    }

    for (const u of updatedUsers ?? []) {
      logAdminAction({
        actorId: req.userId!,
        targetUserId: u.id,
        action: "user_rejection_undone",
        entityType: "user",
        entityId: u.id,
      }).catch((err: unknown) => { console.error("[audit] logAdminAction fire-and-forget failed:", err); });
    }

    res.json({ updated: (updatedUsers ?? []).length });
  }
});

router.patch("/users/:id/role", requireAdmin, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid user id" });
    return;
  }

  const parsed = UpdateUserRoleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { data: user, error } = await supabase
    .from("users")
    .update({ role: parsed.data.role })
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error || !user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(formatUser(user));
});

export default router;
