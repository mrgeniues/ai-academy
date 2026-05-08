import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { GraduationCap, Eye, EyeOff, CheckCircle, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type FormData = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [done, setDone] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [tokenChecked, setTokenChecked] = useState(false);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenError, setTokenError] = useState("Invalid reset link. Please request a new one.");

  const token = new URLSearchParams(window.location.search).get("token");

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  useEffect(() => {
    if (!token) {
      setTokenError("No reset token found. Please request a new password reset link.");
      setTokenValid(false);
      setTokenChecked(true);
      return;
    }

    fetch(`/api/auth/verify-reset-token?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then((data: { valid: boolean; reason?: string }) => {
        setTokenValid(data.valid);
        if (!data.valid) setTokenError(data.reason ?? "Invalid reset link. Please request a new one.");
      })
      .catch(() => {
        setTokenValid(false);
        setTokenError("Could not verify reset link. Please try again.");
      })
      .finally(() => setTokenChecked(true));
  }, [token]);

  const onSubmit = async (data: FormData) => {
    if (!token) return;
    setIsLoading(true);
    try {
      const resp = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: data.password }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error || "Failed to update password. Please request a new reset link.");
      }
      setDone(true);
      setTimeout(() => setLocation("/login"), 3000);
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast({
        title: "Error",
        description: e?.message || "Failed to update password. Please request a new reset link.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-sidebar p-12">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center overflow-hidden">
            <img src="/logo.png" className="w-7 h-7 object-contain" alt="AI Academy" />
          </div>
          <span className="font-bold text-xl text-white">AI Academy 3.0</span>
        </div>
        <div>
          <h2 className="text-3xl font-bold text-white mb-4">Reset your password</h2>
          <p className="text-white/70 text-lg">Choose a strong password to keep your account secure.</p>
        </div>
        <div />
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center overflow-hidden">
              <img src="/logo.png" className="w-6 h-6 object-contain" alt="AI Academy" />
            </div>
            <span className="font-bold text-lg">AI Academy 3.0</span>
          </div>

          {/* Checking token */}
          {!tokenChecked && (
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground text-sm">Verifying reset link...</p>
            </div>
          )}

          {/* Success */}
          {tokenChecked && done && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Password updated!</h1>
              <p className="text-muted-foreground text-sm">
                Your password has been updated successfully. Redirecting to login...
              </p>
            </div>
          )}

          {/* Invalid / expired token */}
          {tokenChecked && !tokenValid && !done && (
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-2">Link invalid or expired</h1>
              <p className="text-muted-foreground text-sm mb-6">{tokenError}</p>
              <Button className="w-full" onClick={() => setLocation("/login")}>
                Back to Login
              </Button>
            </div>
          )}

          {/* Reset form */}
          {tokenChecked && tokenValid && !done && (
            <>
              <h1 className="text-2xl font-bold mb-1">Set new password</h1>
              <p className="text-muted-foreground text-sm mb-8">Enter your new password below.</p>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
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

                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showConfirm ? "text" : "password"}
                              placeholder="••••••••"
                              {...field}
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirm(!showConfirm)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Updating..." : "Update Password"}
                  </Button>
                </form>
              </Form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
