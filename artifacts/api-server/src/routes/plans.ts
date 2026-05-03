import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
import { z } from "zod";

const router: IRouter = Router();

const PlanSchema = z.object({
  name:             z.string().min(1).max(100),
  price:            z.number().min(0),
  max_communities:  z.number().int().min(1),
  max_tools:        z.number().int().min(0),
  max_courses:      z.number().int().min(0),
  discount_percent: z.number().min(0).max(100).optional().default(0),
  description:      z.string().max(500).nullable().optional(),
  is_active:        z.boolean().optional().default(true),
});

async function isAdmin(userId: string | number): Promise<boolean> {
  const { data } = await supabase.from("users").select("role").eq("id", userId).single();
  return data?.role === "admin";
}

// GET /api/plans — list all active plans (public)
router.get("/plans", async (_req, res): Promise<void> => {
  const { data, error } = await supabase
    .from("plans")
    .select("*")
    .eq("is_active", true)
    .order("price", { ascending: true });

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data ?? []);
});

// GET /api/plans/all — admin: list all plans including inactive
router.get("/plans/all", requireAuth, async (req, res): Promise<void> => {
  if (!(await isAdmin(req.userId!))) { res.status(403).json({ error: "Admin only" }); return; }

  const { data, error } = await supabase
    .from("plans")
    .select("*")
    .order("price", { ascending: true });

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data ?? []);
});

// POST /api/plans — admin: create a plan
router.post("/plans", requireAuth, async (req, res): Promise<void> => {
  if (!(await isAdmin(req.userId!))) { res.status(403).json({ error: "Admin only" }); return; }

  const parsed = PlanSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid plan data", details: parsed.error.flatten() }); return; }

  const { data, error } = await supabase
    .from("plans")
    .insert(parsed.data)
    .select()
    .single();

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.status(201).json(data);
});

// PUT /api/plans/:id — admin: update a plan
router.put("/plans/:id", requireAuth, async (req, res): Promise<void> => {
  if (!(await isAdmin(req.userId!))) { res.status(403).json({ error: "Admin only" }); return; }

  const id = parseInt(req.params["id"] as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = PlanSchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid plan data" }); return; }

  const { data, error } = await supabase
    .from("plans")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .single();

  if (error) { res.status(500).json({ error: error.message }); return; }
  if (!data) { res.status(404).json({ error: "Plan not found" }); return; }
  res.json(data);
});

// DELETE /api/plans/:id — admin: delete a plan
router.delete("/plans/:id", requireAuth, async (req, res): Promise<void> => {
  if (!(await isAdmin(req.userId!))) { res.status(403).json({ error: "Admin only" }); return; }

  const id = parseInt(req.params["id"] as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { error } = await supabase.from("plans").delete().eq("id", id);
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.status(204).send();
});

export default router;
