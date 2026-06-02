import { Globe, Lock, Pencil, Trash2, Check, Play } from "lucide-react";

// Style 3: Timeline — vertical step circles with connecting line, completion states
const lessons = [
  { n: 1, title: "R1 Automate Instagram",    pub: true,  done: true,  dur: "15:29" },
  { n: 2, title: "R2 Create YT Short",        pub: true,  done: true,  dur: "12:10" },
  { n: 3, title: "R3 Articles to Socials",    pub: true,  done: false, active: true, dur: "08:45" },
  { n: 4, title: "Secret 10 Hacks GPT",       pub: false, done: false, dur: "22:00" },
  { n: 5, title: "R5 Twitter Automation",     pub: true,  done: false, dur: "11:30" },
  { n: 6, title: "R6 Spotify Podcast",        pub: true,  done: false, dur: "09:15" },
  { n: 7, title: "R7 TK-INSTA YT Automate",  pub: false, done: false, dur: "18:40" },
  { n: 8, title: "R8 Repurpose your Blog",    pub: true,  done: false, dur: "14:20" },
];

const accent = "#10b981";

export function LessonStyle3() {
  return (
    <div style={{ display:"flex", height:"100vh", fontFamily:"'Inter',sans-serif", background:"#fff", overflow:"hidden" }}>
      {/* Timeline sidebar */}
      <div style={{ width:270, background:"#fff", borderRight:"1px solid #e2e8f0", display:"flex", flexDirection:"column", overflowY:"auto" }}>
        <div style={{ padding:"16px 16px 0" }}>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.09em", textTransform:"uppercase", color:"#94a3b8", marginBottom:4 }}>Course Lessons</div>
          <div style={{ fontSize:12, color:"#64748b", marginBottom:14 }}>2 of 8 complete</div>
        </div>
        <div style={{ padding:"0 16px 16px", position:"relative" }}>
          {/* Vertical connecting line */}
          <div style={{ position:"absolute", left:28, top:0, bottom:0, width:2, background:"linear-gradient(to bottom,#10b98144,#e2e8f0)", zIndex:0 }} />
          {lessons.map((l, i) => (
            <div key={l.n} style={{ display:"flex", alignItems:"flex-start", gap:12, marginBottom: i < lessons.length-1 ? 4 : 0, position:"relative", zIndex:1, paddingBottom:4 }}>
              {/* Step circle */}
              <div style={{
                width:28, height:28, borderRadius:"50%", flexShrink:0, marginTop:2,
                background: l.done ? accent : l.active ? "#fff" : "#fff",
                border: l.done ? "none" : l.active ? `2px solid ${accent}` : "2px solid #e2e8f0",
                display:"flex", alignItems:"center", justifyContent:"center",
                boxShadow: l.active ? `0 0 0 4px ${accent}18` : "none",
              }}>
                {l.done
                  ? <Check size={13} color="#fff" strokeWidth={3} />
                  : l.active
                    ? <div style={{ width:8, height:8, borderRadius:"50%", background:accent }} />
                    : <span style={{ fontSize:9, fontWeight:700, color:"#94a3b8" }}>{l.n}</span>
                }
              </div>
              {/* Content */}
              <div style={{
                flex:1, padding:"6px 10px 6px",
                background: l.active ? `${accent}0a` : "transparent",
                border: l.active ? `1px solid ${accent}22` : "1px solid transparent",
                borderRadius:8, cursor:"pointer",
              }}>
                <p style={{ fontSize:12, fontWeight: l.active ? 700 : 500, color: l.done ? "#94a3b8" : l.active ? "#0f172a" : "#475569", margin:"0 0 3px", lineHeight:1.3 }}>{l.title}</p>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <span style={{ fontSize:10, color:"#94a3b8" }}>{l.dur}</span>
                  {l.pub ? <Globe size={9} color="#94a3b8" /> : <Lock size={9} color="#94a3b8" />}
                  {l.done && <span style={{ fontSize:9, fontWeight:700, color:accent, background:`${accent}12`, padding:"1px 6px", borderRadius:20 }}>Done</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", background:"#f8fafc", overflow:"hidden" }}>
        {/* Header */}
        <div style={{ padding:"14px 20px", background:"#fff", borderBottom:"1px solid #e2e8f0", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
              <div style={{ width:5, height:20, borderRadius:3, background:accent }} />
              <h2 style={{ fontSize:15, fontWeight:700, color:"#0f172a", margin:0 }}>R3 Articles to Socials</h2>
            </div>
            <p style={{ fontSize:12, color:"#94a3b8", margin:0, paddingLeft:13 }}>Lesson 3 of 8 · 8:45</p>
          </div>
          <div style={{ display:"flex", gap:6 }}>
            {[Pencil, Trash2].map((Icon, i) => (
              <div key={i} style={{ width:30, height:30, borderRadius:8, border:"1px solid #e2e8f0", background:"#f8fafc", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
                <Icon size={13} color="#94a3b8" />
              </div>
            ))}
          </div>
        </div>

        {/* Video */}
        <div style={{ flex:1, background:"#111827", display:"flex", alignItems:"center", justifyContent:"center", position:"relative" }}>
          <div style={{ position:"absolute", inset:0, backgroundImage:`radial-gradient(circle at 35% 50%,${accent}18,transparent 60%)` }} />
          <div style={{ position:"relative", zIndex:1, textAlign:"center" }}>
            <div style={{ width:64, height:64, borderRadius:"50%", background:`${accent}22`, border:`2px solid ${accent}55`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 12px" }}>
              <Play size={28} color={accent} fill={accent} />
            </div>
            <p style={{ color:"#4b5563", fontSize:12 }}>Video Player</p>
          </div>
          {/* Progress bar */}
          <div style={{ position:"absolute", bottom:0, left:0, right:0, padding:"12px 20px" }}>
            <div style={{ height:3, borderRadius:99, background:"rgba(255,255,255,0.08)", marginBottom:8 }}>
              <div style={{ height:"100%", width:"35%", borderRadius:99, background:accent }} />
            </div>
            <div style={{ display:"flex", justifyContent:"space-between" }}>
              <span style={{ fontSize:11, color:"#4b5563" }}>3:05</span>
              <span style={{ fontSize:11, color:"#4b5563" }}>8:45</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
