import { useState, useEffect, useCallback } from "react";
import { EVENTS } from "@/lib/events";

const POLL_INTERVAL = 30000;

export interface PendingApprovals {
  total: number;
  users: number;
  enrollments: number;
}

export function usePendingApprovals(token: string | null, isAdmin: boolean): PendingApprovals {
  const [counts, setCounts] = useState<PendingApprovals>({ total: 0, users: 0, enrollments: 0 });

  const fetchCount = useCallback(async () => {
    if (!token || !isAdmin) { setCounts({ total: 0, users: 0, enrollments: 0 }); return; }
    try {
      const [usersRes, enrollmentsRes] = await Promise.all([
        fetch("/api/users", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/enrollments/pending", { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      let users = 0;
      let enrollments = 0;

      if (usersRes.ok) {
        const usersData = await usersRes.json() as Array<{ isApproved: boolean; isBlocked: boolean }>;
        users = usersData.filter(u => !u.isApproved && !u.isBlocked).length;
      }

      if (enrollmentsRes.ok) {
        const enrollmentsData = await enrollmentsRes.json() as unknown[];
        enrollments = enrollmentsData.length;
      }

      setCounts({ total: users + enrollments, users, enrollments });
    } catch { /* silent */ }
  }, [token, isAdmin]);

  useEffect(() => {
    if (!token || !isAdmin) { setCounts({ total: 0, users: 0, enrollments: 0 }); return; }
    fetchCount();
    const id = setInterval(fetchCount, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [token, isAdmin, fetchCount]);

  useEffect(() => {
    const handler = () => fetchCount();
    window.addEventListener(EVENTS.PENDING_APPROVALS_REFRESH, handler);
    return () => window.removeEventListener(EVENTS.PENDING_APPROVALS_REFRESH, handler);
  }, [fetchCount]);

  return counts;
}
