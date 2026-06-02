export function LandingLightClean() {
  const courses = [
    { emoji: "🤖", title: "AI Fundamentals", lessons: 12, level: "Beginner", progress: 0, accent: "#6366f1" },
    { emoji: "⚡", title: "Prompt Engineering", lessons: 8, level: "Intermediate", progress: 0, accent: "#f59e0b" },
    { emoji: "💬", title: "ChatGPT Mastery", lessons: 15, level: "All levels", progress: 0, accent: "#10b981" },
    { emoji: "🏢", title: "AI for Business", lessons: 10, level: "Beginner", progress: 0, accent: "#ec4899" },
    { emoji: "🎨", title: "AI Image Generation", lessons: 9, level: "Beginner", progress: 0, accent: "#f97316" },
    { emoji: "📊", title: "AI Data Analysis", lessons: 11, level: "Advanced", progress: 0, accent: "#8b5cf6" },
  ];
  return (
    <div style={{ fontFamily: "Inter, sans-serif", background: "#ffffff", color: "#0f172a", minHeight: "100vh", overflowY: "auto" }}>
      {/* Nav */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 32px", borderBottom: "1px solid #f1f5f9", position: "sticky", top: 0, background: "rgba(255,255,255,0.95)", backdropFilter: "blur(10px)", zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: "#f59e0b", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>🤖</div>
          <span style={{ fontWeight: 800, fontSize: 15 }}>AI Academy 3.0</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {["Courses","Community","About"].map(l=>(
            <a key={l} href="#" style={{ fontSize: 13, color: "#64748b", textDecoration: "none", fontWeight: 500 }}>{l}</a>
          ))}
          <div style={{ width: 1, height: 18, background: "#e2e8f0" }} />
          <a href="#" style={{ fontSize: 13, color: "#475569", textDecoration: "none" }}>Sign In</a>
          <button style={{ padding: "8px 18px", borderRadius: 8, background: "#f59e0b", border: "none", color: "#0f172a", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Get Started</button>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ textAlign: "center", padding: "64px 32px 52px", maxWidth: 720, margin: "0 auto" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#fff8ed", border: "1px solid #fde68a", borderRadius: 20, padding: "5px 14px", fontSize: 12, color: "#92400e", marginBottom: 24, fontWeight: 600 }}>
          🎓 Join 1,000+ AI learners worldwide
        </div>
        <h1 style={{ fontSize: 48, fontWeight: 900, lineHeight: 1.1, marginBottom: 20, letterSpacing: -1.5, color: "#0f172a" }}>
          Learn AI Skills That<br />
          <span style={{ position: "relative", display: "inline-block" }}>
            <span style={{ position: "relative", zIndex: 1 }}>Actually Matter</span>
            <span style={{ position: "absolute", bottom: 2, left: 0, right: 0, height: 12, background: "#fde68a", zIndex: 0, borderRadius: 3 }} />
          </span>
        </h1>
        <p style={{ fontSize: 17, color: "#64748b", lineHeight: 1.7, marginBottom: 36 }}>
          Practical AI courses taught step by step — from complete beginner to confident AI user. No tech background required.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 44 }}>
          <button style={{ padding: "14px 32px", borderRadius: 10, background: "#0f172a", border: "none", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
            Browse Free Courses →
          </button>
          <button style={{ padding: "14px 32px", borderRadius: 10, background: "#fff", border: "2px solid #e2e8f0", color: "#374151", fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
            ▶ Watch Preview
          </button>
        </div>
        {/* Trust bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 28, flexWrap: "wrap" }}>
          {[["✅","Free to start"],["📱","Learn anywhere"],["🏆","Earn certificates"],["💬","Community support"]].map(([ic,t])=>(
            <div key={t} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#64748b" }}>
              <span>{ic}</span><span>{t}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Stats strip */}
      <div style={{ background: "#f8fafc", borderTop: "1px solid #f1f5f9", borderBottom: "1px solid #f1f5f9", padding: "24px 32px" }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 48, flexWrap: "wrap" }}>
          {[["50+","Courses published"],["1,000+","Active learners"],["200+","Video lessons"],["4.9/5","Average rating"]].map(([n,l])=>(
            <div key={l} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#0f172a" }}>{n}</div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Course Grid */}
      <section style={{ padding: "52px 32px" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Popular Courses</h2>
            <p style={{ fontSize: 14, color: "#64748b" }}>Hand-picked courses to get you AI-ready fast</p>
          </div>
          <a href="#" style={{ fontSize: 13, fontWeight: 600, color: "#f59e0b", textDecoration: "none" }}>See all courses →</a>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          {courses.map((c,i)=>(
            <div key={i} style={{ background: "#fff", border: "1px solid #f1f5f9", borderRadius: 14, padding: "20px 18px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", transition: "all 0.2s", cursor: "pointer" }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: c.accent + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, marginBottom: 14 }}>{c.emoji}</div>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4, color: "#0f172a" }}>{c.title}</div>
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 4, background: "#f1f5f9", color: "#64748b" }}>{c.level}</span>
                <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 4, background: "#f1f5f9", color: "#64748b" }}>📖 {c.lessons} lessons</span>
              </div>
              <button style={{ width: "100%", padding: "9px", borderRadius: 8, background: c.accent, border: "none", color: "#fff", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                Enroll Free
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Quote + CTA */}
      <section style={{ margin: "0 32px 52px", borderRadius: 18, background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)", padding: "44px 40px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 32, color: "#f59e0b", marginBottom: 12, lineHeight: 1 }}>"</div>
          <p style={{ fontSize: 17, color: "#e2e8f0", lineHeight: 1.7, marginBottom: 16, fontStyle: "italic" }}>
            The best investment you can make is in yourself. Knowledge is the one asset that can't be taken away.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ display: "flex" }}>
              {["#6366f1","#10b981","#f59e0b","#ec4899"].map((c,i)=>(
                <div key={i} style={{ width: 28, height: 28, borderRadius: "50%", background: c, border: "2px solid #0f172a", marginLeft: i ? -8 : 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff" }}>
                  {["A","B","C","D"][i]}
                </div>
              ))}
            </div>
            <span style={{ fontSize: 12, color: "#64748b" }}>1,000+ learners growing daily</span>
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <h3 style={{ fontSize: 22, fontWeight: 800, color: "#f8fafc", marginBottom: 8 }}>Ready to join them?</h3>
          <p style={{ color: "#64748b", fontSize: 13, marginBottom: 20 }}>Create your free account and start learning today.</p>
          <button style={{ padding: "13px 28px", borderRadius: 10, background: "#f59e0b", border: "none", color: "#0f172a", fontWeight: 700, fontSize: 14, cursor: "pointer", display: "block", margin: "0 auto 10px" }}>
            Create Free Account
          </button>
          <span style={{ fontSize: 11, color: "#475569" }}>No credit card required · Cancel anytime</span>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid #f1f5f9", padding: "20px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fafafa" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: "#f59e0b", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>🤖</div>
          <span style={{ fontSize: 12, color: "#475569", fontWeight: 600 }}>AI Academy 3.0</span>
        </div>
        <span style={{ fontSize: 11, color: "#94a3b8" }}>© 2025 AI Academy 3.0. All rights reserved.</span>
      </footer>
    </div>
  );
}
