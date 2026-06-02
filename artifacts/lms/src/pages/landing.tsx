import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { BookOpen, Users, Zap, Award, Globe, MessageCircle, Clock, Loader2 } from "lucide-react";

const ACCENT_PALETTE = ["#6366f1", "#f59e0b", "#10b981", "#ec4899", "#f97316", "#8b5cf6"];

const FEATURES = [
  { icon: BookOpen,   title: "Structured Courses",    desc: "Step-by-step lessons built for real, practical results you can apply immediately." },
  { icon: Zap,        title: "AI-Powered Tools",      desc: "Access cutting-edge AI tools alongside every lesson — learn by doing." },
  { icon: Users,      title: "Community Access",      desc: "Connect with fellow learners. Ask questions, share progress, grow together." },
  { icon: Award,      title: "Earn Certificates",     desc: "Get verified certificates when you complete a course — share them anywhere." },
  { icon: Clock,      title: "Self-Paced Learning",   desc: "Learn anytime, anywhere, at your own speed — no deadlines, no pressure." },
  { icon: Globe,      title: "Lifetime Access",       desc: "Enrol once, access forever. Your courses never expire." },
];

type PublicCourse = {
  id: number;
  title: string;
  description: string | null;
  thumbnail: string | null;
  enrollmentMode: "open" | "approval_required";
  lessonCount: number;
  enrollmentCount: number;
};

type PublicStats = {
  totalCourses: number;
  totalMembers: number;
  totalLessons: number;
};

export default function LandingPage() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  const [courses, setCourses] = useState<PublicCourse[]>([]);
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [coursesLoading, setCoursesLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && user) setLocation("/dashboard");
  }, [user, isLoading, setLocation]);

  useEffect(() => {
    Promise.all([
      fetch("/api/public/courses").then(r => r.json()),
      fetch("/api/public/stats").then(r => r.json()),
    ]).then(([c, s]) => {
      setCourses(c as PublicCourse[]);
      setStats(s as PublicStats);
    }).catch(() => {}).finally(() => setCoursesLoading(false));
  }, []);

  if (isLoading) return null;

  const statItems = stats
    ? [
        [stats.totalCourses > 0 ? `${stats.totalCourses}+` : "—", "Courses Published"],
        [stats.totalMembers > 0 ? `${stats.totalMembers.toLocaleString()}+` : "—", "Active Members"],
        [stats.totalLessons > 0 ? `${stats.totalLessons}+` : "—", "Video Lessons"],
      ]
    : [["—", "Courses Published"], ["—", "Active Members"], ["—", "Video Lessons"]];

  return (
    <div className="min-h-screen bg-white text-foreground" style={{ fontFamily: "Inter, sans-serif" }}>

      {/* ── NAV ─────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xl" style={{ background: "#f59e0b" }}>
              🤖
            </div>
            <span className="font-extrabold text-base text-foreground">AI Academy 3.0</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <a href="#courses"  className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">Courses</a>
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">Features</a>
            <a href="#join"     className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">Join Us</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <button className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium px-3 py-2 rounded-lg hover:bg-muted">
                Sign In
              </button>
            </Link>
            <Link href="/signup">
              <button className="text-sm font-bold px-4 py-2 rounded-lg transition-all hover:opacity-90 active:scale-95" style={{ background: "#f59e0b", color: "#0f172a" }}>
                Get Started Free
              </button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-14 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-7 border" style={{ background: "#fff8ed", borderColor: "#fde68a", color: "#92400e" }}>
          🎓 The AI skills platform built for everyone
        </div>
        <h1 className="text-5xl md:text-6xl font-black leading-[1.1] tracking-tight mb-5">
          Learn AI Skills That<br />
          <span className="relative inline-block">
            <span className="relative z-10">Actually Matter</span>
            <span className="absolute bottom-1 left-0 right-0 h-4 rounded-sm -z-0" style={{ background: "#fde68a" }} />
          </span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed mb-9">
          Practical AI courses taught step by step — from complete beginner to confident AI user. No tech background required.
        </p>
        <div className="flex flex-wrap gap-3 justify-center mb-12">
          <Link href="/signup">
            <button className="px-7 py-3.5 rounded-xl font-bold text-base transition-all hover:opacity-90 active:scale-95 shadow-lg" style={{ background: "#0f172a", color: "#fff", boxShadow: "0 8px 24px rgba(15,23,42,0.18)" }}>
              Browse Free Courses →
            </button>
          </Link>
          <a href="#courses">
            <button className="px-7 py-3.5 rounded-xl font-semibold text-base border-2 border-border text-foreground hover:bg-muted transition-colors">
              See What We Teach
            </button>
          </a>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-7 gap-y-2 text-sm text-muted-foreground">
          {[["✅", "Free to start"], ["📱", "Learn anywhere"], ["🏆", "Earn certificates"], ["💬", "Community support"]].map(([ic, t]) => (
            <span key={t} className="flex items-center gap-1.5">{ic} {t}</span>
          ))}
        </div>
      </section>

      {/* ── STATS STRIP ─────────────────────────────────────────────── */}
      <div className="border-y border-border bg-muted/30">
        <div className="max-w-6xl mx-auto px-6 py-7 flex flex-wrap justify-center gap-x-14 gap-y-4">
          {statItems.map(([num, label]) => (
            <div key={label} className="text-center">
              <div className="text-2xl font-extrabold text-foreground">{num}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── COURSES ─────────────────────────────────────────────────── */}
      <section id="courses" className="max-w-6xl mx-auto px-6 py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-3xl font-extrabold mb-1.5">Our Courses</h2>
            <p className="text-muted-foreground text-sm">All courses available on AI Academy 3.0</p>
          </div>
          <Link href="/signup">
            <span className="text-sm font-semibold hover:underline cursor-pointer" style={{ color: "#f59e0b" }}>
              Enrol to see all →
            </span>
          </Link>
        </div>

        {coursesLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm">
            No public courses yet — check back soon!
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {courses.map((c, i) => {
              const accent = ACCENT_PALETTE[i % ACCENT_PALETTE.length];
              return (
                <div key={c.id} className="bg-white border border-border rounded-2xl p-5 hover:shadow-md transition-shadow flex flex-col gap-4">
                  {c.thumbnail ? (
                    <img src={c.thumbnail} alt={c.title} className="w-full h-28 object-cover rounded-xl" />
                  ) : (
                    <div className="w-full h-28 rounded-xl flex items-center justify-center text-4xl" style={{ background: accent + "18" }}>
                      📖
                    </div>
                  )}
                  <div>
                    <div className="font-bold text-sm mb-2 text-foreground">{c.title}</div>
                    {c.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{c.description}</p>
                    )}
                    <div className="flex gap-2 flex-wrap">
                      <span className="text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                        📖 {c.lessonCount} {c.lessonCount === 1 ? "lesson" : "lessons"}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                        👥 {c.enrollmentCount} enrolled
                      </span>
                      {c.enrollmentMode === "open" && (
                        <span className="text-xs px-2 py-0.5 rounded-md font-medium" style={{ background: "#dcfce7", color: "#15803d" }}>
                          ⚡ Instant Access
                        </span>
                      )}
                    </div>
                  </div>
                  <Link href="/signup">
                    <button className="w-full py-2 rounded-lg text-white text-sm font-semibold transition-opacity hover:opacity-90 mt-auto" style={{ background: accent }}>
                      Enrol Free
                    </button>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── FEATURES ────────────────────────────────────────────────── */}
      <section id="features" className="border-t border-border bg-muted/20">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-extrabold mb-2">Why AI Academy?</h2>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">Everything you need to go from curious to confident with AI — in one place.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-white border border-border rounded-2xl p-5 flex gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#f59e0b1a" }}>
                  <f.icon className="w-5 h-5" style={{ color: "#f59e0b" }} />
                </div>
                <div>
                  <div className="font-bold text-sm mb-1">{f.title}</div>
                  <div className="text-xs text-muted-foreground leading-relaxed">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── JOIN CTA ────────────────────────────────────────────────── */}
      <section id="join" className="max-w-6xl mx-auto px-6 pb-16 pt-4">
        <div className="rounded-3xl overflow-hidden grid md:grid-cols-2" style={{ background: "#0f172a" }}>
          <div className="p-10 flex flex-col justify-center">
            <div className="text-4xl mb-4 leading-none" style={{ color: "#f59e0b" }}>"</div>
            <p className="text-lg font-medium leading-relaxed mb-6" style={{ color: "#e2e8f0" }}>
              The best investment you can make is in yourself. Knowledge is the one asset that can't be taken away.
            </p>
            {stats && (
              <div className="flex gap-6">
                {[
                  [stats.totalCourses, "Courses"],
                  [stats.totalMembers, "Members"],
                  [stats.totalLessons, "Lessons"],
                ].map(([n, l]) => (
                  <div key={String(l)}>
                    <div className="text-xl font-extrabold" style={{ color: "#f59e0b" }}>{Number(n) > 0 ? `${n}+` : "—"}</div>
                    <div className="text-xs" style={{ color: "#64748b" }}>{l}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="p-10 flex flex-col justify-center items-center text-center border-l" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <h3 className="text-2xl font-extrabold mb-2" style={{ color: "#f8fafc" }}>Ready to start learning?</h3>
            <p className="text-sm mb-6" style={{ color: "#64748b" }}>Create your free account and join the AI Academy community today.</p>
            <Link href="/signup">
              <button className="px-8 py-3 rounded-xl font-bold text-sm transition-all hover:opacity-90 active:scale-95 mb-3" style={{ background: "#f59e0b", color: "#0f172a" }}>
                Create Free Account
              </button>
            </Link>
            <span className="text-xs" style={{ color: "#475569" }}>No credit card required</span>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────── */}
      <footer className="border-t border-border bg-muted/30">
        <div className="max-w-6xl mx-auto px-6 py-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm" style={{ background: "#f59e0b" }}>🤖</div>
            <span className="text-sm font-bold text-foreground">AI Academy 3.0</span>
          </div>
          <div className="flex items-center gap-5">
            <Link href="/login"><span className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer">Sign In</span></Link>
            <Link href="/signup"><span className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer">Sign Up</span></Link>
            <a href="https://wa.me/923278035433" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <MessageCircle className="w-3.5 h-3.5" /> Contact
            </a>
          </div>
          <span className="text-xs text-muted-foreground">© 2025 AI Academy 3.0. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
