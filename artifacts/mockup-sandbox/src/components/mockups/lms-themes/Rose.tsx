import { BookOpen, Users, LayoutDashboard, MessageSquare, User, Bell, Search, TrendingUp, Award, Clock, ChevronRight, Settings, LogOut, Zap } from "lucide-react";

const sidebar = { bg: "#180a12", accent: "#e11d48", accentLight: "#e11d4822", nav: "#28111e", text: "#c4a0b0", textMuted: "#7a4a5e", border: "#28111e" };
const content = { bg: "#fdf2f5", card: "#ffffff", border: "#f0d9e0", text: "#1a0a10", muted: "#7a4a5e", primary: "#e11d48", primaryLight: "#e11d4815" };

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: BookOpen, label: "Courses" },
  { icon: Users, label: "Community" },
  { icon: MessageSquare, label: "Messages" },
  { icon: User, label: "Profile" },
];

const stats = [
  { label: "Courses Enrolled", value: "12", delta: "+2 this week", icon: BookOpen, color: "#e11d48" },
  { label: "Hours Learned", value: "48h", delta: "+6h this week", icon: Clock, color: "#f97316" },
  { label: "Certificates", value: "4", delta: "1 pending", icon: Award, color: "#8b5cf6" },
  { label: "Streak", value: "7 days", delta: "Personal best!", icon: TrendingUp, color: "#0891b2" },
];

const activity = [
  { title: "Completed: Intro to AI", time: "2h ago" },
  { title: "Posted in Community", time: "5h ago" },
  { title: "New certificate earned", time: "Yesterday" },
  { title: "Joined Advanced Python", time: "2 days ago" },
];

export function Rose() {
  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "'Inter', sans-serif", overflow: "hidden" }}>
      {/* Sidebar */}
      <div style={{ width: 220, background: sidebar.bg, display: "flex", flexDirection: "column", borderRight: `1px solid ${sidebar.border}`, flexShrink: 0 }}>
        <div style={{ padding: "20px 16px 16px", borderBottom: `1px solid ${sidebar.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: sidebar.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Zap size={16} color="#fff" />
            </div>
            <div>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: 14, lineHeight: 1 }}>AI Academy</div>
              <div style={{ color: sidebar.textMuted, fontSize: 11, marginTop: 2 }}>Pro Plan</div>
            </div>
          </div>
        </div>

        <nav style={{ flex: 1, padding: "12px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
          {navItems.map(({ icon: Icon, label, active }) => (
            <div key={label} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "9px 10px",
              borderRadius: 8, cursor: "pointer",
              background: active ? sidebar.accentLight : "transparent",
              color: active ? sidebar.accent : sidebar.text,
              fontWeight: active ? 600 : 400, fontSize: 13.5,
              borderLeft: active ? `3px solid ${sidebar.accent}` : "3px solid transparent",
            }}>
              <Icon size={16} />{label}
            </div>
          ))}
        </nav>

        <div style={{ padding: "8px", borderTop: `1px solid ${sidebar.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 8, color: sidebar.textMuted, fontSize: 13, cursor: "pointer", marginBottom: 4 }}>
            <Settings size={15} /> Settings
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "10px 10px", borderRadius: 8, background: sidebar.nav }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: sidebar.accent, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 700 }}>A</div>
            <div style={{ flex: 1 }}>
              <div style={{ color: "#fff", fontSize: 12.5, fontWeight: 600 }}>Alice Johnson</div>
              <div style={{ color: sidebar.textMuted, fontSize: 11 }}>Creator</div>
            </div>
            <LogOut size={13} color={sidebar.textMuted} />
          </div>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: content.bg, overflow: "hidden" }}>
        <div style={{ height: 56, background: content.card, borderBottom: `1px solid ${content.border}`, display: "flex", alignItems: "center", padding: "0 24px", gap: 12, flexShrink: 0 }}>
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, background: content.bg, border: `1px solid ${content.border}`, borderRadius: 8, padding: "7px 12px", maxWidth: 320 }}>
            <Search size={14} color={content.muted} />
            <span style={{ fontSize: 13, color: content.muted }}>Search courses, members…</span>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ position: "relative" }}>
              <Bell size={18} color={content.muted} />
              <div style={{ position: "absolute", top: -3, right: -3, width: 8, height: 8, borderRadius: "50%", background: content.primary }} />
            </div>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: content.primaryLight, border: `2px solid ${content.primary}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: content.primary }}>A</div>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
          <div style={{ marginBottom: 20 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: content.text, margin: 0 }}>Good morning, Alice 👋</h1>
            <p style={{ fontSize: 13.5, color: content.muted, marginTop: 4 }}>Here's what's happening today.</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14, marginBottom: 20 }}>
            {stats.map(s => (
              <div key={s.label} style={{ background: content.card, border: `1px solid ${content.border}`, borderRadius: 12, padding: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <span style={{ fontSize: 12, color: content.muted, fontWeight: 500 }}>{s.label}</span>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: s.color + "18", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <s.icon size={13} color={s.color} />
                  </div>
                </div>
                <div style={{ fontSize: 22, fontWeight: 700, color: content.text, marginBottom: 4 }}>{s.value}</div>
                <div style={{ fontSize: 11, color: content.muted }}>{s.delta}</div>
              </div>
            ))}
          </div>

          <div style={{ background: content.card, border: `1px solid ${content.border}`, borderRadius: 12, padding: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: content.text }}>Recent Activity</span>
              <span style={{ fontSize: 12, color: content.primary, cursor: "pointer", display: "flex", alignItems: "center", gap: 2 }}>View all <ChevronRight size={12} /></span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {activity.map(a => (
                <div key={a.title} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", background: content.bg, borderRadius: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: content.primaryLight, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <BookOpen size={13} color={content.primary} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: content.text }}>{a.title}</div>
                    <div style={{ fontSize: 11, color: content.muted }}>{a.time}</div>
                  </div>
                  <ChevronRight size={14} color={content.muted} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
