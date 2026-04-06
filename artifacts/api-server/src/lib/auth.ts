import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { supabase } from "./supabase";

const JWT_SECRET = process.env.JWT_SECRET ?? "fallback-secret";

export function signToken(userId: number): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "30d" });
}

export function verifyToken(token: string): { userId: number } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: number };
  } catch {
    return null;
  }
}

declare global {
  namespace Express {
    interface Request {
      userId?: number;
      userRole?: string;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  const { data: user } = await supabase
    .from("users")
    .select("id, role, is_blocked")
    .eq("id", payload.userId)
    .maybeSingle();

  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  if ((user as { is_blocked?: boolean }).is_blocked) {
    res.status(403).json({ error: "Your account has been blocked. Contact admin for help." });
    return;
  }

  req.userId = user.id;
  req.userRole = (user.role ?? "member").toLowerCase();
  next();
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  await requireAuth(req, res, async () => {
    if (req.userRole !== "admin") {
      res.status(403).json({ error: "Admin access required" });
      return;
    }
    next();
  });
}
