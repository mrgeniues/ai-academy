import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { GraduationCap, Eye, EyeOff } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const { user, login, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const loginMutation = useLogin();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!isLoading && user) {
      setLocation("/dashboard");
    }
  }, [user, isLoading, setLocation]);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: FormData) => {
    try {
      const response = await loginMutation.mutateAsync({ data });
      login(response.token);
    } catch (err: unknown) {
      const error = err as { data?: { error?: string }; message?: string };
      toast({
        title: "Login failed",
        description: error?.data?.error || error?.message || "Invalid email or password",
        variant: "destructive",
      });
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
          <span className="font-bold text-xl text-white">AI Academy 2.0</span>
        </div>

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
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg">AI Academy 2.0</span>
          </div>

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
                    <FormLabel>Password</FormLabel>
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
        </div>
      </div>
    </div>
  );
}
