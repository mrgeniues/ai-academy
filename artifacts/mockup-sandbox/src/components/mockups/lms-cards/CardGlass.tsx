import { Users, BookOpen, TrendingUp, MessageSquare, Award, Clock } from "lucide-react";

// Card Style 2: Dark Glass — navy/gold theme
const cards = [
  { label: "Total Members",    value: "39",  icon: Users,         sub: "", accent: "#f59e0b" },
  { label: "Total Courses",    value: "4",   icon: BookOpen,      sub: "", accent: "#38bdf8" },
  { label: "Enrollments",      value: "76",  icon: TrendingUp,    sub: "", accent: "#34d399" },
  { label: "Community Posts",  value: "2",   icon: MessageSquare, sub: "", accent: "#f97316" },
  { label: "My Courses",       value: "4",   icon: Award,         sub: "Enrolled courses",    accent: "#f472b6" },
  { label: "Avg Progress",     value: "0%",  icon: Clock,         sub: "Across all courses",  accent: "#a78bfa" },
];

export function CardGlass() {
  return (
    <div style={{ background:"#0a0f1e", minHeight:"100vh", padding:24, fontFamily:"'Inter',sans-serif" }}>
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:13, fontWeight:600, color:"#475569", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:4 }}>Style B</div>
        <div style={{ fontSize:20, fontWeight:700, color:"#f1f5f9" }}>Dark Glass Cards</div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14 }}>
        {cards.map(c => (
          <div key={c.label} style={{
            background: "rgba(255,255,255,0.04)",
            border: `1px solid rgba(255,255,255,0.08)`,
            borderTop: `2px solid ${c.accent}`,
            borderRadius: 14,
            padding: "20px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 10,
            backdropFilter: "blur(12px)",
          }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
              <span style={{ fontSize:13, color:"#94a3b8", fontWeight:500 }}>{c.label}</span>
              <div style={{ width:36, height:36, borderRadius:10, background:`${c.accent}18`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <c.icon size={17} color={c.accent} />
              </div>
            </div>
            <div style={{ fontSize:28, fontWeight:800, color:"#f1f5f9", lineHeight:1 }}>{c.value}</div>
            {c.sub && <div style={{ fontSize:12, color:"#64748b" }}>{c.sub}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
