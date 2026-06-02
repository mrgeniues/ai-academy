import { Globe, Lock, Pencil, Trash2, CheckCircle2, Play, ChevronRight } from "lucide-react";

// Style 2: Card Lessons — each lesson is a white card with numbered badge, hover state
const lessons = [
  { n: 1, title: "R1 Automate Instagram",    pub: true,  done: true,  dur: "15:29" },
  { n: 2, title: "R2 Create YT Short",        pub: true,  done: true,  dur: "12:10" },
  { n: 3, title: "R3 Articles to Socials",    pub: true,  done: false, active: true, dur: "08:45" },
  { n: 4, title: "Secret 10 Hacks GPT",       pub: false, done: false, dur: "22:00" },
  { n: 5, title: "R5 Twitter Automation",     pub: true,  done: false, dur: "11:30" },
  { n: 6, title: "R6 Spotify Podcast",        pub: true,  done: false, dur: "09:15" },
  { n: 7, title: "R7 TK-INSTA YT Automate",  pub: false, done: false, dur: "18:40" },
];

const accent = "#6366f1";

export function LessonStyle2() {
  return (
    <div style={{ display:"flex", height:"100vh", fontFamily:"'Inter',sans-serif", background:"#f8fafc", overflow:"hidden" }}>
      {/* Lesson list panel */}
      <div style={{ width:280, background:"#f1f5f9", display:"flex", flexDirection:"column", flexShrink:0, overflowY:"auto", borderRight:"1px solid #e2e8f0" }}>
        <div style={{ padding:"14px 14px 10px" }}>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.09em", textTransform:"uppercase", color:"#94a3b8", marginBottom:12 }}>Course Lessons</div>
          {/* Progress */}
          <div style={{ background:"#fff", borderRadius:10, padding:"10px 12px", border:"1px solid #e2e8f0", marginBottom:12 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
              <span style={{ fontSize:11, color:"#64748b" }}>2 of 8 done</span>
              <span style={{ fontSize:11, fontWeight:700, color:accent }}>25%</span>
            </div>
            <div style={{ height:5, borderRadius:99, background:"#e2e8f0" }}>
              <div style={{ height:"100%", width:"25%", borderRadius:99, background:accent }} />
            </div>
          </div>
        </div>
        <div style={{ flex:1, padding:"0 10px 12px", display:"flex", flexDirection:"column", gap:6 }}>
          {lessons.map(l => (
            <div key={l.n} style={{
              background: l.active ? "#fff" : "transparent",
              border: l.active ? `1px solid ${accent}33` : "1px solid transparent",
              borderRadius:10,
              padding:"10px 12px",
              cursor:"pointer",
              display:"flex", alignItems:"center", gap:10,
              boxShadow: l.active ? `0 2px 8px ${accent}18` : "none",
            }}>
              {/* Number badge */}
              <div style={{
                width:28, height:28, borderRadius:8, flexShrink:0,
                background: l.done ? accent : l.active ? `${accent}18` : "#e2e8f0",
                border: l.done ? "none" : l.active ? `1px solid ${accent}44` : "none",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:11, fontWeight:700,
                color: l.done ? "#fff" : l.active ? accent : "#94a3b8",
              }}>
                {l.done ? <CheckCircle2 size={14} color="#fff" /> : l.n}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontSize:12, fontWeight: l.active ? 700 : 500, color: l.done ? "#94a3b8" : l.active ? "#0f172a" : "#475569", margin:0, lineHeight:1.3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{l.title}</p>
                <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:3 }}>
                  <span style={{ fontSize:10, color:"#94a3b8" }}>{l.dur}</span>
                  {l.pub ? <Globe size={9} color="#94a3b8" /> : <Lock size={9} color="#94a3b8" />}
                </div>
              </div>
              {l.active && <ChevronRight size={14} style={{ color:accent, flexShrink:0 }} />}
            </div>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        {/* Header */}
        <div style={{ padding:"14px 20px", background:"#fff", borderBottom:"1px solid #e2e8f0", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <h2 style={{ fontSize:16, fontWeight:700, color:"#0f172a", margin:"0 0 3px" }}>R3 Articles to Socials</h2>
            <p style={{ fontSize:12, color:"#94a3b8", margin:0 }}>Lesson 3 of 8 · 8:45</p>
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
        <div style={{ flex:1, background:"#0d1829", display:"flex", alignItems:"center", justifyContent:"center", position:"relative" }}>
          <div style={{ position:"absolute", inset:0, backgroundImage:"radial-gradient(circle at 40% 50%,#6366f122,transparent 70%)" }} />
          <div style={{ position:"relative", zIndex:1, textAlign:"center" }}>
            <div style={{ width:60, height:60, borderRadius:"50%", background:`${accent}33`, border:`2px solid ${accent}66`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 10px" }}>
              <Play size={26} color={accent} fill={accent} />
            </div>
            <p style={{ color:"#475569", fontSize:12, margin:0 }}>Video Player</p>
          </div>
          <div style={{ position:"absolute", bottom:0, left:0, right:0, padding:"12px 20px" }}>
            <div style={{ height:3, borderRadius:99, background:"rgba(255,255,255,0.1)", marginBottom:8 }}>
              <div style={{ height:"100%", width:"35%", borderRadius:99, background:accent }} />
            </div>
            <div style={{ display:"flex", justifyContent:"space-between" }}>
              <span style={{ fontSize:11, color:"#475569" }}>3:05</span>
              <span style={{ fontSize:11, color:"#475569" }}>8:45</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
