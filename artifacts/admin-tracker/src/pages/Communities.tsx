import { useEffect, useState, useCallback } from "react";
import { apiGet, apiPatch } from "@/lib/auth";
import { relativeTime } from "@/lib/utils";

type Community = {
  id: number;
  name: string;
  description: string | null;
  status: string;
  plan_id: number | null;
  created_at: string;
  owner: { id: number; name: string; email: string } | null;
  member_count: number;
  plans: { id: number; name: string; price: number } | null;
};

const STATUS_COLORS: Record<string, string> = {
  pending:  "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  approved: "bg-green-500/20 text-green-400 border-green-500/30",
  rejected: "bg-red-500/20 text-red-400 border-red-500/30",
};

export default function Communities() {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [actioning, setActioning]     = useState<number | null>(null);
  const [error, setError]             = useState<string | null>(null);

  const fetchCommunities = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<Community[]>("/communities/all");
      setCommunities(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchCommunities(); }, [fetchCommunities]);

  async function handleStatus(id: number, status: "approved" | "rejected") {
    setActioning(id);
    try {
      await apiPatch(`/communities/${id}/status`, { status });
      setCommunities(prev => prev.map(c => c.id === id ? { ...c, status } : c));
    } catch { /* silent */ }
    finally { setActioning(null); }
  }

  const filtered = communities.filter(c => {
    const matchSearch = search === "" ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.owner?.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (c.owner?.email ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const pending  = communities.filter(c => c.status === "pending").length;
  const approved = communities.filter(c => c.status === "approved").length;
  const rejected = communities.filter(c => c.status === "rejected").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">All Communities</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{communities.length} total · {pending} pending · {approved} live</p>
        </div>
        <button
          onClick={() => void fetchCommunities()}
          className="h-8 px-3 text-xs rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Summary chips */}
      <div className="flex gap-2 flex-wrap">
        {[
          { label: `All (${communities.length})`, value: "all" },
          { label: `Pending (${pending})`, value: "pending" },
          { label: `Approved (${approved})`, value: "approved" },
          { label: `Rejected (${rejected})`, value: "rejected" },
        ].map(opt => (
          <button
            key={opt.value}
            onClick={() => setStatusFilter(opt.value)}
            className={`h-7 px-3 text-xs rounded-full border transition-colors font-medium ${
              statusFilter === opt.value
                ? "bg-primary/10 text-primary border-primary/30"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search by community name or owner…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full h-9 rounded-lg border border-border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/40"
      />

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl border border-border bg-card/60 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card/40 py-16 text-center text-sm text-muted-foreground">
          No communities match your filters.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(c => (
            <div
              key={c.id}
              className="rounded-xl border border-border bg-card/60 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3"
            >
              {/* Left: info */}
              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-foreground truncate">{c.name}</span>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${STATUS_COLORS[c.status] ?? "bg-muted/20 text-muted-foreground border-border"}`}>
                    {c.status}
                  </span>
                  {c.plans && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border bg-blue-500/10 text-blue-400 border-blue-500/20">
                      {c.plans.name} · ${c.plans.price}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  Owner: <span className="text-foreground/80">{c.owner?.name ?? "—"}</span>
                  <span className="ml-1 opacity-60">{c.owner?.email}</span>
                </p>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                  <span>👥 {c.member_count ?? 0} members</span>
                  <span>🕐 {relativeTime(c.created_at)}</span>
                  {c.description && (
                    <span className="truncate max-w-xs opacity-70" title={c.description}>
                      {c.description.slice(0, 60)}{c.description.length > 60 ? "…" : ""}
                    </span>
                  )}
                </div>
              </div>

              {/* Right: actions (only for pending) */}
              {c.status === "pending" && (
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => void handleStatus(c.id, "approved")}
                    disabled={actioning === c.id}
                    className="h-8 px-3 text-xs rounded-lg bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-colors disabled:opacity-40 font-medium"
                  >
                    {actioning === c.id ? "…" : "Approve"}
                  </button>
                  <button
                    onClick={() => void handleStatus(c.id, "rejected")}
                    disabled={actioning === c.id}
                    className="h-8 px-3 text-xs rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors disabled:opacity-40 font-medium"
                  >
                    {actioning === c.id ? "…" : "Reject"}
                  </button>
                </div>
              )}

              {/* Re-actions for approved (can reject) or rejected (can approve) */}
              {c.status === "approved" && (
                <button
                  onClick={() => void handleStatus(c.id, "rejected")}
                  disabled={actioning === c.id}
                  className="h-8 px-3 text-xs rounded-lg border border-border text-muted-foreground hover:text-red-400 hover:border-red-500/30 transition-colors disabled:opacity-40 shrink-0"
                >
                  Revoke
                </button>
              )}
              {c.status === "rejected" && (
                <button
                  onClick={() => void handleStatus(c.id, "approved")}
                  disabled={actioning === c.id}
                  className="h-8 px-3 text-xs rounded-lg bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-colors disabled:opacity-40 font-medium shrink-0"
                >
                  Restore
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
