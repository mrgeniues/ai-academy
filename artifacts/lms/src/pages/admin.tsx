import { useState, useEffect, useCallback } from "react";
import { useListUsers, useUpdateUserRole, useListCourses, useDeleteCourse, useListPosts, useDeletePost, useGetDashboardStats, useGetPresenceOverview, getListUsersQueryKey, getListCoursesQueryKey, getListPostsQueryKey, getGetDashboardStatsQueryKey, getGetPresenceOverviewQueryKey, type Course } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash2, Users, BookOpen, MessageSquare, TrendingUp, Shield, Ban, CheckCircle, Clock, Calendar, GraduationCap, Wrench, XCircle, ScrollText, Database, Users2, User, ImageIcon, ExternalLink, Plus, Pencil, Radio, RefreshCw, Wifi, WifiOff, TimerReset, Activity, AlertCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { EVENTS } from "@/lib/events";

type PendingEnrollment = {
  id: number;
  userId: number;
  courseId: number;
  createdAt: string;
  user: { id: number; name: string; email: string; avatar: string | null };
  course: Course;
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
  lastAction?: { action: string; actorName: string; createdAt: string } | null;
};

function formatActionLabel(action: string): string {
  switch (action) {
    case "user_approved": return "Approved";
    case "user_rejected": return "Blocked";
    case "user_unblocked": return "Unblocked";
    case "user_approval_undone": return "Approval undone";
    case "user_rejection_undone": return "Block undone";
    default: return action.replace(/_/g, " ");
  }
}


function UndoCountdownAction({ onUndo, duration = 5 }: { onUndo: () => void; duration?: number }) {
  const [secondsLeft, setSecondsLeft] = useState(duration);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [secondsLeft]);

  return (
    <ToastAction
      altText="Undo bulk action"
      data-testid="bulk-undo-btn"
      onClick={onUndo}
    >
      Undo ({secondsLeft}s)
    </ToastAction>
  );
}

function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  if (minutes > 0) return `${minutes}m ${String(remainingSeconds).padStart(2, "0")}s`;
  return `${remainingSeconds}s`;
}

function formatTimestamp(timestamp?: string | null): string {
  if (!timestamp) return "Not recorded";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatRelativePresence(timestamp?: string | null): string {
  if (!timestamp) return "No activity recorded";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "No activity recorded";
  return formatDistanceToNow(date, { addSuffix: true });
}

function presenceInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "U";
}

function roleLabel(role: string): string {
  return role.replace(/[_-]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

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
  const [rejectingEnrollmentId, setRejectingEnrollmentId] = useState<number | null>(null);
  const [pendingRejectEnrollmentId, setPendingRejectEnrollmentId] = useState<number | null>(null);
  const [rejectEnrollmentReason, setRejectEnrollmentReason] = useState("");
  const [selectedEnrollmentIds, setSelectedEnrollmentIds] = useState<Set<number>>(new Set());
  const [bulkEnrollmentActioning, setBulkEnrollmentActioning] = useState(false);
  const [showBulkEnrollmentRejectReason, setShowBulkEnrollmentRejectReason] = useState(false);
  const [bulkEnrollmentRejectReason, setBulkEnrollmentRejectReason] = useState("");
  const [showBulkEnrollmentApproveConfirm, setShowBulkEnrollmentApproveConfirm] = useState(false);
  const [pendingBlockUserId, setPendingBlockUserId] = useState<number | null>(null);
  const [blockUserReason, setBlockUserReason] = useState("");
  const [showBulkRejectReason, setShowBulkRejectReason] = useState(false);
  const [bulkRejectReason, setBulkRejectReason] = useState("");
  const [activeTab, setActiveTab] = useState("tracker");

  useEffect(() => {
    const handler = (e: Event) => {
      const tab = (e as CustomEvent<string>).detail;
      if (tab) setActiveTab(tab);
    };
    window.addEventListener("admin:switch-tab", handler);
    return () => window.removeEventListener("admin:switch-tab", handler);
  }, []);

  // Audit log state
  type AdminAction = {
    id: number;
    action: string;
    entityType: string;
    entityId: number | null;
    reason: string | null;
    createdAt: string;
    actor: { name: string; email: string } | null;
    targetUser: { name: string; email: string } | null;
  };
  const [auditLog, setAuditLog] = useState<AdminAction[]>([]);
  const [auditLogLoading, setAuditLogLoading] = useState(false);
  const [auditLogLoaded, setAuditLogLoaded] = useState(false);
  const [auditLogActionFilter, setAuditLogActionFilter] = useState("all");
  const [auditLogStartDate, setAuditLogStartDate] = useState("");
  const [auditLogEndDate, setAuditLogEndDate] = useState("");

  const [viewScreenshot, setViewScreenshot]         = useState<string | null>(null);

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
  const [emailFromTesting, setEmailFromTesting] = useState(false);
  const [testEmailPreviewOpen, setTestEmailPreviewOpen] = useState(false);
  const [testEmailPreviewLoading, setTestEmailPreviewLoading] = useState(false);
  const [testEmailPreview, setTestEmailPreview] = useState<{ subject: string; from: string; to: string; html: string } | null>(null);

  // General / platform settings state
  const [platformName, setPlatformName] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [defaultEnrollmentMode, setDefaultEnrollmentMode] = useState<"open" | "approval_required" | "">("");
  const [generalSettingsLoaded, setGeneralSettingsLoaded] = useState(false);
  const [generalSettingsSaving, setGeneralSettingsSaving] = useState(false);

  const [togglingEnrollmentModeId, setTogglingEnrollmentModeId] = useState<number | null>(null);

  // Supabase configuration state
  const [supabaseDialogOpen, setSupabaseDialogOpen] = useState(false);
  const [supabaseCurrentUrl, setSupabaseCurrentUrl] = useState("");
  const [supabaseUrl, setSupabaseUrl] = useState("");
  const [supabaseServiceKey, setSupabaseServiceKey] = useState("");
  const [supabaseSaving, setSupabaseSaving] = useState(false);
  const [supabaseConfigLoaded, setSupabaseConfigLoaded] = useState(false);

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
  const {
    data: presence,
    isLoading: presenceLoading,
    isError: presenceError,
    refetch: refetchPresence,
    isFetching: presenceFetching,
  } = useGetPresenceOverview({
    query: {
      queryKey: getGetPresenceOverviewQueryKey(),
      refetchInterval: 15_000,
    },
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

  const handleToggleBlock = async (u: UserRow, reason?: string) => {
    const newBlocked = !u.isBlocked;
    setBlockingId(u.id);
    setPendingBlockUserId(null);
    setBlockUserReason("");
    try {
      const authToken = token ?? localStorage.getItem("lms_token");
      const resp = await fetch(`/api/users/${u.id}/block`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ blocked: newBlocked, ...(reason ? { reason } : {}) }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? "Failed to update block status");
      }
      queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      window.dispatchEvent(new Event(EVENTS.PENDING_APPROVALS_REFRESH));
      toast({ title: newBlocked ? `${u.name} has been blocked` : `${u.name} has been unblocked` });
      if (auditLogLoaded) void fetchAuditLog();
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

  const handleToggleEnrollmentMode = async (course: Course) => {
    const newMode = course.enrollmentMode === "open" ? "approval_required" : "open";
    setTogglingEnrollmentModeId(course.id);
    try {
      const authToken = token ?? localStorage.getItem("lms_token");
      const resp = await fetch(`/api/courses/${course.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ enrollmentMode: newMode }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? "Failed to update enrollment mode");
      }
      queryClient.invalidateQueries({ queryKey: getListCoursesQueryKey() });
      toast({
        title: newMode === "open"
          ? `"${course.title}" set to Open enrollment`
          : `"${course.title}" set to Approval Required`,
      });
    } catch (err) {
      toast({ title: (err as Error).message, variant: "destructive" });
    } finally {
      setTogglingEnrollmentModeId(null);
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
      window.dispatchEvent(new Event(EVENTS.PENDING_APPROVALS_REFRESH));
      toast({ title: `${u.name} has been approved` });
      if (auditLogLoaded) void fetchAuditLog();
    } catch (err) {
      toast({ title: (err as Error).message, variant: "destructive" });
    } finally {
      setApprovingId(null);
    }
  };

  const handleBulkUndo = async (userIds: number[], action: "approve" | "reject") => {
    try {
      const authToken = token ?? localStorage.getItem("lms_token");
      const resp = await fetch("/api/users/bulk-undo", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ userIds, action }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? "Failed to undo action");
      }
      const data = await resp.json() as { updated: number };
      queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      window.dispatchEvent(new Event(EVENTS.PENDING_APPROVALS_REFRESH));
      toast({
        title: `Undone — ${data.updated} user${data.updated !== 1 ? "s" : ""} moved back to pending`,
      });
      if (auditLogLoaded) void fetchAuditLog();
    } catch (err) {
      toast({ title: (err as Error).message, variant: "destructive" });
    }
  };

  const handleBulkAction = async (action: "approve" | "reject", reason?: string) => {
    if (selectedPendingIds.size === 0) return;
    const affectedIds = Array.from(selectedPendingIds);
    setBulkActioning(true);
    setShowBulkRejectReason(false);
    setBulkRejectReason("");
    try {
      const authToken = token ?? localStorage.getItem("lms_token");
      const resp = await fetch("/api/users/bulk-action", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ userIds: affectedIds, action, ...(reason ? { reason } : {}) }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? `Failed to ${action} users`);
      }
      const data = await resp.json() as { updated: number; updatedIds?: number[] };
      const undoIds = data.updatedIds ?? affectedIds;
      setSelectedPendingIds(new Set());
      queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      window.dispatchEvent(new Event(EVENTS.PENDING_APPROVALS_REFRESH));
      const undoAction = (
        <UndoCountdownAction
          duration={5}
          onUndo={() => void handleBulkUndo(undoIds, action)}
        />
      );
      toast({
        title: action === "approve"
          ? `${data.updated} user${data.updated !== 1 ? "s" : ""} approved`
          : `${data.updated} user${data.updated !== 1 ? "s" : ""} rejected`,
        duration: 5000,
        action: undoAction,
      });
      if (auditLogLoaded) void fetchAuditLog();
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
      window.dispatchEvent(new Event(EVENTS.PENDING_APPROVALS_REFRESH));
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

  const handleOpenTestEmailPreview = async () => {
    setTestEmailPreviewLoading(true);
    try {
      const authToken = token ?? localStorage.getItem("lms_token");
      const resp = await fetch("/api/settings/email/test/preview", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? "Failed to load email preview");
      }
      const data = await resp.json() as { subject: string; from: string; to: string; html: string };
      setTestEmailPreview(data);
      setTestEmailPreviewOpen(true);
    } catch (err) {
      toast({ title: (err as Error).message, variant: "destructive" });
    } finally {
      setTestEmailPreviewLoading(false);
    }
  };

  const handleSendTestEmail = async () => {
    setEmailFromTesting(true);
    try {
      const authToken = token ?? localStorage.getItem("lms_token");
      const resp = await fetch("/api/settings/email/test", {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? "Failed to send test email");
      }
      const data = await resp.json() as { message: string };
      setTestEmailPreviewOpen(false);
      toast({ title: data.message });
    } catch (err) {
      toast({ title: (err as Error).message, variant: "destructive" });
    } finally {
      setEmailFromTesting(false);
    }
  };

  const loadGeneralSettings = useCallback(async () => {
    try {
      const authToken = token ?? localStorage.getItem("lms_token");
      const resp = await fetch("/api/settings/general", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!resp.ok) return;
      const data = await resp.json() as {
        platformName: string | null;
        supportEmail: string | null;
        defaultEnrollmentMode: "open" | "approval_required" | null;
      };
      setPlatformName(data.platformName ?? "");
      setSupportEmail(data.supportEmail ?? "");
      setDefaultEnrollmentMode(data.defaultEnrollmentMode ?? "");
      setGeneralSettingsLoaded(true);
    } catch { /* silently ignore */ }
  }, [token]);

  const handleSaveGeneralSettings = async () => {
    setGeneralSettingsSaving(true);
    try {
      const authToken = token ?? localStorage.getItem("lms_token");
      const resp = await fetch("/api/settings/general", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({
          platformName: platformName.trim() || null,
          supportEmail: supportEmail.trim() || null,
          defaultEnrollmentMode: defaultEnrollmentMode || null,
        }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? "Failed to save settings");
      }
      const data = await resp.json() as {
        platformName: string | null;
        supportEmail: string | null;
        defaultEnrollmentMode: "open" | "approval_required" | null;
      };
      setPlatformName(data.platformName ?? "");
      setSupportEmail(data.supportEmail ?? "");
      setDefaultEnrollmentMode(data.defaultEnrollmentMode ?? "");
      toast({ title: "Platform settings saved" });
    } catch (err) {
      toast({ title: (err as Error).message, variant: "destructive" });
    } finally {
      setGeneralSettingsSaving(false);
    }
  };

  const fetchAuditLog = useCallback(async () => {
    setAuditLogLoading(true);
    try {
      const authToken = token ?? localStorage.getItem("lms_token");
      const resp = await fetch("/api/admin-actions", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (resp.ok) {
        const data = await resp.json() as AdminAction[];
        setAuditLog(data);
        setAuditLogLoaded(true);
      }
    } catch { /* silently ignore */ }
    finally { setAuditLogLoading(false); }
  }, [token]);

  const handleBulkEnrollmentUndo = async (
    enrollmentIds: number[],
    enrollmentPairs: { userId: number; courseId: number }[],
    action: "approve" | "reject"
  ) => {
    try {
      const authToken = token ?? localStorage.getItem("lms_token");
      const body = action === "approve"
        ? { action, enrollmentIds }
        : { action, enrollments: enrollmentPairs };
      const resp = await fetch("/api/enrollments/bulk-undo", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify(body),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? "Failed to undo action");
      }
      const data = await resp.json() as { updated: number };
      await fetchPendingEnrollments();
      window.dispatchEvent(new Event(EVENTS.PENDING_APPROVALS_REFRESH));
      toast({
        title: `Undone — ${data.updated} enrollment${data.updated !== 1 ? "s" : ""} moved back to pending`,
      });
      if (auditLogLoaded) void fetchAuditLog();
    } catch (err) {
      toast({ title: (err as Error).message, variant: "destructive" });
    }
  };

  const handleBulkEnrollmentAction = async (action: "approve" | "reject", reason?: string) => {
    if (selectedEnrollmentIds.size === 0) return;
    const affectedIds = Array.from(selectedEnrollmentIds);
    const affectedPairs = pendingEnrollments
      .filter(e => selectedEnrollmentIds.has(e.id))
      .map(e => ({ userId: e.userId, courseId: e.courseId }));
    setBulkEnrollmentActioning(true);
    setShowBulkEnrollmentRejectReason(false);
    setBulkEnrollmentRejectReason("");
    try {
      const authToken = token ?? localStorage.getItem("lms_token");
      const resp = await fetch("/api/enrollments/bulk-action", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ enrollmentIds: affectedIds, action, ...(reason ? { reason } : {}) }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? `Failed to ${action} enrollments`);
      }
      const data = await resp.json() as { updated: number; updatedIds?: number[] };
      const undoIds = data.updatedIds ?? affectedIds;
      setSelectedEnrollmentIds(new Set());
      await fetchPendingEnrollments();
      window.dispatchEvent(new Event(EVENTS.PENDING_APPROVALS_REFRESH));
      const undoAction = (
        <UndoCountdownAction
          duration={5}
          onUndo={() => void handleBulkEnrollmentUndo(undoIds, affectedPairs, action)}
        />
      );
      toast({
        title: action === "approve"
          ? `${data.updated} enrollment${data.updated !== 1 ? "s" : ""} approved`
          : `${data.updated} enrollment${data.updated !== 1 ? "s" : ""} rejected`,
        duration: 5000,
        action: undoAction,
      });
      if (auditLogLoaded) void fetchAuditLog();
    } catch (err) {
      toast({ title: (err as Error).message, variant: "destructive" });
    } finally {
      setBulkEnrollmentActioning(false);
    }
  };

  const loadSupabaseConfig = useCallback(async () => {
    try {
      const authToken = token ?? localStorage.getItem("lms_token");
      const resp = await fetch("/api/settings/supabase", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!resp.ok) return;
      const data = await resp.json() as { url: string; hasCustomConfig: boolean };
      setSupabaseCurrentUrl(data.url ?? "");
      setSupabaseUrl(data.url ?? "");
      setSupabaseConfigLoaded(true);
    } catch { /* silently ignore */ }
  }, [token]);

  const handleOpenSupabaseDialog = useCallback(async () => {
    if (!supabaseConfigLoaded) await loadSupabaseConfig();
    setSupabaseServiceKey("");
    setSupabaseDialogOpen(true);
  }, [supabaseConfigLoaded, loadSupabaseConfig]);

  const handleSaveSupabaseConfig = async () => {
    setSupabaseSaving(true);
    try {
      const authToken = token ?? localStorage.getItem("lms_token");
      const resp = await fetch("/api/settings/supabase", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ url: supabaseUrl, serviceRoleKey: supabaseServiceKey }),
      });
      const data = await resp.json() as { url?: string; error?: string };
      if (!resp.ok) throw new Error(data.error ?? "Failed to save");
      setSupabaseCurrentUrl(data.url ?? supabaseUrl);
      setSupabaseServiceKey("");
      setSupabaseDialogOpen(false);
      toast({ title: "Supabase credentials updated", description: "The server is now connected to the new project." });
    } catch (err) {
      toast({ title: "Connection failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSupabaseSaving(false);
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
      window.dispatchEvent(new Event(EVENTS.PENDING_APPROVALS_REFRESH));
      toast({ title: `${enrollment.user.name} approved for "${enrollment.course.title}"` });
      if (auditLogLoaded) void fetchAuditLog();
    } catch (err) {
      toast({ title: (err as Error).message, variant: "destructive" });
    } finally {
      setApprovingEnrollmentId(null);
    }
  };

  const handleRejectEnrollment = async (enrollment: PendingEnrollment, reason?: string) => {
    setRejectingEnrollmentId(enrollment.id);
    setPendingRejectEnrollmentId(null);
    setRejectEnrollmentReason("");
    try {
      const authToken = token ?? localStorage.getItem("lms_token");
      const resp = await fetch(`/api/enrollments/${enrollment.id}/reject`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify(reason ? { reason } : {}),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? "Failed to reject enrollment");
      }
      await fetchPendingEnrollments();
      window.dispatchEvent(new Event(EVENTS.PENDING_APPROVALS_REFRESH));
      toast({ title: `Enrollment request from ${enrollment.user.name} rejected` });
      if (auditLogLoaded) void fetchAuditLog();
    } catch (err) {
      toast({ title: (err as Error).message, variant: "destructive" });
    } finally {
      setRejectingEnrollmentId(null);
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

        {/* Management tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="hidden">
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
                if (!generalSettingsLoaded) void loadGeneralSettings();
                if (!supabaseConfigLoaded) void loadSupabaseConfig();
              }}
            >
              <Wrench className="w-3.5 h-3.5 mr-1" />
              Maint.
              {maintActive && (
                <Badge variant="destructive" className="ml-1.5 text-xs px-1.5 py-0 h-4">ON</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="activity-log"
              data-testid="tab-activity-log"
              onClick={() => { if (!auditLogLoaded) void fetchAuditLog(); }}
            >
              <ScrollText className="w-3.5 h-3.5 mr-1" />
              Log
            </TabsTrigger>
          </TabsList>

          {/* ── Tracker tab ───────────────────────────────────────────── */}
          <TabsContent value="tracker" className="mt-4">
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold tracking-tight">Operations overview</h2>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Live
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Know who is learning now, then follow the time behind the activity.</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 bg-card"
                  onClick={() => void refetchPresence()}
                  disabled={presenceFetching}
                  data-testid="button-refresh-presence"
                  aria-label="Refresh presence data"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${presenceFetching ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Total Users", value: stats?.totalUsers ?? 0, icon: Users, bg: "#3b82f6" },
                  { label: "Total Courses", value: stats?.totalCourses ?? 0, icon: BookOpen, bg: "#8b5cf6" },
                  { label: "Enrollments", value: stats?.totalEnrollments ?? 0, icon: TrendingUp, bg: "#10b981" },
                ].map(({ label, value, icon: Icon, bg }) => (
                  <Card key={label} data-testid={`admin-stat-${label.toLowerCase().replace(/\s+/g, "-")}`} className="border-0" style={{ background: bg, boxShadow: `0 4px 18px ${bg}55` }}>
                    <CardContent className="pt-4 pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs" style={{ color: "rgba(255,255,255,0.8)" }}>{label}</p>
                          <p className="text-2xl font-bold" style={{ color: "#fff" }}>{value}</p>
                          {label === "Total Courses" && stats && (
                            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.7)" }} data-testid="enrollment-mode-summary">
                              {stats.openCourses} open / {stats.approvalGatedCourses} approval-gated
                            </p>
                          )}
                        </div>
                        <Icon className="w-8 h-8" style={{ color: "rgba(255,255,255,0.65)" }} />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {(pendingUsers.length > 0 || pendingEnrollments.length > 0 || pendingToolRequests.length > 0) && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" data-testid="pending-approvals-summary">
                  {pendingUsers.length > 0 && (
                    <Card className="border-0" style={{ background: "#f59e0b", boxShadow: "0 4px 18px #f59e0b55" }} data-testid="pending-users-card">
                      <CardContent className="pt-4 pb-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs" style={{ color: "rgba(255,255,255,0.8)" }}>Pending Accounts</p>
                            <p className="text-2xl font-bold" style={{ color: "#fff" }}>{pendingUsers.length}</p>
                            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.7)" }}>
                              {pendingUsers.length === 1 ? "account awaiting" : "accounts awaiting"} approval
                            </p>
                          </div>
                          <Clock className="w-8 h-8" style={{ color: "rgba(255,255,255,0.65)" }} />
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  {pendingEnrollments.length > 0 && (
                    <Card className="border-0" style={{ background: "#f97316", boxShadow: "0 4px 18px #f9731655" }} data-testid="pending-enrollments-card">
                      <CardContent className="pt-4 pb-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs" style={{ color: "rgba(255,255,255,0.8)" }}>Pending Enrollments</p>
                            <p className="text-2xl font-bold" style={{ color: "#fff" }}>{pendingEnrollments.length}</p>
                            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.7)" }}>
                              {pendingEnrollments.length === 1 ? "enrollment awaiting" : "enrollments awaiting"} approval
                            </p>
                          </div>
                          <GraduationCap className="w-8 h-8" style={{ color: "rgba(255,255,255,0.65)" }} />
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  {pendingToolRequests.length > 0 && (
                    <Card className="border-0" style={{ background: "#6366f1", boxShadow: "0 4px 18px #6366f155" }} data-testid="pending-tool-requests-card">
                      <CardContent className="pt-4 pb-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs" style={{ color: "rgba(255,255,255,0.8)" }}>Pending Tool Requests</p>
                            <p className="text-2xl font-bold" style={{ color: "#fff" }}>{pendingToolRequests.length}</p>
                            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.7)" }}>
                              {pendingToolRequests.length === 1 ? "request awaiting" : "requests awaiting"} approval
                            </p>
                          </div>
                          <Wrench className="w-8 h-8" style={{ color: "rgba(255,255,255,0.65)" }} />
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              <section
                className="rounded-xl border border-slate-200 bg-card shadow-sm overflow-hidden"
                aria-labelledby="presence-heading"
                data-testid="presence-section"
              >
                <div className="border-b border-slate-200 bg-slate-50/70 px-5 py-4 sm:px-6">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                        <Radio className="h-4 w-4" aria-hidden="true" />
                      </div>
                      <div>
                        <h3 id="presence-heading" className="font-semibold text-slate-900">Presence monitor</h3>
                        <p className="text-xs text-slate-500 mt-0.5">A rolling view of the community heartbeat.</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500" data-testid="presence-last-updated">
                      {presence?.asOf ? `Updated ${formatRelativePresence(presence.asOf)}` : "Waiting for first update"}
                    </p>
                  </div>
                </div>

                {presenceLoading ? (
                  <div className="p-5 sm:p-6 space-y-5" data-testid="presence-loading">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-20 rounded-lg" />)}
                    </div>
                    <Skeleton className="h-12 w-full" />
                    <div className="space-y-2">
                      {Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-16 w-full" />)}
                    </div>
                  </div>
                ) : presenceError ? (
                  <div className="flex flex-col items-center justify-center px-6 py-12 text-center" role="alert" data-testid="presence-error">
                    <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                      <AlertCircle className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <p className="font-medium text-slate-900">Presence data is unavailable</p>
                    <p className="mt-1 max-w-sm text-sm text-slate-500">The live monitor could not reach the tracker. Your other admin tools are still available.</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => void refetchPresence()}
                      data-testid="button-retry-presence"
                    >
                      Try again
                    </Button>
                  </div>
                ) : !presence ? (
                  <div className="flex flex-col items-center justify-center px-6 py-12 text-center" data-testid="presence-empty">
                    <Activity className="mb-3 h-8 w-8 text-slate-300" aria-hidden="true" />
                    <p className="font-medium text-slate-900">No presence snapshot yet</p>
                    <p className="mt-1 text-sm text-slate-500">Live activity will appear here as soon as tracking starts.</p>
                  </div>
                ) : (
                  <div className="p-5 sm:p-6 space-y-6">
                     {presence.migrationRequired && (
                       <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900" role="status" data-testid="presence-migration-notice">
                         <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
                         <div>
                           <p className="text-sm font-semibold">Detailed time tracking needs one database update</p>
                           <p className="mt-1 text-xs text-amber-800/80">
                             Live status is available, but online/offline history will start after the
                             <span className="font-mono"> user_presence_sessions </span>
                             table is added from the latest Supabase setup SQL.
                           </p>
                         </div>
                       </div>
                     )}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3" aria-label="Presence totals">
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-4" data-testid="presence-stat-online">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800">Live now</p>
                          <Wifi className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                        </div>
                        <p className="mt-2 font-mono text-3xl font-bold tracking-tight text-emerald-950">{presence.onlineCount}</p>
                        <p className="mt-1 text-xs text-emerald-800/75">of {presence.totalUsers} members</p>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4" data-testid="presence-stat-tracked">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">Tracked today</p>
                          <TimerReset className="h-4 w-4 text-slate-500" aria-hidden="true" />
                        </div>
                        <p className="mt-2 font-mono text-3xl font-bold tracking-tight text-slate-900">{presence.trackedToday}</p>
                        <p className="mt-1 text-xs text-slate-500">members with activity</p>
                      </div>
                      <div className="col-span-2 md:col-span-1 rounded-lg border border-slate-200 bg-white p-4">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">Snapshot</p>
                          <Activity className="h-4 w-4 text-slate-500" aria-hidden="true" />
                        </div>
                        <p className="mt-2 font-mono text-xl font-bold tracking-tight text-slate-900">{formatTimestamp(presence.asOf)}</p>
                        <p className="mt-1 text-xs text-slate-500">Refreshes every 15 seconds</p>
                      </div>
                    </div>

                    <div>
                      <div className="mb-3 flex items-end justify-between gap-3">
                        <div>
                          <h4 className="font-semibold text-slate-900">People live right now</h4>
                          <p className="text-xs text-slate-500 mt-0.5">Active sessions and their current duration.</p>
                        </div>
                        <span className="font-mono text-xs font-bold text-emerald-700" data-testid="live-user-count-label">
                          {presence.liveUsers.length} {presence.liveUsers.length === 1 ? "person" : "people"}
                        </span>
                      </div>
                      {presence.liveUsers.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/60 px-5 py-8 text-center" data-testid="live-users-empty">
                          <WifiOff className="mx-auto h-6 w-6 text-slate-400" aria-hidden="true" />
                          <p className="mt-2 text-sm font-medium text-slate-700">The community is quiet right now</p>
                          <p className="mt-1 text-xs text-slate-500">No active sessions in the latest snapshot.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3" data-testid="live-users-list">
                          {presence.liveUsers.map((liveUser) => (
                            <div
                              key={liveUser.id}
                              className="group flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 transition-transform duration-200 hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-sm"
                              data-testid={`live-user-${liveUser.id}`}
                            >
                              <div className="relative shrink-0">
                                <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                                  <AvatarImage src={liveUser.avatar ?? undefined} alt={`${liveUser.name} avatar`} />
                                  <AvatarFallback className="bg-slate-100 text-xs font-bold text-slate-600">{presenceInitials(liveUser.name)}</AvatarFallback>
                                </Avatar>
                                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" aria-label="Online" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="truncate text-sm font-semibold text-slate-900" data-testid={`text-live-user-name-${liveUser.id}`}>{liveUser.name}</p>
                                  <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">{roleLabel(liveUser.role)}</span>
                                </div>
                                <p className="truncate text-xs text-slate-500">{liveUser.email}</p>
                                <p className="mt-1 text-[11px] text-slate-500">
                                  Started {formatTimestamp(liveUser.startedAt)} · Seen {formatRelativePresence(liveUser.lastSeen)}
                                </p>
                              </div>
                              <div className="shrink-0 text-right">
                                <p className="font-mono text-sm font-bold text-emerald-700" data-testid={`text-live-duration-${liveUser.id}`}>{formatDuration(liveUser.currentSeconds)}</p>
                                <p className="text-[10px] uppercase tracking-wider text-slate-400">this session</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="mb-3">
                        <h4 className="font-semibold text-slate-900">Daily time ledger</h4>
                        <p className="text-xs text-slate-500 mt-0.5">Online and offline time for every tracked member, today.</p>
                      </div>
                      {presence.users.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-slate-300 px-5 py-8 text-center text-sm text-slate-500" data-testid="time-ledger-empty">
                          No user time records are available for today.
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-lg border border-slate-200" data-testid="time-ledger">
                          <div className="min-w-[760px]">
                            <div className="grid grid-cols-[minmax(220px,1.5fr)_minmax(120px,0.8fr)_minmax(120px,0.8fr)_80px_minmax(130px,0.9fr)] gap-3 bg-slate-50 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                              <span>Member</span>
                              <span>Online today</span>
                              <span>Offline today</span>
                              <span>Sessions</span>
                              <span>Last activity</span>
                            </div>
                            <div className="divide-y divide-slate-200">
                              {presence.users.map((summaryUser) => (
                                <div key={summaryUser.id} className="grid grid-cols-[minmax(220px,1.5fr)_minmax(120px,0.8fr)_minmax(120px,0.8fr)_80px_minmax(130px,0.9fr)] items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50/80" data-testid={`presence-user-row-${summaryUser.id}`}>
                                  <div className="flex min-w-0 items-center gap-3">
                                    <div className="relative shrink-0">
                                      <Avatar className="h-8 w-8">
                                        <AvatarImage src={summaryUser.avatar ?? undefined} alt={`${summaryUser.name} avatar`} />
                                        <AvatarFallback className="bg-slate-100 text-[10px] font-bold text-slate-600">{presenceInitials(summaryUser.name)}</AvatarFallback>
                                      </Avatar>
                                      <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white ${summaryUser.isOnline ? "bg-emerald-500" : "bg-slate-300"}`} aria-label={summaryUser.isOnline ? "Online" : "Offline"} />
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2">
                                        <p className="truncate text-sm font-medium text-slate-900">{summaryUser.name}</p>
                                        <span className={`shrink-0 text-[10px] font-semibold uppercase tracking-wide ${summaryUser.isOnline ? "text-emerald-700" : "text-slate-400"}`}>{summaryUser.isOnline ? "Online" : "Offline"}</span>
                                      </div>
                                      <div className="flex items-center gap-2 min-w-0">
                                        <p className="truncate text-xs text-slate-500">{summaryUser.email}</p>
                                        <span className="shrink-0 text-[10px] text-slate-400">{roleLabel(summaryUser.role)}</span>
                                      </div>
                                    </div>
                                  </div>
                                  <p className="font-mono text-xs font-semibold text-emerald-700" data-testid={`online-time-${summaryUser.id}`}>{formatDuration(summaryUser.onlineSecondsToday)}</p>
                                  <p className="font-mono text-xs text-slate-600" data-testid={`offline-time-${summaryUser.id}`}>{formatDuration(summaryUser.offlineSecondsToday)}</p>
                                  <p className="font-mono text-xs text-slate-700" data-testid={`session-count-${summaryUser.id}`}>{summaryUser.sessionsToday}</p>
                                  <div className="text-xs text-slate-500">
                                    <p>{summaryUser.isOnline ? formatRelativePresence(summaryUser.lastSeen) : formatRelativePresence(summaryUser.lastOfflineAt)}</p>
                                    <p className="mt-0.5 text-[10px] text-slate-400">Online {formatTimestamp(summaryUser.lastOnlineAt)}</p>
                                    <p className="text-[10px] text-slate-400">Offline {formatTimestamp(summaryUser.lastOfflineAt)}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </section>
            </div>
          </TabsContent>

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
                    <div className="flex flex-col gap-2" data-testid="bulk-action-toolbar">
                      <div className="flex items-center gap-2">
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
                          onClick={() => setShowBulkRejectReason(v => !v)}
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
                      {showBulkRejectReason && (
                        <div className="space-y-2" data-testid="bulk-reject-reason-form">
                          <Textarea
                            placeholder="Optional: reason for rejection (included in all notification emails)"
                            className="text-xs min-h-[60px] resize-none"
                            value={bulkRejectReason}
                            onChange={e => setBulkRejectReason(e.target.value)}
                            data-testid="bulk-reject-reason-input"
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-7 text-xs gap-1"
                              onClick={() => handleBulkAction("reject", bulkRejectReason || undefined)}
                              disabled={bulkActioning}
                              data-testid="bulk-reject-confirm-btn"
                            >
                              <XCircle className="w-3 h-3" /> Confirm Reject
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs"
                              onClick={() => { setShowBulkRejectReason(false); setBulkRejectReason(""); }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
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
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <CardTitle className="text-base flex items-center gap-2">
                    Pending Course Enrollments
                    <Badge variant="secondary" className="text-xs font-normal">{pendingEnrollments.length}</Badge>
                  </CardTitle>
                  {selectedEnrollmentIds.size > 0 && (
                    <div className="flex flex-col gap-2" data-testid="bulk-enrollment-action-toolbar">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{selectedEnrollmentIds.size} selected</span>
                        <Button
                          size="sm"
                          className="h-7 gap-1 text-xs"
                          onClick={() => setShowBulkEnrollmentApproveConfirm(true)}
                          disabled={bulkEnrollmentActioning}
                          data-testid="bulk-enrollment-approve-btn"
                        >
                          {bulkEnrollmentActioning ? (
                            <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <><CheckCircle className="w-3 h-3" /> Approve selected</>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-7 gap-1 text-xs"
                          onClick={() => setShowBulkEnrollmentRejectReason(v => !v)}
                          disabled={bulkEnrollmentActioning}
                          data-testid="bulk-enrollment-reject-btn"
                        >
                          {bulkEnrollmentActioning ? (
                            <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <><XCircle className="w-3 h-3" /> Reject selected</>
                          )}
                        </Button>
                      </div>
                      {showBulkEnrollmentRejectReason && (
                        <div className="space-y-2" data-testid="bulk-enrollment-reject-reason-form">
                          <Textarea
                            placeholder="Optional: reason for rejection (included in all notification emails)"
                            className="text-xs min-h-[60px] resize-none"
                            value={bulkEnrollmentRejectReason}
                            onChange={e => setBulkEnrollmentRejectReason(e.target.value)}
                            data-testid="bulk-enrollment-reject-reason-input"
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-7 text-xs gap-1"
                              onClick={() => handleBulkEnrollmentAction("reject", bulkEnrollmentRejectReason || undefined)}
                              disabled={bulkEnrollmentActioning}
                              data-testid="bulk-enrollment-reject-confirm-btn"
                            >
                              <XCircle className="w-3 h-3" /> Confirm Reject
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs"
                              onClick={() => { setShowBulkEnrollmentRejectReason(false); setBulkEnrollmentRejectReason(""); }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
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
                    {/* Select all row */}
                    <div className="flex items-center gap-3 pb-3">
                      <Checkbox
                        data-testid="select-all-enrollments"
                        checked={selectedEnrollmentIds.size === pendingEnrollments.length && pendingEnrollments.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedEnrollmentIds(new Set(pendingEnrollments.map(e => e.id)));
                          } else {
                            setSelectedEnrollmentIds(new Set());
                          }
                        }}
                      />
                      <span className="text-xs text-muted-foreground">Select all</span>
                    </div>
                    {pendingEnrollments.map(enrollment => (
                      <div key={enrollment.id} className="py-4 border-b border-border last:border-0" data-testid={`enrollment-row-${enrollment.id}`}>
                        <div className="flex items-center gap-3">
                          <Checkbox
                            data-testid={`select-enrollment-${enrollment.id}`}
                            checked={selectedEnrollmentIds.has(enrollment.id)}
                            onCheckedChange={(checked) => {
                              setSelectedEnrollmentIds(prev => {
                                const next = new Set(prev);
                                if (checked) next.add(enrollment.id);
                                else next.delete(enrollment.id);
                                return next;
                              });
                            }}
                          />
                          <Avatar className="w-10 h-10 flex-shrink-0">
                            <AvatarImage src={enrollment.user.avatar ?? undefined} />
                            <AvatarFallback className="text-xs bg-muted font-semibold">
                              {enrollment.user.name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">{enrollment.user.name}</p>
                            <p className="text-xs text-muted-foreground truncate">wants to join: <span className="font-medium text-foreground">{enrollment.course.title}</span></p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {enrollment.createdAt && (
                                <p className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(enrollment.createdAt), { addSuffix: true })}
                                </p>
                              )}
                              {enrollment.course.enrollmentMode && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] px-1.5 py-0 h-4 font-normal border-amber-400 text-amber-700 dark:border-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30"
                                  data-testid={`enrollment-mode-badge-${enrollment.id}`}
                                >
                                  {enrollment.course.enrollmentMode === "approval_required" ? "Approval Required" : enrollment.course.enrollmentMode}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Button
                              size="sm"
                              className="h-8 gap-1 text-xs"
                              onClick={() => handleApproveEnrollment(enrollment)}
                              disabled={approvingEnrollmentId === enrollment.id || rejectingEnrollmentId === enrollment.id}
                              data-testid={`approve-enrollment-${enrollment.id}`}
                            >
                              {approvingEnrollmentId === enrollment.id ? (
                                <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <><CheckCircle className="w-3 h-3" /> Approve</>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-8 gap-1 text-xs"
                              onClick={() => {
                                if (pendingRejectEnrollmentId === enrollment.id) {
                                  setPendingRejectEnrollmentId(null);
                                  setRejectEnrollmentReason("");
                                } else {
                                  setPendingRejectEnrollmentId(enrollment.id);
                                  setRejectEnrollmentReason("");
                                }
                              }}
                              disabled={approvingEnrollmentId === enrollment.id || rejectingEnrollmentId === enrollment.id}
                              data-testid={`reject-enrollment-${enrollment.id}`}
                            >
                              {rejectingEnrollmentId === enrollment.id ? (
                                <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <><XCircle className="w-3 h-3" /> Reject</>
                              )}
                            </Button>
                          </div>
                        </div>
                        {pendingRejectEnrollmentId === enrollment.id && (
                          <div className="mt-3 ml-13 space-y-2 pl-[52px]" data-testid={`reject-reason-form-${enrollment.id}`}>
                            <Textarea
                              placeholder="Optional: provide a reason for rejection (included in notification email)"
                              className="text-xs min-h-[60px] resize-none"
                              value={rejectEnrollmentReason}
                              onChange={e => setRejectEnrollmentReason(e.target.value)}
                              data-testid={`reject-reason-input-${enrollment.id}`}
                              autoFocus
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-7 text-xs gap-1"
                                onClick={() => handleRejectEnrollment(enrollment, rejectEnrollmentReason || undefined)}
                                data-testid={`reject-reason-confirm-${enrollment.id}`}
                              >
                                <XCircle className="w-3 h-3" /> Confirm Reject
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs"
                                onClick={() => { setPendingRejectEnrollmentId(null); setRejectEnrollmentReason(""); }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}
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
                          className={`py-4 ${isBlocked ? "opacity-60" : ""}`}
                        >
                          <div className="flex items-start gap-3">
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
                            {u.lastAction && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground" data-testid={`last-action-${u.id}`}>
                                <Shield className="w-3 h-3 flex-shrink-0" />
                                <span>
                                  {formatActionLabel(u.lastAction.action)} by {u.lastAction.actorName}{" "}
                                  {formatDistanceToNow(new Date(u.lastAction.createdAt), { addSuffix: true })}
                                </span>
                              </div>
                            )}
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
                                onClick={() => {
                                  if (isBlocked) {
                                    handleToggleBlock(u);
                                  } else if (pendingBlockUserId === u.id) {
                                    setPendingBlockUserId(null);
                                    setBlockUserReason("");
                                  } else {
                                    setPendingBlockUserId(u.id);
                                    setBlockUserReason("");
                                  }
                                }}
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
                          {pendingBlockUserId === u.id && !isBlocked && (
                            <div className="mt-3 pl-[52px] space-y-2" data-testid={`block-reason-form-${u.id}`}>
                              <Textarea
                                placeholder="Optional: provide a reason for blocking this user (included in notification email)"
                                className="text-xs min-h-[60px] resize-none"
                                value={blockUserReason}
                                onChange={e => setBlockUserReason(e.target.value)}
                                data-testid={`block-reason-input-${u.id}`}
                                autoFocus
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="h-7 text-xs gap-1"
                                  onClick={() => handleToggleBlock(u, blockUserReason || undefined)}
                                  data-testid={`block-reason-confirm-${u.id}`}
                                >
                                  <Ban className="w-3 h-3" /> Confirm Block
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs"
                                  onClick={() => { setPendingBlockUserId(null); setBlockUserReason(""); }}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          )}
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
                        <button
                          data-testid={`toggle-enrollment-mode-${course.id}`}
                          onClick={() => void handleToggleEnrollmentMode(course)}
                          disabled={togglingEnrollmentModeId === course.id}
                          title={course.enrollmentMode === "open" ? "Switch to Approval Required" : "Switch to Open"}
                          className="flex-shrink-0 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {course.enrollmentMode === "open" ? (
                            <Badge
                              data-testid={`enrollment-mode-badge-${course.id}`}
                              className="cursor-pointer bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-900/60 transition-colors"
                              variant="outline"
                            >
                              Open
                            </Badge>
                          ) : (
                            <Badge
                              data-testid={`enrollment-mode-badge-${course.id}`}
                              className="cursor-pointer bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800 dark:hover:bg-amber-900/60 transition-colors"
                              variant="outline"
                            >
                              Approval Required
                            </Badge>
                          )}
                        </button>
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

            {/* Supabase Database Connection card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  Database Connection
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Configure the Supabase project this platform reads and writes data from. Changes take effect immediately without restarting.
                </p>
                <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/40">
                  <Database className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground font-medium mb-0.5">Current Project URL</p>
                    <code className="text-sm font-mono truncate block">
                      {supabaseConfigLoaded ? (supabaseCurrentUrl || "—") : "Loading…"}
                    </code>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void handleOpenSupabaseDialog()}
                    data-testid="button-configure-supabase"
                  >
                    Change
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Platform settings card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
                  Platform Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!generalSettingsLoaded ? (
                  <div className="space-y-3">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="platform-name" className="text-sm">Platform Name</Label>
                      <Input
                        id="platform-name"
                        type="text"
                        placeholder="My LMS Platform"
                        value={platformName}
                        onChange={e => setPlatformName(e.target.value)}
                        data-testid="input-platform-name"
                      />
                      <p className="text-xs text-muted-foreground">
                        The name shown in emails and platform-wide headings. Leave blank to use the default.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="support-email" className="text-sm">Support Contact Email</Label>
                      <Input
                        id="support-email"
                        type="email"
                        placeholder="support@yourschool.com"
                        value={supportEmail}
                        onChange={e => setSupportEmail(e.target.value)}
                        data-testid="input-support-email"
                      />
                      <p className="text-xs text-muted-foreground">
                        Shown to users when they need help. Leave blank to omit the support contact from emails.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="default-enrollment-mode" className="text-sm">Default Enrollment Mode for New Courses</Label>
                      <Select
                        value={defaultEnrollmentMode}
                        onValueChange={v => setDefaultEnrollmentMode(v as "open" | "approval_required" | "")}
                      >
                        <SelectTrigger id="default-enrollment-mode" data-testid="select-default-enrollment-mode">
                          <SelectValue placeholder="Use system default (open)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Open — anyone can enroll immediately</SelectItem>
                          <SelectItem value="approval_required">Approval Required — admin must approve each enrollment</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        New courses will start with this enrollment mode. Course creators can change it per-course.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        onClick={handleSaveGeneralSettings}
                        disabled={generalSettingsSaving}
                        data-testid="button-save-general-settings"
                        className="w-full sm:w-auto"
                      >
                        {generalSettingsSaving ? "Saving…" : "Save Platform Settings"}
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

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
                    <div className="flex flex-wrap gap-2">
                      <Button
                        onClick={handleSaveEmailFrom}
                        disabled={emailFromSaving}
                        data-testid="button-save-email-from"
                        className="w-full sm:w-auto"
                      >
                        {emailFromSaving ? "Saving…" : "Save Address"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleOpenTestEmailPreview}
                        disabled={testEmailPreviewLoading || emailFromSaving}
                        data-testid="button-test-email"
                        className="w-full sm:w-auto"
                      >
                        {testEmailPreviewLoading ? "Loading…" : "Send Test Email"}
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


      {/* Screenshot viewer dialog */}
      <Dialog open={!!viewScreenshot} onOpenChange={open => { if (!open) setViewScreenshot(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ImageIcon className="w-4 h-4" />Payment Screenshot</DialogTitle>
          </DialogHeader>
          {viewScreenshot && (
            <div className="space-y-3">
              <img src={viewScreenshot} alt="Payment screenshot" className="w-full rounded-xl border object-contain max-h-[60vh]" />
              <a href={viewScreenshot} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                <ExternalLink className="w-3.5 h-3.5" />Open full size
              </a>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showBulkEnrollmentApproveConfirm} onOpenChange={setShowBulkEnrollmentApproveConfirm}>
        <DialogContent className="max-w-sm" data-testid="bulk-enrollment-approve-confirm-dialog">
          <DialogHeader>
            <DialogTitle>Approve {selectedEnrollmentIds.size} enrollment{selectedEnrollmentIds.size !== 1 ? "s" : ""}?</DialogTitle>
            <DialogDescription>
              This will approve {selectedEnrollmentIds.size} pending enrollment request{selectedEnrollmentIds.size !== 1 ? "s" : ""} and notify the students.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowBulkEnrollmentApproveConfirm(false)}
              disabled={bulkEnrollmentActioning}
            >
              Cancel
            </Button>
            <Button
              onClick={() => { setShowBulkEnrollmentApproveConfirm(false); void handleBulkEnrollmentAction("approve"); }}
              disabled={bulkEnrollmentActioning}
              data-testid="bulk-enrollment-approve-confirm-btn"
            >
              {bulkEnrollmentActioning ? (
                <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <><CheckCircle className="w-4 h-4 mr-1" /> Approve</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Supabase Configuration Dialog */}
      <Dialog open={supabaseDialogOpen} onOpenChange={setSupabaseDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="w-4 h-4" /> Supabase Configuration
            </DialogTitle>
            <DialogDescription>
              Enter your Supabase project URL and Service Role Key. The connection is tested before saving. Your current data is not affected until you confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="sb-url" className="text-sm">Project URL</Label>
              <Input
                id="sb-url"
                type="url"
                placeholder="https://xxxxxxxxxxxxxxxxxxxx.supabase.co"
                value={supabaseUrl}
                onChange={e => setSupabaseUrl(e.target.value)}
                disabled={supabaseSaving}
                data-testid="input-supabase-url"
              />
              <p className="text-xs text-muted-foreground">
                Supabase Dashboard → Settings → API → <strong>Project URL</strong>
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sb-key" className="text-sm">Service Role Key</Label>
              <Input
                id="sb-key"
                type="password"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…"
                value={supabaseServiceKey}
                onChange={e => setSupabaseServiceKey(e.target.value)}
                disabled={supabaseSaving}
                data-testid="input-supabase-service-key"
              />
              <p className="text-xs text-muted-foreground">
                Supabase Dashboard → Settings → API → <strong>service_role</strong> secret key. Never share this publicly.
              </p>
            </div>
            <div className="rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
              The connection will be tested before saving. If the test fails the current credentials are kept.
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSupabaseDialogOpen(false)}
              disabled={supabaseSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleSaveSupabaseConfig()}
              disabled={supabaseSaving || !supabaseUrl.trim() || !supabaseServiceKey.trim()}
              data-testid="button-save-supabase"
            >
              {supabaseSaving ? (
                <><span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin mr-2" />Testing connection…</>
              ) : "Save & Connect"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={testEmailPreviewOpen} onOpenChange={setTestEmailPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Test Email Preview</DialogTitle>
            <DialogDescription>
              Review the email below before sending it to your inbox.
            </DialogDescription>
          </DialogHeader>
          {testEmailPreview && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-[80px_1fr] gap-x-3 gap-y-1.5">
                <span className="text-muted-foreground font-medium">From</span>
                <span className="font-mono break-all">{testEmailPreview.from}</span>
                <span className="text-muted-foreground font-medium">To</span>
                <span className="font-mono break-all">{testEmailPreview.to}</span>
                <span className="text-muted-foreground font-medium">Subject</span>
                <span>{testEmailPreview.subject}</span>
              </div>
              <div className="border rounded-md overflow-hidden">
                <div className="bg-muted px-3 py-1.5 text-xs text-muted-foreground font-medium border-b">Email Body</div>
                <div
                  className="p-4 prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: testEmailPreview.html }}
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setTestEmailPreviewOpen(false)} disabled={emailFromTesting}>
              Cancel
            </Button>
            <Button onClick={handleSendTestEmail} disabled={emailFromTesting} data-testid="button-confirm-send-test-email">
              {emailFromTesting ? "Sending…" : "Send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
