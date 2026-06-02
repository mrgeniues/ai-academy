import { Pencil, BookOpen, Users, CheckCircle2, Lock, Globe, Play, ArrowRight } from "lucide-react";

// Style 2: Dark Premium — dark navy cards with glowing progress bar, gold accent
const courses = [
  { title: "Learn n8n Automation", desc: "Connect, Automate, and Empower your workflow with n8n.", lessons: 0,  enrolled: 1,  progress: 0,  pub: false, accent: "#3b82f6" },
  { title: "Learn Make.com Automation", desc: "Simplify, Connect, and Automate your workflows.", lessons: 15, enrolled: 19, progress: 30, pub: true,  accent: "#10b981" },
  { title: "Earn from Adobe Stock", desc: "Turn your creativity into income selling AI videos & images.", lessons: 1,  enrolled: 28, progress: 0,  pub: true,  accent: "#f97316" },
  { title: "Vibe Coding Roadmap", desc: "Beginner to Advanced — No-Code AI tools, APIs & SaaS apps.", lessons: 8,  enrolled: 42, progress: 60, pub: true,  accent: "#8b5cf6" },
  { title: "Stock Keywords Mastery", desc: "Find the best keywords to rank your stock content.", lessons: 6,  enrolled: 11, progress: 80, pub: false, accent: "#06b6d4" },
  { title: "AI Prompt Engineering", desc: "Master prompts to generate stunning images & videos.", lessons: 12, enrolled: 35, progress: 45, pub: true,  accent: "#ec4899" },
];

const thumbGrads: Record<string,string> = {
  "#3b82f6": "linear-gradient(135deg,#1e3a5f,#3b82f6)",
  "#10b981": "linear-gradient(135deg,#064e3b,#10b981)",
  "#f97316": "linear-gradient(135deg,#7c2d12,#f97316)",
  "#8b5cf6": "linear-gradient(135deg,#1e1b4b,#8b5cf6)",
  "#06b6d4": "linear-gradient(135deg,#164e63,#06b6d4)",
  "#ec4899": "linear-gradient(135deg,#831843,#ec4899)",
};

export function CourseStyle2() {
  return (
    <div style={{ background: "#060d1a", minHeight: "100vh", padding: 24, fontFamily: "'Inter',sans-serif" }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>Style 2</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: "#f1f5f9" }}>Dark Premium Cards</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        {courses.map(c => (
          <div key={c.title} style={{ borderRadius: 16, overflow: "hidden", background: "#0d1829", border: `1px solid ${c.accent}28`, boxShadow: `0 0 0 1px ${c.accent}14, 0 8px 24px rgba(0,0,0,0.4)` }}>
            {/* Thumbnail */}
            <div style={{ position: "relative", height: 130, background: thumbGrads[c.accent] }}>
              <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle,rgba(255,255,255,0.06) 1px,transparent 1px)", backgroundSize: "18px 18px" }} />
              <div style={{ position: "absolute", top: 10, right: 10, display: "flex", alignItems: "center", gap: 4, background: c.pub ? "rgba(16,185,129,0.85)" : "rgba(239,68,68,0.85)", borderRadius: 20, padding: "3px 9px" }}>
                {c.pub ? <Globe size={10} color="#fff" /> : <Lock size={10} color="#fff" />}
                <span style={{ fontSize: 10, fontWeight: 700, color: "#fff" }}>{c.pub ? "Public" : "Private"}</span>
              </div>
              <div style={{ position: "absolute", top: 10, left: 10, width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Pencil size={12} color="#fff" />
              </div>
              {/* Play button center */}
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: 38, height: 38, borderRadius: "50%", background: "rgba(255,255,255,0.15)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Play size={16} color="#fff" fill="#fff" />
                </div>
              </div>
            </div>
            {/* Body */}
            <div style={{ padding: "14px 14px 14px" }}>
              <p style={{ margin: "0 0 5px", fontSize: 13.5, fontWeight: 700, color: "#f1f5f9", lineHeight: 1.35 }}>{c.title}</p>
              <p style={{ fontSize: 11.5, color: "#475569", margin: "0 0 10px", lineHeight: 1.45, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{c.desc}</p>
              <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#475569" }}>
                  <BookOpen size={11} color={c.accent} />{c.lessons} lessons
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#475569" }}>
                  <Users size={11} color={c.accent} />{c.enrolled} enrolled
                </div>
              </div>
              {/* Glowing progress bar */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontSize: 11, color: "#334155" }}>Progress</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: c.accent }}>{c.progress}%</span>
                </div>
                <div style={{ height: 4, borderRadius: 99, background: "rgba(255,255,255,0.07)" }}>
                  <div style={{ height: "100%", borderRadius: 99, width: `${c.progress}%`, background: c.accent, boxShadow: `0 0 8px ${c.accent}88` }} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, background: `${c.accent}18`, border: `1px solid ${c.accent}44`, borderRadius: 8, padding: "8px 0", color: c.accent, fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                  View <ArrowRight size={12} />
                </button>
                <button style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 8, padding: "8px 10px", color: "#10b981", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
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
