import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Bell, BookOpen, MessageSquare, FileText, Crown, Check, CheckCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";

const API = "/api";

interface Notification {
  id: number;
  type: "post" | "comment" | "admin_post" | "admin_course";
  title: string;
  message: string;
  postId: number | null;
  courseId: number | null;
  isRead: boolean;
  isVip: boolean;
  createdAt: string;
}

type Tab = "all" | "unread" | "vip";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function typeIcon(type: Notification["type"]) {
  switch (type) {
    case "admin_course": return <BookOpen className="w-3.5 h-3.5 text-purple-400" />;
    case "admin_post":   return <Crown className="w-3.5 h-3.5 text-amber-400" />;
    case "comment":      return <MessageSquare className="w-3.5 h-3.5 text-blue-400" />;
    default:             return <FileText className="w-3.5 h-3.5 text-green-400" />;
  }
}

function authHeaders(token: string | null): Record<string, string> {
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function NotificationBell({ align = "right" }: { align?: "left" | "right" }) {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("all");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const wrapperRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const fetchNotifications = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/notifications`, { headers: authHeaders(token) });
      if (res.ok) setNotifications(await res.json());
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const inWrapper = wrapperRef.current?.contains(target);
      const inDropdown = dropdownRef.current?.contains(target);
      if (!inWrapper && !inDropdown) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleToggle = () => {
    if (!open && wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      const dropdownW = 320;
      const margin = 8;
      let left = align === "right"
        ? rect.right - dropdownW
        : rect.left;
      left = Math.max(margin, Math.min(left, window.innerWidth - dropdownW - margin));
      setCoords({ top: rect.bottom + 8, left });
    }
    setOpen(o => !o);
  };

  const markRead = async (id: number) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    try {
      await fetch(`${API}/notifications/${id}/read`, { method: "PATCH", headers: authHeaders(token) });
    } catch { /* silent */ }
  };

  const markAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    try {
      await fetch(`${API}/notifications/read-all`, { method: "PATCH", headers: authHeaders(token) });
    } catch { /* silent */ }
  };

  const handleNotificationClick = (n: Notification) => {
    markRead(n.id);
    setOpen(false);
    if (n.postId) {
      window.location.href = "/community";
    } else if (n.courseId) {
      window.location.href = `/courses/${n.courseId}`;
    }
  };

  const filtered = notifications.filter(n => {
    if (tab === "unread") return !n.isRead;
    if (tab === "vip") return n.isVip;
    return true;
  });

  const dropdown = (
    <motion.div
      ref={dropdownRef}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      style={{ position: "fixed", top: coords.top, left: coords.left, width: 320, zIndex: 9999 }}
      className="bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="font-semibold text-sm text-foreground">Notifications</span>
        {unreadCount > 0 && (
          <button
            onClick={e => { e.stopPropagation(); markAllRead(); }}
            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Mark all read
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {(["all", "unread", "vip"] as Tab[]).map(t => (
          <button
            key={t}
            onClick={e => { e.stopPropagation(); setTab(t); }}
            className={`flex-1 py-2 text-xs font-medium capitalize transition-colors ${
              tab === t
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "vip" ? "⭐ VIP" : t}
            {t === "unread" && unreadCount > 0 && (
              <span className="ml-1 bg-primary/20 text-primary rounded-full px-1.5 py-0.5 text-[10px]">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="max-h-80 overflow-y-auto">
        {loading && notifications.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            {tab === "unread" ? "All caught up!" : tab === "vip" ? "No VIP notifications" : "No notifications yet"}
          </div>
        ) : (
          filtered.map(n => (
            <div
              key={n.id}
              onClick={() => handleNotificationClick(n)}
              className={`flex gap-3 px-4 py-3 cursor-pointer hover:bg-accent transition-colors border-b border-border/50 last:border-0 ${
                !n.isRead ? "bg-primary/5" : ""
              }`}
            >
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                n.isVip ? "bg-amber-500/20" : "bg-muted"
              }`}>
                {typeIcon(n.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className={`text-xs font-semibold truncate ${n.isVip ? "text-amber-500" : "text-foreground"}`}>
                    {n.title}
                    {n.isVip && <span className="ml-1">⭐</span>}
                  </p>
                  <span className="text-[10px] text-muted-foreground flex-shrink-0">{timeAgo(n.createdAt)}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
              </div>
              {!n.isRead ? (
                <div className="flex-shrink-0 w-2 h-2 rounded-full bg-primary mt-1.5" />
              ) : (
                <Check className="flex-shrink-0 w-3.5 h-3.5 text-muted-foreground/50 mt-1" />
              )}
            </div>
          ))
        )}
      </div>
    </motion.div>
  );

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        data-testid="notification-bell"
        onClick={handleToggle}
        className="relative p-2 rounded-lg hover:bg-sidebar-accent transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-sidebar-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-primary text-white text-[10px] font-bold px-1 leading-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && createPortal(dropdown, document.body)}
      </AnimatePresence>
    </div>
  );
}
