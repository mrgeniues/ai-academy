import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";

const router: IRouter = Router();

router.get("/notifications", requireAuth, async (req, res): Promise<void> => {
  const { data: notifications, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", req.userId!)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    // If the table doesn't exist yet, return empty list instead of 500
    console.error("[GET /notifications] Supabase error:", error.message);
    res.json([]);
    return;
  }

  res.json(
    (notifications ?? []).map(n => ({
      id: n.id,
      userId: n.user_id,
      type: n.type,
      title: n.title,
      message: n.message,
      postId: n.post_id ?? null,
      courseId: n.course_id ?? null,
      isRead: n.is_read,
      isVip: n.is_vip,
      createdAt: n.created_at,
    }))
  );
});

router.get("/notifications/unread-count", requireAuth, async (req, res): Promise<void> => {
  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", req.userId!)
    .eq("is_read", false);

  if (error) {
    console.error("[GET /notifications/unread-count] Supabase error:", error.message);
    res.json({ count: 0 });
    return;
  }

  res.json({ count: count ?? 0 });
});

router.patch("/notifications/:id/read", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id)
    .eq("user_id", req.userId!);

  res.json({ ok: true });
});

router.patch("/notifications/read-all", requireAuth, async (req, res): Promise<void> => {
  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", req.userId!)
    .eq("is_read", false);

  res.json({ ok: true });
});

export default router;
