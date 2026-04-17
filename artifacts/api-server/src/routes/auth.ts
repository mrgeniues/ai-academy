import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { signToken, requireAuth, verifyToken } from "../lib/auth";
import { SignupBody, LoginBody } from "@workspace/api-zod";
import { supabase } from "../lib/supabase";
import { sendPasswordResetEmail } from "../lib/email";

const RESET_SECRET = process.env.SESSION_SECRET ?? process.env.JWT_SECRET ?? "fallback-reset-secret";

type ResetTokenPayload = {
  userId: number;
  type: "password_reset";
  pwPrint: string;
};

function signResetToken(userId: number, pwPrint: string): string {
  return jwt.sign({ userId, type: "password_reset", pwPrint } satisfies ResetTokenPayload, RESET_SECRET, { expiresIn: "1h" });
}

function verifyResetToken(token: string): ResetTokenPayload | null {
  try {
    const payload = jwt.verify(token, RESET_SECRET) as ResetTokenPayload;
    if (payload.type !== "password_reset") return null;
    return payload;
  } catch {
    return null;
  }
}

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
  rejection_reason: string | null;
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
    rejectionReason: (user as Record<string, unknown>).rejection_reason as string | null ?? null,
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
    const rejectionReason = (user as DbUser).rejection_reason ?? null;
    res.status(403).json({
      error: "Your account has not been approved.",
      blocked: true,
      rejectionReason,
    });
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

// ── Password reset (stateless JWT-based — no extra table needed) ───────────

router.post("/auth/forgot-password", async (req, res): Promise<void> => {
  const { email } = req.body as { email?: string };
  if (!email || typeof email !== "string") {
    res.status(400).json({ error: "Email is required" });
    return;
  }

  // Always return the same message to prevent email enumeration
  const successMsg = { message: "If this email is registered, a reset link has been sent." };

  const { data: user } = await supabase
    .from("users")
    .select("id, email, name, password_hash")
    .eq("email", email.toLowerCase().trim())
    .maybeSingle();

  if (!user) {
    res.json(successMsg);
    return;
  }

  const u = user as { id: number; email: string; name: string; password_hash: string };
  // Use first 8 chars of current hash as a fingerprint — token auto-invalidates after password change
  const pwPrint = u.password_hash.slice(0, 8);
  const token = signResetToken(u.id, pwPrint);

  await sendPasswordResetEmail(u.email, u.name, token);

  res.json(successMsg);
});

router.get("/auth/verify-reset-token", async (req, res): Promise<void> => {
  const { token } = req.query as { token?: string };
  if (!token) {
    res.json({ valid: false, reason: "Token is missing" });
    return;
  }

  const payload = verifyResetToken(token);
  if (!payload) {
    res.json({ valid: false, reason: "Invalid or expired reset link. Please request a new one." });
    return;
  }

  // Verify fingerprint still matches (i.e. password hasn't been changed since token was issued)
  const { data: user } = await supabase
    .from("users")
    .select("password_hash")
    .eq("id", payload.userId)
    .maybeSingle();

  if (!user || (user as { password_hash: string }).password_hash.slice(0, 8) !== payload.pwPrint) {
    res.json({ valid: false, reason: "This reset link has already been used. Please request a new one." });
    return;
  }

  res.json({ valid: true });
});

router.post("/auth/reset-password", async (req, res): Promise<void> => {
  const { token, password } = req.body as { token?: string; password?: string };

  if (!token || !password) {
    res.status(400).json({ error: "Token and password are required" });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }

  const payload = verifyResetToken(token);
  if (!payload) {
    res.status(400).json({ error: "Invalid or expired reset link. Please request a new one." });
    return;
  }

  const { data: user } = await supabase
    .from("users")
    .select("id, password_hash")
    .eq("id", payload.userId)
    .maybeSingle();

  if (!user) {
    res.status(400).json({ error: "User not found." });
    return;
  }

  const u = user as { id: number; password_hash: string };
  if (u.password_hash.slice(0, 8) !== payload.pwPrint) {
    res.status(400).json({ error: "This reset link has already been used. Please request a new one." });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const { error: updateError } = await supabase
    .from("users")
    .update({ password_hash: passwordHash, updated_at: new Date().toISOString() })
    .eq("id", u.id);

  if (updateError) {
    res.status(500).json({ error: "Failed to update password. Please try again." });
    return;
  }

  res.json({ message: "Password updated successfully" });
});

export default router;
