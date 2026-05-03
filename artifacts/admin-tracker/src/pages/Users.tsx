import { useEffect, useState, useCallback } from "react";
import { apiGet } from "@/lib/auth";
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

export default function Users() {
  const [users, setUsers]     = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const fetchUsers = useCallback(async () => {
    try {
      const data = await apiGet<User[]>("/tracker/users");
      setUsers(data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void fetchUsers(); }, [fetchUsers]);

  const filtered = users.filter(u => {
    const matchSearch = search === "" || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">All Users</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{users.length} total registered users</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <input
          type="search"
          placeholder="Search name or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="h-8 px-3 text-sm rounded-lg bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 w-56"
        />
        {["all","admin","creator","user"].map(r => (
          <button
            key={r}
            onClick={() => setRoleFilter(r)}
            className={`h-8 px-3 text-xs rounded-lg capitalize transition-colors border ${roleFilter === r ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
          >
            {r}
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
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Enrollments</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Posts</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">No users found</td></tr>
                ) : filtered.map(u => (
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
                      <span className={`text-xs capitalize ${u.status === "approved" || !u.status ? "text-green-400" : u.status === "pending" ? "text-yellow-400" : "text-red-400"}`}>
                        {u.status ?? "active"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-foreground">{u.enrollments}</td>
                    <td className="px-4 py-3 text-right text-foreground">{u.posts}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground text-xs">{relativeTime(u.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
