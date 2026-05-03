import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
import { z } from "zod";

const router: IRouter = Router();

async function isAdmin(userId: string | number): Promise<boolean> {
  const { data } = await supabase.from("users").select("role").eq("id", userId).single();
  return data?.role === "admin";
}

const CouponSchema = z.object({
  code:             z.string().min(2).max(50).toUpperCase(),
  discount_percent: z.number().min(1).max(100),
  plan_id:          z.number().int().positive().nullable().optional(),
  expiry_date:      z.string().nullable().optional(),
  max_usage:        z.number().int().min(1).optional().default(100),
  is_active:        z.boolean().optional().default(true),
});

// GET /api/coupons — admin: list all coupons
router.get("/coupons", requireAuth, async (req, res): Promise<void> => {
  if (!(await isAdmin(req.userId!))) { res.status(403).json({ error: "Admin only" }); return; }

  const { data, error } = await supabase
    .from("coupons")
    .select("*, plans(id, name)")
    .order("created_at", { ascending: false });

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data ?? []);
});

// POST /api/coupons — admin: create a coupon
router.post("/coupons", requireAuth, async (req, res): Promise<void> => {
  if (!(await isAdmin(req.userId!))) { res.status(403).json({ error: "Admin only" }); return; }

  const parsed = CouponSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid coupon data", details: parsed.error.flatten() }); return; }

  const { data, error } = await supabase
    .from("coupons")
    .insert(parsed.data)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") { res.status(409).json({ error: "Coupon code already exists" }); return; }
    res.status(500).json({ error: error.message });
    return;
  }
  res.status(201).json(data);
});

// PUT /api/coupons/:id — admin: update a coupon
router.put("/coupons/:id", requireAuth, async (req, res): Promise<void> => {
  if (!(await isAdmin(req.userId!))) { res.status(403).json({ error: "Admin only" }); return; }

  const id = parseInt(req.params["id"] as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = CouponSchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid coupon data" }); return; }

  const { data, error } = await supabase
    .from("coupons")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .single();

  if (error) { res.status(500).json({ error: error.message }); return; }
  if (!data) { res.status(404).json({ error: "Coupon not found" }); return; }
  res.json(data);
});

// DELETE /api/coupons/:id — admin: delete a coupon
router.delete("/coupons/:id", requireAuth, async (req, res): Promise<void> => {
  if (!(await isAdmin(req.userId!))) { res.status(403).json({ error: "Admin only" }); return; }

  const id = parseInt(req.params["id"] as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { error } = await supabase.from("coupons").delete().eq("id", id);
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.status(204).send();
});

// POST /api/coupons/validate — user: validate a coupon code for a plan
router.post("/coupons/validate", requireAuth, async (req, res): Promise<void> => {
  const Schema = z.object({
    code:    z.string().min(1),
    plan_id: z.number().int().positive(),
  });
  const parsed = Schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "code and plan_id are required" }); return; }

  const { data, error } = await supabase
    .from("coupons")
    .select("*")
    .eq("code", parsed.data.code.toUpperCase())
    .eq("is_active", true)
    .maybeSingle();

  if (error) { res.status(500).json({ error: error.message }); return; }
  if (!data) { res.status(404).json({ error: "Coupon not found or inactive" }); return; }

  // Check plan applicability
  if (data.plan_id !== null && data.plan_id !== parsed.data.plan_id) {
    res.status(400).json({ error: "This coupon is not valid for the selected plan" }); return;
  }

  // Check expiry
  if (data.expiry_date && new Date(data.expiry_date) < new Date()) {
    res.status(400).json({ error: "Coupon has expired" }); return;
  }

  // Check usage
  if (data.used_count >= data.max_usage) {
    res.status(400).json({ error: "Coupon usage limit reached" }); return;
  }

  res.json({
    id:               data.id,
    code:             data.code,
    discount_percent: data.discount_percent,
    valid:            true,
  });
});

export default router;
