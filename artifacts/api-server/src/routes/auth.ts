import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { signToken, requireAuth, verifyToken } from "../lib/auth";
import { SignupBody, LoginBody } from "@workspace/api-zod";
import { supabase } from "../lib/supabase";

const router: IRouter = Router();

async function trySetOnlineStatus(userId: number, isOnline: boolean): Promise<void> {
  try {
    await supabase
      .from("users")
      .update({ is_online: isOnline, last_seen: new Date().toISOString() })
      .eq("id", userId);
  } catch { /* column may not exist yet */ }
}

type DbUser = {
  id: number;
  email: string;
  password_hash: string;
  name: string;
  role: string;
  avatar: string | null;
  bio: string | null;
  theme: string | null;
  social_links: Record<string, string | null> | null;
  last_login: string | null;
  last_logout: string | null;
  is_blocked: boolean | null;
  is_approved: boolean | null;
  is_online: boolean | null;
  last_seen: string | null;
  created_at: string;
  updated_at: string;
};

export function formatUser(user: DbUser) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: (user.role ?? "member").toLowerCase(),
    avatar: user.avatar ?? null,
    bio: user.bio ?? null,
    theme: user.theme ?? "light",
    socialLinks: user.social_links ?? {},
    lastLogin: user.last_login ?? null,
    lastLogout: user.last_logout ?? null,
    isBlocked: user.is_blocked ?? false,
    isApproved: user.is_approved ?? false,
    isOnline: user.is_online ?? false,
    lastSeen: user.last_seen ?? null,
    createdAt: user.created_at,
  };
}

router.post("/auth/signup", async (req, res): Promise<void> => {
  const parsed = SignupBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, password, name } = parsed.data;

  if (!email.toLowerCase().endsWith("@gmail.com")) {
    res.status(400).json({ error: "Only Gmail accounts are allowed (@gmail.com)" });
    return;
  }

  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existing) {
    res.status(400).json({ error: "Email already in use" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const { data: user, error } = await supabase
    .from("users")
    .insert({ email, password_hash: passwordHash, name, role: "member", is_approved: false })
    .select()
    .single();

  if (error || !user) {
    res.status(500).json({ error: "Failed to create user" });
    return;
  }

  await supabase
    .from("users")
    .update({ last_login: new Date().toISOString() })
    .eq("id", user.id);
  void trySetOnlineStatus(user.id, true);

  const token = signToken(user.id);
  res.status(201).json({ user: formatUser(user as DbUser), token });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, password } = parsed.data;

  const { data: user } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .maybeSingle();

  if (!user) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const valid = await bcrypt.compare(password, (user as DbUser).password_hash);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  if ((user as DbUser).is_blocked) {
    res.status(403).json({ error: "Your account has been blocked. Contact admin for help." });
    return;
  }

  await supabase
    .from("users")
    .update({ last_login: new Date().toISOString() })
    .eq("id", (user as DbUser).id);
  void trySetOnlineStatus((user as DbUser).id, true);

  const token = signToken((user as DbUser).id);
  res.json({ user: formatUser(user as DbUser), token });
});

router.post("/auth/logout", requireAuth, async (req, res): Promise<void> => {
  await supabase
    .from("users")
    .update({ last_logout: new Date().toISOString() })
    .eq("id", req.userId!);
  void trySetOnlineStatus(req.userId!, false);

  res.json({ message: "Logged out successfully" });
});

router.post("/auth/heartbeat", requireAuth, async (req, res): Promise<void> => {
  void trySetOnlineStatus(req.userId!, true);
  res.json({ ok: true });
});

router.post("/auth/offline", async (req, res): Promise<void> => {
  const body = req.body as { token?: string };
  if (body?.token) {
    const payload = verifyToken(body.token);
    if (payload?.userId) void trySetOnlineStatus(payload.userId, false);
  }
  res.json({ ok: true });
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const { data: user } = await supabase
    .from("users")
    .select("*")
    .eq("id", req.userId!)
    .maybeSingle();

  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  res.json(formatUser(user as DbUser));
});

export default router;
