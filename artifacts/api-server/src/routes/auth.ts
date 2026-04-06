import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { signToken, requireAuth } from "../lib/auth";
import { SignupBody, LoginBody } from "@workspace/api-zod";
import { supabase } from "../lib/supabase";

const router: IRouter = Router();

type DbUser = {
  id: number;
  email: string;
  password_hash: string;
  name: string;
  role: string;
  avatar: string | null;
  bio: string | null;
  social_links: Record<string, string | null> | null;
  last_login: string | null;
  last_logout: string | null;
  created_at: string;
  updated_at: string;
};

export function formatUser(user: DbUser) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    avatar: user.avatar ?? null,
    bio: user.bio ?? null,
    socialLinks: user.social_links ?? {},
    lastLogin: user.last_login ?? null,
    lastLogout: user.last_logout ?? null,
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
    .insert({ email, password_hash: passwordHash, name, role: "member" })
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

  await supabase
    .from("users")
    .update({ last_login: new Date().toISOString() })
    .eq("id", (user as DbUser).id);

  const token = signToken((user as DbUser).id);
  res.json({ user: formatUser(user as DbUser), token });
});

router.post("/auth/logout", requireAuth, async (req, res): Promise<void> => {
  await supabase
    .from("users")
    .update({ last_logout: new Date().toISOString() })
    .eq("id", req.userId!);

  res.json({ message: "Logged out successfully" });
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
