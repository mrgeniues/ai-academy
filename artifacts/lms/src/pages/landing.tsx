import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useEffect } from "react";
import { GraduationCap, BookOpen, Users, Zap, Award, Globe, MessageCircle, Clock } from "lucide-react";

const COURSES = [
  { emoji: "🤖", title: "AI Fundamentals", lessons: 12, level: "Beginner", accent: "#6366f1" },
  { emoji: "⚡", title: "Prompt Engineering", lessons: 8, level: "Intermediate", accent: "#f59e0b" },
  { emoji: "💬", title: "ChatGPT Mastery", lessons: 15, level: "All Levels", accent: "#10b981" },
  { emoji: "🏢", title: "AI for Business", lessons: 10, level: "Beginner", accent: "#ec4899" },
  { emoji: "🎨", title: "AI Image Generation", lessons: 9, level: "Beginner", accent: "#f97316" },
  { emoji: "📊", title: "AI Data Analysis", lessons: 11, level: "Advanced", accent: "#8b5cf6" },
];

const FEATURES = [
  { icon: BookOpen, title: "Structured Courses", desc: "Step-by-step lessons built for real, practical results you can apply immediately." },
  { icon: Zap, title: "AI-Powered Tools", desc: "Access cutting-edge AI tools alongside every lesson — learn by doing." },
  { icon: Users, title: "Community Access", desc: "Learn alongside 1,000+ motivated peers. Ask questions, share wins." },
  { icon: Award, title: "Earn Certificates", desc: "Get verified certificates when you complete a course — share them anywhere." },
  { icon: Clock, title: "Self-Paced Learning", desc: "Learn anytime, anywhere, at your own speed — no deadlines, no pressure." },
  { icon: Globe, title: "Lifetime Access", desc: "Enrol once, access forever. Your courses never expire." },
];

const TESTIMONIALS = [
  { name: "Sarah K.", role: "Marketing Manager", text: "I went from AI-curious to using ChatGPT daily in my campaigns within 2 weeks.", color: "#6366f1" },
  { name: "Ahmed R.", role: "Freelancer", text: "The prompt engineering course alone tripled my freelance income. Worth every minute.", color: "#10b981" },
  { name: "Lisa M.", role: "Small Business Owner", text: "Best investment I made this year. The community is incredibly supportive.", color: "#f59e0b" },
];

export default function LandingPage() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && user) {
      setLocation("/dashboard");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) return null;

  return (
    <div className="min-h-screen bg-white text-foreground" style={{ fontFamily: "Inter, sans-serif" }}>

      {/* ── NAV ─────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xl" style={{ background: "#f59e0b" }}>
              🤖
            </div>
            <span className="font-extrabold text-base text-foreground">AI Academy 3.0</span>
          </div>
          {/* Links */}
          <div className="hidden md:flex items-center gap-6">
            <a href="#courses" className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">Courses</a>
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">Features</a>
            <a href="#testimonials" className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">Reviews</a>
          </div>
          {/* Auth buttons */}
          <div className="flex items-center gap-3">
            <Link href="/login">
              <button className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium px-3 py-2 rounded-lg hover:bg-muted">
                Sign In
              </button>
            </Link>
            <Link href="/signup">
              <button className="text-sm font-bold px-4 py-2 rounded-lg text-background transition-all hover:opacity-90 active:scale-95" style={{ background: "#f59e0b", color: "#0f172a" }}>
                Get Started Free
              </button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-14 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-7 border" style={{ background: "#fff8ed", borderColor: "#fde68a", color: "#92400e" }}>
          🎓 Join 1,000+ AI learners worldwide
        </div>

        {/* Headline */}
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

        {/* CTAs */}
        <div className="flex flex-wrap gap-3 justify-center mb-12">
          <Link href="/signup">
            <button className="px-7 py-3.5 rounded-xl font-bold text-base transition-all hover:opacity-90 active:scale-95 shadow-lg" style={{ background: "#0f172a", color: "#fff", boxShadow: "0 8px 24px rgba(15,23,42,0.18)" }}>
              Browse Free Courses →
            </button>
          </Link>
          <a href="#courses">
            <button className="px-7 py-3.5 rounded-xl font-semibold text-base border-2 border-border text-foreground hover:bg-muted transition-colors flex items-center gap-2">
              <span className="text-base">▶</span> See What We Teach
            </button>
          </a>
        </div>

        {/* Trust badges */}
        <div className="flex flex-wrap items-center justify-center gap-x-7 gap-y-2 text-sm text-muted-foreground">
          {[["✅", "Free to start"], ["📱", "Learn anywhere"], ["🏆", "Earn certificates"], ["💬", "Community support"]].map(([ic, t]) => (
            <span key={t} className="flex items-center gap-1.5">{ic} {t}</span>
          ))}
        </div>
      </section>

      {/* ── STATS STRIP ─────────────────────────────────────────────── */}
      <div className="border-y border-border bg-muted/30">
        <div className="max-w-6xl mx-auto px-6 py-7 flex flex-wrap justify-center gap-x-14 gap-y-4">
          {[["50+", "Courses Published"], ["1,000+", "Active Learners"], ["200+", "Video Lessons"], ["4.9/5", "Average Rating"]].map(([num, label]) => (
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
            <h2 className="text-3xl font-extrabold mb-1.5">Popular Courses</h2>
            <p className="text-muted-foreground text-sm">Hand-picked courses to get you AI-ready fast</p>
          </div>
          <Link href="/signup">
            <span className="text-sm font-semibold hover:underline" style={{ color: "#f59e0b" }}>See all courses →</span>
          </Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {COURSES.map((c) => (
            <div key={c.title} className="bg-white border border-border rounded-2xl p-5 hover:shadow-md transition-shadow flex flex-col gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ background: c.accent + "1a" }}>
                {c.emoji}
              </div>
              <div>
                <div className="font-bold text-sm mb-2 text-foreground">{c.title}</div>
                <div className="flex gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground">{c.level}</span>
                  <span className="text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground">📖 {c.lessons} lessons</span>
                </div>
              </div>
              <Link href="/signup">
                <button className="w-full py-2 rounded-lg text-white text-sm font-semibold transition-opacity hover:opacity-90" style={{ background: c.accent }}>
                  Enrol Free
                </button>
              </Link>
            </div>
          ))}
        </div>
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

      {/* ── TESTIMONIALS ────────────────────────────────────────────── */}
      <section id="testimonials" className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-extrabold mb-2">What Our Learners Say</h2>
          <p className="text-muted-foreground text-sm">Real people, real results.</p>
        </div>
        <div className="grid sm:grid-cols-3 gap-5">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="bg-white border border-border rounded-2xl p-6 flex flex-col gap-4">
              <div className="flex gap-0.5" style={{ color: "#f59e0b" }}>
                {Array(5).fill(0).map((_, i) => <span key={i} className="text-lg">★</span>)}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed flex-1">"{t.text}"</p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ background: t.color }}>
                  {t.name[0]}
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── QUOTE + CTA BANNER ──────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pb-16">
        <div className="rounded-3xl overflow-hidden grid md:grid-cols-2" style={{ background: "#0f172a" }}>
          {/* Left — quote */}
          <div className="p-10 flex flex-col justify-center">
            <div className="text-4xl mb-4 leading-none" style={{ color: "#f59e0b" }}>"</div>
            <p className="text-lg font-medium leading-relaxed mb-6" style={{ color: "#e2e8f0" }}>
              The best investment you can make is in yourself. Knowledge is the one asset that can't be taken away.
            </p>
            <div className="flex items-center gap-3">
              <div className="flex">
                {["#6366f1", "#10b981", "#f59e0b", "#ec4899"].map((c, i) => (
                  <div key={i} className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold border-2" style={{ background: c, borderColor: "#0f172a", marginLeft: i ? -8 : 0 }}>
                    {["A", "B", "C", "D"][i]}
                  </div>
                ))}
              </div>
              <span className="text-sm" style={{ color: "#64748b" }}>1,000+ learners growing daily</span>
            </div>
          </div>
          {/* Right — CTA */}
          <div className="p-10 flex flex-col justify-center items-center text-center border-l" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <h3 className="text-2xl font-extrabold mb-2" style={{ color: "#f8fafc" }}>Ready to join them?</h3>
            <p className="text-sm mb-6" style={{ color: "#64748b" }}>Create your free account and start your AI journey today.</p>
            <Link href="/signup">
              <button className="px-8 py-3 rounded-xl font-bold text-sm transition-all hover:opacity-90 active:scale-95 mb-3" style={{ background: "#f59e0b", color: "#0f172a" }}>
                Create Free Account
              </button>
            </Link>
            <span className="text-xs" style={{ color: "#475569" }}>No credit card required · Cancel anytime</span>
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
            <Link href="/login"><span className="text-xs text-muted-foreground hover:text-foreground transition-colors">Sign In</span></Link>
            <Link href="/signup"><span className="text-xs text-muted-foreground hover:text-foreground transition-colors">Sign Up</span></Link>
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
