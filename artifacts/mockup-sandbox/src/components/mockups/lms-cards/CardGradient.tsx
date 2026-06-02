import { Users, BookOpen, TrendingUp, MessageSquare, Award, Clock } from "lucide-react";

// Card Style 1: Subtle Gradient Fill per card
const cards = [
  { label: "Total Members",    value: "39",  icon: Users,         sub: "", grad: ["#dbeafe","#eff6ff"], icon_c: "#3b82f6" },
  { label: "Total Courses",    value: "4",   icon: BookOpen,      sub: "", grad: ["#ede9fe","#f5f3ff"], icon_c: "#8b5cf6" },
  { label: "Enrollments",      value: "76",  icon: TrendingUp,    sub: "", grad: ["#d1fae5","#ecfdf5"], icon_c: "#10b981" },
  { label: "Community Posts",  value: "2",   icon: MessageSquare, sub: "", grad: ["#ffedd5","#fff7ed"], icon_c: "#f97316" },
  { label: "My Courses",       value: "4",   icon: Award,         sub: "Enrolled courses", grad: ["#fce7f3","#fdf2f8"], icon_c: "#ec4899" },
  { label: "Avg Progress",     value: "0%",  icon: Clock,         sub: "Across all courses", grad: ["#cffafe","#ecfeff"], icon_c: "#06b6d4" },
];

export function CardGradient() {
  return (
    <div style={{ background:"#f8fafc", minHeight:"100vh", padding:24, fontFamily:"'Inter',sans-serif" }}>
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:13, fontWeight:600, color:"#94a3b8", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:4 }}>Style A</div>
        <div style={{ fontSize:20, fontWeight:700, color:"#0f172a" }}>Gradient Background Cards</div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14 }}>
        {cards.map(c => (
          <div key={c.label} style={{
            background: `linear-gradient(135deg, ${c.grad[0]}, ${c.grad[1]})`,
            border: `1px solid ${c.icon_c}22`,
            borderRadius: 14,
            padding: "20px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
              <span style={{ fontSize:13, color:"#475569", fontWeight:500 }}>{c.label}</span>
              <div style={{ width:36, height:36, borderRadius:10, background:"#fff", boxShadow:`0 2px 8px ${c.icon_c}30`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <c.icon size={17} color={c.icon_c} />
              </div>
            </div>
            <div style={{ fontSize:28, fontWeight:800, color:"#0f172a", lineHeight:1 }}>{c.value}</div>
            {c.sub && <div style={{ fontSize:12, color:"#64748b" }}>{c.sub}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
