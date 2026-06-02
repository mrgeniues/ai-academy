import { Users, BookOpen, TrendingUp, MessageSquare, Award, Clock } from "lucide-react";

// Card Style 3: White + Bold Left Colour Border
const cards = [
  { label: "Total Members",    value: "39",  icon: Users,         sub: "", color: "#3b82f6" },
  { label: "Total Courses",    value: "4",   icon: BookOpen,      sub: "", color: "#8b5cf6" },
  { label: "Enrollments",      value: "76",  icon: TrendingUp,    sub: "", color: "#10b981" },
  { label: "Community Posts",  value: "2",   icon: MessageSquare, sub: "", color: "#f97316" },
  { label: "My Courses",       value: "4",   icon: Award,         sub: "Enrolled courses",   color: "#ec4899" },
  { label: "Avg Progress",     value: "0%",  icon: Clock,         sub: "Across all courses", color: "#06b6d4" },
];

export function CardBordered() {
  return (
    <div style={{ background:"#f1f5f9", minHeight:"100vh", padding:24, fontFamily:"'Inter',sans-serif" }}>
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:13, fontWeight:600, color:"#94a3b8", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:4 }}>Style C</div>
        <div style={{ fontSize:20, fontWeight:700, color:"#0f172a" }}>Accent Border Cards</div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14 }}>
        {cards.map(c => (
          <div key={c.label} style={{
            background: "#ffffff",
            border: `1px solid #e2e8f0`,
            borderLeft: `4px solid ${c.color}`,
            borderRadius: 12,
            padding: "20px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 10,
            boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
          }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
              <span style={{ fontSize:13, color:"#64748b", fontWeight:500 }}>{c.label}</span>
              <div style={{ width:36, height:36, borderRadius:10, background:`${c.color}14`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <c.icon size={17} color={c.color} />
              </div>
            </div>
            <div style={{ fontSize:28, fontWeight:800, color:"#0f172a", lineHeight:1 }}>{c.value}</div>
            {c.sub && <div style={{ fontSize:12, color:"#94a3b8" }}>{c.sub}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
