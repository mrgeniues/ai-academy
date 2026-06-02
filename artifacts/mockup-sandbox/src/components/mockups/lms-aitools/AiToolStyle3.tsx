import { ExternalLink, Pencil, Trash2, Zap, Code2, Search, Video, Image, ChevronRight } from "lucide-react";

// Style 3: Horizontal List Cards — thumbnail left, info right
const tools = [
  { name: "Svg-Animation",  desc: "Commands: 1-npm install 2-npm run dev", tag: "Dev", icon: Code2, bg: "#3b82f6" },
  { name: "Stock Keywords", desc: "Find the best keywords for stock earning.", tag: "SEO", icon: Search, bg: "#10b981" },
  { name: "VEO Automation", desc: "Make videos & images in Bulk.", tag: "Video", icon: Video, bg: "#8b5cf6" },
  { name: "PromptLens AI",  desc: "Create prompts to any images.", tag: "AI", icon: Zap, bg: "#f59e0b" },
  { name: "Image Studio",   desc: "Generate stunning visuals with AI.", tag: "Art", icon: Image, bg: "#06b6d4" },
  { name: "AI Writer Pro",  desc: "Write better content 10x faster.", tag: "Copy", icon: Zap, bg: "#ec4899" },
];

export function AiToolStyle3() {
  return (
    <div style={{ background: "#f1f5f9", minHeight: "100vh", padding: 24, fontFamily: "'Inter',sans-serif" }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#94a3b8", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>Style 3</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: "#0f172a" }}>Horizontal List Cards</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {tools.map(t => (
          <div key={t.name} style={{ background: "#fff", borderRadius: 14, display: "flex", alignItems: "center", gap: 0, border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", overflow: "hidden" }}>
            <div style={{ width: 80, minHeight: 80, background: `linear-gradient(135deg,${t.bg}ee,${t.bg}88)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <t.icon size={28} color="#fff" />
            </div>
            <div style={{ flex: 1, padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{t.name}</span>
                <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: t.bg, background: `${t.bg}14`, padding: "2px 7px", borderRadius: 20 }}>{t.tag}</span>
              </div>
              <p style={{ fontSize: 12.5, color: "#64748b", margin: 0, lineHeight: 1.4 }}>{t.desc}</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 16px", flexShrink: 0 }}>
              {[Pencil, Trash2].map((Icon, i) => (
                <div key={i} style={{ width: 30, height: 30, borderRadius: 8, background: "#f1f5f9", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                  <Icon size={13} color="#94a3b8" />
                </div>
              ))}
              <button style={{ display: "flex", alignItems: "center", gap: 5, background: t.bg, border: "none", borderRadius: 8, padding: "8px 14px", color: "#fff", fontWeight: 600, fontSize: 12.5, cursor: "pointer", marginLeft: 4 }}>
                Open <ChevronRight size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
