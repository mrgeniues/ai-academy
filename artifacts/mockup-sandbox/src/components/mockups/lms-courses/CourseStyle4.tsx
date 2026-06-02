import { Pencil, BookOpen, Users, CheckCircle2, Lock, Globe, Star, Zap } from "lucide-react";

// Style 4: Bold Feature Cards — large thumbnail, category pill, star rating, gold CTA
const courses = [
  { title: "Learn n8n Automation", desc: "Connect, Automate & Empower your workflow with n8n open-source tools.", lessons: 0,  enrolled: 1,  progress: 0,  pub: false, cat: "Automation", stars: 4, color: "#6366f1", grad: "linear-gradient(135deg,#1e3a5f,#6366f1)" },
  { title: "Learn Make.com Automation", desc: "Simplify, Connect, and Automate your Workflows end-to-end.", lessons: 15, enrolled: 19, progress: 30, pub: true,  cat: "No-Code",    stars: 5, color: "#10b981", grad: "linear-gradient(135deg,#064e3b,#10b981)" },
  { title: "Earn from Adobe Stock", desc: "Turn your creativity into income selling AI videos & images.", lessons: 1,  enrolled: 28, progress: 0,  pub: true,  cat: "Business",   stars: 5, color: "#f97316", grad: "linear-gradient(135deg,#7c2d12,#f97316)" },
  { title: "Vibe Coding Roadmap", desc: "No-Code AI → APIs & Automation → SaaS Apps. Full beginner roadmap.", lessons: 8,  enrolled: 42, progress: 60, pub: true,  cat: "Dev",        stars: 5, color: "#8b5cf6", grad: "linear-gradient(135deg,#1e1b4b,#8b5cf6)" },
  { title: "Stock Keywords Mastery", desc: "Find the best keywords to maximise your stock footage rankings.", lessons: 6,  enrolled: 11, progress: 80, pub: false, cat: "SEO",        stars: 4, color: "#06b6d4", grad: "linear-gradient(135deg,#164e63,#06b6d4)" },
  { title: "AI Prompt Engineering", desc: "Master prompts to generate stunning AI images and cinematic videos.", lessons: 12, enrolled: 35, progress: 45, pub: true,  cat: "AI Art",    stars: 5, color: "#ec4899", grad: "linear-gradient(135deg,#831843,#ec4899)" },
];

export function CourseStyle4() {
  return (
    <div style={{ background: "#0f172a", minHeight: "100vh", padding: 24, fontFamily: "'Inter',sans-serif" }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>Style 4</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: "#f1f5f9" }}>Bold Feature Cards</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 18 }}>
        {courses.map(c => (
          <div key={c.title} style={{ borderRadius: 18, overflow: "hidden", background: "#1e293b", border: "1px solid rgba(255,255,255,0.07)", boxShadow: "0 4px 24px rgba(0,0,0,0.35)" }}>
            {/* Thumbnail — taller, with floating chips */}
            <div style={{ position: "relative", height: 150, background: c.grad }}>
              <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle,rgba(255,255,255,0.06) 1px,transparent 1px)", backgroundSize: "22px 22px" }} />
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 60, background: "linear-gradient(to top,rgba(30,41,59,0.95),transparent)" }} />
              {/* Category pill */}
              <div style={{ position: "absolute", top: 10, left: 10, display: "flex", alignItems: "center", gap: 4, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(6px)", borderRadius: 20, padding: "4px 10px", border: "1px solid rgba(255,255,255,0.15)" }}>
                <Zap size={9} color={c.color} fill={c.color} />
                <span style={{ fontSize: 10, fontWeight: 700, color: "#fff", letterSpacing: "0.06em" }}>{c.cat}</span>
              </div>
              {/* Visibility */}
              <div style={{ position: "absolute", top: 10, right: 36, display: "flex", alignItems: "center", gap: 4, background: c.pub ? "rgba(16,185,129,0.85)" : "rgba(239,68,68,0.85)", borderRadius: 20, padding: "3px 9px" }}>
                {c.pub ? <Globe size={9} color="#fff" /> : <Lock size={9} color="#fff" />}
                <span style={{ fontSize: 10, fontWeight: 700, color: "#fff" }}>{c.pub ? "Public" : "Private"}</span>
              </div>
              {/* Edit */}
              <div style={{ position: "absolute", top: 10, right: 8, width: 24, height: 24, borderRadius: 7, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Pencil size={11} color="#fff" />
              </div>
              {/* Stars on bottom of thumb */}
              <div style={{ position: "absolute", bottom: 8, left: 12, display: "flex", gap: 2 }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={11} fill={i < c.stars ? c.color : "none"} color={i < c.stars ? c.color : "rgba(255,255,255,0.2)"} />
                ))}
              </div>
            </div>
            {/* Body */}
            <div style={{ padding: "13px 14px 15px" }}>
              <p style={{ margin: "0 0 5px", fontSize: 13.5, fontWeight: 700, color: "#f1f5f9", lineHeight: 1.35 }}>{c.title}</p>
              <p style={{ fontSize: 11.5, color: "#475569", margin: "0 0 11px", lineHeight: 1.45, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{c.desc}</p>
              <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#475569" }}>
                  <BookOpen size={11} color={c.color} />{c.lessons} lessons
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#475569" }}>
                  <Users size={11} color={c.color} />{c.enrolled} enrolled
                </span>
              </div>
              {/* Thick segmented progress */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontSize: 11, color: "#334155" }}>Progress</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: c.color }}>{c.progress}%</span>
                </div>
                <div style={{ height: 6, borderRadius: 99, background: "rgba(255,255,255,0.07)" }}>
                  <div style={{ height: "100%", borderRadius: 99, width: `${c.progress || 2}%`, background: `linear-gradient(90deg,${c.color},${c.color}99)`, boxShadow: `0 0 10px ${c.color}55` }} />
                </div>
              </div>
              {/* Buttons */}
              <div style={{ display: "flex", gap: 8 }}>
                <button style={{ flex: 1, background: `linear-gradient(135deg,${c.color},${c.color}aa)`, border: "none", borderRadius: 9, padding: "9px 0", color: "#fff", fontWeight: 700, fontSize: 12.5, cursor: "pointer" }}>View Course</button>
                <button style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: 9, padding: "9px 11px", color: "#10b981", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
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
