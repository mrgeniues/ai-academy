import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { GraduationCap, Clock, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLogout } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

export default function WaitingApprovalPage() {
  const { user, isLoading, logout } = useAuth();
  const [, setLocation] = useLocation();
  const logoutMutation = useLogout();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
    }
    if (!isLoading && user && (user as Record<string, unknown>).isApproved === true) {
      setLocation("/dashboard");
    }
  }, [user, isLoading, setLocation]);

  const handleLogout = async () => {
    try { await logoutMutation.mutateAsync({}); } catch {}
    queryClient.clear();
    logout();
  };

  if (isLoading || !user) return null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-8">
      <div className="w-full max-w-md text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-6">
          <GraduationCap className="w-9 h-9 text-white" />
        </div>

        <h1 className="text-2xl font-bold mb-2">AI Academy 2.0</h1>

        <div className="mt-8 p-6 rounded-2xl border border-border bg-card">
          <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-4">
            <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>

          <h2 className="text-xl font-semibold mb-3">Waiting for approval</h2>

          <p className="text-muted-foreground text-sm leading-relaxed mb-2">
            Your account has been created successfully. An admin will review and approve your account shortly.
          </p>

          <p className="text-muted-foreground text-sm">
            Signed in as <span className="font-medium text-foreground">{user.email}</span>
          </p>
        </div>

        <Button
          variant="ghost"
          className="mt-6 text-muted-foreground"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign out
        </Button>
      </div>
    </div>
  );
}
