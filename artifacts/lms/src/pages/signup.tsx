import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/lib/auth";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { GraduationCap, Eye, EyeOff, Users2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z
    .string()
    .email("Please enter a valid email")
    .refine(v => v.toLowerCase().endsWith("@gmail.com"), {
      message: "Only Gmail accounts are allowed (@gmail.com)",
    }),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type FormData = z.infer<typeof schema>;

export default function SignupPage() {
  const { user, login, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Read invite code from ?invite= query param
  const inviteCode = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("invite") ?? ""
    : "";

  useEffect(() => {
    if (!isLoading && user) {
      // If they landed here via invite link, send them back to join page
      if (inviteCode) {
        setLocation(`/community/join/${encodeURIComponent(inviteCode)}`);
      } else {
        setLocation("/dashboard");
      }
    }
  }, [user, isLoading, setLocation, inviteCode]);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", password: "" },
  });

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    try {
      // Call API directly so we can include invite_code
      const body: Record<string, string> = { email: data.email, password: data.password, name: data.name };
      if (inviteCode) body["invite_code"] = inviteCode;

      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json() as { token?: string; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to create account");

      // Tag user as community-member if they signed up via an invite link
      if (inviteCode) {
        localStorage.setItem("lms_join_source", "community");
      }
      login(json.token!);
      // redirect handled by useEffect above
    } catch (err: unknown) {
      const error = err as { message?: string };
      toast({
        title: "Sign up failed",
        description: error?.message || "Failed to create account",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) return null;

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-sidebar p-12">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl text-white">AI Academy 3.0</span>
        </div>

        <div>
          <h2 className="text-3xl font-bold text-white mb-4">Start learning today</h2>
          <p className="text-white/70 text-lg leading-relaxed mb-8">
            Join our community of learners and unlock access to high-quality courses taught by experts.
          </p>
          <ul className="space-y-3">
            {[
              "Access 50+ professional courses",
              "Connect with a growing community",
              "Track your progress and achievements",
              "Learn at your own pace",
            ].map(item => (
              <li key={item} className="flex items-center gap-3 text-white/80">
                <div className="w-5 h-5 rounded-full bg-primary/30 flex items-center justify-center flex-shrink-0">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                </div>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-white/40 text-sm">Free to join. No credit card required.</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg">AI Academy 3.0</span>
          </div>

          <h1 className="text-2xl font-bold mb-1">Create your account</h1>
          <p className="text-muted-foreground text-sm mb-8">
            {inviteCode ? "Create an account to join the community" : "Join the community and start learning"}
          </p>

          {/* Invite code banner */}
          {inviteCode && (
            <div className="flex items-center gap-2 mb-6 p-3 rounded-xl bg-primary/5 border border-primary/20 text-sm">
              <Users2 className="w-4 h-4 text-primary shrink-0" />
              <span className="text-primary font-medium">You've been invited to join a community. Sign up to continue.</span>
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full name</FormLabel>
                    <FormControl>
                      <Input data-testid="input-name" placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input data-testid="input-email" type="email" placeholder="you@example.com" {...field} />
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
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          data-testid="input-password"
                          type={showPassword ? "text" : "password"}
                          placeholder="At least 6 characters"
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
                data-testid="button-signup"
                type="submit"
                className="w-full"
                disabled={submitting}
              >
                {submitting ? "Creating account..." : "Create account"}
              </Button>
            </form>
          </Form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary font-medium hover:underline" data-testid="link-login">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
