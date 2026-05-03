import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
import { z } from "zod";

const router: IRouter = Router();

async function isAdmin(userId: string | number): Promise<boolean> {
  const { data } = await supabase.from("users").select("role").eq("id", userId).single();
  return data?.role === "admin";
}

const MethodSchema = z.object({
  name:            z.string().min(1).max(100),
  instructions:    z.string().max(1000).nullable().optional(),
  account_details: z.string().max(500).nullable().optional(),
  qr_url:          z.string().nullable().optional(),
  is_active:       z.boolean().optional().default(true),
  sort_order:      z.number().int().min(0).optional().default(0),
});

// GET /api/payment-methods — public: active methods only
router.get("/payment-methods", async (_req, res): Promise<void> => {
  const { data, error } = await supabase
    .from("payment_methods")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data ?? []);
});

// GET /api/payment-methods/all — admin: all methods
router.get("/payment-methods/all", requireAuth, async (req, res): Promise<void> => {
  if (!(await isAdmin(req.userId!))) { res.status(403).json({ error: "Admin only" }); return; }

  const { data, error } = await supabase
    .from("payment_methods")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data ?? []);
});

// POST /api/payment-methods — admin: create
router.post("/payment-methods", requireAuth, async (req, res): Promise<void> => {
  if (!(await isAdmin(req.userId!))) { res.status(403).json({ error: "Admin only" }); return; }

  const parsed = MethodSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid data", details: parsed.error.flatten() }); return; }

  const { data, error } = await supabase
    .from("payment_methods")
    .insert(parsed.data)
    .select()
    .single();

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.status(201).json(data);
});

// PUT /api/payment-methods/:id — admin: update
router.put("/payment-methods/:id", requireAuth, async (req, res): Promise<void> => {
  if (!(await isAdmin(req.userId!))) { res.status(403).json({ error: "Admin only" }); return; }

  const id = parseInt(req.params["id"] as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = MethodSchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid data" }); return; }

  const { data, error } = await supabase
    .from("payment_methods")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .single();

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data);
});

// DELETE /api/payment-methods/:id — admin: delete
router.delete("/payment-methods/:id", requireAuth, async (req, res): Promise<void> => {
  if (!(await isAdmin(req.userId!))) { res.status(403).json({ error: "Admin only" }); return; }

  const id = parseInt(req.params["id"] as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { error } = await supabase.from("payment_methods").delete().eq("id", id);
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.status(204).send();
});

export default router;
