import { useEffect, useState, useCallback } from "react";
import { apiGet, apiDelete } from "@/lib/auth";
import { relativeTime } from "@/lib/utils";

type Course = {
  id: number;
  title: string;
  description: string | null;
  lessonCount: number;
  enrollmentCount: number;
  createdAt: string;
};

export default function Courses() {
  const [courses, setCourses]     = useState<Course[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [search, setSearch]       = useState("");
  const [deleting, setDeleting]   = useState<number | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<Course[]>("/courses");
      setCourses(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchCourses(); }, [fetchCourses]);

  async function handleDelete(id: number) {
    setDeleting(id);
    setConfirmId(null);
    try {
      await apiDelete(`/courses/${id}`);
      setCourses(prev => prev.filter(c => c.id !== id));
    } catch { /* silent */ }
    finally { setDeleting(null); }
  }

  const filtered = courses.filter(c =>
    search === "" ||
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    (c.description ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">All Courses</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{courses.length} total courses</p>
        </div>
        <button
          onClick={() => void fetchCourses()}
          className="h-8 px-3 text-xs rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"
        >
          Refresh
        </button>
      </div>

      <input
        type="text"
        placeholder="Search courses…"
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
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl border border-border bg-card/60 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card/40 py-16 text-center text-sm text-muted-foreground">
          {search ? "No courses match your search." : "No courses yet."}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(c => (
            <div
              key={c.id}
              className="rounded-xl border border-border bg-card/60 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3"
            >
              <div className="flex-1 min-w-0 space-y-0.5">
                <span className="text-sm font-semibold text-foreground block truncate">{c.title}</span>
                {c.description && (
                  <p className="text-xs text-muted-foreground truncate max-w-lg">{c.description}</p>
                )}
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                  <span>📚 {c.lessonCount} lessons</span>
                  <span>👥 {c.enrollmentCount} enrolled</span>
                  <span>🕐 {relativeTime(c.createdAt)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {confirmId === c.id ? (
                  <>
                    <span className="text-xs text-muted-foreground">Delete course?</span>
                    <button
                      onClick={() => void handleDelete(c.id)}
                      disabled={deleting === c.id}
                      className="h-8 px-3 text-xs rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors disabled:opacity-40 font-medium"
                    >
                      {deleting === c.id ? "…" : "Yes, delete"}
                    </button>
                    <button
                      onClick={() => setConfirmId(null)}
                      className="h-8 px-3 text-xs rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setConfirmId(c.id)}
                    className="h-8 px-3 text-xs rounded-lg border border-border text-muted-foreground hover:text-red-400 hover:border-red-500/30 transition-colors"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
