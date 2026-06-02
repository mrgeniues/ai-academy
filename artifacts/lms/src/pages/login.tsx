import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Link, useLocation } from "wouter";
import { GraduationCap, Eye, EyeOff, ArrowLeft, CheckCircle, XCircle, Database } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

const forgotSchema = z.object({
  email: z.string().email("Please enter a valid email"),
});

type FormData = z.infer<typeof schema>;
type ForgotData = z.infer<typeof forgotSchema>;

export default function LoginPage() {
  const { user, login, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const loginMutation = useLogin();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [view, setView] = useState<"login" | "forgot" | "sent" | "blocked">("login");
  const [isSending, setIsSending] = useState(false);
  const [blockedReason, setBlockedReason] = useState<string | null>(null);

  // Supabase configuration dialog state
  const [dbDialogOpen, setDbDialogOpen] = useState(false);
  const [dbUrl, setDbUrl] = useState("");
  const [dbServiceKey, setDbServiceKey] = useState("");
  const [dbSaving, setDbSaving] = useState(false);
  const [dbCurrentUrl, setDbCurrentUrl] = useState("");

  useEffect(() => {
    if (!isLoading && user) {
      setLocation("/dashboard");
    }
  }, [user, isLoading, setLocation]);

  useEffect(() => {
    fetch("/api/settings/supabase")
      .then(r => r.ok ? r.json() : null)
      .then((data: { url?: string } | null) => {
        if (data?.url) setDbCurrentUrl(data.url);
      })
      .catch(() => {});
  }, []);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const forgotForm = useForm<ForgotData>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: FormData) => {
    try {
      const response = await loginMutation.mutateAsync({ data });
      login(response.token);
    } catch (err: unknown) {
      const error = err as { data?: { error?: string; blocked?: boolean; rejectionReason?: string | null }; message?: string; status?: number };
      if (error?.data?.blocked) {
        setBlockedReason(error.data.rejectionReason ?? null);
        setView("blocked");
        return;
      }
      toast({
        title: "Login failed",
        description: error?.data?.error || error?.message || "Invalid email or password",
        variant: "destructive",
      });
    }
  };

  const onForgotSubmit = async (data: ForgotData) => {
    setIsSending(true);
    try {
      const resp = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error || "Failed to send reset email");
      }
      setView("sent");
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast({
        title: "Error",
        description: e?.message || "Failed to send reset email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleOpenDbDialog = () => {
    setDbUrl(dbCurrentUrl);
    setDbServiceKey("");
    setDbDialogOpen(true);
  };

  const handleSaveDbConfig = async () => {
    setDbSaving(true);
    try {
      const resp = await fetch("/api/settings/supabase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: dbUrl, serviceRoleKey: dbServiceKey }),
      });
      const data = await resp.json() as { url?: string; error?: string };
      if (!resp.ok) throw new Error(data.error ?? "Failed to save");
      setDbCurrentUrl(data.url ?? dbUrl);
      setDbServiceKey("");
      setDbDialogOpen(false);
      toast({
        title: "Database connected",
        description: "The server is now connected to your Supabase project. You can sign in now.",
      });
    } catch (err) {
      toast({
        title: "Connection failed",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setDbSaving(false);
    }
  };

  if (isLoading) return null;

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-sidebar p-12">
        <Link href="/">
          <div className="flex items-center gap-3 cursor-pointer">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl text-white">AI Academy 3.0</span>
          </div>
        </Link>

        <div>
          <blockquote className="text-2xl font-medium leading-relaxed text-white/90 mb-6">
            "The best investment you can make is in yourself. Knowledge is the one asset that can't be taken away."
          </blockquote>
          <div className="flex items-center gap-4">
            <div className="flex -space-x-2">
              {["A", "B", "C"].map((l, i) => (
                <div key={i} className="w-9 h-9 rounded-full bg-primary/30 border-2 border-sidebar flex items-center justify-center text-xs font-bold text-white">
                  {l}
                </div>
              ))}
            </div>
            <p className="text-white/70 text-sm">Join 1,000+ learners growing their skills</p>
          </div>
        </div>

        <div className="flex gap-4">
          {[
            { label: "Courses", value: "50+" },
            { label: "Members", value: "1K+" },
            { label: "Lessons", value: "200+" },
          ].map(stat => (
            <div key={stat.label} className="bg-white/10 rounded-xl px-5 py-4">
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-sm text-white/60 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <Link href="/">
            <div className="flex items-center gap-2 mb-8 lg:hidden cursor-pointer">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg">AI Academy 3.0</span>
            </div>
          </Link>

          {/* ── LOGIN VIEW ── */}
          {view === "login" && (
            <>
              <h1 className="text-2xl font-bold mb-1">Welcome back</h1>
              <p className="text-muted-foreground text-sm mb-8">Sign in to continue your learning journey</p>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            data-testid="input-email"
                            type="email"
                            placeholder="you@example.com"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel>Password</FormLabel>
                          <button
                            type="button"
                            onClick={() => setView("forgot")}
                            className="text-xs text-primary hover:underline"
                          >
                            Forgot password?
                          </button>
                        </div>
                        <FormControl>
                          <div className="relative">
                            <Input
                              data-testid="input-password"
                              type={showPassword ? "text" : "password"}
                              placeholder="••••••••"
                              {...field}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    data-testid="button-login"
                    type="submit"
                    className="w-full"
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? "Signing in..." : "Sign in"}
                  </Button>
                </form>
              </Form>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link href="/signup" className="text-primary font-medium hover:underline" data-testid="link-signup">
                  Sign up
                </Link>
              </p>

            </>
          )}

          {/* ── FORGOT PASSWORD VIEW ── */}
          {view === "forgot" && (
            <>
              <button
                onClick={() => setView("login")}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
              >
                <ArrowLeft className="w-4 h-4" /> Back to login
              </button>

              <h1 className="text-2xl font-bold mb-1">Forgot your password?</h1>
              <p className="text-muted-foreground text-sm mb-8">
                Enter your email and we'll send you a reset link.
              </p>

              <Form {...forgotForm}>
                <form onSubmit={forgotForm.handleSubmit(onForgotSubmit)} className="space-y-4">
                  <FormField
                    control={forgotForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="you@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full" disabled={isSending}>
                    {isSending ? "Sending..." : "Send Reset Link"}
                  </Button>
                </form>
              </Form>
            </>
          )}

          {/* ── EMAIL SENT VIEW ── */}
          {view === "sent" && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Check your email</h1>
              <p className="text-muted-foreground text-sm mb-6">
                We sent a password reset link to your email address. Click the link to set a new password.
              </p>
              <button
                onClick={() => setView("login")}
                className="text-sm text-primary hover:underline"
              >
                Back to login
              </button>
            </div>
          )}

          {/* ── BLOCKED / REJECTED VIEW ── */}
          {view === "blocked" && (
            <div>
              <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-5">
                <XCircle className="w-7 h-7 text-red-600 dark:text-red-400" />
              </div>
              <h1 className="text-2xl font-bold mb-2 text-center">Account not approved</h1>

              {blockedReason ? (
                <div className="mt-4 p-4 rounded-lg bg-muted border border-border text-sm">
                  <p className="font-medium text-foreground mb-1">Reason from admin:</p>
                  <p className="text-muted-foreground leading-relaxed">{blockedReason}</p>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm text-center mt-3 leading-relaxed">
                  Your account request was not approved. Please contact support if you believe this is a mistake.
                </p>
              )}

              <button
                onClick={() => setView("login")}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mt-6 mx-auto"
              >
                <ArrowLeft className="w-4 h-4" /> Back to login
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── SUPABASE CONFIGURATION DIALOG ── */}
      <Dialog open={dbDialogOpen} onOpenChange={setDbDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="w-4 h-4" /> Database Configuration
            </DialogTitle>
            <DialogDescription>
              Connect to your Supabase project. The connection is tested before saving — your current setup is not changed until the test passes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="db-url">Project URL</Label>
              <Input
                id="db-url"
                type="url"
                placeholder="https://xxxxxxxxxxxxxxxxxxxx.supabase.co"
                value={dbUrl}
                onChange={e => setDbUrl(e.target.value)}
                disabled={dbSaving}
                data-testid="input-db-url"
              />
              <p className="text-xs text-muted-foreground">
                Supabase Dashboard → Settings → API → <strong>Project URL</strong>
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="db-key">Service Role Key</Label>
              <Input
                id="db-key"
                type="password"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…"
                value={dbServiceKey}
                onChange={e => setDbServiceKey(e.target.value)}
                disabled={dbSaving}
                data-testid="input-db-service-key"
              />
              <p className="text-xs text-muted-foreground">
                Supabase Dashboard → Settings → API → <strong>service_role</strong> secret key
              </p>
            </div>

            <div className="rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-3 py-2.5 text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
              <strong>Where to find these?</strong> Open your Supabase project → click <strong>Settings</strong> (gear icon) → <strong>API</strong>. Copy the <em>Project URL</em> and the <em>service_role</em> key (under "Project API keys").
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDbDialogOpen(false)}
              disabled={dbSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleSaveDbConfig()}
              disabled={dbSaving || !dbUrl.trim() || !dbServiceKey.trim()}
              data-testid="button-save-db-config"
            >
              {dbSaving ? (
                <><span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin mr-2" />Testing…</>
              ) : "Save & Connect"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
