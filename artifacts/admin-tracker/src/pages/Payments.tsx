import { useEffect, useState, useCallback } from "react";
import { apiGet, apiPatch } from "@/lib/auth";
import { relativeTime } from "@/lib/utils";

type CommunityPayment = {
  id: number;
  plan: string;
  payment_method: string | null;
  screenshot_url: string;
  status: string;
  created_at: string;
  final_price: number | null;
  discount_amount: number | null;
  users: { id: number; name: string; email: string } | null;
  communities: { id: number; name: string } | null;
};

const STATUS_COLORS: Record<string, string> = {
  pending:  "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  approved: "bg-green-500/20 text-green-400 border-green-500/30",
  rejected: "bg-red-500/20 text-red-400 border-red-500/30",
};

export default function Payments() {
  const [payments, setPayments]       = useState<CommunityPayment[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [actioning, setActioning]     = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch]           = useState("");
  const [viewImg, setViewImg]         = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<CommunityPayment[]>("/community-payments/all");
      setPayments(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchPayments(); }, [fetchPayments]);

  async function handleApprove(id: number) {
    setActioning(id);
    try {
      await apiPatch(`/community-payments/${id}/status`, { status: "approved" });
      setPayments(prev => prev.map(p => p.id === id ? { ...p, status: "approved" } : p));
    } catch { /* silent */ }
    finally { setActioning(null); }
  }

  async function handleReject(id: number) {
    setActioning(id);
    try {
      await apiPatch(`/community-payments/${id}/status`, { status: "rejected", rejection_reason: rejectReason || undefined });
      setPayments(prev => prev.map(p => p.id === id ? { ...p, status: "rejected" } : p));
      setRejectingId(null);
      setRejectReason("");
    } catch { /* silent */ }
    finally { setActioning(null); }
  }

  const pending  = payments.filter(p => p.status === "pending").length;
  const approved = payments.filter(p => p.status === "approved").length;
  const rejected = payments.filter(p => p.status === "rejected").length;

  const filtered = payments.filter(p => {
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    const matchSearch = search === "" ||
      (p.users?.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (p.users?.email ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (p.communities?.name ?? "").toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <div className="space-y-4">
      {/* Image lightbox */}
      {viewImg && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setViewImg(null)}
        >
          <img src={viewImg} alt="Payment screenshot" className="max-h-[80vh] max-w-full rounded-xl object-contain" />
        </div>
      )}

      {/* Reject reason modal */}
      {rejectingId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm space-y-4">
            <h3 className="font-semibold text-foreground">Reject Payment</h3>
            <textarea
              className="w-full h-24 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none focus:ring-1 focus:ring-primary/40"
              placeholder="Rejection reason (optional)…"
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setRejectingId(null); setRejectReason(""); }}
                className="h-8 px-3 text-xs rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleReject(rejectingId)}
                disabled={actioning === rejectingId}
                className="h-8 px-3 text-xs rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors disabled:opacity-40 font-medium"
              >
                {actioning === rejectingId ? "…" : "Confirm Reject"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">Community Payments</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {payments.length} total · {pending} pending · {approved} approved
          </p>
        </div>
        <button
          onClick={() => void fetchPayments()}
          className="h-8 px-3 text-xs rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Status filter chips */}
      <div className="flex gap-2 flex-wrap">
        {[
          { label: `All (${payments.length})`, value: "all" },
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

      <input
        type="text"
        placeholder="Search by user or community…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full h-9 rounded-lg border border-border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/40"
      />

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl border border-border bg-card/60 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card/40 py-16 text-center text-sm text-muted-foreground">
          {search || statusFilter !== "all" ? "No payments match your filters." : "No community payments yet."}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(p => (
            <div
              key={p.id}
              className="rounded-xl border border-border bg-card/60 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3"
            >
              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-foreground">{p.users?.name ?? "Unknown"}</span>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${STATUS_COLORS[p.status] ?? "bg-muted/20 text-muted-foreground border-border"}`}>
                    {p.status}
                  </span>
                  {p.plan && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border bg-blue-500/10 text-blue-400 border-blue-500/20">
                      {p.plan}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {p.users?.email} · Community: <span className="text-foreground/80">{p.communities?.name ?? "—"}</span>
                </p>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                  {p.payment_method && <span>💳 {p.payment_method}</span>}
                  {p.final_price != null && <span>💰 ${p.final_price}</span>}
                  <span>🕐 {relativeTime(p.created_at)}</span>
                  {p.screenshot_url && (
                    <button
                      onClick={() => setViewImg(p.screenshot_url)}
                      className="underline hover:text-primary transition-colors"
                    >
                      View screenshot
                    </button>
                  )}
                </div>
              </div>

              {p.status === "pending" && (
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => void handleApprove(p.id)}
                    disabled={actioning === p.id}
                    className="h-8 px-3 text-xs rounded-lg bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-colors disabled:opacity-40 font-medium"
                  >
                    {actioning === p.id ? "…" : "Approve"}
                  </button>
                  <button
                    onClick={() => setRejectingId(p.id)}
                    disabled={actioning === p.id}
                    className="h-8 px-3 text-xs rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors disabled:opacity-40 font-medium"
                  >
                    Reject
                  </button>
                </div>
              )}
              {p.status === "approved" && (
                <button
                  onClick={() => setRejectingId(p.id)}
                  disabled={actioning === p.id}
                  className="h-8 px-3 text-xs rounded-lg border border-border text-muted-foreground hover:text-red-400 hover:border-red-500/30 transition-colors disabled:opacity-40 shrink-0"
                >
                  Revoke
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
