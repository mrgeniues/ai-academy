import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
import { z } from "zod";

const router: IRouter = Router();

const CreateCommunitySchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(1000).optional().nullable(),
});

// POST /api/communities — create a new community (status = pending)
router.post("/communities", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateCommunitySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }

  const { name, description } = parsed.data;

  const { data, error } = await supabase
    .from("communities")
    .insert({
      name: name.trim(),
      description: description?.trim() ?? null,
      owner_id: req.userId!,
      status: "pending",
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
    .select("*")
    .eq("owner_id", req.userId!)
    .order("created_at", { ascending: false });

  if (error) {
    req.log.error({ error }, "Failed to fetch communities");
    res.status(500).json({ error: error.message });
    return;
  }

  res.json(data ?? []);
});

// GET /api/communities — list all approved communities
router.get("/communities", requireAuth, async (req, res): Promise<void> => {
  const { data, error } = await supabase
    .from("communities")
    .select("id, name, description, status, created_at, owner_id")
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (error) {
    req.log.error({ error }, "Failed to fetch communities");
    res.status(500).json({ error: error.message });
    return;
  }

  res.json(data ?? []);
});

export default router;
