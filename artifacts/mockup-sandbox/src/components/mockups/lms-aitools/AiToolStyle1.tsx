import { ExternalLink, Pencil, Trash2, Zap, Code2, Search, Video, Image } from "lucide-react";

// Style 1: Gradient Header Cards — color band at top, clean white body
const tools = [
  { name: "Svg-Animation", desc: "Commands: 1-npm install 2-npm run dev", tag: "Dev", icon: Code2, grad: "linear-gradient(135deg,#3b82f6,#6366f1)", cat: "#3b82f6" },
  { name: "Stock Keywords", desc: "Find the best keywords for stock earning.", tag: "SEO", icon: Search, grad: "linear-gradient(135deg,#10b981,#06b6d4)", cat: "#10b981" },
  { name: "VEO Automation", desc: "Make videos & images in Bulk.", tag: "Video", icon: Video, grad: "linear-gradient(135deg,#8b5cf6,#ec4899)", cat: "#8b5cf6" },
  { name: "PromptLens AI", desc: "Create prompts to any images.", tag: "AI", icon: Zap, grad: "linear-gradient(135deg,#f59e0b,#f97316)", cat: "#f59e0b" },
  { name: "Image Studio", desc: "Generate stunning visuals with AI.", tag: "Art", icon: Image, grad: "linear-gradient(135deg,#06b6d4,#3b82f6)", cat: "#06b6d4" },
  { name: "AI Writer Pro", desc: "Write better content 10x faster.", tag: "Copy", icon: Zap, grad: "linear-gradient(135deg,#ec4899,#f97316)", cat: "#ec4899" },
];

export function AiToolStyle1() {
  return (
    <div style={{ background: "#f8fafc", minHeight: "100vh", padding: 24, fontFamily: "'Inter',sans-serif" }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#94a3b8", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>Style 1</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: "#0f172a" }}>Gradient Header Cards</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        {tools.map(t => (
          <div key={t.name} style={{ background: "#fff", borderRadius: 14, overflow: "hidden", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <div style={{ background: t.grad, padding: "20px 18px 16px", position: "relative" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <t.icon size={20} color="#fff" />
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {[ExternalLink, Pencil, Trash2].map((Icon, i) => (
                    <div key={i} style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                      <Icon size={13} color="#fff" />
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ marginTop: 12, fontSize: 15, fontWeight: 700, color: "#fff" }}>{t.name}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.75)", marginTop: 2, letterSpacing: "0.06em", textTransform: "uppercase" }}>{t.tag}</div>
            </div>
            <div style={{ padding: "14px 18px 16px" }}>
              <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 14px", lineHeight: 1.5 }}>{t.desc}</p>
              <button style={{ width: "100%", background: t.grad, border: "none", borderRadius: 8, padding: "9px 0", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <ExternalLink size={13} /> Open Tool
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
