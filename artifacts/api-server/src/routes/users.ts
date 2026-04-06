import { Router, type IRouter } from "express";
import { requireAuth, requireAdmin } from "../lib/auth";
import { formatUser } from "./auth";
import { UpdateUserBody, UpdateUserRoleBody } from "@workspace/api-zod";
import { supabase } from "../lib/supabase";

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

  res.json((users ?? []).map(formatUser));
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

  res.json(formatUser(user));
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

  const updates: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.avatar !== undefined) updates.avatar = parsed.data.avatar;
  if (parsed.data.bio !== undefined) updates.bio = parsed.data.bio;
  if (parsed.data.socialLinks !== undefined) updates.social_links = parsed.data.socialLinks;

  const { data: user, error } = await supabase
    .from("users")
    .update(updates)
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error || !user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(formatUser(user));
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
