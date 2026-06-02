import { Users, BookOpen, TrendingUp, MessageSquare, Award, Clock } from "lucide-react";

// Card Style 4: Bold Solid Colour Cards
const cards = [
  { label: "Total Members",    value: "39",  icon: Users,         sub: "", bg: "#3b82f6", text: "#fff", iconBg: "rgba(255,255,255,0.2)" },
  { label: "Total Courses",    value: "4",   icon: BookOpen,      sub: "", bg: "#8b5cf6", text: "#fff", iconBg: "rgba(255,255,255,0.2)" },
  { label: "Enrollments",      value: "76",  icon: TrendingUp,    sub: "", bg: "#10b981", text: "#fff", iconBg: "rgba(255,255,255,0.2)" },
  { label: "Community Posts",  value: "2",   icon: MessageSquare, sub: "", bg: "#f97316", text: "#fff", iconBg: "rgba(255,255,255,0.2)" },
  { label: "My Courses",       value: "4",   icon: Award,         sub: "Enrolled courses",   bg: "#f59e0b", text: "#fff", iconBg: "rgba(255,255,255,0.2)" },
  { label: "Avg Progress",     value: "0%",  icon: Clock,         sub: "Across all courses", bg: "#06b6d4", text: "#fff", iconBg: "rgba(255,255,255,0.2)" },
];

export function CardSolid() {
  return (
    <div style={{ background:"#f8fafc", minHeight:"100vh", padding:24, fontFamily:"'Inter',sans-serif" }}>
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:13, fontWeight:600, color:"#94a3b8", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:4 }}>Style D</div>
        <div style={{ fontSize:20, fontWeight:700, color:"#0f172a" }}>Solid Colour Cards</div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14 }}>
        {cards.map(c => (
          <div key={c.label} style={{
            background: c.bg,
            borderRadius: 14,
            padding: "20px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 10,
            boxShadow: `0 4px 14px ${c.bg}55`,
          }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
              <span style={{ fontSize:13, color:"rgba(255,255,255,0.8)", fontWeight:500 }}>{c.label}</span>
              <div style={{ width:36, height:36, borderRadius:10, background:c.iconBg, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <c.icon size={17} color="#fff" />
              </div>
            </div>
            <div style={{ fontSize:28, fontWeight:800, color:"#fff", lineHeight:1 }}>{c.value}</div>
            {c.sub && <div style={{ fontSize:12, color:"rgba(255,255,255,0.7)" }}>{c.sub}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
