import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { GraduationCap, Clock, LogOut, XCircle } from "lucide-react";
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

  const isBlocked = (user as Record<string, unknown>).isBlocked === true;
  const rejectionReason = (user as Record<string, unknown>).rejectionReason as string | null | undefined;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-8">
      <div className="w-full max-w-md text-center">
        <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center mx-auto mb-6 overflow-hidden shadow-sm">
          <img src="/logo.png" className="w-12 h-12 object-contain" alt="AI Academy" />
        </div>

        <h1 className="text-2xl font-bold mb-2">AI Academy 3.0</h1>

        {isBlocked ? (
          <div className="mt-8 p-6 rounded-2xl border border-destructive/30 bg-destructive/5">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>

            <h2 className="text-xl font-semibold mb-3 text-destructive">Account not approved</h2>

            {rejectionReason ? (
              <div className="mb-3 p-3 rounded-lg bg-muted text-sm text-left">
                <p className="font-medium text-foreground mb-1">Reason:</p>
                <p className="text-muted-foreground leading-relaxed">{rejectionReason}</p>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm leading-relaxed mb-2">
                Your account request was not approved. Please contact support if you believe this is a mistake.
              </p>
            )}

            <p className="text-muted-foreground text-sm">
              Signed in as <span className="font-medium text-foreground">{user.email}</span>
            </p>
          </div>
        ) : (
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
        )}

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
