import { useState, useEffect, useCallback } from "react";
import { useListUsers, useUpdateUserRole, useListCourses, useDeleteCourse, useListPosts, useDeletePost, useGetDashboardStats, getListUsersQueryKey, getListCoursesQueryKey, getListPostsQueryKey, getGetDashboardStatsQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash2, Users, BookOpen, MessageSquare, TrendingUp, Shield, Ban, CheckCircle, Clock, Calendar, GraduationCap, Wrench, XCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";

type PendingEnrollment = {
  id: number;
  userId: number;
  courseId: number;
  createdAt: string;
  user: { id: number; name: string; email: string; avatar: string | null };
  course: { id: number; title: string };
};

type UserRow = {
  id: number;
  name: string;
  email: string;
  role: string;
  avatar?: string | null;
  bio?: string | null;
  isBlocked?: boolean;
  isApproved?: boolean;
  lastLogin?: string | null;
  createdAt?: string;
};

export default function AdminPage() {
  const { user, token } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [blockingId, setBlockingId] = useState<number | null>(null);
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [selectedPendingIds, setSelectedPendingIds] = useState<Set<number>>(new Set());
  const [bulkActioning, setBulkActioning] = useState(false);
  const [pendingEnrollments, setPendingEnrollments] = useState<PendingEnrollment[]>([]);
  const [pendingEnrollmentsLoading, setPendingEnrollmentsLoading] = useState(true);
  const [approvingEnrollmentId, setApprovingEnrollmentId] = useState<number | null>(null);

  // Tool requests state
  type PendingToolRequest = {
    id: number;
    userId: number;
    toolId: number;
    createdAt: string;
    user: { id: number; name: string; email: string };
    tool: { id: number; title: string };
  };
  const [pendingToolRequests, setPendingToolRequests] = useState<PendingToolRequest[]>([]);
  const [toolRequestsLoading, setToolRequestsLoading] = useState(true);
  const [approvingToolRequestId, setApprovingToolRequestId] = useState<number | null>(null);

  // Maintenance state
  const [maintActive, setMaintActive] = useState(false);
  const [maintStart, setMaintStart] = useState("");
  const [maintEnd, setMaintEnd] = useState("");
  const [maintDesc, setMaintDesc] = useState("");
  const [maintSaving, setMaintSaving] = useState(false);
  const [maintLoaded, setMaintLoaded] = useState(false);

  // Email settings state
  const [emailFrom, setEmailFrom] = useState("");
  const [emailFromEffective, setEmailFromEffective] = useState("");
  const [emailFromSaving, setEmailFromSaving] = useState(false);
  const [emailFromLoaded, setEmailFromLoaded] = useState(false);

  // All hooks must be called unconditionally (Rules of Hooks)
  const { data: users, isLoading: usersLoading } = useListUsers({
    query: { queryKey: getListUsersQueryKey(), refetchInterval: 30_000 }
  });
  const { data: courses, isLoading: coursesLoading } = useListCourses({
    query: { queryKey: getListCoursesQueryKey() }
  });
  const { data: posts, isLoading: postsLoading } = useListPosts({
    query: { queryKey: getListPostsQueryKey() }
  });
  const { data: stats } = useGetDashboardStats({
    query: { queryKey: getGetDashboardStatsQueryKey() }
  });

  const updateRoleMutation = useUpdateUserRole();
  const deleteCourseMutation = useDeleteCourse();
  const deletePostMutation = useDeletePost();

  // Redirect non-admin users after hooks have been called
  useEffect(() => {
    if (user && user.role !== "admin") {
      setLocation("/dashboard");
    }
  }, [user, setLocation]);

  if (!user || user.role !== "admin") return null;

  const handleRoleChange = async (userId: number, role: string) => {
    try {
      await updateRoleMutation.mutateAsync({ id: userId, data: { role } });
      queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      toast({ title: "Role updated" });
    } catch {
      toast({ title: "Failed to update role", variant: "destructive" });
    }
  };

  const handleToggleBlock = async (u: UserRow) => {
    const newBlocked = !u.isBlocked;
    setBlockingId(u.id);
    try {
      const authToken = token ?? localStorage.getItem("lms_token");
      const resp = await fetch(`/api/users/${u.id}/block`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ blocked: newBlocked }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? "Failed to update block status");
      }
      queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      toast({ title: newBlocked ? `${u.name} has been blocked` : `${u.name} has been unblocked` });
    } catch (err) {
      toast({ title: (err as Error).message, variant: "destructive" });
    } finally {
      setBlockingId(null);
    }
  };

  const handleDeleteCourse = async (courseId: number) => {
    try {
      await deleteCourseMutation.mutateAsync({ id: courseId });
      queryClient.invalidateQueries({ queryKey: getListCoursesQueryKey() });
      toast({ title: "Course deleted" });
    } catch {
      toast({ title: "Failed to delete course", variant: "destructive" });
    }
  };

  const handleDeletePost = async (postId: number) => {
    try {
      await deletePostMutation.mutateAsync({ id: postId });
      queryClient.invalidateQueries({ queryKey: getListPostsQueryKey() });
      toast({ title: "Post deleted" });
    } catch {
      toast({ title: "Failed to delete post", variant: "destructive" });
    }
  };

  const handleApprove = async (u: UserRow) => {
    setApprovingId(u.id);
    try {
      const authToken = token ?? localStorage.getItem("lms_token");
      const resp = await fetch(`/api/users/${u.id}/approve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? "Failed to approve user");
      }
      queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      toast({ title: `${u.name} has been approved` });
    } catch (err) {
      toast({ title: (err as Error).message, variant: "destructive" });
    } finally {
      setApprovingId(null);
    }
  };

  const handleBulkAction = async (action: "approve" | "reject") => {
    if (selectedPendingIds.size === 0) return;
    setBulkActioning(true);
    try {
      const authToken = token ?? localStorage.getItem("lms_token");
      const resp = await fetch("/api/users/bulk-action", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ userIds: Array.from(selectedPendingIds), action }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? `Failed to ${action} users`);
      }
      const data = await resp.json() as { updated: number };
      setSelectedPendingIds(new Set());
      queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      toast({
        title: action === "approve"
          ? `${data.updated} user${data.updated !== 1 ? "s" : ""} approved`
          : `${data.updated} user${data.updated !== 1 ? "s" : ""} rejected`,
      });
    } catch (err) {
      toast({ title: (err as Error).message, variant: "destructive" });
    } finally {
      setBulkActioning(false);
    }
  };

  // Only show users who are NOT yet approved, NOT blocked, and NOT admins
  const pendingUsers = (users as UserRow[] | undefined)?.filter(
    u => !u.isApproved && !u.isBlocked && u.role !== "admin"
  ) ?? [];

  const fetchPendingEnrollments = useCallback(async () => {
    setPendingEnrollmentsLoading(true);
    try {
      const authToken = token ?? localStorage.getItem("lms_token");
      const resp = await fetch("/api/enrollments/pending", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (resp.ok) {
        const data = await resp.json() as PendingEnrollment[];
        setPendingEnrollments(data);
      }
    } catch {
      // silently ignore
    } finally {
      setPendingEnrollmentsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (user?.role === "admin") {
      void fetchPendingEnrollments();
      const interval = setInterval(() => { void fetchPendingEnrollments(); }, 30_000);
      return () => clearInterval(interval);
    }
  }, [user, fetchPendingEnrollments]);

  const fetchPendingToolRequests = useCallback(async () => {
    setToolRequestsLoading(true);
    try {
      const authToken = token ?? localStorage.getItem("lms_token");
      const resp = await fetch("/api/tool-requests/pending", { headers: { Authorization: `Bearer ${authToken}` } });
      if (resp.ok) setPendingToolRequests(await resp.json() as PendingToolRequest[]);
    } catch { /* silently ignore */ }
    finally { setToolRequestsLoading(false); }
  }, [token]);

  useEffect(() => {
    if (user?.role === "admin") {
      void fetchPendingToolRequests();
      const interval = setInterval(() => { void fetchPendingToolRequests(); }, 30_000);
      return () => clearInterval(interval);
    }
  }, [user, fetchPendingToolRequests]);

  const handleApproveToolRequest = async (request: PendingToolRequest) => {
    setApprovingToolRequestId(request.id);
    try {
      const authToken = token ?? localStorage.getItem("lms_token");
      const resp = await fetch(`/api/tool-requests/${request.id}/approve`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? "Failed to approve");
      }
      await fetchPendingToolRequests();
      toast({ title: `${request.user.name} approved for "${request.tool.title}"` });
    } catch (err) {
      toast({ title: (err as Error).message, variant: "destructive" });
    } finally {
      setApprovingToolRequestId(null);
    }
  };

  const loadEmailSettings = useCallback(async () => {
    try {
      const authToken = token ?? localStorage.getItem("lms_token");
      const resp = await fetch("/api/settings/email", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!resp.ok) return;
      const data = await resp.json() as {
        emailFrom: string | null; effectiveEmailFrom: string; envDefault: string;
      };
      setEmailFrom(data.emailFrom ?? "");
      setEmailFromEffective(data.effectiveEmailFrom);
      setEmailFromLoaded(true);
    } catch { /* silently ignore */ }
  }, [token]);

  const handleSaveEmailFrom = async () => {
    setEmailFromSaving(true);
    try {
      const authToken = token ?? localStorage.getItem("lms_token");
      const resp = await fetch("/api/settings/email", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ emailFrom: emailFrom.trim() || null }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? "Failed to save");
      }
      const data = await resp.json() as { emailFrom: string | null };
      setEmailFrom(data.emailFrom ?? "");
      await loadEmailSettings();
      toast({ title: "Email sender address saved" });
    } catch (err) {
      toast({ title: (err as Error).message, variant: "destructive" });
    } finally {
      setEmailFromSaving(false);
    }
  };

  const loadMaintenanceSettings = useCallback(async () => {
    try {
      const resp = await fetch("/api/maintenance");
      if (!resp.ok) return;
      const data = await resp.json() as {
        isActive: boolean; startTime: string | null; endTime: string | null; description: string | null;
      };
      setMaintActive(data.isActive ?? false);
      setMaintStart(data.startTime ? data.startTime.slice(0, 16) : "");
      setMaintEnd(data.endTime ? data.endTime.slice(0, 16) : "");
      setMaintDesc(data.description ?? "");
      setMaintLoaded(true);
    } catch { /* silently ignore */ }
  }, []);

  const handleSaveMaintenance = async () => {
    setMaintSaving(true);
    try {
      const authToken = token ?? localStorage.getItem("lms_token");
      const resp = await fetch("/api/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({
          isActive: maintActive,
          startTime: maintStart ? new Date(maintStart).toISOString() : null,
          endTime: maintEnd ? new Date(maintEnd).toISOString() : null,
          description: maintDesc.trim() || null,
        }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? "Failed to save");
      }
      toast({ title: "Maintenance settings saved" });
    } catch (err) {
      toast({ title: (err as Error).message, variant: "destructive" });
    } finally {
      setMaintSaving(false);
    }
  };

  const handleApproveEnrollment = async (enrollment: PendingEnrollment) => {
    setApprovingEnrollmentId(enrollment.id);
    try {
      const authToken = token ?? localStorage.getItem("lms_token");
      const resp = await fetch(`/api/enrollments/${enrollment.id}/approve`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? "Failed to approve enrollment");
      }
      await fetchPendingEnrollments();
      toast({ title: `${enrollment.user.name} approved for "${enrollment.course.title}"` });
    } catch (err) {
      toast({ title: (err as Error).message, variant: "destructive" });
    } finally {
      setApprovingEnrollmentId(null);
    }
  };

  return (
    <Layout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Admin Panel</h1>
            <p className="text-muted-foreground text-sm">Manage users, courses, and community</p>
          </div>
        </div>

        {/* Analytics overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Users", value: stats?.totalUsers ?? 0, icon: Users, color: "text-blue-500" },
            { label: "Total Courses", value: stats?.totalCourses ?? 0, icon: BookOpen, color: "text-purple-500" },
            { label: "Enrollments", value: stats?.totalEnrollments ?? 0, icon: TrendingUp, color: "text-green-500" },
            { label: "Community Posts", value: stats?.totalPosts ?? 0, icon: MessageSquare, color: "text-orange-500" },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label} data-testid={`admin-stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-2xl font-bold">{value}</p>
                  </div>
                  <Icon className={`w-8 h-8 ${color} opacity-60`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Pending approvals summary */}
        {(pendingUsers.length > 0 || pendingEnrollments.length > 0 || pendingToolRequests.length > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" data-testid="pending-approvals-summary">
            {pendingUsers.length > 0 && (
              <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20" data-testid="pending-users-card">
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Pending Accounts</p>
                      <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{pendingUsers.length}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {pendingUsers.length === 1 ? "account awaiting" : "accounts awaiting"} approval
                      </p>
                    </div>
                    <Clock className="w-8 h-8 text-amber-500 opacity-60" />
                  </div>
                </CardContent>
              </Card>
            )}
            {pendingEnrollments.length > 0 && (
              <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20" data-testid="pending-enrollments-card">
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Pending Enrollments</p>
                      <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{pendingEnrollments.length}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {pendingEnrollments.length === 1 ? "enrollment awaiting" : "enrollments awaiting"} approval
                      </p>
                    </div>
                    <GraduationCap className="w-8 h-8 text-amber-500 opacity-60" />
                  </div>
                </CardContent>
              </Card>
            )}
            {pendingToolRequests.length > 0 && (
              <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20" data-testid="pending-tool-requests-card">
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Pending Tool Requests</p>
                      <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{pendingToolRequests.length}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {pendingToolRequests.length === 1 ? "request awaiting" : "requests awaiting"} approval
                      </p>
                    </div>
                    <Wrench className="w-8 h-8 text-amber-500 opacity-60" />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Management tabs */}
        <Tabs defaultValue="pending">
          <TabsList className="grid grid-cols-7 w-full max-w-4xl">
            <TabsTrigger value="pending" data-testid="tab-pending">
              Approvals
              {pendingUsers.length > 0 && (
                <Badge variant="destructive" className="ml-1.5 text-xs px-1.5 py-0 h-4">{pendingUsers.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="course-approval" data-testid="tab-course-approval">
              Courses
              {pendingEnrollments.length > 0 && (
                <Badge variant="destructive" className="ml-1.5 text-xs px-1.5 py-0 h-4">{pendingEnrollments.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="users" data-testid="tab-users">Users</TabsTrigger>
            <TabsTrigger value="courses" data-testid="tab-courses">Manage</TabsTrigger>
            <TabsTrigger value="posts" data-testid="tab-posts">Posts</TabsTrigger>
            <TabsTrigger value="tool-access" data-testid="tab-tool-access">
              Tools
              {pendingToolRequests.length > 0 && (
                <Badge variant="destructive" className="ml-1.5 text-xs px-1.5 py-0 h-4">{pendingToolRequests.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="maintenance"
              data-testid="tab-maintenance"
              onClick={() => {
                if (!maintLoaded) void loadMaintenanceSettings();
                if (!emailFromLoaded) void loadEmailSettings();
              }}
            >
              <Wrench className="w-3.5 h-3.5 mr-1" />
              Maint.
              {maintActive && (
                <Badge variant="destructive" className="ml-1.5 text-xs px-1.5 py-0 h-4">ON</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ── Need Approval tab ─────────────────────────────────────── */}
          <TabsContent value="pending" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <CardTitle className="text-base flex items-center gap-2">
                    Pending Approval
                    <Badge variant="secondary" className="text-xs font-normal">{pendingUsers.length}</Badge>
                  </CardTitle>
                  {selectedPendingIds.size > 0 && (
                    <div className="flex items-center gap-2" data-testid="bulk-action-toolbar">
                      <span className="text-xs text-muted-foreground">{selectedPendingIds.size} selected</span>
                      <Button
                        size="sm"
                        className="h-7 gap-1 text-xs"
                        onClick={() => handleBulkAction("approve")}
                        disabled={bulkActioning}
                        data-testid="bulk-approve-btn"
                      >
                        {bulkActioning ? (
                          <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <><CheckCircle className="w-3 h-3" /> Approve selected</>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-7 gap-1 text-xs"
                        onClick={() => handleBulkAction("reject")}
                        disabled={bulkActioning}
                        data-testid="bulk-reject-btn"
                      >
                        {bulkActioning ? (
                          <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <><XCircle className="w-3 h-3" /> Reject selected</>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
                ) : pendingUsers.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <CheckCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No users waiting for approval</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {/* Select all row */}
                    <div className="flex items-center gap-3 pb-3">
                      <Checkbox
                        data-testid="select-all-pending"
                        checked={selectedPendingIds.size === pendingUsers.length && pendingUsers.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedPendingIds(new Set(pendingUsers.map(u => u.id)));
                          } else {
                            setSelectedPendingIds(new Set());
                          }
                        }}
                      />
                      <span className="text-xs text-muted-foreground">Select all</span>
                    </div>
                    {pendingUsers.map(u => (
                      <div key={u.id} className="flex items-center gap-3 py-4">
                        <Checkbox
                          data-testid={`select-pending-${u.id}`}
                          checked={selectedPendingIds.has(u.id)}
                          onCheckedChange={(checked) => {
                            setSelectedPendingIds(prev => {
                              const next = new Set(prev);
                              if (checked) next.add(u.id);
                              else next.delete(u.id);
                              return next;
                            });
                          }}
                        />
                        <Avatar className="w-10 h-10 flex-shrink-0">
                          <AvatarImage src={u.avatar ?? undefined} />
                          <AvatarFallback className="text-xs bg-muted font-semibold">
                            {u.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{u.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                          {u.createdAt && (
                            <p className="text-xs text-muted-foreground">
                              Signed up {formatDistanceToNow(new Date(u.createdAt), { addSuffix: true })}
                            </p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          className="h-8 gap-1 text-xs flex-shrink-0"
                          onClick={() => handleApprove(u)}
                          disabled={approvingId === u.id}
                        >
                          {approvingId === u.id ? (
                            <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <><CheckCircle className="w-3 h-3" /> Approve</>
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Course Approval tab ───────────────────────────────────── */}
          <TabsContent value="course-approval" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  Pending Course Enrollments
                  <Badge variant="secondary" className="text-xs font-normal">{pendingEnrollments.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pendingEnrollmentsLoading ? (
                  <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
                ) : pendingEnrollments.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <GraduationCap className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No pending enrollment requests</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {pendingEnrollments.map(enrollment => (
                      <div key={enrollment.id} className="flex items-center gap-3 py-4">
                        <Avatar className="w-10 h-10 flex-shrink-0">
                          <AvatarImage src={enrollment.user.avatar ?? undefined} />
                          <AvatarFallback className="text-xs bg-muted font-semibold">
                            {enrollment.user.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{enrollment.user.name}</p>
                          <p className="text-xs text-muted-foreground truncate">wants to join: <span className="font-medium text-foreground">{enrollment.course.title}</span></p>
                          {enrollment.createdAt && (
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(enrollment.createdAt), { addSuffix: true })}
                            </p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          className="h-8 gap-1 text-xs flex-shrink-0"
                          onClick={() => handleApproveEnrollment(enrollment)}
                          disabled={approvingEnrollmentId === enrollment.id}
                        >
                          {approvingEnrollmentId === enrollment.id ? (
                            <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <><CheckCircle className="w-3 h-3" /> Approve</>
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Users tab ─────────────────────────────────────────────── */}
          <TabsContent value="users" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  All Users
                  <Badge variant="secondary" className="text-xs font-normal">{users?.length ?? 0}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
                ) : (
                  <div className="divide-y divide-border">
                    {(users as UserRow[] | undefined)?.map(u => {
                      const isCurrentUser = u.id === user?.id;
                      const isBlocked = u.isBlocked ?? false;
                      const isProcessing = blockingId === u.id;

                      return (
                        <div
                          key={u.id}
                          data-testid={`user-row-${u.id}`}
                          className={`flex items-start gap-3 py-4 ${isBlocked ? "opacity-60" : ""}`}
                        >
                          {/* Avatar */}
                          <div className="relative flex-shrink-0">
                            <Avatar className="w-10 h-10">
                              <AvatarImage src={u.avatar ?? undefined} />
                              <AvatarFallback className="text-xs bg-muted font-semibold">
                                {u.name.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            {isBlocked && (
                              <span className="absolute -bottom-0.5 -right-0.5 bg-destructive rounded-full p-0.5">
                                <Ban className="w-2.5 h-2.5 text-white" />
                              </span>
                            )}
                          </div>

                          {/* User info */}
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold truncate">{u.name}</span>
                              {isBlocked && (
                                <Badge variant="destructive" className="text-xs px-1.5 py-0">Blocked</Badge>
                              )}
                              {isCurrentUser && (
                                <Badge variant="outline" className="text-xs px-1.5 py-0">You</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                            {u.bio && (
                              <p className="text-xs text-muted-foreground line-clamp-1 italic">"{u.bio}"</p>
                            )}
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              {u.createdAt && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  Joined {formatDistanceToNow(new Date(u.createdAt), { addSuffix: true })}
                                </span>
                              )}
                              {u.lastLogin && (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  Last seen {formatDistanceToNow(new Date(u.lastLogin), { addSuffix: true })}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Controls */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {/* Role selector */}
                            <Select
                              value={u.role}
                              onValueChange={role => handleRoleChange(u.id, role)}
                              disabled={isCurrentUser || isBlocked}
                            >
                              <SelectTrigger data-testid={`select-role-${u.id}`} className="w-24 h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="member">Member</SelectItem>
                                <SelectItem value="creator">Creator</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>

                            {/* Block / Unblock */}
                            {!isCurrentUser && (
                              <Button
                                data-testid={`button-block-${u.id}`}
                                size="sm"
                                variant={isBlocked ? "outline" : "destructive"}
                                className={`h-8 gap-1 text-xs ${isBlocked ? "border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20" : ""}`}
                                onClick={() => handleToggleBlock(u)}
                                disabled={isProcessing}
                              >
                                {isProcessing ? (
                                  <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                                ) : isBlocked ? (
                                  <><CheckCircle className="w-3 h-3" /> Unblock</>
                                ) : (
                                  <><Ban className="w-3 h-3" /> Block</>
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Courses tab ───────────────────────────────────────────── */}
          <TabsContent value="courses" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">All Courses ({courses?.length ?? 0})</CardTitle>
              </CardHeader>
              <CardContent>
                {coursesLoading ? (
                  <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
                ) : (
                  <div className="space-y-2">
                    {courses?.map(course => (
                      <div key={course.id} data-testid={`course-row-${course.id}`} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                        {course.thumbnail && (
                          <img src={course.thumbnail} alt="" className="w-10 h-8 object-cover rounded flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{course.title}</p>
                          <p className="text-xs text-muted-foreground">{course.lessonCount} lessons · {course.enrollmentCount} enrolled</p>
                        </div>
                        <Button
                          data-testid={`button-delete-course-${course.id}`}
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteCourse(course.id)}
                          disabled={deleteCourseMutation.isPending}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Posts tab ─────────────────────────────────────────────── */}
          <TabsContent value="posts" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">All Posts ({posts?.length ?? 0})</CardTitle>
              </CardHeader>
              <CardContent>
                {postsLoading ? (
                  <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
                ) : (
                  <div className="space-y-2">
                    {posts?.map(post => (
                      <div key={post.id} data-testid={`post-row-${post.id}`} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                        <Avatar className="w-7 h-7 flex-shrink-0">
                          <AvatarFallback className="text-xs bg-muted">{post.author.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-medium">{post.author.name}</span>
                            <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">{post.content}</p>
                        </div>
                        <Button
                          data-testid={`button-admin-delete-post-${post.id}`}
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeletePost(post.id)}
                          disabled={deletePostMutation.isPending}
                          className="text-muted-foreground hover:text-destructive flex-shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          {/* ── Tool Access tab ───────────────────────────────────────── */}
          <TabsContent value="tool-access" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  Tool Access Requests
                  <Badge variant="secondary" className="text-xs font-normal">{pendingToolRequests.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {toolRequestsLoading ? (
                  <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
                ) : pendingToolRequests.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <CheckCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No pending tool access requests</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {pendingToolRequests.map(req => (
                      <div key={req.id} className="flex items-center gap-3 py-4">
                        <Avatar className="w-9 h-9 flex-shrink-0">
                          <AvatarFallback className="text-xs bg-muted font-semibold">
                            {req.user.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{req.user.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            wants access to <span className="font-medium text-foreground">"{req.tool.title}"</span>
                          </p>
                          <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(req.createdAt), { addSuffix: true })}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleApproveToolRequest(req)}
                          disabled={approvingToolRequestId === req.id}
                          data-testid={`button-approve-tool-request-${req.id}`}
                          className="flex-shrink-0 text-green-600 border-green-300 hover:bg-green-50 dark:hover:bg-green-900/20"
                        >
                          {approvingToolRequestId === req.id ? "Approving…" : "Approve"}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Maintenance tab ───────────────────────────────────────── */}
          <TabsContent value="maintenance" className="mt-4 space-y-4">
            {/* Email settings card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                  Email Sender Address
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!emailFromLoaded ? (
                  <div className="space-y-3">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-4 w-64" />
                  </div>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="email-from" className="text-sm">From Address</Label>
                      <Input
                        id="email-from"
                        type="text"
                        placeholder={emailFromEffective}
                        value={emailFrom}
                        onChange={e => setEmailFrom(e.target.value)}
                        data-testid="input-email-from"
                      />
                      <p className="text-xs text-muted-foreground">
                        Set the sender address for notification emails (e.g.{" "}
                        <code className="bg-muted px-1 rounded text-xs">no-reply@yourschool.com</code> or{" "}
                        <code className="bg-muted px-1 rounded text-xs">School LMS &lt;no-reply@yourschool.com&gt;</code>).
                        Leave blank to use the default or the <code className="bg-muted px-1 rounded text-xs">EMAIL_FROM</code> environment variable.
                      </p>
                      {emailFromEffective && (
                        <p className="text-xs text-muted-foreground">
                          Currently sending from: <span className="font-medium text-foreground">{emailFromEffective}</span>
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleSaveEmailFrom}
                        disabled={emailFromSaving}
                        data-testid="button-save-email-from"
                        className="w-full sm:w-auto"
                      >
                        {emailFromSaving ? "Saving…" : "Save Address"}
                      </Button>
                      {emailFrom && (
                        <Button
                          variant="outline"
                          onClick={() => { setEmailFrom(""); void handleSaveEmailFrom(); }}
                          disabled={emailFromSaving}
                          data-testid="button-clear-email-from"
                          className="w-full sm:w-auto"
                        >
                          Reset to Default
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Wrench className="w-4 h-4" /> Maintenance Mode
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {!maintLoaded ? (
                  <div className="space-y-3">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-24 w-full" />
                  </div>
                ) : (
                  <>
                    {/* Toggle */}
                    <div className="flex items-center gap-3 p-3 rounded-lg border border-border">
                      <Switch
                        id="maint-active"
                        checked={maintActive}
                        onCheckedChange={setMaintActive}
                        data-testid="switch-maintenance-active"
                      />
                      <Label htmlFor="maint-active" className="cursor-pointer">
                        <span className="font-medium">Enable Maintenance Mode</span>
                        {maintActive && (
                          <Badge variant="destructive" className="ml-2 text-xs">Active</Badge>
                        )}
                      </Label>
                    </div>

                    {/* Date/Time range */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="maint-start" className="text-sm">Start Date &amp; Time</Label>
                        <Input
                          id="maint-start"
                          type="datetime-local"
                          value={maintStart}
                          onChange={e => setMaintStart(e.target.value)}
                          data-testid="input-maintenance-start"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="maint-end" className="text-sm">End Date &amp; Time</Label>
                        <Input
                          id="maint-end"
                          type="datetime-local"
                          value={maintEnd}
                          onChange={e => setMaintEnd(e.target.value)}
                          data-testid="input-maintenance-end"
                        />
                      </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-1.5">
                      <Label htmlFor="maint-desc" className="text-sm">Description / Reason</Label>
                      <Textarea
                        id="maint-desc"
                        placeholder="We're performing scheduled maintenance to improve your experience…"
                        value={maintDesc}
                        onChange={e => setMaintDesc(e.target.value)}
                        rows={4}
                        data-testid="textarea-maintenance-description"
                      />
                    </div>

                    <Button
                      onClick={handleSaveMaintenance}
                      disabled={maintSaving}
                      data-testid="button-save-maintenance"
                      className="w-full sm:w-auto"
                    >
                      {maintSaving ? "Saving…" : "Save Settings"}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
