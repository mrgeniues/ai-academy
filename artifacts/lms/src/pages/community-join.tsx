import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Clock, XCircle, Users2, AlertTriangle, Loader2, UserCheck } from "lucide-react";

const API = "/api";
function authH(token: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}
function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

type CommunityInfo = {
  id: number;
  name: string;
  description: string | null;
  owner_id: number;
  isOwner: boolean;
  memberStatus: "pending" | "approved" | "rejected" | null;
  users: { id: number; name: string; avatar: string | null } | null;
};

export default function CommunityJoinPage() {
  const [, params] = useRoute("/community/join/:code");
  const code = params?.code ?? "";
  const { token } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const [community, setCommunity] = useState<CommunityInfo | null>(null);
  const [loading, setLoading]     = useState(true);
  const [notFound, setNotFound]   = useState(false);
  const [joining, setJoining]     = useState(false);

  // Unauthenticated: redirect to signup/login with invite code preserved
  useEffect(() => {
    if (!code) return;
    if (!token) {
      navigate(`/signup?invite=${encodeURIComponent(code)}`);
    }
  }, [code, token, navigate]);

  useEffect(() => {
    if (!code || !token) return;
    setLoading(true);
    fetch(`${API}/communities/join/${encodeURIComponent(code)}`, { headers: authH(token) })
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then((d: CommunityInfo) => setCommunity(d))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [code, token]);

  const handleJoin = async () => {
    if (!community) return;
    setJoining(true);
    try {
      const res = await fetch(`${API}/communities/${community.id}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authH(token) },
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) {
        toast({ title: data.error ?? "Could not send join request", variant: "destructive" });
        return;
      }
      toast({ title: "Join request sent!", description: "The community owner will review your request." });
      // Refresh community status
      setCommunity(c => c ? { ...c, memberStatus: "pending" } : c);
    } catch {
      toast({ title: "Network error. Please try again.", variant: "destructive" });
    } finally {
      setJoining(false);
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Layout>
        <div className="p-6 max-w-lg mx-auto space-y-4 mt-10">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      </Layout>
    );
  }

  // ── Not found ──────────────────────────────────────────────────────────────
  if (notFound || !community) {
    return (
      <Layout>
        <div className="p-6 max-w-lg mx-auto mt-16 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-bold">Invite Link Invalid</h1>
          <p className="text-sm text-muted-foreground">
            This invite link is invalid, expired, or the community is no longer active.
          </p>
          <Button onClick={() => navigate("/dashboard")}>Go to Dashboard</Button>
        </div>
      </Layout>
    );
  }

  // ── Owner cannot join their own community ──────────────────────────────────
  if (community.isOwner) {
    return (
      <Layout>
        <div className="p-6 max-w-lg mx-auto mt-16 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Users2 className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-xl font-bold">{community.name}</h1>
          <p className="text-sm text-muted-foreground">You are the owner of this community.</p>
          <Button onClick={() => navigate(`/community-dashboard/${community.id}`)}>Open Dashboard</Button>
        </div>
      </Layout>
    );
  }

  // ── Status-based UI ────────────────────────────────────────────────────────
  const statusUI = () => {
    if (community.memberStatus === "approved") {
      return (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <CheckCircle className="w-10 h-10 text-green-500" />
          <p className="font-semibold text-green-700 dark:text-green-400">You're already a member!</p>
          <Button onClick={() => navigate(`/community/${community.id}`)}>Enter Community</Button>
        </div>
      );
    }
    if (community.memberStatus === "pending") {
      return (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <Clock className="w-10 h-10 text-yellow-500" />
          <p className="font-semibold text-yellow-700 dark:text-yellow-400">Your join request is pending approval.</p>
          <p className="text-xs text-muted-foreground">The community owner will review your request soon.</p>
        </div>
      );
    }
    if (community.memberStatus === "rejected") {
      return (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <XCircle className="w-10 h-10 text-red-500" />
          <p className="font-semibold text-red-700 dark:text-red-400">Your join request was rejected.</p>
          <p className="text-xs text-muted-foreground">Please contact the community owner if you think this was a mistake.</p>
        </div>
      );
    }
    // Not yet requested
    return (
      <Button className="w-full" onClick={handleJoin} disabled={joining}>
        {joining ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserCheck className="w-4 h-4 mr-2" />}
        Request to Join
      </Button>
    );
  };

  return (
    <Layout>
      <div className="p-6 max-w-lg mx-auto mt-10 space-y-4">
        <Card className="overflow-hidden">
          {/* Community header */}
          <div className="p-6 bg-gradient-to-r from-primary/10 to-primary/5 border-b">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                <Users2 className="w-7 h-7 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold">{community.name}</h1>
                {community.description && (
                  <p className="text-sm text-muted-foreground mt-1">{community.description}</p>
                )}
                {community.users && (
                  <div className="flex items-center gap-2 mt-2">
                    <Avatar className="w-5 h-5">
                      <AvatarImage src={community.users.avatar ?? undefined} />
                      <AvatarFallback className="text-[9px]">{initials(community.users.name)}</AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-muted-foreground">Owned by {community.users.name}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground text-center mb-4">
              You've been invited to join this community. Submit a join request and the owner will approve you.
            </p>
            {statusUI()}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
