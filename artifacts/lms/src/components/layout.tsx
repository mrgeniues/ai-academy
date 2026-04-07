import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { useLogout } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { NotificationBell } from "@/components/notification-bell";
import {
  LayoutDashboard, BookOpen, Users, User, LogOut, Sun, Moon, Palette, Shield, Menu,
  GraduationCap, Crown, MessageSquare, PanelLeftClose, PanelLeftOpen,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { initGlobalClickSound } from "@/lib/sound";
import { cn } from "@/lib/utils";
import { useUnreadCount } from "@/hooks/use-unread-count";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/courses", label: "Courses", icon: BookOpen },
  { href: "/vip-posts", label: "VIP Posts", icon: Crown },
  { href: "/community", label: "Community", icon: Users },
  { href: "/messages", label: "Messages", icon: MessageSquare },
  { href: "/profile", label: "Profile", icon: User },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout, token } = useAuth();
  const { theme, setTheme } = useTheme();
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem("sidebar-collapsed") === "true"; } catch { return false; }
  });
  const logoutMutation = useLogout();
  const queryClient = useQueryClient();
  const unreadCount = useUnreadCount(token);

  useEffect(() => {
    const cleanup = initGlobalClickSound();
    return cleanup;
  }, []);

  const toggleCollapsed = () => {
    setCollapsed(v => {
      const next = !v;
      try { localStorage.setItem("sidebar-collapsed", String(next)); } catch {}
      return next;
    });
  };

  const handleLogout = async () => {
    try { await logoutMutation.mutateAsync({}); } catch {}
    queryClient.clear();
    logout();
  };

  const initials = user?.name
    ? user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo + collapse button */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-sidebar-border">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
          <GraduationCap className="w-5 h-5 text-white" />
        </div>
        <span className="font-bold text-lg text-sidebar-foreground tracking-tight flex-1">LearnHub</span>
        <NotificationBell align="left" />
        <button
          onClick={toggleCollapsed}
          title="Collapse sidebar"
          className="hidden md:flex p-1 rounded-md text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
        >
          <PanelLeftClose className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = location === href || location.startsWith(href + "/");
          const showBadge = label === "Messages" && unreadCount > 0;
          return (
            <Link
              key={href}
              href={href}
              data-testid={`nav-${label.toLowerCase()}`}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-primary text-white shadow-sm"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{label}</span>
              {showBadge && (
                <span className={cn(
                  "ml-auto min-w-[1.25rem] h-5 px-1.5 rounded-full text-[11px] font-bold flex items-center justify-center leading-none",
                  isActive ? "bg-white/25 text-white" : "bg-primary text-white"
                )}>
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>
          );
        })}

        {user?.role === "admin" && (
          <Link
            href="/admin"
            data-testid="nav-admin"
            onClick={() => setSidebarOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              location === "/admin"
                ? "bg-primary text-white shadow-sm"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            }`}
          >
            <Shield className="w-4 h-4 flex-shrink-0" />
            Admin
          </Link>
        )}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-sidebar-border space-y-2">
        <button
          data-testid="theme-toggle"
          onClick={() => {
            const next = theme === "light" ? "dark" : theme === "dark" ? "purple" : "light";
            setTheme(next);
          }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all"
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : theme === "purple" ? <Palette className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          {theme === "dark" ? "Light mode" : theme === "purple" ? "Light mode" : "Dark mode"}
        </button>

        <div className="flex items-center gap-3 px-3 py-2">
          <Avatar className="w-8 h-8 flex-shrink-0">
            <AvatarImage src={user?.avatar ?? undefined} />
            <AvatarFallback className="text-xs bg-primary/20 text-primary">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p data-testid="sidebar-username" className="text-sm font-medium text-sidebar-foreground truncate">{user?.name}</p>
            <Badge variant="outline" className="text-xs border-sidebar-border text-sidebar-foreground/60 mt-0.5">
              {user?.role}
            </Badge>
          </div>
        </div>

        <button
          data-testid="button-logout"
          onClick={handleLogout}
          disabled={logoutMutation.isPending}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside className={cn(
        "hidden md:flex flex-col bg-sidebar border-r border-sidebar-border flex-shrink-0 transition-all duration-300 overflow-hidden",
        collapsed ? "w-12" : "w-64"
      )}>
        {collapsed ? (
          /* Mini collapsed sidebar — just the expand button */
          <div className="flex flex-col items-center pt-4 gap-3 h-full">
            <button
              onClick={toggleCollapsed}
              title="Expand sidebar"
              className="p-2 rounded-lg text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
            >
              <PanelLeftOpen className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <SidebarContent />
        )}
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <aside className="relative flex flex-col w-64 bg-sidebar border-r border-sidebar-border">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-card border-b border-border">
          <button data-testid="menu-toggle" onClick={() => setSidebarOpen(true)} className="p-1">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <GraduationCap className="w-5 h-5 text-primary" />
            <span className="font-bold text-base">LearnHub</span>
          </div>
          <NotificationBell />
        </header>

        <main className="flex-1 overflow-y-auto">
          <motion.div
            key={location}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="h-full"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
