import { BookOpen, Users, LayoutDashboard, MessageSquare, User, Bell, Search, TrendingUp, Award, Clock, ChevronRight, Settings, LogOut, Zap } from "lucide-react";

// Theme 2: Deep Navy + Gold
const S = { bg: "#0a0f1e", accent: "#f59e0b", accentBg: "#f59e0b14", row: "#111827", text: "#94a3b8", muted: "#475569", border: "#1e293b" };
const C = { bg: "#f8f9fc", card: "#ffffff", border: "#e8edf5", text: "#0a0f1e", muted: "#64748b", primary: "#f59e0b", primaryBg: "#f59e0b12" };

const nav = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: BookOpen, label: "Courses" },
  { icon: Users, label: "Community" },
  { icon: MessageSquare, label: "Messages" },
  { icon: User, label: "Profile" },
];
const stats = [
  { label: "Courses Enrolled", value: "12", delta: "+2 this week", icon: BookOpen, color: "#f59e0b" },
  { label: "Hours Learned", value: "48h", delta: "+6h this week", icon: Clock, color: "#3b82f6" },
  { label: "Certificates", value: "4", delta: "1 pending", icon: Award, color: "#10b981" },
  { label: "Streak", value: "7 days", delta: "Personal best!", icon: TrendingUp, color: "#ef4444" },
];
const activity = ["Completed: Intro to AI • 2h ago","Posted in Community • 5h ago","New certificate earned • Yesterday","Joined Advanced Python • 2 days ago"];

export function Blue() {
  return (
    <div style={{ display:"flex", height:"100vh", fontFamily:"'Inter',sans-serif", overflow:"hidden" }}>
      <div style={{ width:220, background:S.bg, display:"flex", flexDirection:"column", borderRight:`1px solid ${S.border}`, flexShrink:0 }}>
        <div style={{ padding:"20px 16px 16px", borderBottom:`1px solid ${S.border}` }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:32, height:32, borderRadius:8, background:S.accent, display:"flex", alignItems:"center", justifyContent:"center" }}><Zap size={16} color="#0a0f1e" /></div>
            <div><div style={{ color:"#fff", fontWeight:700, fontSize:14, lineHeight:1 }}>AI Academy</div><div style={{ color:S.muted, fontSize:11, marginTop:2 }}>Pro Plan</div></div>
          </div>
        </div>
        <nav style={{ flex:1, padding:"12px 8px", display:"flex", flexDirection:"column", gap:2 }}>
          {nav.map(({ icon:Icon, label, active }) => (
            <div key={label} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 10px", borderRadius:8, cursor:"pointer", background:active?S.accentBg:"transparent", color:active?S.accent:S.text, fontWeight:active?600:400, fontSize:13.5, borderLeft:active?`3px solid ${S.accent}`:"3px solid transparent" }}>
              <Icon size={16} />{label}
            </div>
          ))}
        </nav>
        <div style={{ padding:"8px", borderTop:`1px solid ${S.border}` }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 10px", borderRadius:8, color:S.muted, fontSize:13, cursor:"pointer", marginBottom:4 }}><Settings size={15} /> Settings</div>
          <div style={{ display:"flex", alignItems:"center", gap:9, padding:"10px", borderRadius:8, background:S.row }}>
            <div style={{ width:30, height:30, borderRadius:"50%", background:S.accent, display:"flex", alignItems:"center", justifyContent:"center", color:"#0a0f1e", fontSize:12, fontWeight:700 }}>A</div>
            <div style={{ flex:1 }}><div style={{ color:"#fff", fontSize:12.5, fontWeight:600 }}>Alice Johnson</div><div style={{ color:S.muted, fontSize:11 }}>Creator</div></div>
            <LogOut size={13} color={S.muted} />
          </div>
        </div>
      </div>
      <div style={{ flex:1, display:"flex", flexDirection:"column", background:C.bg, overflow:"hidden" }}>
        <div style={{ height:56, background:C.card, borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", padding:"0 24px", flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, background:C.bg, border:`1px solid ${C.border}`, borderRadius:8, padding:"7px 12px", maxWidth:320 }}><Search size={14} color={C.muted} /><span style={{ fontSize:13, color:C.muted }}>Search courses, members…</span></div>
          <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ position:"relative" }}><Bell size={18} color={C.muted} /><div style={{ position:"absolute", top:-3, right:-3, width:8, height:8, borderRadius:"50%", background:C.primary }} /></div>
            <div style={{ width:32, height:32, borderRadius:"50%", background:C.primaryBg, border:`2px solid ${C.primary}44`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, color:C.primary }}>A</div>
          </div>
        </div>
        <div style={{ flex:1, overflowY:"auto", padding:24 }}>
          <div style={{ marginBottom:20 }}><h1 style={{ fontSize:22, fontWeight:700, color:C.text, margin:0 }}>Good morning, Alice 👋</h1><p style={{ fontSize:13.5, color:C.muted, marginTop:4 }}>Here's what's happening today.</p></div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:14, marginBottom:20 }}>
            {stats.map(s => (
              <div key={s.label} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:16 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                  <span style={{ fontSize:12, color:C.muted, fontWeight:500 }}>{s.label}</span>
                  <div style={{ width:28, height:28, borderRadius:8, background:s.color+"18", display:"flex", alignItems:"center", justifyContent:"center" }}><s.icon size={13} color={s.color} /></div>
                </div>
                <div style={{ fontSize:22, fontWeight:700, color:C.text, marginBottom:4 }}>{s.value}</div>
                <div style={{ fontSize:11, color:C.muted }}>{s.delta}</div>
              </div>
            ))}
          </div>
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <span style={{ fontSize:14, fontWeight:600, color:C.text }}>Recent Activity</span>
              <span style={{ fontSize:12, color:C.primary, cursor:"pointer", display:"flex", alignItems:"center", gap:2 }}>View all <ChevronRight size={12} /></span>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {activity.map(a => (
                <div key={a} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 12px", background:C.bg, borderRadius:8 }}>
                  <div style={{ width:32, height:32, borderRadius:8, background:C.primaryBg, display:"flex", alignItems:"center", justifyContent:"center" }}><BookOpen size={13} color={C.primary} /></div>
                  <div style={{ flex:1 }}><div style={{ fontSize:13, fontWeight:500, color:C.text }}>{a.split(" • ")[0]}</div><div style={{ fontSize:11, color:C.muted }}>{a.split(" • ")[1]}</div></div>
                  <ChevronRight size={14} color={C.muted} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
