import { Globe, Lock, Pencil, Trash2, CheckCircle2, Play, ChevronDown, BookOpen } from "lucide-react";

// Style 4: Full-width accordion — lessons stacked below the video, expand to show description
const lessons = [
  { n: 1, title: "R1 Automate Instagram",    pub: true,  done: true,  dur: "15:29", desc: "Learn how to fully automate your Instagram posting workflow using Make.com." },
  { n: 2, title: "R2 Create YT Short",        pub: true,  done: true,  dur: "12:10", desc: "Use AI to generate and schedule YouTube Shorts content at scale." },
  { n: 3, title: "R3 Articles to Socials",    pub: true,  done: false, active: true, dur: "08:45", desc: "Auto-convert blog articles into engaging social media posts." },
  { n: 4, title: "Secret 10 Hacks GPT",       pub: false, done: false, dur: "22:00", desc: "Unlock hidden ChatGPT techniques to 10x your productivity." },
  { n: 5, title: "R5 Twitter Automation",     pub: true,  done: false, dur: "11:30", desc: "Schedule and auto-reply to Twitter threads using Make.com." },
  { n: 6, title: "R6 Spotify Podcast",        pub: true,  done: false, dur: "09:15", desc: "Submit and promote your podcast episodes automatically." },
];

const accent = "#8b5cf6";

export function LessonStyle4() {
  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100vh", fontFamily:"'Inter',sans-serif", background:"#f8fafc", overflow:"hidden" }}>
      {/* Video + header */}
      <div style={{ display:"flex", height:"55%" }}>
        {/* Video */}
        <div style={{ flex:1, background:"#0f0a1e", display:"flex", alignItems:"center", justifyContent:"center", position:"relative" }}>
          <div style={{ position:"absolute", inset:0, backgroundImage:`radial-gradient(circle at 40% 50%,${accent}22,transparent 65%)` }} />
          <div style={{ position:"relative", zIndex:1, textAlign:"center" }}>
            <div style={{ width:60, height:60, borderRadius:"50%", background:`${accent}28`, border:`2px solid ${accent}55`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 10px" }}>
              <Play size={26} color={accent} fill={accent} />
            </div>
            <p style={{ color:"#6b7280", fontSize:12, margin:0 }}>Video Player</p>
          </div>
          <div style={{ position:"absolute", bottom:0, left:0, right:0, padding:"10px 20px" }}>
            <div style={{ height:3, borderRadius:99, background:"rgba(255,255,255,0.08)", marginBottom:8 }}>
              <div style={{ height:"100%", width:"35%", borderRadius:99, background:accent }} />
            </div>
            <div style={{ display:"flex", justifyContent:"space-between" }}>
              <span style={{ fontSize:11, color:"#6b7280" }}>3:05 / 8:45</span>
            </div>
          </div>
        </div>

        {/* Lesson info panel */}
        <div style={{ width:280, background:"#fff", borderLeft:"1px solid #e2e8f0", display:"flex", flexDirection:"column", padding:"16px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
            <div style={{ width:24, height:24, borderRadius:7, background:`${accent}18`, border:`1px solid ${accent}33`, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <BookOpen size={13} style={{ color:accent }} />
            </div>
            <span style={{ fontSize:11, fontWeight:700, color:"#94a3b8", letterSpacing:"0.07em", textTransform:"uppercase" }}>Now Playing</span>
          </div>
          <h2 style={{ fontSize:15, fontWeight:700, color:"#0f172a", margin:"0 0 4px", lineHeight:1.35 }}>R3 Articles to Socials</h2>
          <p style={{ fontSize:12, color:"#64748b", margin:"0 0 14px", lineHeight:1.5 }}>Auto-convert blog articles into engaging social media posts across all platforms.</p>
          <div style={{ display:"flex", gap:6, marginBottom:14 }}>
            <span style={{ fontSize:10, fontWeight:700, color:accent, background:`${accent}12`, padding:"3px 9px", borderRadius:20 }}>08:45</span>
            <span style={{ fontSize:10, fontWeight:700, color:"#10b981", background:"#f0fdf4", padding:"3px 9px", borderRadius:20 }}>Lesson 3</span>
          </div>
          <div style={{ marginTop:"auto", display:"flex", gap:6 }}>
            {[Pencil, Trash2].map((Icon, i) => (
              <div key={i} style={{ width:30, height:30, borderRadius:8, border:"1px solid #e2e8f0", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
                <Icon size={13} color="#94a3b8" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lesson accordion list */}
      <div style={{ flex:1, overflowY:"auto", background:"#f8fafc", borderTop:"1px solid #e2e8f0" }}>
        <div style={{ padding:"12px 20px 6px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", color:"#94a3b8" }}>All Lessons · 6 total</div>
          <div style={{ height:4, width:100, borderRadius:99, background:"#e2e8f0" }}>
            <div style={{ height:"100%", width:"33%", borderRadius:99, background:accent }} />
          </div>
        </div>
        <div style={{ padding:"4px 20px 16px", display:"flex", flexDirection:"column", gap:6 }}>
          {lessons.map(l => (
            <div key={l.n} style={{
              background:"#fff",
              border: l.active ? `1px solid ${accent}44` : "1px solid #e2e8f0",
              borderRadius:12,
              overflow:"hidden",
              boxShadow: l.active ? `0 2px 12px ${accent}18` : "none",
            }}>
              <div style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px", cursor:"pointer" }}>
                {/* Status */}
                {l.done
                  ? <CheckCircle2 size={18} style={{ color:accent, flexShrink:0 }} />
                  : <div style={{ width:18, height:18, borderRadius:"50%", border:`2px solid ${l.active ? accent : "#e2e8f0"}`, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
                      {l.active && <div style={{ width:6, height:6, borderRadius:"50%", background:accent }} />}
                    </div>
                }
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:12.5, fontWeight: l.active ? 700 : 500, color: l.done ? "#94a3b8" : "#0f172a", margin:"0 0 2px", lineHeight:1.3 }}>{l.title}</p>
                  <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                    <span style={{ fontSize:10.5, color:"#94a3b8" }}>{l.dur}</span>
                    {l.pub ? <Globe size={9} color="#94a3b8" /> : <Lock size={9} color="#f97316" />}
                  </div>
                </div>
                {l.active && <ChevronDown size={16} style={{ color:accent, flexShrink:0 }} />}
              </div>
              {l.active && (
                <div style={{ padding:"0 14px 12px 44px", borderTop:`1px solid ${accent}18` }}>
                  <p style={{ fontSize:12, color:"#64748b", lineHeight:1.5, margin:0 }}>{l.desc}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
