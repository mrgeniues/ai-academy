import { supabase } from "./supabase";

type NotificationType = "post" | "comment" | "admin_post" | "admin_course";

interface NotificationPayload {
  type: NotificationType;
  title: string;
  message: string;
  postId?: number | null;
  courseId?: number | null;
  isVip?: boolean;
  excludeUserId?: number;
}

interface TargetedNotificationPayload {
  userIds: number[];
  type: NotificationType;
  title: string;
  message: string;
  postId?: number | null;
  courseId?: number | null;
  isVip?: boolean;
}

export async function sendNotificationToUsers(payload: TargetedNotificationPayload): Promise<void> {
  if (payload.userIds.length === 0) return;
  try {
    const { error } = await supabase.from("notifications").insert(
      payload.userIds.map(uid => ({
        user_id: uid,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        post_id: payload.postId ?? null,
        course_id: payload.courseId ?? null,
        is_vip: payload.isVip ?? false,
        is_read: false,
      }))
    );
    if (error) {
      console.error("[sendNotificationToUsers] Insert error:", error.message);
    }
  } catch (err) {
    console.error("[sendNotificationToUsers] Unexpected error:", err);
  }
}

export async function broadcastNotification(payload: NotificationPayload): Promise<void> {
  try {
    const { data: users } = await supabase.from("users").select("id");
    if (!users || users.length === 0) return;

    const targets = payload.excludeUserId
      ? users.filter(u => u.id !== payload.excludeUserId)
      : users;

    if (targets.length === 0) return;

    const { error } = await supabase.from("notifications").insert(
      targets.map(u => ({
        user_id: u.id,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        post_id: payload.postId ?? null,
        course_id: payload.courseId ?? null,
        is_vip: payload.isVip ?? false,
        is_read: false,
      }))
    );

    if (error) {
      console.error("[broadcastNotification] Insert error:", error.message);
    }
  } catch (err) {
    console.error("[broadcastNotification] Unexpected error:", err);
  }
}
