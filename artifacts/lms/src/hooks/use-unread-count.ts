import { useState, useEffect, useCallback } from "react";

const POLL_INTERVAL = 5000;

export function useUnreadCount(token: string | null): number {
  const [count, setCount] = useState(0);

  const fetchCount = useCallback(async () => {
    if (!token) { setCount(0); return; }
    try {
      const res = await fetch("/api/messages/unread-count", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const { count: c } = await res.json() as { count: number };
        setCount(c ?? 0);
      }
    } catch { /* silent */ }
  }, [token]);

  useEffect(() => {
    if (!token) { setCount(0); return; }
    fetchCount();
    const id = setInterval(fetchCount, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [token, fetchCount]);

  // Expose refetch so external callers can trigger it via a custom event
  useEffect(() => {
    const handler = () => fetchCount();
    window.addEventListener("unread-count-refresh", handler);
    return () => window.removeEventListener("unread-count-refresh", handler);
  }, [fetchCount]);

  return count;
}
