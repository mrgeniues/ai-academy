import { useEffect, useState, useCallback, useRef } from "react";
import { apiGet } from "@/lib/auth";
import { formatNum, relativeTime } from "@/lib/utils";

type Overview = {
  users:       { total: number; pending: number };
  courses:     { total: number };
  enrollments: { total: number; pending: number };
  posts:       { total: number };
  communities: { total: number; pending: number; approved: number };
  payments:    { total: number; pending: number; approved: number };
  messages:    { total: number };
  tools:       { total: number };
};

type Activity = {
  id: string; type: string; message: string; detail: string; status: string; createdAt: string;
};

type GrowthPoint = { date: string; count: number };

const TYPE_COLORS: Record<string, string> = {
  user:       "bg-blue-500/20 text-blue-400 border-blue-500/30",
  enrollment: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  post:       "bg-green-500/20 text-green-400 border-green-500/30",
  community:  "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  payment:    "bg-orange-500/20 text-orange-400 border-orange-500/30",
};

const STATUS_COLORS: Record<string, string> = {
  pending:  "text-yellow-400",
  approved: "text-green-400",
  active:   "text-blue-400",
  rejected: "text-red-400",
};

function StatCard({ label, value, sub, color }: { label: string; value: number; sub?: string; color: string }) {
  return (
    <div className={`rounded-2xl border p-5 flex flex-col gap-2 ${color}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</p>
      <p className="text-3xl font-bold">{formatNum(value)}</p>
      {sub && <p className="text-xs opacity-60">{sub}</p>}
    </div>
  );
}

export default function Dashboard() {
  const [overview, setOverview]   = useState<Overview | null>(null);
  const [activity, setActivity]   = useState<Activity[]>([]);
  const [growth, setGrowth]       = useState<GrowthPoint[]>([]);
  const [loading, setLoading]     = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [filter, setFilter]       = useState("all");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [ov, act, gr] = await Promise.all([
        apiGet<Overview>("/tracker/overview"),
        apiGet<Activity[]>("/tracker/activity"),
        apiGet<GrowthPoint[]>("/tracker/growth"),
      ]);
      setOverview(ov);
      setActivity(act);
      setGrowth(gr);
      setLastUpdate(new Date());
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    void fetchAll();
    intervalRef.current = setInterval(() => { void fetchAll(); }, 30_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchAll]);

  const filtered = filter === "all" ? activity : activity.filter(a => a.type === filter);

  // Mini bar chart for growth
  const maxCount = Math.max(...growth.map(g => g.count), 1);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Platform Overview</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Auto-refreshes every 30s · Last updated {relativeTime(lastUpdate.toISOString())}</p>
        </div>
        <button
          onClick={() => { void fetchAll(); }}
          className="h-8 px-3 text-xs rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
        >
          ↻ Refresh
        </button>
      </div>

      {/* Stats Grid */}
      {overview && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Total Users"   value={overview.users.total}       sub={`${overview.users.pending} pending approval`}      color="bg-blue-500/10 border-blue-500/20 text-blue-300" />
          <StatCard label="Courses"       value={overview.courses.total}     sub="published"                                          color="bg-purple-500/10 border-purple-500/20 text-purple-300" />
          <StatCard label="Enrollments"   value={overview.enrollments.total} sub={`${overview.enrollments.pending} pending`}          color="bg-indigo-500/10 border-indigo-500/20 text-indigo-300" />
          <StatCard label="Posts"         value={overview.posts.total}       sub="community posts"                                    color="bg-green-500/10 border-green-500/20 text-green-300" />
          <StatCard label="Communities"   value={overview.communities.total} sub={`${overview.communities.approved} live`}            color="bg-yellow-500/10 border-yellow-500/20 text-yellow-300" />
          <StatCard label="Payments"      value={overview.payments.total}    sub={`${overview.payments.pending} pending · ${overview.payments.approved} approved`} color="bg-orange-500/10 border-orange-500/20 text-orange-300" />
          <StatCard label="Messages"      value={overview.messages.total}    sub="chat messages"                                      color="bg-teal-500/10 border-teal-500/20 text-teal-300" />
          <StatCard label="Tools"         value={overview.tools.total}       sub="available tools"                                    color="bg-pink-500/10 border-pink-500/20 text-pink-300" />
        </div>
      )}

      {/* Growth Chart */}
      {growth.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-sm font-semibold text-foreground mb-4">User Signups — Last 30 Days</p>
          <div className="flex items-end gap-1 h-28">
            {growth.map(pt => (
              <div key={pt.date} className="flex-1 flex flex-col items-center gap-1 group" title={`${pt.date}: ${pt.count}`}>
                <div
                  className="w-full rounded-t bg-primary/60 group-hover:bg-primary transition-colors min-h-[2px]"
                  style={{ height: `${(pt.count / maxCount) * 100}%` }}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
            <span>{growth[0]?.date}</span>
            <span>{growth[growth.length - 1]?.date}</span>
          </div>
        </div>
      )}

      {/* Activity Feed */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <p className="text-sm font-semibold text-foreground">Live Activity Feed</p>
          <div className="flex gap-1">
            {["all","user","enrollment","post","community","payment"].map(t => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`h-6 px-2.5 text-[10px] rounded-md capitalize transition-colors ${filter === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="divide-y divide-border max-h-96 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-10">No activity yet.</p>
          ) : filtered.map(item => (
            <div key={item.id} className="flex items-start gap-3 px-5 py-3 hover:bg-muted/30 transition-colors">
              <span className={`mt-0.5 flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded border capitalize ${TYPE_COLORS[item.type] ?? "bg-muted text-muted-foreground border-border"}`}>
                {item.type}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">{item.message}</p>
                {item.detail && <p className="text-xs text-muted-foreground">{item.detail}</p>}
              </div>
              <div className="flex-shrink-0 text-right">
                <span className={`text-xs font-medium capitalize ${STATUS_COLORS[item.status] ?? "text-muted-foreground"}`}>{item.status}</span>
                <p className="text-[10px] text-muted-foreground mt-0.5">{relativeTime(item.createdAt)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
