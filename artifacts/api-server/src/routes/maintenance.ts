import { Router, type IRouter } from "express";
import { supabase } from "../lib/supabase";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

// Public: get current maintenance settings
router.get("/maintenance", async (_req, res): Promise<void> => {
  const { data, error } = await supabase
    .from("maintenance_settings")
    .select("*")
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    // If table doesn't exist yet, return inactive
    res.json({ isActive: false, startTime: null, endTime: null, description: null });
    return;
  }

  if (!data) {
    res.json({ isActive: false, startTime: null, endTime: null, description: null });
    return;
  }

  res.json({
    isActive: data.is_active ?? false,
    startTime: data.start_time ?? null,
    endTime: data.end_time ?? null,
    description: data.description ?? null,
  });
});

// Admin: save maintenance settings (upsert)
router.post("/maintenance", requireAuth, async (req, res): Promise<void> => {
  if (req.userRole !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  const { isActive, startTime, endTime, description } = req.body as {
    isActive: boolean;
    startTime: string | null;
    endTime: string | null;
    description: string | null;
  };

  // Check if a row already exists
  const { data: existing } = await supabase
    .from("maintenance_settings")
    .select("id")
    .limit(1)
    .maybeSingle();

  let result;
  if (existing) {
    result = await supabase
      .from("maintenance_settings")
      .update({
        is_active: isActive,
        start_time: startTime,
        end_time: endTime,
        description: description ?? null,
      })
      .eq("id", existing.id)
      .select()
      .single();
  } else {
    result = await supabase
      .from("maintenance_settings")
      .insert({
        is_active: isActive,
        start_time: startTime,
        end_time: endTime,
        description: description ?? null,
      })
      .select()
      .single();
  }

  if (result.error || !result.data) {
    res.status(500).json({ error: "Failed to save maintenance settings" });
    return;
  }

  res.json({
    isActive: result.data.is_active,
    startTime: result.data.start_time,
    endTime: result.data.end_time,
    description: result.data.description,
  });
});

export default router;
