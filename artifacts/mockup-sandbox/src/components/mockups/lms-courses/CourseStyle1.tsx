import { Pencil, BookOpen, Users, CheckCircle2, Lock, Globe } from "lucide-react";

// Style 1: Overlay Cards — gradient overlay on thumbnail, title/info on image
const courses = [
  { title: "Learn n8n Automation", desc: "Connect, Automate, and Empower your workflow with n8n.", lessons: 0,  enrolled: 1,  progress: 0,  pub: false, grad: "linear-gradient(135deg,#1e3a5f,#6366f1)" },
  { title: "Learn Make.com Automation", desc: "Simplify, Connect, and Automate your workflows.", lessons: 15, enrolled: 19, progress: 30, pub: true,  grad: "linear-gradient(135deg,#1a4731,#10b981)" },
  { title: "Earn from Adobe Stock", desc: "Turn your creativity into income selling AI videos & images.", lessons: 1,  enrolled: 28, progress: 0,  pub: true,  grad: "linear-gradient(135deg,#7c2d12,#f97316)" },
  { title: "Vibe Coding Roadmap", desc: "Beginner to Advanced — No-Code AI tools, APIs & SaaS apps.", lessons: 8,  enrolled: 42, progress: 60, pub: true,  grad: "linear-gradient(135deg,#1e1b4b,#8b5cf6)" },
  { title: "Stock Keywords Mastery", desc: "Find the best keywords to rank your stock content.", lessons: 6,  enrolled: 11, progress: 80, pub: false, grad: "linear-gradient(135deg,#064e3b,#06b6d4)" },
  { title: "AI Prompt Engineering", desc: "Master prompts to generate stunning images & videos.", lessons: 12, enrolled: 35, progress: 45, pub: true,  grad: "linear-gradient(135deg,#831843,#ec4899)" },
];

export function CourseStyle1() {
  return (
    <div style={{ background: "#f1f5f9", minHeight: "100vh", padding: 24, fontFamily: "'Inter',sans-serif" }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#94a3b8", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>Style 1</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: "#0f172a" }}>Gradient Overlay Cards</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        {courses.map(c => (
          <div key={c.title} style={{ borderRadius: 16, overflow: "hidden", background: "#fff", border: "1px solid #e2e8f0", boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
            {/* Thumbnail with gradient overlay */}
            <div style={{ position: "relative", height: 140, background: c.grad }}>
              {/* Fake grid texture */}
              <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle,rgba(255,255,255,0.07) 1px,transparent 1px)", backgroundSize: "20px 20px" }} />
              {/* Gradient fade at bottom */}
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 70, background: "linear-gradient(to top, rgba(0,0,0,0.55), transparent)" }} />
              {/* Badge */}
              <div style={{ position: "absolute", top: 10, right: 10, display: "flex", alignItems: "center", gap: 4, background: c.pub ? "rgba(16,185,129,0.9)" : "rgba(239,68,68,0.9)", borderRadius: 20, padding: "3px 9px" }}>
                {c.pub ? <Globe size={10} color="#fff" /> : <Lock size={10} color="#fff" />}
                <span style={{ fontSize: 10, fontWeight: 700, color: "#fff" }}>{c.pub ? "Public" : "Private"}</span>
              </div>
              {/* Edit */}
              <div style={{ position: "absolute", top: 10, left: 10, width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <Pencil size={12} color="#fff" />
              </div>
              {/* Title overlay */}
              <div style={{ position: "absolute", bottom: 10, left: 12, right: 12 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#fff", lineHeight: 1.3 }}>{c.title}</p>
              </div>
            </div>
            {/* Body */}
            <div style={{ padding: "12px 14px 14px" }}>
              <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 10px", lineHeight: 1.45, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{c.desc}</p>
              <div style={{ display: "flex", gap: 12, marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#64748b" }}>
                  <BookOpen size={12} color="#94a3b8" />{c.lessons} lessons
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#64748b" }}>
                  <Users size={12} color="#94a3b8" />{c.enrolled} enrolled
                </div>
              </div>
              {/* Progress */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: "#94a3b8" }}>Progress</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#0f172a" }}>{c.progress}%</span>
                </div>
                <div style={{ height: 5, borderRadius: 99, background: "#e2e8f0" }}>
                  <div style={{ height: "100%", borderRadius: 99, width: `${c.progress}%`, background: "linear-gradient(90deg,#6366f1,#8b5cf6)" }} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={{ flex: 1, background: "#6366f1", border: "none", borderRadius: 8, padding: "8px 0", color: "#fff", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>View Course</button>
                <button style={{ display: "flex", alignItems: "center", gap: 4, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "8px 10px", color: "#16a34a", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
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
