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
import { Trash2, Users, BookOpen, MessageSquare, TrendingUp, Shield, Ban, CheckCircle, Clock, Calendar, GraduationCap, Wrench, XCircle, ScrollText } from "lucide-react";
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

type CourseWithMode = {
  id: number;
  title: string;
  description?: string | null;
  thumbnail?: string | null;
  lessonCount: number;
  enrollmentCount: number;
  enrollmentMode?: "open" | "approval_required";
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
        <ToastAction
          altText="Undo bulk action"
          data-testid="bulk-undo-btn"
          onClick={() => void handleBulkUndo(undoIds, action)}
        >
          Undo
        </ToastAction>
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

  const handleBulkEnrollmentAction = async (action: "approve" | "reject", reason?: string) => {
    if (selectedEnrollmentIds.size === 0) return;
    setBulkEnrollmentActioning(true);
    setShowBulkEnrollmentRejectReason(false);
    setBulkEnrollmentRejectReason("");
    try {
      const authToken = token ?? localStorage.getItem("lms_token");
      const resp = await fetch("/api/enrollments/bulk-action", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ enrollmentIds: Array.from(selectedEnrollmentIds), action, ...(reason ? { reason } : {}) }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? `Failed to ${action} enrollments`);
      }
      const data = await resp.json() as { updated: number };
      setSelectedEnrollmentIds(new Set());
      await fetchPendingEnrollments();
      window.dispatchEvent(new Event(EVENTS.PENDING_APPROVALS_REFRESH));
      toast({
        title: action === "approve"
          ? `${data.updated} enrollment${data.updated !== 1 ? "s" : ""} approved`
          : `${data.updated} enrollment${data.updated !== 1 ? "s" : ""} rejected`,
      });
      if (auditLogLoaded) void fetchAuditLog();
    } catch (err) {
      toast({ title: (err as Error).message, variant: "destructive" });
    } finally {
      setBulkEnrollmentActioning(false);
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
          <TabsList className="grid grid-cols-8 w-full max-w-4xl">
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
                            {enrollment.createdAt && (
                              <p className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(enrollment.createdAt), { addSuffix: true })}
                              </p>
                            )}
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
                    {(courses as CourseWithMode[] | undefined)?.map(course => (
                      <div key={course.id} data-testid={`course-row-${course.id}`} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                        {course.thumbnail && (
                          <img src={course.thumbnail} alt="" className="w-10 h-8 object-cover rounded flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{course.title}</p>
                          <p className="text-xs text-muted-foreground">{course.lessonCount} lessons · {course.enrollmentCount} enrolled</p>
                        </div>
                        {course.enrollmentMode === "open" ? (
                          <Badge
                            data-testid={`enrollment-mode-badge-${course.id}`}
                            className="flex-shrink-0 bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
                            variant="outline"
                          >
                            Open
                          </Badge>
                        ) : (
                          <Badge
                            data-testid={`enrollment-mode-badge-${course.id}`}
                            className="flex-shrink-0 bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800"
                            variant="outline"
                          >
                            Approval Required
                          </Badge>
                        )}
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

          {/* ── Activity Log tab ──────────────────────────────────────── */}
          <TabsContent value="activity-log" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ScrollText className="w-4 h-4" />
                    Activity Log
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void fetchAuditLog()}
                    disabled={auditLogLoading}
                    data-testid="button-refresh-audit-log"
                  >
                    {auditLogLoading ? "Refreshing…" : "Refresh"}
                  </Button>
                </div>
                {/* Filter bar */}
                <div className="flex flex-wrap items-end gap-3 pt-3" data-testid="audit-log-filter-bar">
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs text-muted-foreground">Action type</Label>
                    <Select
                      value={auditLogActionFilter}
                      onValueChange={setAuditLogActionFilter}
                    >
                      <SelectTrigger className="w-48 h-8 text-xs" data-testid="select-audit-action-filter">
                        <SelectValue placeholder="All actions" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All actions</SelectItem>
                        <SelectItem value="user_approved">Account approved</SelectItem>
                        <SelectItem value="user_rejected">Account rejected</SelectItem>
                        <SelectItem value="user_blocked">Account blocked</SelectItem>
                        <SelectItem value="user_unblocked">Account unblocked</SelectItem>
                        <SelectItem value="enrollment_approved">Enrollment approved</SelectItem>
                        <SelectItem value="enrollment_rejected">Enrollment rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs text-muted-foreground">From</Label>
                    <Input
                      type="date"
                      className="h-8 text-xs w-36"
                      value={auditLogStartDate}
                      onChange={e => setAuditLogStartDate(e.target.value)}
                      data-testid="input-audit-start-date"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs text-muted-foreground">To</Label>
                    <Input
                      type="date"
                      className="h-8 text-xs w-36"
                      value={auditLogEndDate}
                      onChange={e => setAuditLogEndDate(e.target.value)}
                      data-testid="input-audit-end-date"
                    />
                  </div>
                  {(auditLogActionFilter !== "all" || auditLogStartDate || auditLogEndDate) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs self-end"
                      onClick={() => {
                        setAuditLogActionFilter("all");
                        setAuditLogStartDate("");
                        setAuditLogEndDate("");
                      }}
                      data-testid="button-clear-audit-filters"
                    >
                      Clear filters
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {(() => {
                  const actionLabels: Record<string, { label: string; color: string }> = {
                    user_approved: { label: "Account approved", color: "text-green-600 dark:text-green-400" },
                    user_rejected: { label: "Account rejected", color: "text-red-600 dark:text-red-400" },
                    user_blocked: { label: "Account blocked", color: "text-orange-600 dark:text-orange-400" },
                    user_unblocked: { label: "Account unblocked", color: "text-blue-600 dark:text-blue-400" },
                    enrollment_approved: { label: "Enrollment approved", color: "text-green-600 dark:text-green-400" },
                    enrollment_rejected: { label: "Enrollment rejected", color: "text-red-600 dark:text-red-400" },
                  };

                  const filteredLog = auditLog.filter(entry => {
                    if (auditLogActionFilter !== "all" && entry.action !== auditLogActionFilter) return false;
                    if (auditLogStartDate) {
                      const entryDate = new Date(entry.createdAt);
                      const start = new Date(auditLogStartDate);
                      start.setHours(0, 0, 0, 0);
                      if (entryDate < start) return false;
                    }
                    if (auditLogEndDate) {
                      const entryDate = new Date(entry.createdAt);
                      const end = new Date(auditLogEndDate);
                      end.setHours(23, 59, 59, 999);
                      if (entryDate > end) return false;
                    }
                    return true;
                  });

                  const hasActiveFilters = auditLogActionFilter !== "all" || auditLogStartDate || auditLogEndDate;

                  if (auditLogLoading && !auditLogLoaded) {
                    return (
                      <div className="space-y-3 py-2">
                        {[...Array(5)].map((_, i) => (
                          <Skeleton key={i} className="h-12 w-full" />
                        ))}
                      </div>
                    );
                  }

                  if (auditLog.length === 0) {
                    return (
                      <p className="text-sm text-muted-foreground py-6 text-center">
                        No actions recorded yet. Approvals and rejections will appear here.
                      </p>
                    );
                  }

                  if (filteredLog.length === 0) {
                    return (
                      <p className="text-sm text-muted-foreground py-6 text-center" data-testid="audit-log-empty-filtered">
                        No entries match the selected filters.
                      </p>
                    );
                  }

                  return (
                    <div className="overflow-x-auto">
                      {hasActiveFilters && (
                        <p className="text-xs text-muted-foreground mb-2" data-testid="audit-log-filter-count">
                          Showing {filteredLog.length} of {auditLog.length} entries
                        </p>
                      )}
                      <table className="w-full text-sm" data-testid="audit-log-table">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 pr-4 font-medium text-muted-foreground">When</th>
                            <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Action</th>
                            <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Target</th>
                            <th className="text-left py-2 pr-4 font-medium text-muted-foreground">By</th>
                            <th className="text-left py-2 font-medium text-muted-foreground">Reason</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredLog.map((entry) => {
                            const { label, color } = actionLabels[entry.action] ?? { label: entry.action, color: "" };
                            return (
                              <tr key={entry.id} className="border-b last:border-0 hover:bg-muted/30">
                                <td className="py-2.5 pr-4 text-muted-foreground whitespace-nowrap">
                                  {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
                                </td>
                                <td className={`py-2.5 pr-4 font-medium whitespace-nowrap ${color}`}>
                                  {label}
                                </td>
                                <td className="py-2.5 pr-4">
                                  {entry.targetUser ? (
                                    <span className="font-medium">{entry.targetUser.name}</span>
                                  ) : (
                                    <span className="text-muted-foreground italic">—</span>
                                  )}
                                </td>
                                <td className="py-2.5 pr-4 text-muted-foreground">
                                  {entry.actor?.name ?? "—"}
                                </td>
                                <td className="py-2.5 text-muted-foreground">
                                  {entry.reason ?? <span className="italic">—</span>}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

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
