import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
import { z } from "zod";

const router: IRouter = Router();

const CreateCommunitySchema = z.object({
  name:        z.string().min(2).max(100),
  description: z.string().max(1000).optional().nullable(),
  plan_id:     z.number().int().positive().optional().nullable(),
});

// POST /api/communities — create a new community (status = pending)
router.post("/communities", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateCommunitySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }

  const { name, description, plan_id } = parsed.data;
  const userId = req.userId!;

  // ── Limit check ──────────────────────────────────────────────────────────
  if (plan_id) {
    // Fetch the plan to get max_communities
    const { data: plan } = await supabase
      .from("plans")
      .select("max_communities")
      .eq("id", plan_id)
      .single();

    if (plan) {
      // Count how many APPROVED communities this user already has
      const { count } = await supabase
        .from("communities")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", userId)
        .eq("status", "approved");

      if ((count ?? 0) >= plan.max_communities) {
        res.status(403).json({
          error: `Limit reached for your current plan. Your plan allows ${plan.max_communities} communit${plan.max_communities === 1 ? "y" : "ies"}.`,
          code: "PLAN_LIMIT_EXCEEDED",
        });
        return;
      }
    }
  }

  const { data, error } = await supabase
    .from("communities")
    .insert({
      name:        name.trim(),
      description: description?.trim() ?? null,
      owner_id:    userId,
      status:      "pending",
      plan_id:     plan_id ?? null,
    })
    .select()
    .single();

  if (error) {
    req.log.error({ error }, "Failed to create community");
    res.status(500).json({ error: error.message });
    return;
  }

  res.status(201).json(data);
});

// GET /api/communities/mine — list communities owned by current user
router.get("/communities/mine", requireAuth, async (req, res): Promise<void> => {
  const { data, error } = await supabase
    .from("communities")
    .select("*, plans(id, name, price, max_communities, max_tools, max_courses)")
    .eq("owner_id", req.userId!)
    .order("created_at", { ascending: false });

  if (error) {
    req.log.error({ error }, "Failed to fetch communities");
    res.status(500).json({ error: error.message });
    return;
  }

  res.json(data ?? []);
});

// GET /api/communities/pending — admin: list all pending communities with owner info
router.get("/communities/pending", requireAuth, async (req, res): Promise<void> => {
  const { data: me, error: meErr } = await supabase
    .from("users").select("role").eq("id", req.userId!).single();
  if (meErr || me?.role !== "admin") {
    res.status(403).json({ error: "Admin only" });
    return;
  }

  const { data, error } = await supabase
    .from("communities")
    .select("id, name, description, status, created_at, owner_id, plan_id, users!communities_owner_id_fkey(id, name, email), plans(id, name, price)")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) {
    req.log.error({ error }, "Failed to fetch pending communities");
    res.status(500).json({ error: error.message });
    return;
  }

  res.json(data ?? []);
});

// PATCH /api/communities/:id/status — admin: approve or reject a community
router.patch("/communities/:id/status", requireAuth, async (req, res): Promise<void> => {
  const { data: me, error: meErr } = await supabase
    .from("users").select("role").eq("id", req.userId!).single();
  if (meErr || me?.role !== "admin") {
    res.status(403).json({ error: "Admin only" });
    return;
  }

  const id = parseInt(req.params["id"] as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const StatusSchema = z.object({ status: z.enum(["approved", "rejected"]) });
  const parsed = StatusSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "status must be 'approved' or 'rejected'" }); return; }

  const { data, error } = await supabase
    .from("communities")
    .update({ status: parsed.data.status })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    req.log.error({ error }, "Failed to update community status");
    res.status(500).json({ error: error.message });
    return;
  }

  res.json(data);
});

// GET /api/communities — list all approved communities
router.get("/communities", requireAuth, async (req, res): Promise<void> => {
  const { data, error } = await supabase
    .from("communities")
    .select("id, name, description, status, created_at, owner_id, plan_id, plans(id, name)")
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (error) {
    req.log.error({ error }, "Failed to fetch communities");
    res.status(500).json({ error: error.message });
    return;
  }

  res.json(data ?? []);
});

// GET /api/communities/my-plan — user: get their active plan info
router.get("/communities/my-plan", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;

  // Find the latest approved community_payment with a plan
  const { data: payment } = await supabase
    .from("community_payments")
    .select("id, plan_id, status, created_at, final_price, plans(id, name, price, max_communities, max_tools, max_courses, description)")
    .eq("user_id", userId)
    .eq("status", "approved")
    .not("plan_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!payment) {
    res.json({ plan: null, usage: null });
    return;
  }

  // Count usage
  const { count: communityCount } = await supabase
    .from("communities")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", userId)
    .eq("status", "approved");

  res.json({
    plan:    payment.plans,
    payment: { id: payment.id, final_price: payment.final_price, created_at: payment.created_at },
    usage:   { communities: communityCount ?? 0 },
  });
});

export default router;
