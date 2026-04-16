import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Wrench, Clock } from "lucide-react";

type MaintenanceSettings = {
  isActive: boolean;
  startTime: string | null;
  endTime: string | null;
  description: string | null;
};

export default function MaintenancePage() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [settings, setSettings] = useState<MaintenanceSettings | null>(null);

  useEffect(() => {
    fetch("/api/maintenance")
      .then(r => r.json())
      .then((data: MaintenanceSettings) => setSettings(data))
      .catch(() => setSettings(null));
  }, []);

  // Once auth loads, if admin redirect back to dashboard
  useEffect(() => {
    if (!isLoading && user?.role === "admin") {
      setLocation("/dashboard");
    }
  }, [user, isLoading, setLocation]);

  const formatDate = (iso: string | null) => {
    if (!iso) return null;
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <Wrench className="w-10 h-10 text-primary" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Website is under maintenance</h1>
          <p className="text-muted-foreground text-base leading-relaxed">
            {settings?.description
              ? settings.description
              : "We're making some improvements. Please check back soon."}
          </p>
        </div>

        {(settings?.startTime || settings?.endTime) && (
          <div className="bg-muted rounded-lg p-4 space-y-2 text-sm text-muted-foreground">
            {settings.startTime && (
              <div className="flex items-center justify-center gap-2">
                <Clock className="w-4 h-4" />
                <span>Started: {formatDate(settings.startTime)}</span>
              </div>
            )}
            {settings.endTime && (
              <div className="flex items-center justify-center gap-2">
                <Clock className="w-4 h-4" />
                <span>Expected back: {formatDate(settings.endTime)}</span>
              </div>
            )}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          If you have an urgent matter, please contact support.
        </p>
      </div>
    </div>
  );
}
