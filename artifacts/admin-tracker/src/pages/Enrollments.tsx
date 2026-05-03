import { useEffect, useState, useCallback } from "react";
import { apiGet, apiPost } from "@/lib/auth";
import { relativeTime } from "@/lib/utils";

type PendingEnrollment = {
  id: number;
  userId: number;
  courseId: number;
  createdAt: string;
  user: { id: number; name: string; email: string; avatar: string | null };
  course: { id: number; title: string; enrollmentMode: string };
};

export default function Enrollments() {
  const [enrollments, setEnrollments] = useState<PendingEnrollment[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [actioning, setActioning]     = useState<number | null>(null);
  const [search, setSearch]           = useState("");

  const fetchEnrollments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<PendingEnrollment[]>("/enrollments/pending");
      setEnrollments(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchEnrollments(); }, [fetchEnrollments]);

  async function handleAction(id: number, action: "approve" | "reject") {
    setActioning(id);
    try {
      await apiPost(`/enrollments/${id}/${action}`, {});
      setEnrollments(prev => prev.filter(e => e.id !== id));
    } catch { /* silent */ }
    finally { setActioning(null); }
  }

  const filtered = enrollments.filter(e =>
    search === "" ||
    e.user.name.toLowerCase().includes(search.toLowerCase()) ||
    e.user.email.toLowerCase().includes(search.toLowerCase()) ||
    e.course.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">Pending Enrollments</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {enrollments.length} pending approval
          </p>
        </div>
        <button
          onClick={() => void fetchEnrollments()}
          className="h-8 px-3 text-xs rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"
        >
          Refresh
        </button>
      </div>

      <input
        type="text"
        placeholder="Search by user or course…"
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
            <div key={i} className="h-16 rounded-xl border border-border bg-card/60 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card/40 py-16 text-center text-sm text-muted-foreground">
          {search ? "No enrollments match your search." : "No pending enrollment requests."}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(e => (
            <div
              key={e.id}
              className="rounded-xl border border-border bg-card/60 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3"
            >
              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-foreground">{e.user.name}</span>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border bg-yellow-500/10 text-yellow-400 border-yellow-500/20">
                    pending
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{e.user.email}</p>
                <p className="text-xs text-foreground/70">
                  Course: <span className="font-medium">{e.course.title}</span>
                </p>
                <p className="text-[10px] text-muted-foreground">{relativeTime(e.createdAt)}</p>
              </div>

              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => void handleAction(e.id, "approve")}
                  disabled={actioning === e.id}
                  className="h-8 px-3 text-xs rounded-lg bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-colors disabled:opacity-40 font-medium"
                >
                  {actioning === e.id ? "…" : "Approve"}
                </button>
                <button
                  onClick={() => void handleAction(e.id, "reject")}
                  disabled={actioning === e.id}
                  className="h-8 px-3 text-xs rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors disabled:opacity-40 font-medium"
                >
                  {actioning === e.id ? "…" : "Reject"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
