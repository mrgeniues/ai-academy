import { supabase } from "./supabase";

export const PRESENCE_STALE_MS = 3 * 60 * 1000;

export function isFreshPresence(lastSeen: string | null | undefined, now = Date.now()): boolean {
  if (!lastSeen) return false;
  return now - new Date(lastSeen).getTime() <= PRESENCE_STALE_MS;
}

export async function touchPresenceSession(userId: number, sessionKey: string): Promise<boolean> {
  const now = new Date().toISOString();

  try {
    const { data: activeSession, error: lookupError } = await supabase
      .from("user_presence_sessions")
      .select("id")
      .eq("user_id", userId)
      .eq("session_key", sessionKey)
      .is("ended_at", null)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lookupError) return false;

    if (activeSession) {
      await supabase
        .from("user_presence_sessions")
        .update({ last_seen: now })
        .eq("id", activeSession.id);
    } else {
      const { error: insertError } = await supabase
        .from("user_presence_sessions")
        .insert({ user_id: userId, session_key: sessionKey, started_at: now, last_seen: now });
      if (insertError) return false;
    }

    const { error: userError } = await supabase
      .from("users")
      .update({ is_online: true, last_seen: now })
      .eq("id", userId);

    return !userError;
  } catch {
    return false;
  }
}

export async function closePresenceSession(userId: number, sessionKey?: string): Promise<boolean> {
  const now = new Date().toISOString();

  try {
    let query = supabase
      .from("user_presence_sessions")
      .update({ ended_at: now, last_seen: now })
      .eq("user_id", userId)
      .is("ended_at", null);

    if (sessionKey) query = query.eq("session_key", sessionKey);
    const { error } = await query;
    if (error) return false;

    const { data: otherActiveSessions } = await supabase
      .from("user_presence_sessions")
      .select("id")
      .eq("user_id", userId)
      .is("ended_at", null)
      .limit(1);

    if (!otherActiveSessions || otherActiveSessions.length === 0) {
      await supabase
        .from("users")
        .update({ is_online: false, last_seen: now, last_logout: now })
        .eq("id", userId);
    }

    return true;
  } catch {
    return false;
  }
}