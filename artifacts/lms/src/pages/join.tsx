import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Copy, CheckCheck, GraduationCap, Users, BookOpen, Wrench, LogIn, UserPlus } from "lucide-react";

export default function JoinPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (user) navigate("/dashboard");
  }, [user, navigate]);

  const inviteUrl = typeof window !== "undefined"
    ? `${window.location.origin}/join`
    : "/join";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      toast({ title: "Invite link copied!" });
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(222,47%,8%)] via-[hsl(222,47%,11%)] to-[hsl(258,50%,15%)] flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-10">
        <div className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center shadow-lg">
          <GraduationCap className="w-6 h-6 text-white" />
        </div>
        <span className="text-white font-bold text-xl tracking-tight">AI Academy 3.0</span>
      </div>

      {/* Hero card */}
      <div className="w-full max-w-md bg-white/5 border border-white/10 backdrop-blur-sm rounded-2xl p-8 space-y-6 shadow-2xl">
        <div className="text-center space-y-2">
          <Badge className="bg-primary/20 text-primary border-primary/30 text-xs font-semibold">Platform Invite</Badge>
          <h1 className="text-2xl font-bold text-white mt-3">Join AI Academy 3.0</h1>
          <p className="text-sm text-white/60 leading-relaxed">
            You've been invited to join the platform. Sign up to access courses, AI tools, communities, and more.
          </p>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap gap-2 justify-center">
          {[
            { icon: BookOpen, label: "Courses" },
            { icon: Wrench, label: "AI Tools" },
            { icon: Users, label: "Communities" },
          ].map(({ icon: Icon, label }) => (
            <span key={label} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white/70 text-xs font-medium">
              <Icon className="w-3.5 h-3.5" /> {label}
            </span>
          ))}
        </div>

        {/* Invite URL display */}
        <div className="space-y-2">
          <p className="text-xs text-white/40 font-medium uppercase tracking-wider">Your invite link</p>
          <div className="flex items-center gap-2 bg-white/10 border border-white/10 rounded-xl px-3 py-2">
            <span className="flex-1 text-xs text-white/70 font-mono truncate">{inviteUrl}</span>
            <button
              onClick={copy}
              className="flex-shrink-0 p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/60 hover:text-white"
              title="Copy invite link"
            >
              {copied ? <CheckCheck className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* CTA buttons */}
        <div className="flex flex-col gap-3 pt-1">
          <Button
            className="w-full bg-primary hover:bg-primary/90 text-white font-semibold h-11"
            onClick={() => navigate("/signup")}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Create an account
          </Button>
          <Button
            variant="outline"
            className="w-full border-white/20 text-white hover:bg-white/10 hover:text-white bg-transparent font-medium h-11"
            onClick={() => navigate("/login")}
          >
            <LogIn className="w-4 h-4 mr-2" />
            I already have an account
          </Button>
        </div>
      </div>

      <p className="mt-8 text-xs text-white/30 text-center">
        By signing up you agree to our Terms of Service and Privacy Policy.
      </p>
    </div>
  );
}
