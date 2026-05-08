import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Globe, Users2, Search, UserCheck, ExternalLink, Crown } from "lucide-react";

const API = "/api";
function authH(token: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}
function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

type DirectoryCommunity = {
  id: number;
  name: string;
  description: string | null;
  owner_id: number;
  invite_code: string | null;
  member_count: number;
  is_owner: boolean;
  owner: { id: number; name: string; avatar: string | null } | null;
};

export default function CommunitiesDirectoryPage() {
  const { token, user } = useAuth();
  const [, navigate] = useLocation();
  const [communities, setCommunities] = useState<DirectoryCommunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetch(`${API}/communities/directory`, { headers: authH(token) })
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then((d: DirectoryCommunity[]) => setCommunities(d))
      .catch(() => setCommunities([]))
      .finally(() => setLoading(false));
  }, [token]);

  const filtered = communities.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.description ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (c.owner?.name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              <h1 className="text-2xl font-bold">Communities</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Browse all approved communities and request to join.
            </p>
          </div>
          {user?.role === "admin" || user?.role === "creator" ? (
            <Button variant="outline" size="sm" onClick={() => navigate("/create-community")}>
              <Users2 className="w-4 h-4 mr-1.5" />
              Create Community
            </Button>
          ) : null}
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search communities…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl border bg-card p-5 space-y-3">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-9 w-full rounded-lg" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
              <Globe className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="font-semibold text-lg">
              {search ? "No communities found" : "No communities yet"}
            </p>
            <p className="text-sm text-muted-foreground">
              {search ? "Try a different search term." : "Be the first to create a community!"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(c => (
              <CommunityCard
                key={c.id}
                community={c}
                onJoin={() => {
                  if (c.invite_code) navigate(`/community/join/${c.invite_code}`);
                }}
                onOpen={() => navigate(`/community/${c.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

function CommunityCard({
  community: c,
  onJoin,
  onOpen,
}: {
  community: DirectoryCommunity;
  onJoin: () => void;
  onOpen: () => void;
}) {
  return (
    <div className="rounded-2xl border bg-card hover:border-primary/40 transition-all duration-200 hover:shadow-md flex flex-col overflow-hidden group">
      {/* Top gradient bar */}
      <div className="h-1.5 bg-gradient-to-r from-primary via-primary/70 to-primary/30" />

      <div className="p-5 flex flex-col flex-1 gap-4">
        {/* Name + owner badge */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Users2 className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm leading-tight truncate">{c.name}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                <Users2 className="w-3 h-3" />
                {c.member_count} {c.member_count === 1 ? "member" : "members"}
              </p>
            </div>
          </div>
          {c.is_owner && (
            <Badge variant="outline" className="flex-shrink-0 text-[10px] border-amber-400/40 text-amber-500 bg-amber-400/5 gap-1">
              <Crown className="w-2.5 h-2.5" /> Owner
            </Badge>
          )}
        </div>

        {/* Description */}
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 flex-1">
          {c.description || "No description provided."}
        </p>

        {/* Owner */}
        {c.owner && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Avatar className="w-5 h-5">
              <AvatarImage src={c.owner.avatar ?? undefined} />
              <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                {initials(c.owner.name)}
              </AvatarFallback>
            </Avatar>
            <span>by <span className="font-medium text-foreground">{c.owner.name}</span></span>
          </div>
        )}

        {/* Action button */}
        <div className="pt-1">
          {c.is_owner ? (
            <Button size="sm" className="w-full" onClick={onOpen}>
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
              Open Dashboard
            </Button>
          ) : c.invite_code ? (
            <Button size="sm" variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all" onClick={onJoin}>
              <UserCheck className="w-3.5 h-3.5 mr-1.5" />
              Request to Join
            </Button>
          ) : (
            <Button size="sm" variant="ghost" className="w-full" disabled>
              Not accepting members
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
