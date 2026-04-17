import { useState, useEffect, useCallback } from "react";

const POLL_INTERVAL = 30000;

export function usePendingApprovals(token: string | null, isAdmin: boolean): number {
  const [count, setCount] = useState(0);

  const fetchCount = useCallback(async () => {
    if (!token || !isAdmin) { setCount(0); return; }
    try {
      const [usersRes, enrollmentsRes] = await Promise.all([
        fetch("/api/users", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/enrollments/pending", { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      let total = 0;

      if (usersRes.ok) {
        const users = await usersRes.json() as Array<{ isApproved: boolean; isBlocked: boolean }>;
        total += users.filter(u => !u.isApproved && !u.isBlocked).length;
      }

      if (enrollmentsRes.ok) {
        const enrollments = await enrollmentsRes.json() as unknown[];
        total += enrollments.length;
      }

      setCount(total);
    } catch { /* silent */ }
  }, [token, isAdmin]);

  useEffect(() => {
    if (!token || !isAdmin) { setCount(0); return; }
    fetchCount();
    const id = setInterval(fetchCount, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [token, isAdmin, fetchCount]);

  return count;
}
