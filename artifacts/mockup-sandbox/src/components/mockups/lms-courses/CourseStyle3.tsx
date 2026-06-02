import { Pencil, BookOpen, Users, CheckCircle2, Lock, Globe, Clock } from "lucide-react";

// Style 3: Minimal Clean — white card, large bold title, pill progress, accent top border
const courses = [
  { title: "Learn n8n Automation", desc: "Connect, Automate, and Empower your workflow with n8n open-source automation.", lessons: 0,  enrolled: 1,  progress: 0,  pub: false, color: "#6366f1", dur: "2h 10m" },
  { title: "Learn Make.com Automation", desc: "Simplify, Connect, and Automate your Workflows with Make.com (formerly Integromat).", lessons: 15, enrolled: 19, progress: 30, pub: true,  color: "#10b981", dur: "5h 30m" },
  { title: "Earn from Adobe Stock", desc: "Turn your Creativity into Income — Adobe Stock allows photographers & creators to sell.", lessons: 1,  enrolled: 28, progress: 0,  pub: true,  color: "#f97316", dur: "1h 05m" },
  { title: "Vibe Coding Roadmap", desc: "No-Code AI Tools → APIs & Automation → SaaS Apps. A complete beginner to advanced guide.", lessons: 8,  enrolled: 42, progress: 60, pub: true,  color: "#8b5cf6", dur: "3h 45m" },
  { title: "Stock Keywords Mastery", desc: "Find the best keywords to maximise your stock footage and photo rankings.", lessons: 6,  enrolled: 11, progress: 80, pub: false, color: "#06b6d4", dur: "2h 20m" },
  { title: "AI Prompt Engineering", desc: "Master the art of writing prompts to generate stunning images and videos with AI tools.", lessons: 12, enrolled: 35, progress: 45, pub: true,  color: "#ec4899", dur: "4h 00m" },
];

export function CourseStyle3() {
  return (
    <div style={{ background: "#ffffff", minHeight: "100vh", padding: 24, fontFamily: "'Inter',sans-serif" }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#94a3b8", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>Style 3</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: "#0f172a" }}>Minimal Clean Cards</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        {courses.map(c => (
          <div key={c.title} style={{ borderRadius: 14, overflow: "hidden", background: "#fff", border: "1px solid #e2e8f0", boxShadow: "0 1px 6px rgba(0,0,0,0.05)", borderTop: `3px solid ${c.color}` }}>
            <div style={{ padding: "14px 16px 16px" }}>
              {/* Top row */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div style={{ display: "flex", gap: 6 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: c.pub ? "#10b981" : "#ef4444", background: c.pub ? "#f0fdf4" : "#fef2f2", border: `1px solid ${c.pub ? "#bbf7d0" : "#fecaca"}`, borderRadius: 20, padding: "2px 8px" }}>
                    {c.pub ? <Globe size={9} /> : <Lock size={9} />} {c.pub ? "Public" : "Private"}
                  </span>
                </div>
                <div style={{ width: 26, height: 26, borderRadius: 8, background: "#f8fafc", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Pencil size={11} color="#94a3b8" />
                </div>
              </div>
              {/* Title */}
              <p style={{ margin: "0 0 6px", fontSize: 14, fontWeight: 700, color: "#0f172a", lineHeight: 1.35 }}>{c.title}</p>
              <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 12px", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{c.desc}</p>
              {/* Meta */}
              <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#94a3b8" }}>
                  <BookOpen size={11} color={c.color} />{c.lessons} lessons
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#94a3b8" }}>
                  <Users size={11} color={c.color} />{c.enrolled} enrolled
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#94a3b8" }}>
                  <Clock size={11} color={c.color} />{c.dur}
                </div>
              </div>
              {/* Pill progress */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: "#94a3b8" }}>Your progress</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: c.color, background: `${c.color}14`, padding: "1px 8px", borderRadius: 20 }}>{c.progress}% done</span>
                </div>
                <div style={{ height: 7, borderRadius: 99, background: "#f1f5f9" }}>
                  <div style={{ height: "100%", borderRadius: 99, width: `${c.progress || 2}%`, background: c.color }} />
                </div>
              </div>
              {/* Buttons */}
              <div style={{ display: "flex", gap: 8 }}>
                <button style={{ flex: 1, background: c.color, border: "none", borderRadius: 8, padding: "9px 0", color: "#fff", fontWeight: 700, fontSize: 12.5, cursor: "pointer" }}>View Course</button>
                <button style={{ display: "flex", alignItems: "center", gap: 5, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "9px 12px", color: "#16a34a", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                  <CheckCircle2 size={12} /> Enrolled
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
