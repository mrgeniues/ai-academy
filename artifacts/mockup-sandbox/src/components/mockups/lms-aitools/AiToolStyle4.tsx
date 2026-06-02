import { ExternalLink, Pencil, Trash2, Zap, Code2, Search, Video, Image, Star } from "lucide-react";

// Style 4: Feature Cards — large icon, category pill, bold name, gradient CTA
const tools = [
  { name: "Svg-Animation",  desc: "Commands: 1-npm install 2-npm run dev",  cat: "Developer", icon: Code2, color: "#3b82f6", stars: 4 },
  { name: "Stock Keywords", desc: "Find the best keywords for stock earning.", cat: "SEO",       icon: Search, color: "#10b981", stars: 5 },
  { name: "VEO Automation", desc: "Make videos & images in Bulk.",            cat: "Video AI",  icon: Video,  color: "#8b5cf6", stars: 5 },
  { name: "PromptLens AI",  desc: "Create prompts to any images.",            cat: "AI Art",    icon: Zap,    color: "#f59e0b", stars: 4 },
  { name: "Image Studio",   desc: "Generate stunning visuals with AI.",       cat: "Creative",  icon: Image,  color: "#06b6d4", stars: 5 },
  { name: "AI Writer Pro",  desc: "Write better content 10x faster.",         cat: "Copywrite", icon: Zap,    color: "#ec4899", stars: 4 },
];

export function AiToolStyle4() {
  return (
    <div style={{ background: "#f8fafc", minHeight: "100vh", padding: 24, fontFamily: "'Inter',sans-serif" }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#94a3b8", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>Style 4</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: "#0f172a" }}>Feature Cards</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        {tools.map(t => (
          <div key={t.name} style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "18px 18px 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: `${t.color}14`, border: `2px solid ${t.color}30`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <t.icon size={24} color={t.color} />
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  {[ExternalLink, Pencil, Trash2].map((Icon, i) => (
                    <div key={i} style={{ width: 28, height: 28, borderRadius: 8, background: "#f8fafc", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                      <Icon size={12} color="#94a3b8" />
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>{t.name}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: t.color, background: `${t.color}14`, padding: "2px 8px", borderRadius: 20 }}>{t.cat}</span>
                <div style={{ display: "flex", gap: 2 }}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={10} fill={i < t.stars ? t.color : "none"} color={i < t.stars ? t.color : "#cbd5e1"} />
                  ))}
                </div>
              </div>
              <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.5, margin: "0 0 16px" }}>{t.desc}</p>
            </div>
            <div style={{ marginTop: "auto", padding: "0 18px 18px" }}>
              <div style={{ height: 1, background: "#f1f5f9", marginBottom: 14 }} />
              <button style={{ width: "100%", background: `linear-gradient(135deg,${t.color},${t.color}bb)`, border: "none", borderRadius: 10, padding: "10px 0", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, letterSpacing: "0.02em" }}>
                <ExternalLink size={13} /> Open Tool
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
