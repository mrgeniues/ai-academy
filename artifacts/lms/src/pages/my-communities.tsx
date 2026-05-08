import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BookmarkCheck, Users2, Crown, ExternalLink, Globe } from "lucide-react";

const API = "/api";
function authH(t: string | null): Record<string, string> {
  return t ? { Authorization: `Bearer ${t}` } : {};
}

type MyCommunity = {
  id: number;
  name: string;
  description: string | null;
  owner_id: number;
  invite_code: string | null;
  is_owner: boolean;
  owner: { id: number; name: string; avatar: string | null } | null;
};

export default function MyCommunitiesPage() {
  const { token } = useAuth();
  const [, navigate] = useLocation();
  const [communities, setCommunities] = useState<MyCommunity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetch(`${API}/communities/my`, { headers: authH(token) })
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then((d: MyCommunity[]) => setCommunities(d))
      .catch(() => setCommunities([]))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <Layout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <BookmarkCheck className="w-5 h-5 text-primary" />
            <h1 className="text-2xl font-bold">My Communities</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Communities you own or have been approved to join.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl border bg-card p-5 space-y-3">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-9 w-full rounded-lg" />
              </div>
            ))}
          </div>
        ) : communities.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
              <BookmarkCheck className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold text-lg">No communities yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Browse the directory to find a community and request to join.
              </p>
            </div>
            <Button variant="outline" onClick={() => navigate("/communities")}>
              <Globe className="w-4 h-4 mr-2" />
              Browse Communities
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {communities.map(c => (
              <div
                key={c.id}
                className="rounded-2xl border bg-card hover:border-primary/40 transition-all duration-200 hover:shadow-md flex flex-col overflow-hidden group"
              >
                <div className="h-1.5 bg-gradient-to-r from-primary via-primary/70 to-primary/30" />
                <div className="p-5 flex flex-col gap-4">
                  {/* Name + badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Users2 className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{c.name}</p>
                        {c.owner && (
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            by <span className="font-medium text-foreground">{c.owner.name}</span>
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={`flex-shrink-0 text-[10px] gap-1 ${
                        c.is_owner
                          ? "border-amber-400/40 text-amber-500 bg-amber-400/5"
                          : "border-green-400/40 text-green-600 bg-green-400/5"
                      }`}
                    >
                      {c.is_owner
                        ? <><Crown className="w-2.5 h-2.5" /> Owner</>
                        : <><BookmarkCheck className="w-2.5 h-2.5" /> Member</>
                      }
                    </Badge>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 flex-1">
                    {c.description || "No description provided."}
                  </p>

                  {/* Open button */}
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => navigate(c.is_owner ? `/community-dashboard/${c.id}` : `/community/${c.id}`)}
                  >
                    <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                    {c.is_owner ? "Open Dashboard" : "Enter Community"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
