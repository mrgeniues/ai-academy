import { useEffect, useState, useCallback } from "react";
import { apiGet, apiPost } from "@/lib/auth";
import { relativeTime } from "@/lib/utils";

type User = {
  id: number; name: string; email: string; role: string;
  status: string | null; created_at: string;
  enrollments: number; posts: number;
};

const ROLE_COLORS: Record<string, string> = {
  admin:   "bg-red-500/20 text-red-400 border-red-500/30",
  creator: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  user:    "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

const STATUS_COLORS: Record<string, string> = {
  approved: "text-green-400",
  active:   "text-green-400",
  pending:  "text-yellow-400",
  blocked:  "text-red-400",
};

export default function Users() {
  const [users, setUsers]           = useState<User[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [actioning, setActioning]   = useState<number | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<User[]>("/tracker/users");
      setUsers(data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void fetchUsers(); }, [fetchUsers]);

  async function handleAction(userId: number, action: "approve" | "block" | "unblock") {
    setActioning(userId);
    try {
      await apiPost(`/users/${userId}/${action}`, {});
      setUsers(prev => prev.map(u => {
        if (u.id !== userId) return u;
        if (action === "approve")  return { ...u, status: "approved" };
        if (action === "block")    return { ...u, status: "blocked" };
        if (action === "unblock")  return { ...u, status: "approved" };
        return u;
      }));
    } catch { /* silent */ }
    finally { setActioning(null); }
  }

  const filtered = users.filter(u => {
    const matchSearch = search === "" ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole   = roleFilter === "all"   || u.role === roleFilter;
    const effectiveStatus = u.status ?? "approved";
    const matchStatus = statusFilter === "all" || effectiveStatus === statusFilter;
    return matchSearch && matchRole && matchStatus;
  });

  const pending = users.filter(u => u.status === "pending").length;
  const blocked = users.filter(u => u.status === "blocked").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">All Users</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {users.length} total · {pending} pending · {blocked} blocked
          </p>
        </div>
        <button
          onClick={() => void fetchUsers()}
          className="h-8 px-3 text-xs rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <input
          type="search"
          placeholder="Search name or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="h-8 px-3 text-sm rounded-lg bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 w-52"
        />
        {["all", "admin", "creator", "user"].map(r => (
          <button
            key={r}
            onClick={() => setRoleFilter(r)}
            className={`h-8 px-3 text-xs rounded-lg capitalize transition-colors border ${roleFilter === r ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
          >
            {r}
          </button>
        ))}
        <div className="w-px bg-border mx-1" />
        {["all", "approved", "pending", "blocked"].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`h-8 px-3 text-xs rounded-lg capitalize transition-colors border ${statusFilter === s ? "bg-primary/10 text-primary border-primary/30" : "border-border text-muted-foreground hover:text-foreground"}`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">User</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Role</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Courses</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Posts</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Joined</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">No users found</td></tr>
                ) : filtered.map(u => {
                  const effectiveStatus = u.status ?? "approved";
                  return (
                    <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-foreground">{u.name}</p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border capitalize ${ROLE_COLORS[u.role] ?? "bg-muted text-muted-foreground border-border"}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs capitalize ${STATUS_COLORS[effectiveStatus] ?? "text-muted-foreground"}`}>
                          {effectiveStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-foreground">{u.enrollments}</td>
                      <td className="px-4 py-3 text-right text-foreground">{u.posts}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground text-xs">{relativeTime(u.created_at)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {effectiveStatus === "pending" && (
                            <button
                              onClick={() => void handleAction(u.id, "approve")}
                              disabled={actioning === u.id}
                              className="h-7 px-2.5 text-[10px] rounded-md bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-colors disabled:opacity-40 font-medium"
                            >
                              {actioning === u.id ? "…" : "Approve"}
                            </button>
                          )}
                          {(effectiveStatus === "approved" || effectiveStatus === "active") && u.role !== "admin" && (
                            <button
                              onClick={() => void handleAction(u.id, "block")}
                              disabled={actioning === u.id}
                              className="h-7 px-2.5 text-[10px] rounded-md border border-border text-muted-foreground hover:text-red-400 hover:border-red-500/30 transition-colors disabled:opacity-40"
                            >
                              {actioning === u.id ? "…" : "Block"}
                            </button>
                          )}
                          {effectiveStatus === "blocked" && (
                            <button
                              onClick={() => void handleAction(u.id, "unblock")}
                              disabled={actioning === u.id}
                              className="h-7 px-2.5 text-[10px] rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors disabled:opacity-40 font-medium"
                            >
                              {actioning === u.id ? "…" : "Unblock"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
