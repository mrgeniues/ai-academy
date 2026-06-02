export function LandingSplitFeature() {
  const steps = [
    { num: "01", title: "Create your free account", desc: "Sign up in under 30 seconds — no credit card needed" },
    { num: "02", title: "Pick a course", desc: "Browse 50+ AI courses built for practical, real-world use" },
    { num: "03", title: "Learn & apply", desc: "Watch, practice, and deploy AI skills to your work immediately" },
  ];
  const testimonials = [
    { name: "Sarah K.", role: "Marketing Manager", text: "I went from AI-curious to using ChatGPT daily in my campaigns within 2 weeks.", avatar: "#6366f1" },
    { name: "Ahmed R.", role: "Freelancer", text: "The prompt engineering course alone tripled my freelance income.", avatar: "#10b981" },
    { name: "Lisa M.", role: "Small Business Owner", text: "Best investment I made this year. The community is incredibly supportive.", avatar: "#f59e0b" },
  ];
  return (
    <div style={{ fontFamily: "Inter, sans-serif", minHeight: "100vh", overflowY: "auto", background: "#f8fafc", color: "#0f172a" }}>
      {/* Nav */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 32px", background: "#fff", borderBottom: "1px solid #e2e8f0", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: "#f59e0b", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>🤖</div>
          <span style={{ fontWeight: 800, fontSize: 15, color: "#0f172a" }}>AI Academy 3.0</span>
        </div>
        <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
          {["Courses","Community","About"].map(l=>(
            <a key={l} href="#" style={{ fontSize: 13, color: "#64748b", textDecoration: "none", fontWeight: 500 }}>{l}</a>
          ))}
          <button style={{ padding: "8px 20px", borderRadius: 8, background: "#0f172a", border: "none", color: "#f59e0b", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Sign In</button>
        </div>
      </nav>

      {/* Hero — split */}
      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", minHeight: 480 }}>
        {/* Left — dark */}
        <div style={{ background: "#0f172a", padding: "52px 36px", display: "flex", flexDirection: "column", justifyContent: "center", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -60, right: -60, width: 220, height: 220, borderRadius: "50%", background: "rgba(245,158,11,0.08)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: -40, left: -40, width: 160, height: 160, borderRadius: "50%", background: "rgba(99,102,241,0.08)", pointerEvents: "none" }} />
          <div style={{ position: "relative" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#f59e0b", textTransform: "uppercase", letterSpacing: 2, display: "block", marginBottom: 16 }}>🤖 AI Education Platform</span>
            <h1 style={{ fontSize: 36, fontWeight: 800, color: "#f8fafc", lineHeight: 1.2, marginBottom: 20 }}>
              The Fastest Way to<br />
              <span style={{ color: "#f59e0b" }}>Learn & Apply AI</span>
            </h1>
            <p style={{ color: "#64748b", fontSize: 14, lineHeight: 1.7, marginBottom: 28, maxWidth: 340 }}>
              "The best investment you can make is in yourself. Knowledge is the one asset that can't be taken away."
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              <button style={{ padding: "12px 24px", borderRadius: 9, background: "#f59e0b", border: "none", color: "#0f172a", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                Start Free Today
              </button>
              <button style={{ padding: "12px 24px", borderRadius: 9, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#94a3b8", fontSize: 14, cursor: "pointer" }}>
                View Courses
              </button>
            </div>
            <div style={{ display: "flex", gap: 20, marginTop: 32 }}>
              {[["50+","Courses"],["1K+","Members"],["200+","Lessons"]].map(([n,l])=>(
                <div key={l} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#f59e0b" }}>{n}</div>
                  <div style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: 1 }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right — light with course grid */}
        <div style={{ background: "#fff", padding: "40px 28px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#64748b", marginBottom: 16 }}>✦ Featured Courses</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
            {[
              { emoji: "🤖", title: "AI Fundamentals", tag: "Beginner", color: "#ddd6fe" },
              { emoji: "⚡", title: "Prompt Engineering", tag: "Popular", color: "#bbf7d0" },
              { emoji: "💬", title: "ChatGPT Mastery", tag: "Hot 🔥", color: "#fed7aa" },
              { emoji: "🏢", title: "AI for Business", tag: "New", color: "#bfdbfe" },
            ].map((c,i)=>(
              <div key={i} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "14px 12px" }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: c.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, marginBottom: 8 }}>{c.emoji}</div>
                <div style={{ fontWeight: 600, fontSize: 12, color: "#0f172a", marginBottom: 2 }}>{c.title}</div>
                <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "#f1f5f9", color: "#64748b", fontWeight: 600 }}>{c.tag}</span>
              </div>
            ))}
          </div>
          <div style={{ padding: "12px 16px", background: "#fff8ed", border: "1px solid #fde68a", borderRadius: 10, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 20 }}>🎓</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, color: "#92400e" }}>Limited time — Free enrollment</div>
              <div style={{ fontSize: 11, color: "#b45309" }}>Start any course today at no cost</div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding: "56px 32px", background: "#fff" }}>
        <h2 style={{ textAlign: "center", fontSize: 24, fontWeight: 800, color: "#0f172a", marginBottom: 6 }}>How It Works</h2>
        <p style={{ textAlign: "center", color: "#64748b", fontSize: 14, marginBottom: 40 }}>Get from zero to AI-powered in 3 simple steps</p>
        <div style={{ display: "flex", gap: 24, justifyContent: "center" }}>
          {steps.map((s,i)=>(
            <div key={i} style={{ flex: 1, maxWidth: 260, textAlign: "center" }}>
              <div style={{ width: 52, height: 52, borderRadius: "50%", background: i===1 ? "#f59e0b" : "#0f172a", color: i===1 ? "#0f172a" : "#f59e0b", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, margin: "0 auto 14px" }}>{s.num}</div>
              {i < steps.length-1 && <div style={{ position: "absolute", marginLeft: 160, marginTop: -40, width: 80, height: 2, background: "#e2e8f0" }} />}
              <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a", marginBottom: 6 }}>{s.title}</div>
              <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section style={{ padding: "48px 32px", background: "#f8fafc" }}>
        <h2 style={{ textAlign: "center", fontSize: 22, fontWeight: 800, marginBottom: 28 }}>What Our Learners Say</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          {testimonials.map((t,i)=>(
            <div key={i} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "20px 18px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
              <div style={{ fontSize: 18, color: "#f59e0b", marginBottom: 10 }}>★★★★★</div>
              <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.7, marginBottom: 14 }}>"{t.text}"</p>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: t.avatar, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 13 }}>{t.name[0]}</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 12, color: "#0f172a" }}>{t.name}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "48px 32px", background: "#0f172a", textAlign: "center" }}>
        <h2 style={{ fontSize: 26, fontWeight: 800, color: "#f8fafc", marginBottom: 8 }}>Your AI future starts today.</h2>
        <p style={{ color: "#64748b", fontSize: 14, marginBottom: 24 }}>Join AI Academy 3.0 and transform how you work.</p>
        <button style={{ padding: "13px 30px", borderRadius: 10, background: "#f59e0b", border: "none", color: "#0f172a", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>Join Free — No Credit Card</button>
      </section>
    </div>
  );
}
