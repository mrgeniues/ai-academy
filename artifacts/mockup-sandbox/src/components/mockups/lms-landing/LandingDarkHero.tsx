export function LandingDarkHero() {
  const courses = [
    { title: "AI Fundamentals", lessons: 12, students: 340, tag: "Beginner" },
    { title: "Prompt Engineering", lessons: 8, students: 210, tag: "Popular" },
    { title: "ChatGPT Mastery", lessons: 15, students: 520, tag: "Hot" },
    { title: "AI for Business", lessons: 10, students: 180, tag: "New" },
  ];
  const features = [
    { icon: "🎯", title: "Structured Learning", desc: "Step-by-step courses built for real results" },
    { icon: "🤖", title: "AI-Powered Tools", desc: "Access cutting-edge AI tools alongside lessons" },
    { icon: "👥", title: "Community Access", desc: "Learn with 1,000+ motivated peers" },
    { icon: "📜", title: "Certificates", desc: "Earn verified certificates on completion" },
    { icon: "⚡", title: "Self-Paced", desc: "Learn anytime, anywhere, at your own speed" },
    { icon: "🔒", title: "Lifetime Access", desc: "Buy once, access forever — no subscriptions" },
  ];
  return (
    <div style={{ fontFamily: "Inter, sans-serif", background: "#0f172a", color: "#f8fafc", minHeight: "100vh", overflowY: "auto" }}>
      {/* Nav */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 32px", borderBottom: "1px solid rgba(255,255,255,0.06)", position: "sticky", top: 0, background: "rgba(15,23,42,0.95)", backdropFilter: "blur(10px)", zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "#f59e0b", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🤖</div>
          <span style={{ fontWeight: 700, fontSize: 16, color: "#f8fafc" }}>AI Academy 3.0</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={{ padding: "8px 18px", borderRadius: 8, background: "transparent", border: "1px solid rgba(255,255,255,0.2)", color: "#cbd5e1", fontSize: 13, cursor: "pointer" }}>Sign In</button>
          <button style={{ padding: "8px 18px", borderRadius: 8, background: "#f59e0b", border: "none", color: "#0f172a", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Get Started Free</button>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ padding: "72px 32px 60px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(245,158,11,0.12) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "relative" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 20, padding: "5px 14px", fontSize: 12, color: "#f59e0b", marginBottom: 24, fontWeight: 600 }}>
            ✦ New courses added every week
          </div>
          <h1 style={{ fontSize: 46, fontWeight: 800, lineHeight: 1.15, marginBottom: 20, letterSpacing: -1 }}>
            Master AI Before<br />
            <span style={{ background: "linear-gradient(90deg, #f59e0b, #fb923c)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Everyone Else Does
            </span>
          </h1>
          <p style={{ fontSize: 17, color: "#94a3b8", maxWidth: 500, margin: "0 auto 36px", lineHeight: 1.7 }}>
            Join 1,000+ learners mastering AI tools, prompt engineering, and automation — without needing a tech background.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 48 }}>
            <button style={{ padding: "14px 32px", borderRadius: 10, background: "#f59e0b", border: "none", color: "#0f172a", fontSize: 15, fontWeight: 700, cursor: "pointer", boxShadow: "0 0 32px rgba(245,158,11,0.35)" }}>
              Start Learning Free →
            </button>
            <button style={{ padding: "14px 32px", borderRadius: 10, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#e2e8f0", fontSize: 15, cursor: "pointer" }}>
              Browse Courses
            </button>
          </div>
          {/* Avatars + social proof */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
            <div style={{ display: "flex" }}>
              {["#6366f1","#10b981","#f59e0b","#ec4899"].map((c,i)=>(
                <div key={i} style={{ width: 32, height: 32, borderRadius: "50%", background: c, border: "2px solid #0f172a", marginLeft: i ? -10 : 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff" }}>
                  {["A","B","C","D"][i]}
                </div>
              ))}
            </div>
            <span style={{ fontSize: 13, color: "#64748b" }}>Join <strong style={{ color: "#94a3b8" }}>1,000+</strong> learners growing their skills</span>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section style={{ display: "flex", justifyContent: "center", gap: 0, padding: "0 32px 60px" }}>
        {[["50+","Courses"],["1K+","Members"],["200+","Lessons"],["4.9★","Rating"]].map(([num,label],i)=>(
          <div key={i} style={{ flex: 1, maxWidth: 160, textAlign: "center", padding: "20px 16px", background: i%2===0 ? "rgba(255,255,255,0.04)" : "rgba(245,158,11,0.06)", border: "1px solid rgba(255,255,255,0.07)", borderLeft: i ? "none" : undefined, borderRadius: i===0 ? "10px 0 0 10px" : i===3 ? "0 10px 10px 0" : 0 }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: "#f59e0b", marginBottom: 2 }}>{num}</div>
            <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
          </div>
        ))}
      </section>

      {/* Featured Courses */}
      <section style={{ padding: "0 32px 60px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700 }}>Featured Courses</h2>
          <a href="#" style={{ fontSize: 13, color: "#f59e0b", textDecoration: "none" }}>View all →</a>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {courses.map((c,i)=>(
            <div key={i} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "18px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: `hsl(${i*55+200},70%,20%)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
                  {["🤖","⚡","💬","🏢"][i]}
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 6, background: i===2 ? "rgba(239,68,68,0.15)" : "rgba(245,158,11,0.15)", color: i===2 ? "#f87171" : "#f59e0b" }}>{c.tag}</span>
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{c.title}</div>
                <div style={{ fontSize: 12, color: "#64748b" }}>{c.lessons} lessons · {c.students} students</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: "0 32px 60px" }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, textAlign: "center", marginBottom: 28 }}>Why AI Academy?</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          {features.map((f,i)=>(
            <div key={i} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "16px 14px", textAlign: "center" }}>
              <div style={{ fontSize: 26, marginBottom: 8 }}>{f.icon}</div>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{f.title}</div>
              <div style={{ fontSize: 11, color: "#64748b", lineHeight: 1.5 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Banner */}
      <section style={{ margin: "0 32px 60px", borderRadius: 16, background: "linear-gradient(135deg, #f59e0b 0%, #fb923c 100%)", padding: "36px 32px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 80% 50%, rgba(255,255,255,0.1), transparent 60%)", pointerEvents: "none" }} />
        <div style={{ position: "relative" }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>Ready to Start Your AI Journey?</h2>
          <p style={{ color: "rgba(15,23,42,0.7)", fontSize: 14, marginBottom: 20 }}>Join thousands of learners and get instant access today.</p>
          <button style={{ padding: "12px 28px", borderRadius: 10, background: "#0f172a", border: "none", color: "#f59e0b", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Create Free Account →</button>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "20px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: "#f59e0b", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>🤖</div>
          <span style={{ fontSize: 12, color: "#475569", fontWeight: 600 }}>AI Academy 3.0</span>
        </div>
        <span style={{ fontSize: 11, color: "#334155" }}>© 2025 AI Academy 3.0. All rights reserved.</span>
      </footer>
    </div>
  );
}
