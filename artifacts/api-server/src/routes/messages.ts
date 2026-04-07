import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";

const router: IRouter = Router();

function mediaPreview(msg: Record<string, unknown>): string {
  const text = (msg.message as string) ?? "";
  if (text) return text;
  if (msg.image_url) return "📷 Image";
  if (msg.video_url) return "🎥 Video";
  return "";
}

// List all conversations for current user (unique partners + last message)
router.get("/messages/conversations", requireAuth, async (req, res): Promise<void> => {
  const myId = req.userId!;

  const { data: messages, error } = await supabase
    .from("messages")
    .select("*")
    .or(`sender_id.eq.${myId},receiver_id.eq.${myId}`)
    .order("created_at", { ascending: false });

  if (error) { res.status(500).json({ error: error.message }); return; }

  const partnerMap = new Map<number, Record<string, unknown>>();
  for (const msg of messages ?? []) {
    const partnerId = (msg.sender_id === myId ? msg.receiver_id : msg.sender_id) as number;
    if (!partnerMap.has(partnerId)) partnerMap.set(partnerId, msg);
  }

  if (partnerMap.size === 0) { res.json([]); return; }

  const partnerIds = Array.from(partnerMap.keys());
  const { data: users } = await supabase
    .from("users")
    .select("id, name, avatar, role")
    .in("id", partnerIds);

  const result = (users ?? []).map(u => {
    const lastMsg = partnerMap.get(u.id) as Record<string, unknown>;
    return {
      user: { id: u.id, name: u.name, avatar: u.avatar, role: u.role },
      lastMessage: mediaPreview(lastMsg),
      lastMessageAt: lastMsg?.created_at ?? null,
      isMine: lastMsg?.sender_id === myId,
    };
  }).sort((a, b) => {
    if (!a.lastMessageAt) return 1;
    if (!b.lastMessageAt) return -1;
    return new Date(b.lastMessageAt as string).getTime() - new Date(a.lastMessageAt as string).getTime();
  });

  res.json(result);
});

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
  };
  if (image_url) insertData.image_url = image_url;
  if (video_url) insertData.video_url = video_url;

  const { data, error } = await supabase
    .from("messages")
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error("[POST /messages] error:", error.message, error.code);
    res.status(500).json({ error: error.message });
    return;
  }

  res.status(201).json(data);
});

export default router;
