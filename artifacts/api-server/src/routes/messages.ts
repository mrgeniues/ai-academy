import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";

const router: IRouter = Router();

// In-memory typing state: key = `${typingUserId}_to_${receiverId}`, value = expiry timestamp
const typingState = new Map<string, number>();

function mediaPreview(msg: Record<string, unknown>): string {
  const text = (msg.message as string) ?? "";
  if (text) return text;
  if (msg.image_url) return "📷 Image";
  if (msg.video_url) return "🎥 Video";
  return "";
}

// ── Typing indicator ────────────────────────────────────────────────────────

// Set typing status (typing=true) or clear it (typing=false)
router.post("/messages/typing/:userId", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
  const receiverId = parseInt(rawId, 10);
  if (isNaN(receiverId)) { res.status(400).json({ error: "Invalid user id" }); return; }

  const senderId = req.userId!;
  const { typing } = req.body as { typing?: boolean };
  const key = `${senderId}_to_${receiverId}`;

  if (typing === false) {
    typingState.delete(key);
  } else {
    typingState.set(key, Date.now() + 5000); // 5s TTL
  }
  res.json({ ok: true });
});

// Check if a specific user is currently typing to me
router.get("/messages/typing/:userId", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
  const senderId = parseInt(rawId, 10); // the other user who might be typing
  if (isNaN(senderId)) { res.status(400).json({ error: "Invalid user id" }); return; }

  const myId = req.userId!;
  const key = `${senderId}_to_${myId}`;
  const expires = typingState.get(key);

  if (expires && expires > Date.now()) {
    res.json({ typing: true });
  } else {
    if (expires) typingState.delete(key); // Clean up expired entries
    res.json({ typing: false });
  }
});

// ── Unread count (total) ────────────────────────────────────────────────────

// Count total unread messages for current user
router.get("/messages/unread-count", requireAuth, async (req, res): Promise<void> => {
  const myId = req.userId!;

  const { count, error } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("receiver_id", myId)
    .eq("is_read", false);

  if (error) {
    res.json({ count: 0 });
    return;
  }

  res.json({ count: count ?? 0 });
});

// ── Mark as read ─────────────────────────────────────────────────────────────

// Mark all messages from a specific sender as read
router.patch("/messages/read/:senderId", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.senderId) ? req.params.senderId[0] : req.params.senderId;
  const senderId = parseInt(rawId, 10);
  if (isNaN(senderId)) { res.status(400).json({ error: "Invalid sender id" }); return; }

  const myId = req.userId!;

  const { error } = await supabase
    .from("messages")
    .update({ is_read: true })
    .eq("receiver_id", myId)
    .eq("sender_id", senderId)
    .eq("is_read", false);

  if (error) {
    res.json({ ok: true }); // Column may not exist yet
    return;
  }

  res.json({ ok: true });
});

// ── Conversations ─────────────────────────────────────────────────────────────

// List all conversations for current user (unique partners + last message + per-chat unread count)
router.get("/messages/conversations", requireAuth, async (req, res): Promise<void> => {
  const myId = req.userId!;

  const { data: messages, error } = await supabase
    .from("messages")
    .select("*")
    .or(`sender_id.eq.${myId},receiver_id.eq.${myId}`)
    .order("created_at", { ascending: false });

  if (error) { res.status(500).json({ error: error.message }); return; }

  const partnerMap = new Map<number, Record<string, unknown>>();
  const unreadMap = new Map<number, number>(); // partnerId → unread count from them

  for (const msg of messages ?? []) {
    const partnerId = (msg.sender_id === myId ? msg.receiver_id : msg.sender_id) as number;
    if (!partnerMap.has(partnerId)) partnerMap.set(partnerId, msg);

    // Count unread: messages sent TO me FROM this partner
    if (msg.receiver_id === myId && msg.sender_id !== myId && msg.is_read === false) {
      unreadMap.set(partnerId, (unreadMap.get(partnerId) ?? 0) + 1);
    }
  }

  if (partnerMap.size === 0) { res.json([]); return; }

  const partnerIds = Array.from(partnerMap.keys());
  let { data: users, error: usersError } = await supabase
    .from("users")
    .select("id, name, avatar, role, is_online")
    .in("id", partnerIds);

  if (usersError) {
    const fallback = await supabase
      .from("users")
      .select("id, name, avatar, role")
      .in("id", partnerIds);
    users = fallback.data;
    usersError = null;
  }

  const result = (users ?? []).map(u => {
    const lastMsg = partnerMap.get(u.id) as Record<string, unknown>;
    return {
      user: { id: u.id, name: u.name, avatar: u.avatar, role: u.role, isOnline: (u as Record<string, unknown>).is_online ?? false },
      lastMessage: mediaPreview(lastMsg),
      lastMessageAt: lastMsg?.created_at ?? null,
      isMine: lastMsg?.sender_id === myId,
      unreadCount: unreadMap.get(u.id) ?? 0,
    };
  }).sort((a, b) => {
    if (!a.lastMessageAt) return 1;
    if (!b.lastMessageAt) return -1;
    return new Date(b.lastMessageAt as string).getTime() - new Date(a.lastMessageAt as string).getTime();
  });

  res.json(result);
});

// ── Messages ──────────────────────────────────────────────────────────────────

// Get all messages between current user and another user
router.get("/messages/:userId", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
  const otherId = parseInt(rawId, 10);
  if (isNaN(otherId)) { res.status(400).json({ error: "Invalid user id" }); return; }

  const myId = req.userId!;

  const { data: messages, error } = await supabase
    .from("messages")
    .select("*")
    .or(`and(sender_id.eq.${myId},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${myId})`)
    .order("created_at", { ascending: true });

  if (error) { res.status(500).json({ error: error.message }); return; }

  res.json(messages ?? []);
});

// Send a message (text + optional image/video)
router.post("/messages/:userId", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
  const receiverId = parseInt(rawId, 10);
  if (isNaN(receiverId)) { res.status(400).json({ error: "Invalid user id" }); return; }

  if (req.userId === receiverId) {
    res.status(400).json({ error: "Cannot message yourself" });
    return;
  }

  const { message, image_url, video_url } = req.body as {
    message?: string;
    image_url?: string;
    video_url?: string;
  };

  const text = message?.trim() ?? "";
  if (!text && !image_url && !video_url) {
    res.status(400).json({ error: "Message content is required" });
    return;
  }

  const insertData: Record<string, unknown> = {
    sender_id: req.userId!,
    receiver_id: receiverId,
    message: text,
    is_read: false,
  };
  if (image_url) insertData.image_url = image_url;
  if (video_url) insertData.video_url = video_url;

  const { data, error } = await supabase
    .from("messages")
    .insert(insertData)
    .select()
    .single();

  if (error) {
    // If is_read column doesn't exist, retry without it
    if (error.code === "PGRST204" || error.message?.includes("is_read")) {
      const fallbackData: Record<string, unknown> = {
        sender_id: req.userId!,
        receiver_id: receiverId,
        message: text,
      };
      if (image_url) fallbackData.image_url = image_url;
      if (video_url) fallbackData.video_url = video_url;

      const { data: fallback, error: fallbackError } = await supabase
        .from("messages")
        .insert(fallbackData)
        .select()
        .single();

      if (fallbackError) {
        console.error("[POST /messages] fallback error:", fallbackError.message);
        res.status(500).json({ error: fallbackError.message });
        return;
      }
      res.status(201).json(fallback);
      return;
    }

    console.error("[POST /messages] error:", error.message, error.code);
    res.status(500).json({ error: error.message });
    return;
  }

  res.status(201).json(data);
});

export default router;
