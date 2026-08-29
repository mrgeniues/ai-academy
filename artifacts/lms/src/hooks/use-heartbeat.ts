import { useEffect, useRef } from "react";

const HEARTBEAT_INTERVAL = 60 * 1000;

export function useHeartbeat(token: string | null) {
  const tokenRef = useRef(token);
  tokenRef.current = token;
  const sessionKeyRef = useRef<string>("");

  if (!sessionKeyRef.current) {
    try {
      const existing = sessionStorage.getItem("lms_presence_session");
      sessionKeyRef.current = existing ?? crypto.randomUUID();
      sessionStorage.setItem("lms_presence_session", sessionKeyRef.current);
    } catch {
      sessionKeyRef.current = `session-${Math.random().toString(36).slice(2)}`;
    }
  }

  useEffect(() => {
    if (!tokenRef.current) return;

    const ping = () => {
      if (!tokenRef.current) return;
      fetch("/api/auth/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenRef.current}` },
        body: JSON.stringify({ sessionKey: sessionKeyRef.current }),
      }).catch(() => {});
    };

    const setOffline = () => {
      if (!tokenRef.current) return;
      navigator.sendBeacon(
        "/api/auth/offline",
        new Blob([JSON.stringify({ token: tokenRef.current, sessionKey: sessionKeyRef.current })], { type: "application/json" })
      );
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") ping();
    };

    ping();
    const interval = setInterval(ping, HEARTBEAT_INTERVAL);
    window.addEventListener("beforeunload", setOffline);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeunload", setOffline);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [!!token]);
}
