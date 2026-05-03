import { useEffect, useState, useCallback } from "react";
import { apiGet, apiPatch, apiDelete } from "@/lib/auth";
import { relativeTime } from "@/lib/utils";

type Tool = {
  id: number;
  title: string;
  description: string | null;
  url: string;
  category: string | null;
  is_active: boolean;
  is_public: boolean;
  created_at: string;
};

type ToolRequest = {
  id: number;
  userId: number;
  toolId: number;
  createdAt: string;
  user: { id: number; name: string; email: string };
  tool: { id: number; title: string };
};

export default function Tools() {
  const [tools, setTools]               = useState<Tool[]>([]);
  const [toolsLoading, setToolsLoading] = useState(true);
  const [requests, setRequests]         = useState<ToolRequest[]>([]);
  const [reqLoading, setReqLoading]     = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [actioning, setActioning]       = useState<number | null>(null);
  const [deleting, setDeleting]         = useState<number | null>(null);
  const [confirmId, setConfirmId]       = useState<number | null>(null);
  const [search, setSearch]             = useState("");
  const [view, setView]                 = useState<"tools" | "requests">("tools");

  const fetchTools = useCallback(async () => {
    setToolsLoading(true);
    try {
      const data = await apiGet<Tool[]>("/tools");
      setTools(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load tools");
    } finally {
      setToolsLoading(false);
    }
  }, []);

  const fetchRequests = useCallback(async () => {
    setReqLoading(true);
    try {
      const data = await apiGet<ToolRequest[]>("/tool-requests/pending");
      setRequests(data);
    } catch {
      setRequests([]);
    } finally {
      setReqLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchTools();
    void fetchRequests();
  }, [fetchTools, fetchRequests]);

  async function handleRequestAction(id: number, approved: boolean) {
    setActioning(id);
    try {
      await apiPatch(`/tool-requests/${id}`, { is_approved: approved });
      setRequests(prev => prev.filter(r => r.id !== id));
    } catch { /* silent */ }
    finally { setActioning(null); }
  }

  async function handleDelete(id: number) {
    setDeleting(id);
    setConfirmId(null);
    try {
      await apiDelete(`/tools/${id}`);
      setTools(prev => prev.filter(t => t.id !== id));
    } catch { /* silent */ }
    finally { setDeleting(null); }
  }

  const filteredTools = tools.filter(t =>
    search === "" ||
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    (t.category ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const filteredRequests = requests.filter(r =>
    search === "" ||
    r.user.name.toLowerCase().includes(search.toLowerCase()) ||
    r.tool.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">AI Tools</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {tools.length} tools · {requests.length} pending requests
          </p>
        </div>
        <button
          onClick={() => { void fetchTools(); void fetchRequests(); }}
          className="h-8 px-3 text-xs rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* View toggle */}
      <div className="flex gap-2">
        {([
          { id: "tools", label: `Tools (${tools.length})` },
          { id: "requests", label: `Requests ${requests.length > 0 ? `(${requests.length})` : ""}` },
        ] as const).map(v => (
          <button
            key={v.id}
            onClick={() => setView(v.id)}
            className={`h-8 px-3 text-xs rounded-lg border transition-colors font-medium ${
              view === v.id
                ? "bg-primary/10 text-primary border-primary/30"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      <input
        type="text"
        placeholder={view === "tools" ? "Search tools…" : "Search requests…"}
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full h-9 rounded-lg border border-border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/40"
      />

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Tools list */}
      {view === "tools" && (
        toolsLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl border border-border bg-card/60 animate-pulse" />
            ))}
          </div>
        ) : filteredTools.length === 0 ? (
          <div className="rounded-xl border border-border bg-card/40 py-16 text-center text-sm text-muted-foreground">
            {search ? "No tools match your search." : "No tools yet."}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTools.map(t => (
              <div
                key={t.id}
                className="rounded-xl border border-border bg-card/60 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3"
              >
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-foreground truncate">{t.title}</span>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                      t.is_active
                        ? "bg-green-500/20 text-green-400 border-green-500/30"
                        : "bg-muted/20 text-muted-foreground border-border"
                    }`}>
                      {t.is_active ? "active" : "inactive"}
                    </span>
                    {t.is_public && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border bg-blue-500/10 text-blue-400 border-blue-500/20">
                        public
                      </span>
                    )}
                    {t.category && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border bg-purple-500/10 text-purple-400 border-purple-500/20">
                        {t.category}
                      </span>
                    )}
                  </div>
                  {t.description && (
                    <p className="text-xs text-muted-foreground truncate max-w-lg">{t.description}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground">🕐 {relativeTime(t.created_at)}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {confirmId === t.id ? (
                    <>
                      <span className="text-xs text-muted-foreground">Delete?</span>
                      <button
                        onClick={() => void handleDelete(t.id)}
                        disabled={deleting === t.id}
                        className="h-8 px-3 text-xs rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors disabled:opacity-40 font-medium"
                      >
                        {deleting === t.id ? "…" : "Yes"}
                      </button>
                      <button
                        onClick={() => setConfirmId(null)}
                        className="h-8 px-3 text-xs rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"
                      >
                        No
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setConfirmId(t.id)}
                      className="h-8 px-3 text-xs rounded-lg border border-border text-muted-foreground hover:text-red-400 hover:border-red-500/30 transition-colors"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Tool requests */}
      {view === "requests" && (
        reqLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl border border-border bg-card/60 animate-pulse" />
            ))}
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="rounded-xl border border-border bg-card/40 py-16 text-center text-sm text-muted-foreground">
            No pending tool access requests.
          </div>
        ) : (
          <div className="space-y-2">
            {filteredRequests.map(r => (
              <div
                key={r.id}
                className="rounded-xl border border-border bg-card/60 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3"
              >
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-foreground">{r.user.name}</span>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border bg-yellow-500/10 text-yellow-400 border-yellow-500/20">
                      pending
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{r.user.email}</p>
                  <p className="text-xs text-foreground/70">
                    Tool: <span className="font-medium">{r.tool.title}</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground">{relativeTime(r.createdAt)}</p>
                </div>

                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => void handleRequestAction(r.id, true)}
                    disabled={actioning === r.id}
                    className="h-8 px-3 text-xs rounded-lg bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-colors disabled:opacity-40 font-medium"
                  >
                    {actioning === r.id ? "…" : "Approve"}
                  </button>
                  <button
                    onClick={() => void handleRequestAction(r.id, false)}
                    disabled={actioning === r.id}
                    className="h-8 px-3 text-xs rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors disabled:opacity-40 font-medium"
                  >
                    {actioning === r.id ? "…" : "Reject"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
