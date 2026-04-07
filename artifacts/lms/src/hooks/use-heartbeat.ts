import { useEffect, useRef } from "react";

const HEARTBEAT_INTERVAL = 2 * 60 * 1000;

export function useHeartbeat(token: string | null) {
  const tokenRef = useRef(token);
  tokenRef.current = token;

  useEffect(() => {
    if (!tokenRef.current) return;

    const ping = () => {
      if (!tokenRef.current) return;
      fetch("/api/auth/heartbeat", {
        method: "POST",
        headers: { Authorization: `Bearer ${tokenRef.current}` },
      }).catch(() => {});
    };

    const setOffline = () => {
      if (!tokenRef.current) return;
      navigator.sendBeacon(
        "/api/auth/offline",
        new Blob([JSON.stringify({ token: tokenRef.current })], { type: "application/json" })
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
