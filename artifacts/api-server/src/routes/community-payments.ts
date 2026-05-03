import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
import { z } from "zod";

const router: IRouter = Router();

// ── GET /api/community-payments/settings ── public plan prices + payment info
router.get("/community-payments/settings", async (_req, res): Promise<void> => {
  const { data, error } = await supabase
    .from("community_payment_settings")
    .select("*")
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) { res.status(500).json({ error: error.message }); return; }

  if (!data) {
    res.json({
      monthly_price: 0, yearly_price: 0, lifetime_price: 0,
      binance_account: null, binance_qr_url: null,
      nayapay_account: null, nayapay_qr_url: null,
    });
    return;
  }
  res.json(data);
});

// ── PUT /api/community-payments/settings ── admin update settings
router.put("/community-payments/settings", requireAuth, async (req, res): Promise<void> => {
  const { data: me } = await supabase.from("users").select("role").eq("id", req.userId!).single();
  if (me?.role !== "admin") { res.status(403).json({ error: "Admin only" }); return; }

  const Schema = z.object({
    monthly_price:    z.number().min(0),
    yearly_price:     z.number().min(0),
    lifetime_price:   z.number().min(0),
    binance_account:  z.string().nullable().optional(),
    binance_qr_url:   z.string().nullable().optional(),
    nayapay_account:  z.string().nullable().optional(),
    nayapay_qr_url:   z.string().nullable().optional(),
  });

  const parsed = Schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid data" }); return; }

  const { data: existing } = await supabase
    .from("community_payment_settings").select("id").limit(1).maybeSingle();

  let result;
  if (existing) {
    result = await supabase
      .from("community_payment_settings")
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq("id", existing.id)
      .select().single();
  } else {
    result = await supabase
      .from("community_payment_settings")
      .insert(parsed.data)
      .select().single();
  }

  if (result.error) { res.status(500).json({ error: result.error.message }); return; }
  res.json(result.data);
});

// ── POST /api/community-payments ── user submits payment proof
router.post("/community-payments", requireAuth, async (req, res): Promise<void> => {
  const Schema = z.object({
    community_id:       z.number().int().positive(),
    plan:               z.string().optional().default("custom"),
    plan_id:            z.number().int().positive().optional().nullable(),
    coupon_id:          z.number().int().positive().optional().nullable(),
    payment_method:     z.string().min(1).max(200),
    payment_method_id:  z.number().int().positive().optional().nullable(),
    screenshot_url:     z.string().url(),
    final_price:        z.number().min(0).optional().nullable(),
    discount_amount:    z.number().min(0).optional().nullable(),
  });

  const parsed = Schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid payment data" }); return; }

  // Verify community belongs to user
  const { data: community } = await supabase
    .from("communities")
    .select("id, owner_id, status, plan_id")
    .eq("id", parsed.data.community_id)
    .single();

  if (!community) { res.status(404).json({ error: "Community not found" }); return; }
  if (community.owner_id !== req.userId) { res.status(403).json({ error: "Not your community" }); return; }

  // Check for existing pending/approved payment
  const { data: existing } = await supabase
    .from("community_payments")
    .select("id, status")
    .eq("community_id", parsed.data.community_id)
    .in("status", ["pending", "approved"])
    .maybeSingle();

  if (existing?.status === "approved") {
    res.status(409).json({ error: "Payment already approved for this community" }); return;
  }
  if (existing?.status === "pending") {
    res.status(409).json({ error: "A payment is already pending review" }); return;
  }

  // Resolve plan_id from community if not provided
  const effectivePlanId = parsed.data.plan_id ?? community.plan_id ?? null;

  // Resolve plan name for backward-compat 'plan' field
  let planName = parsed.data.plan;
  if (effectivePlanId) {
    const { data: planRow } = await supabase
      .from("plans").select("name").eq("id", effectivePlanId).single();
    if (planRow) planName = planRow.name;
  }

  // If coupon provided, increment used_count
  if (parsed.data.coupon_id) {
    await supabase.rpc("increment_coupon_usage", { coupon_id: parsed.data.coupon_id }).then(() => null);
  }

  const { data, error } = await supabase
    .from("community_payments")
    .insert({
      community_id:    parsed.data.community_id,
      plan:            planName,
      plan_id:         effectivePlanId,
      coupon_id:       parsed.data.coupon_id ?? null,
      payment_method:  parsed.data.payment_method,
      screenshot_url:  parsed.data.screenshot_url,
      status:          "pending",
      user_id:         req.userId!,
      final_price:     parsed.data.final_price ?? null,
      discount_amount: parsed.data.discount_amount ?? 0,
    })
    .select().single();

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.status(201).json(data);
});

// ── GET /api/community-payments/pending ── admin list payments
router.get("/community-payments/pending", requireAuth, async (req, res): Promise<void> => {
  const { data: me } = await supabase.from("users").select("role").eq("id", req.userId!).single();
  if (me?.role !== "admin") { res.status(403).json({ error: "Admin only" }); return; }

  const status = (req.query["status"] as string) ?? "pending";

  const { data, error } = await supabase
    .from("community_payments")
    .select(`
      id, plan, plan_id, payment_method, screenshot_url, status, created_at,
      final_price, discount_amount,
      user_id, community_id,
      users!community_payments_user_id_fkey(id, name, email, avatar),
      communities!community_payments_community_id_fkey(id, name, description),
      plans(id, name, price, max_communities, max_tools, max_courses)
    `)
    .eq("status", status)
    .order("created_at", { ascending: false });

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data ?? []);
});

// ── GET /api/community-payments/all ── admin list all payments
router.get("/community-payments/all", requireAuth, async (req, res): Promise<void> => {
  const { data: me } = await supabase.from("users").select("role").eq("id", req.userId!).single();
  if (me?.role !== "admin") { res.status(403).json({ error: "Admin only" }); return; }

  const { data, error } = await supabase
    .from("community_payments")
    .select(`
      id, plan, plan_id, payment_method, screenshot_url, status, created_at,
      final_price, discount_amount,
      user_id, community_id,
      users!community_payments_user_id_fkey(id, name, email, avatar),
      communities!community_payments_community_id_fkey(id, name, description),
      plans(id, name, price, max_communities, max_tools, max_courses)
    `)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data ?? []);
});

// ── PATCH /api/community-payments/:id/status ── admin approve/reject
router.patch("/community-payments/:id/status", requireAuth, async (req, res): Promise<void> => {
  const { data: me } = await supabase.from("users").select("role").eq("id", req.userId!).single();
  if (me?.role !== "admin") { res.status(403).json({ error: "Admin only" }); return; }

  const paymentId = parseInt(req.params["id"] as string, 10);
  if (isNaN(paymentId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = z.object({
    status: z.enum(["approved", "rejected"]),
    rejection_reason: z.string().max(1000).nullable().optional(),
  }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "status must be approved or rejected" }); return; }

  const { data: payment, error: fetchErr } = await supabase
    .from("community_payments")
    .select("id, community_id, status, plan_id")
    .eq("id", paymentId)
    .single();

  if (fetchErr || !payment) { res.status(404).json({ error: "Payment not found" }); return; }

  const updatePayload: Record<string, unknown> = { status: parsed.data.status };
  if (parsed.data.status === "rejected" && parsed.data.rejection_reason) {
    updatePayload["rejection_reason"] = parsed.data.rejection_reason;
  }

  const { data: updated, error: updateErr } = await supabase
    .from("community_payments")
    .update(updatePayload)
    .eq("id", paymentId)
    .select().single();

  if (updateErr) { res.status(500).json({ error: updateErr.message }); return; }

  // If approved → automatically approve the community
  if (parsed.data.status === "approved") {
    await supabase
      .from("communities")
      .update({ status: "approved" })
      .eq("id", payment.community_id);
  }

  // If rejected → set community back to pending
  if (parsed.data.status === "rejected") {
    await supabase
      .from("communities")
      .update({ status: "pending" })
      .eq("id", payment.community_id);
  }

  res.json(updated);
});

// ── GET /api/community-payments/my/:communityId ── user checks own payment
router.get("/community-payments/my/:communityId", requireAuth, async (req, res): Promise<void> => {
  const communityId = parseInt(req.params["communityId"] as string, 10);
  if (isNaN(communityId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { data, error } = await supabase
    .from("community_payments")
    .select("id, plan, plan_id, payment_method, status, created_at, final_price, rejection_reason, plans(id, name, price, max_communities, max_tools, max_courses)")
    .eq("community_id", communityId)
    .eq("user_id", req.userId!)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data ?? null);
});

export default router;
