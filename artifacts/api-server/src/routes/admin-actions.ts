import { Router, type IRouter } from "express";
import { requireAdmin } from "../lib/auth";
import { supabase } from "../lib/supabase";

const router: IRouter = Router();

router.get("/admin-actions", requireAdmin, async (req, res): Promise<void> => {
  const { action, startDate, endDate } = req.query as {
    action?: string;
    startDate?: string;
    endDate?: string;
  };

  let query = supabase
    .from("admin_actions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (action && action !== "all") {
    query = query.eq("action", action);
  }

  if (startDate) {
    query = query.gte("created_at", new Date(startDate).toISOString());
  }

  if (endDate) {
    // Include the full end date day
    const end = new Date(endDate);
    end.setDate(end.getDate() + 1);
    query = query.lt("created_at", end.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    if (error.message.includes("admin_actions") || error.code === "42P01") {
      res.json([]);
      return;
    }
    res.status(500).json({ error: "Failed to fetch audit log" });
    return;
  }

  if (!data || data.length === 0) {
    res.json([]);
    return;
  }

  // Enrich with actor and target user names
  const actorIds = [...new Set(data.map(r => r.actor_id).filter(Boolean))];
  const targetIds = [...new Set(data.map(r => r.target_user_id).filter(Boolean))];
  const allUserIds = [...new Set([...actorIds, ...targetIds])];

  let usersMap: Record<number, { name: string; email: string }> = {};
  if (allUserIds.length > 0) {
    const { data: users } = await supabase
      .from("users")
      .select("id, name, email")
      .in("id", allUserIds);
    for (const u of users ?? []) {
      usersMap[u.id] = { name: u.name, email: u.email };
    }
  }

  const enriched = data.map(row => ({
    id: row.id,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    reason: row.reason,
    createdAt: row.created_at,
    actor: row.actor_id ? (usersMap[row.actor_id] ?? { name: "Unknown", email: "" }) : null,
    targetUser: row.target_user_id ? (usersMap[row.target_user_id] ?? { name: "Deleted user", email: "" }) : null,
  }));

  res.json(enriched);
});

export default router;
