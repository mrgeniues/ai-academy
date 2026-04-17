import { supabase } from "./supabase";

export type AdminActionType =
  | "user_approved"
  | "user_rejected"
  | "user_unblocked"
  | "enrollment_approved"
  | "enrollment_rejected";

export async function logAdminAction(opts: {
  actorId: number | null;
  targetUserId?: number | null;
  action: AdminActionType;
  entityType: "user" | "enrollment";
  entityId?: number | null;
  reason?: string | null;
}): Promise<void> {
  const { error } = await supabase.from("admin_actions").insert({
    actor_id: opts.actorId,
    target_user_id: opts.targetUserId ?? null,
    action: opts.action,
    entity_type: opts.entityType,
    entity_id: opts.entityId ?? null,
    reason: opts.reason ?? null,
  });

  if (error) {
    if (
      error.message.includes("admin_actions") ||
      error.code === "42P01"
    ) {
      // Table doesn't exist yet — silently skip; migration SQL will create it
      return;
    }
    console.error("[audit] Failed to log admin action:", error.message);
  }
}
