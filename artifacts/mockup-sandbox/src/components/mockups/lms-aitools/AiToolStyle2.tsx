import { ExternalLink, Pencil, Trash2, Zap, Code2, Search, Video, Image, ArrowUpRight } from "lucide-react";

// Style 2: Dark Glass Cards — navy bg, glow accent, matches site theme
const tools = [
  { name: "Svg-Animation", desc: "Commands: 1-npm install 2-npm run dev", tag: "Dev Tools", icon: Code2, accent: "#3b82f6" },
  { name: "Stock Keywords", desc: "Find the best keywords for stock earning.", tag: "SEO & Growth", icon: Search, accent: "#10b981" },
  { name: "VEO Automation", desc: "Make videos & images in Bulk.", tag: "Video AI", icon: Video, accent: "#8b5cf6" },
  { name: "PromptLens AI", desc: "Create prompts to any images.", tag: "AI Art", icon: Zap, accent: "#f59e0b" },
  { name: "Image Studio", desc: "Generate stunning visuals with AI.", tag: "Creative", icon: Image, accent: "#06b6d4" },
  { name: "AI Writer Pro", desc: "Write better content 10x faster.", tag: "Copywriting", icon: Zap, accent: "#ec4899" },
];

export function AiToolStyle2() {
  return (
    <div style={{ background: "#0a0f1e", minHeight: "100vh", padding: 24, fontFamily: "'Inter',sans-serif" }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#334155", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>Style 2</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: "#f1f5f9" }}>Dark Glass Cards</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        {tools.map(t => (
          <div key={t.name} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 14, overflow: "hidden", border: "1px solid rgba(255,255,255,0.07)", boxShadow: `0 0 0 1px ${t.accent}22, 0 8px 24px rgba(0,0,0,0.3)` }}>
            <div style={{ padding: "18px 18px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: `${t.accent}22`, border: `1px solid ${t.accent}44`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <t.icon size={20} color={t.accent} />
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {[ExternalLink, Pencil, Trash2].map((Icon, i) => (
                    <div key={i} style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                      <Icon size={13} color="#64748b" />
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9", marginBottom: 4 }}>{t.name}</div>
              <div style={{ display: "inline-block", fontSize: 10, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: t.accent, background: `${t.accent}18`, padding: "2px 8px", borderRadius: 20 }}>{t.tag}</div>
            </div>
            <div style={{ padding: "12px 18px 16px" }}>
              <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 14px", lineHeight: 1.5 }}>{t.desc}</p>
              <button style={{ width: "100%", background: `${t.accent}18`, border: `1px solid ${t.accent}44`, borderRadius: 8, padding: "9px 0", color: t.accent, fontWeight: 600, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <ArrowUpRight size={14} /> Open Tool
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
