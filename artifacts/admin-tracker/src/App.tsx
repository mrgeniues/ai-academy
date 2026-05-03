import { useState, useEffect } from "react";
import { getToken, getUser, clearAuth, type TrackerUser } from "@/lib/auth";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Users from "@/pages/Users";
import Communities from "@/pages/Communities";
import Enrollments from "@/pages/Enrollments";
import Courses from "@/pages/Courses";
import Payments from "@/pages/Payments";
import Tools from "@/pages/Tools";

type Tab = "dashboard" | "users" | "communities" | "enrollments" | "courses" | "payments" | "tools";

const NAV: { id: Tab; label: string; icon: string }[] = [
  { id: "dashboard",   label: "Dashboard",   icon: "📊" },
  { id: "users",       label: "Users",       icon: "👥" },
  { id: "communities", label: "Communities", icon: "🏘️" },
  { id: "enrollments", label: "Enrollments", icon: "📋" },
  { id: "courses",     label: "Courses",     icon: "📚" },
  { id: "payments",    label: "Payments",    icon: "💳" },
  { id: "tools",       label: "Tools",       icon: "🔧" },
];

function Layout({ user, onLogout }: { user: TrackerUser; onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>("dashboard");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top nav */}
      <header className="border-b border-border bg-card/60 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-sm">📊</div>
            <span className="font-bold text-foreground text-sm hidden md:block">AI Academy Tracker</span>
          </div>

          {/* Nav tabs — scrollable on small screens */}
          <nav className="flex gap-0.5 overflow-x-auto scrollbar-none flex-1 justify-center px-2">
            {NAV.map(n => (
              <button
                key={n.id}
                onClick={() => setTab(n.id)}
                className={`h-8 px-2.5 text-xs rounded-lg flex items-center gap-1 transition-colors font-medium whitespace-nowrap shrink-0 ${tab === n.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}
              >
                <span>{n.icon}</span>
                <span className="hidden sm:inline">{n.label}</span>
              </button>
            ))}
          </nav>

          {/* User + logout */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden lg:block text-right">
              <p className="text-xs font-medium text-foreground">{user.name}</p>
              <p className="text-[10px] text-muted-foreground">{user.role}</p>
            </div>
            <button
              onClick={onLogout}
              className="h-8 px-3 text-xs rounded-lg border border-border text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Page */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        {tab === "dashboard"   && <Dashboard />}
        {tab === "users"       && <Users />}
        {tab === "communities" && <Communities />}
        {tab === "enrollments" && <Enrollments />}
        {tab === "courses"     && <Courses />}
        {tab === "payments"    && <Payments />}
        {tab === "tools"       && <Tools />}
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        AI Academy Admin Tracker · Full platform management
      </footer>
    </div>
  );
}

export default function App() {
  const [authed, setAuthed] = useState(false);
  const [user, setUser]     = useState<TrackerUser | null>(null);

  useEffect(() => {
    const token = getToken();
    const u = getUser();
    if (token && u && u.role === "admin") {
      setAuthed(true);
      setUser(u);
    }
  }, []);

  const handleLogin = () => {
    const u = getUser();
    if (u) { setUser(u); setAuthed(true); }
  };

  const handleLogout = () => {
    clearAuth();
    setAuthed(false);
    setUser(null);
  };

  if (!authed || !user) return <Login onLogin={handleLogin} />;
  return <Layout user={user} onLogout={handleLogout} />;
}
