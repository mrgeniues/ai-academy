const KEY = "tracker_token";
const USER_KEY = "tracker_user";

export type TrackerUser = { id: number; name: string; email: string; role: string };

export function getToken(): string | null {
  return localStorage.getItem(KEY);
}

export function setAuth(token: string, user: TrackerUser) {
  localStorage.setItem(KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem(KEY);
  localStorage.removeItem(USER_KEY);
}

export function getUser(): TrackerUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as TrackerUser) : null;
  } catch {
    return null;
  }
}

export function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`/api${path}`, { headers: authHeaders() });
  if (!res.ok) {
    const d = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(d.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body),
  });
  const d = await res.json() as T & { error?: string };
  if (!res.ok) throw new Error((d as { error?: string }).error ?? `HTTP ${res.status}`);
  return d;
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body),
  });
  const d = await res.json() as T & { error?: string };
  if (!res.ok) throw new Error((d as { error?: string }).error ?? `HTTP ${res.status}`);
  return d;
}
