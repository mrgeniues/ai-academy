import { Globe, Lock, Pencil, Trash2, CheckCircle2, PlayCircle, Circle } from "lucide-react";

// Style 1: Dark Sidebar — navy panel, glowing active pill, completion dots
const lessons = [
  { n: 1, title: "R1 Automate Instagram",    pub: true,  done: true  },
  { n: 2, title: "R2 Create YT Short",        pub: true,  done: true  },
  { n: 3, title: "R3 Articles to Socials",    pub: true,  done: false, active: true },
  { n: 4, title: "Secret 10 Hacks GPT",       pub: false, done: false },
  { n: 5, title: "R5 Twitter Automation",     pub: true,  done: false },
  { n: 6, title: "R6 Spotify Podcast",        pub: true,  done: false },
  { n: 7, title: "R7 TK-INSTA YT Automate",  pub: false, done: false },
  { n: 8, title: "R8 Repurpose your Blog",    pub: true,  done: false },
];

const accent = "#f59e0b";

export function LessonStyle1() {
  return (
    <div style={{ display:"flex", height:"100vh", fontFamily:"'Inter',sans-serif", background:"#f1f5f9", overflow:"hidden" }}>
      {/* Sidebar */}
      <div style={{ width:260, background:"#0d1829", display:"flex", flexDirection:"column", flexShrink:0, borderRight:"1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ padding:"16px 16px 12px", borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.09em", textTransform:"uppercase", color:"#475569", marginBottom:10 }}>Course Lessons</div>
          {/* Mini progress */}
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
            <span style={{ fontSize:11, color:"#475569" }}>Progress</span>
            <span style={{ fontSize:11, fontWeight:700, color:accent }}>2 / 8</span>
          </div>
          <div style={{ height:4, borderRadius:99, background:"rgba(255,255,255,0.08)" }}>
            <div style={{ height:"100%", width:"25%", borderRadius:99, background:accent, boxShadow:`0 0 8px ${accent}88` }} />
          </div>
        </div>
        <div style={{ flex:1, overflowY:"auto", padding:"8px 0" }}>
          {lessons.map(l => (
            <div key={l.n} style={{
              display:"flex", alignItems:"center", gap:10, padding:"10px 14px",
              background: l.active ? `${accent}18` : "transparent",
              borderLeft: l.active ? `3px solid ${accent}` : "3px solid transparent",
              cursor:"pointer", transition:"all 0.15s",
            }}>
              {/* Status icon */}
              {l.done
                ? <CheckCircle2 size={16} style={{ color:accent, flexShrink:0 }} />
                : l.active
                  ? <PlayCircle size={16} style={{ color:accent, flexShrink:0 }} />
                  : <Circle size={16} style={{ color:"#334155", flexShrink:0 }} />
              }
              <span style={{ flex:1, fontSize:12, fontWeight: l.active ? 700 : 500, color: l.active ? "#f1f5f9" : l.done ? "#64748b" : "#94a3b8", lineHeight:1.3, textDecoration: l.done ? "none" : "none" }}>{l.title}</span>
              <div style={{ display:"flex", gap:3, flexShrink:0, alignItems:"center" }}>
                {l.pub ? <Globe size={10} style={{ color:"#334155" }} /> : <Lock size={10} style={{ color:"#334155" }} />}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        {/* Lesson header */}
        <div style={{ padding:"16px 20px 14px", borderBottom:"1px solid #e2e8f0", background:"#fff", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
              <div style={{ width:22, height:22, borderRadius:6, background:`${accent}20`, border:`1px solid ${accent}44`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700, color:accent }}>3</div>
              <h2 style={{ fontSize:16, fontWeight:700, color:"#0f172a", margin:0 }}>R3 Articles to Socials</h2>
            </div>
            <p style={{ fontSize:12, color:"#94a3b8", margin:0 }}>Learn Make.com Automation · Lesson 3 of 8</p>
          </div>
          <div style={{ display:"flex", gap:6 }}>
            {[Pencil, Trash2].map((Icon, i) => (
              <div key={i} style={{ width:30, height:30, borderRadius:8, border:"1px solid #e2e8f0", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
                <Icon size={13} color="#94a3b8" />
              </div>
            ))}
          </div>
        </div>

        {/* Video player */}
        <div style={{ flex:1, background:"#000", display:"flex", alignItems:"center", justifyContent:"center", position:"relative" }}>
          <div style={{ position:"absolute", inset:0, background:"linear-gradient(135deg,#1e3a5f,#6366f1)", opacity:0.6 }} />
          <div style={{ position:"relative", zIndex:1, textAlign:"center" }}>
            <div style={{ width:64, height:64, borderRadius:"50%", background:"rgba(255,255,255,0.15)", backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 12px" }}>
              <PlayCircle size={32} color="#fff" />
            </div>
            <p style={{ color:"rgba(255,255,255,0.7)", fontSize:13, margin:0 }}>Video Player</p>
          </div>
          {/* Time bar */}
          <div style={{ position:"absolute", bottom:0, left:0, right:0, padding:"0 16px 12px" }}>
            <div style={{ height:3, borderRadius:99, background:"rgba(255,255,255,0.2)", marginBottom:8 }}>
              <div style={{ height:"100%", width:"30%", borderRadius:99, background:accent }} />
            </div>
            <div style={{ display:"flex", justifyContent:"space-between" }}>
              <span style={{ fontSize:11, color:"rgba(255,255,255,0.6)" }}>4:32</span>
              <span style={{ fontSize:11, color:"rgba(255,255,255,0.6)" }}>15:29</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
