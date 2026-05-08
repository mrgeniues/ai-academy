import { useState, useEffect, useCallback, useRef } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import {
  LayoutDashboard, BookOpen, Wrench, Crown, Users, MessageSquare, User,
  Shield, LogOut, Sun, Moon, Palette, Menu, GraduationCap, PanelLeftClose,
  PanelLeftOpen, ArrowLeft, Send, Trash2, ExternalLink, CheckCircle, Clock,
  XCircle, Users2, AlertTriangle, Loader2, Copy, UserCheck, UserX, Link2, Plus,
  Globe, Lock, ImageIcon, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const API = "/api";
function authH(token: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}
function jsonH(token: string | null) {
  return { "Content-Type": "application/json", ...authH(token) };
}
function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

type Section = "dashboard" | "courses" | "tools" | "vip-posts" | "posts" | "messages" | "profile" | "members";

type Community = {
  id: number; name: string; description: string | null;
  status: string; owner_id: number; isOwner: boolean; invite_code?: string | null;
  memberStatus: "approved" | "pending" | "rejected" | null;
  owner: { id: number; name: string; avatar: string | null } | null;
};
type CommunityPost = {
  id: number; content: string; created_at: string; user_id: number;
  users: { id: number; name: string; avatar: string | null } | null;
};
type CommunityMessage = {
  id: number; content: string; created_at: string; sender_id: number;
  users: { id: number; name: string; avatar: string | null } | null;
};
type CourseRow = {
  id: number; course_id: number; created_at: string;
  courses: { id: number; title: string; description: string | null; thumbnail: string | null } | null;
};
type ToolRow = {
  id: number; tool_id: number; created_at: string;
  tools: { id: number; title: string; description: string | null; image_url: string | null; tool_url: string | null } | null;
};
type Member = {
  id: number; status: string; created_at: string; user_id: number;
  users: { id: number; name: string; email: string; avatar: string | null } | null;
};
type AllCourse = { id: number; title: string; description: string | null; thumbnail: string | null };
type AllTool   = { id: number; title: string; description: string | null; image_url: string | null; tool_url: string | null };
type LessonDraft = { title: string; description: string; videoUrl: string };
type CourseEnrollment = {
  id: number; courseId: number; userId: number; createdAt: string;
  user: { id: number; name: string; email: string; avatar: string | null } | null;
  course: { id: number; title: string } | null;
};
type VipPost   = {
  id: number; content: string; created_at: string; user_id: number;
  users: { id: number; name: string; avatar: string | null } | null;
};

const NAV_ITEMS: { section: Section; label: string; icon: React.ElementType }[] = [
  { section: "dashboard",  label: "Dashboard",        icon: LayoutDashboard },
  { section: "courses",    label: "Courses",           icon: BookOpen },
  { section: "tools",      label: "AI Tools",          icon: Wrench },
  { section: "vip-posts",  label: "VIP Posts",         icon: Crown },
  { section: "posts",      label: "Community Posts",   icon: Users },
  { section: "messages",   label: "Messages",          icon: MessageSquare },
  { section: "members",    label: "My Approval Panel",  icon: UserCheck },
  { section: "profile",    label: "Profile",           icon: User },
];

export default function CommunityDashboardPage() {
  const [, params] = useRoute("/community-dashboard/:id");
  const communityId = parseInt(params?.id ?? "0", 10);
  const { token, user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const [section, setSection] = useState<Section>("dashboard");
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem("sidebar-collapsed") === "true"; } catch { return false; }
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [community, setCommunity] = useState<Community | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  const [members, setMembers] = useState<Member[]>([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [newPost, setNewPost] = useState("");
  const [posting, setPosting] = useState(false);
  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [tools, setTools] = useState<ToolRow[]>([]);
  const [allCourses, setAllCourses]     = useState<AllCourse[]>([]);
  const [allTools, setAllTools]         = useState<AllTool[]>([]);
  const [vipPosts, setVipPosts]         = useState<VipPost[]>([]);
  const [vipPostsLoading, setVipPostsLoading] = useState(false);
  const [newVipPost, setNewVipPost]     = useState("");
  const [postingVip, setPostingVip]     = useState(false);
  const [addingCourse, setAddingCourse] = useState<number | null>(null);
  const [removingCourse, setRemovingCourse] = useState<number | null>(null);
  const [addingTool, setAddingTool]     = useState<number | null>(null);
  const [removingTool, setRemovingTool] = useState<number | null>(null);
  const [courseSearch, setCourseSearch] = useState("");
  const [toolSearch, setToolSearch]     = useState("");
  // Create course dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [ccTitle, setCcTitle] = useState("");
  const [ccDescription, setCcDescription] = useState("");
  const [ccImageFile, setCcImageFile] = useState<File | null>(null);
  const [ccImagePreview, setCcImagePreview] = useState<string | null>(null);
  const [ccExternalUrl, setCcExternalUrl] = useState("");
  const [ccVisibility, setCcVisibility] = useState<"public" | "private">("public");
  const [ccEnrollmentMode, setCcEnrollmentMode] = useState<"open" | "approval_required">("approval_required");
  const [ccLessons, setCcLessons] = useState<LessonDraft[]>([{ title: "", description: "", videoUrl: "" }]);
  const [creatingCourse, setCreatingCourse] = useState(false);
  const ccImageInputRef = useRef<HTMLInputElement>(null);
  // Create tool dialog state
  const [ctDialogOpen, setCtDialogOpen] = useState(false);
  const [ctTitle, setCtTitle] = useState("");
  const [ctDescription, setCtDescription] = useState("");
  const [ctToolUrl, setCtToolUrl] = useState("");
  const [ctVideoUrl, setCtVideoUrl] = useState("");
  const [ctImageFile, setCtImageFile] = useState<File | null>(null);
  const [ctImagePreview, setCtImagePreview] = useState<string | null>(null);
  const [creatingTool, setCreatingTool] = useState(false);
  const ctImageInputRef = useRef<HTMLInputElement>(null);
  // Course enrollment requests (for My Approval Panel)
  const [courseEnrollments, setCourseEnrollments] = useState<CourseEnrollment[]>([]);
  const [actingEnrollment, setActingEnrollment] = useState<number | null>(null);
  const msgEndRef = useRef<HTMLDivElement>(null);

  // ── Fetch community + verify owner access ────────────────────────────────
  useEffect(() => {
    if (!communityId || !token) return;
    setLoading(true);
    fetch(`${API}/communities/${communityId}/panel`, { headers: authH(token) })
      .then(r => r.json())
      .then(d => {
        if (d.error) { setAccessDenied(true); return; }
        if (!d.isOwner) { setAccessDenied(true); return; }
        setCommunity(d);
      })
      .catch(() => setAccessDenied(true))
      .finally(() => setLoading(false));
  }, [communityId, token]);

  // ── Data fetchers ─────────────────────────────────────────────────────────
  const fetchPosts = useCallback(() => {
    setPostsLoading(true);
    fetch(`${API}/communities/${communityId}/posts`, { headers: authH(token) })
      .then(r => r.json()).then(d => { if (Array.isArray(d)) setPosts(d); })
      .catch(() => {}).finally(() => setPostsLoading(false));
  }, [communityId, token]);

  const fetchMessages = useCallback(() => {
    setMsgLoading(true);
    fetch(`${API}/communities/${communityId}/messages`, { headers: authH(token) })
      .then(r => r.json()).then(d => { if (Array.isArray(d)) setMessages(d); })
      .catch(() => {}).finally(() => setMsgLoading(false));
  }, [communityId, token]);

  const fetchCourses = useCallback(() => {
    fetch(`${API}/communities/${communityId}/courses`, { headers: authH(token) })
      .then(r => r.json()).then(d => { if (Array.isArray(d)) setCourses(d); })
      .catch(() => {});
  }, [communityId, token]);

  const fetchTools = useCallback(() => {
    fetch(`${API}/communities/${communityId}/tools`, { headers: authH(token) })
      .then(r => r.json()).then(d => { if (Array.isArray(d)) setTools(d); })
      .catch(() => {});
  }, [communityId, token]);

  const fetchMembers = useCallback(() => {
    fetch(`${API}/communities/${communityId}/members`, { headers: authH(token) })
      .then(r => r.json()).then(d => { if (Array.isArray(d)) setMembers(d); })
      .catch(() => {});
  }, [communityId, token]);

  const fetchAllCourses = useCallback(() => {
    fetch(`${API}/courses`, { headers: authH(token) })
      .then(r => r.json()).then(d => { if (Array.isArray(d)) setAllCourses(d); })
      .catch(() => {});
  }, [token]);

  const fetchAllTools = useCallback(() => {
    fetch(`${API}/tools`, { headers: authH(token) })
      .then(r => r.json()).then(d => { if (Array.isArray(d)) setAllTools(d); })
      .catch(() => {});
  }, [token]);

  const fetchVipPosts = useCallback(() => {
    setVipPostsLoading(true);
    fetch(`${API}/communities/${communityId}/vip-posts`, { headers: authH(token) })
      .then(r => r.json()).then(d => { if (Array.isArray(d)) setVipPosts(d); })
      .catch(() => {}).finally(() => setVipPostsLoading(false));
  }, [communityId, token]);

  const fetchCourseEnrollments = useCallback(() => {
    fetch(`${API}/communities/${communityId}/course-enrollments/pending`, { headers: authH(token) })
      .then(r => r.json()).then(d => { if (Array.isArray(d)) setCourseEnrollments(d); })
      .catch(() => {});
  }, [communityId, token]);

  useEffect(() => {
    if (!community) return;
    fetchPosts(); fetchMessages(); fetchCourses(); fetchTools(); fetchMembers();
  }, [community]);

  // Load management data when relevant sections are opened
  useEffect(() => {
    if (!community) return;
    if (section === "courses")   { fetchAllCourses(); }
    if (section === "tools")     { fetchAllTools(); }
    if (section === "vip-posts") { fetchVipPosts(); }
    if (section === "members")   { fetchCourseEnrollments(); }
  }, [section, community]);

  useEffect(() => { msgEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // ── Post community message ────────────────────────────────────────────────
  const submitPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.trim()) return;
    setPosting(true);
    try {
      const res = await fetch(`${API}/communities/${communityId}/posts`, {
        method: "POST", headers: jsonH(token),
        body: JSON.stringify({ content: newPost.trim() }),
      });
      if (res.ok) { setNewPost(""); fetchPosts(); }
      else toast({ title: "Failed to post", variant: "destructive" });
    } catch { toast({ title: "Network error", variant: "destructive" }); }
    finally { setPosting(false); }
  };

  const deletePost = async (postId: number) => {
    await fetch(`${API}/communities/${communityId}/posts/${postId}`, {
      method: "DELETE", headers: authH(token),
    });
    fetchPosts();
  };

  // ── Approve / reject member ───────────────────────────────────────────────
  const [actingMember, setActingMember] = useState<number | null>(null);
  const handleMemberStatus = async (userId: number, status: "approved" | "rejected") => {
    setActingMember(userId);
    try {
      const res = await fetch(`${API}/communities/${communityId}/members/${userId}`, {
        method: "PATCH", headers: jsonH(token),
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        fetchMembers();
        toast({ title: status === "approved" ? "Member approved" : "Member rejected" });
      } else {
        const d = await res.json() as { error?: string };
        toast({ title: d.error ?? "Failed", variant: "destructive" });
      }
    } catch { toast({ title: "Network error", variant: "destructive" }); }
    finally { setActingMember(null); }
  };

  // ── Course management (owner only) ───────────────────────────────────────
  const addCourse = async (courseId: number) => {
    setAddingCourse(courseId);
    try {
      const res = await fetch(`${API}/communities/${communityId}/courses`, {
        method: "POST", headers: jsonH(token),
        body: JSON.stringify({ courseId }),
      });
      if (res.ok) { fetchCourses(); toast({ title: "Course linked!" }); }
      else { const d = await res.json() as { error?: string }; toast({ title: d.error ?? "Failed", variant: "destructive" }); }
    } catch { toast({ title: "Network error", variant: "destructive" }); }
    finally { setAddingCourse(null); }
  };

  const removeCourse = async (courseId: number) => {
    setRemovingCourse(courseId);
    try {
      await fetch(`${API}/communities/${communityId}/courses/${courseId}`, { method: "DELETE", headers: authH(token) });
      fetchCourses();
      toast({ title: "Course removed" });
    } catch { toast({ title: "Network error", variant: "destructive" }); }
    finally { setRemovingCourse(null); }
  };

  const resetCreateDialog = () => {
    setCcTitle(""); setCcDescription(""); setCcImageFile(null); setCcImagePreview(null);
    setCcExternalUrl(""); setCcVisibility("public"); setCcEnrollmentMode("approval_required");
    setCcLessons([{ title: "", description: "", videoUrl: "" }]);
    if (ccImageInputRef.current) ccImageInputRef.current.value = "";
  };

  const createCourse = async () => {
    if (!ccTitle.trim()) { toast({ title: "Title is required", variant: "destructive" }); return; }
    setCreatingCourse(true);
    try {
      let thumbnailUrl: string | null = null;
      if (ccImageFile) {
        const fd = new FormData();
        fd.append("file", ccImageFile);
        const uploadResp = await fetch(`${API}/upload`, {
          method: "POST", headers: authH(token), body: fd,
        });
        if (!uploadResp.ok) {
          const errData = await uploadResp.json().catch(() => ({})) as { error?: string };
          throw new Error(errData.error ?? "Image upload failed");
        }
        const uploadData = await uploadResp.json() as { url: string };
        thumbnailUrl = uploadData.url;
      }

      const validLessons = ccLessons.filter(l => l.title.trim());
      const res = await fetch(`${API}/communities/${communityId}/courses/create`, {
        method: "POST", headers: jsonH(token),
        body: JSON.stringify({
          title: ccTitle.trim(),
          description: ccDescription.trim() || null,
          thumbnail: thumbnailUrl,
          externalUrl: ccExternalUrl.trim() || null,
          visibility: ccVisibility,
          enrollmentMode: ccEnrollmentMode,
          lessons: validLessons.map(l => ({
            title: l.title.trim(),
            description: l.description.trim() || null,
            videoUrl: l.videoUrl.trim() || null,
          })),
        }),
      });
      if (res.ok) {
        resetCreateDialog();
        setCreateDialogOpen(false);
        fetchCourses();
        toast({ title: "Course created and linked to your community!" });
      } else {
        const d = await res.json() as { error?: string };
        throw new Error(d.error ?? "Failed to create course");
      }
    } catch (err) {
      toast({ title: (err as Error).message ?? "Failed", variant: "destructive" });
    } finally { setCreatingCourse(false); }
  };

  const resetCreateToolDialog = () => {
    setCtTitle(""); setCtDescription(""); setCtToolUrl(""); setCtVideoUrl("");
    setCtImageFile(null); setCtImagePreview(null);
    if (ctImageInputRef.current) ctImageInputRef.current.value = "";
  };

  const createTool = async () => {
    if (!ctTitle.trim()) { toast({ title: "Title is required", variant: "destructive" }); return; }
    setCreatingTool(true);
    try {
      let imageUrl: string | null = null;
      if (ctImageFile) {
        const fd = new FormData();
        fd.append("file", ctImageFile);
        const uploadResp = await fetch(`${API}/upload`, { method: "POST", headers: authH(token), body: fd });
        if (!uploadResp.ok) {
          const e = await uploadResp.json().catch(() => ({})) as { error?: string };
          throw new Error(e.error ?? "Image upload failed");
        }
        const uploadData = await uploadResp.json() as { url: string };
        imageUrl = uploadData.url;
      }
      const res = await fetch(`${API}/communities/${communityId}/tools/create`, {
        method: "POST", headers: jsonH(token),
        body: JSON.stringify({
          title: ctTitle.trim(),
          description: ctDescription.trim() || null,
          imageUrl,
          videoUrl: ctVideoUrl.trim() || null,
          toolUrl: ctToolUrl.trim() || null,
        }),
      });
      if (res.ok) {
        resetCreateToolDialog();
        setCtDialogOpen(false);
        fetchTools();
        toast({ title: "AI Tool created and linked to your community!" });
      } else {
        const d = await res.json() as { error?: string };
        throw new Error(d.error ?? "Failed to create tool");
      }
    } catch (err) {
      toast({ title: (err as Error).message ?? "Failed", variant: "destructive" });
    } finally { setCreatingTool(false); }
  };

  const handleCourseEnrollmentAction = async (enrollmentId: number, action: "approve" | "reject") => {
    setActingEnrollment(enrollmentId);
    try {
      const res = await fetch(`${API}/communities/${communityId}/course-enrollments/${enrollmentId}/${action}`, {
        method: "PATCH", headers: authH(token),
      });
      if (res.ok) {
        fetchCourseEnrollments();
        toast({ title: action === "approve" ? "Enrollment approved!" : "Enrollment rejected" });
      } else {
        const d = await res.json() as { error?: string };
        toast({ title: d.error ?? "Failed", variant: "destructive" });
      }
    } catch { toast({ title: "Network error", variant: "destructive" }); }
    finally { setActingEnrollment(null); }
  };

  // ── Tool management (owner only) ──────────────────────────────────────────
  const addTool = async (toolId: number) => {
    setAddingTool(toolId);
    try {
      const res = await fetch(`${API}/communities/${communityId}/tools`, {
        method: "POST", headers: jsonH(token),
        body: JSON.stringify({ toolId }),
      });
      if (res.ok) { fetchTools(); toast({ title: "Tool linked!" }); }
      else { const d = await res.json() as { error?: string }; toast({ title: d.error ?? "Failed", variant: "destructive" }); }
    } catch { toast({ title: "Network error", variant: "destructive" }); }
    finally { setAddingTool(null); }
  };

  const removeTool = async (toolId: number) => {
    setRemovingTool(toolId);
    try {
      await fetch(`${API}/communities/${communityId}/tools/${toolId}`, { method: "DELETE", headers: authH(token) });
      fetchTools();
      toast({ title: "Tool removed" });
    } catch { toast({ title: "Network error", variant: "destructive" }); }
    finally { setRemovingTool(null); }
  };

  // ── VIP Post handlers ─────────────────────────────────────────────────────
  const submitVipPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVipPost.trim()) return;
    setPostingVip(true);
    try {
      const res = await fetch(`${API}/communities/${communityId}/vip-posts`, {
        method: "POST", headers: jsonH(token),
        body: JSON.stringify({ content: newVipPost.trim() }),
      });
      if (res.ok) { setNewVipPost(""); fetchVipPosts(); }
      else toast({ title: "Failed to post", variant: "destructive" });
    } catch { toast({ title: "Network error", variant: "destructive" }); }
    finally { setPostingVip(false); }
  };

  const deleteVipPost = async (postId: number) => {
    await fetch(`${API}/communities/${communityId}/vip-posts/${postId}`, { method: "DELETE", headers: authH(token) });
    fetchVipPosts();
  };

  // ── Copy invite link ──────────────────────────────────────────────────────
  const copyInviteLink = () => {
    if (!community?.invite_code) { toast({ title: "No invite code available", variant: "destructive" }); return; }
    const url = `${window.location.origin}${import.meta.env.BASE_URL}community/join/${community.invite_code}`;
    navigator.clipboard.writeText(url)
      .then(() => toast({ title: "Invite link copied!", description: "Share this link to invite people." }))
      .catch(() => toast({ title: "Failed to copy", variant: "destructive" }));
  };

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsg.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`${API}/communities/${communityId}/messages`, {
        method: "POST", headers: jsonH(token),
        body: JSON.stringify({ content: newMsg.trim() }),
      });
      if (res.ok) { setNewMsg(""); fetchMessages(); }
    } catch {}
    finally { setSending(false); }
  };

  const toggleCollapsed = () => {
    setCollapsed(v => {
      const next = !v;
      try { localStorage.setItem("sidebar-collapsed", String(next)); } catch {}
      return next;
    });
  };

  const userInitials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  // ── SIDEBAR ───────────────────────────────────────────────────────────────
  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo + back */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-sidebar-border">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
            <GraduationCap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm text-sidebar-foreground tracking-tight whitespace-nowrap truncate max-w-[110px]">
            {community?.name ?? "Community"}
          </span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={toggleCollapsed}
            className="hidden md:flex p-1 rounded-md text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Back to My Community */}
      <div className="px-3 pt-3">
        <button
          onClick={() => navigate("/create-community")}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to My Community
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-1">
        {NAV_ITEMS.map(({ section: s, label, icon: Icon }) => {
          const isActive = section === s;
          return (
            <button
              key={s}
              onClick={() => { setSection(s); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-primary text-white shadow-sm"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 text-left">{label}</span>
            </button>
          );
        })}

        {user?.role === "admin" && (
          <Link
            href="/admin"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all"
          >
            <Shield className="w-4 h-4 flex-shrink-0" />
            <span>Admin</span>
          </Link>
        )}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-sidebar-border space-y-2">
        <button
          onClick={() => {
            const next = theme === "light" ? "dark" : theme === "dark" ? "purple" : "light";
            setTheme(next);
          }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all"
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : theme === "purple" ? <Palette className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          {theme === "dark" ? "Light mode" : theme === "purple" ? "Light mode" : "Dark mode"}
        </button>

        <div className="flex items-center gap-3 px-3 py-2">
          <Avatar className="w-8 h-8 flex-shrink-0">
            <AvatarImage src={user?.avatar ?? undefined} />
            <AvatarFallback className="text-xs bg-primary/20 text-primary">{userInitials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">{user?.name}</p>
            <Badge variant="outline" className="text-xs border-sidebar-border text-sidebar-foreground/60 mt-0.5">
              {user?.role}
            </Badge>
          </div>
        </div>

        <button
          onClick={() => { logout(); navigate("/login"); }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all"
        >
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </div>
    </div>
  );

  // ── LOADING STATE ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // ── ACCESS DENIED ─────────────────────────────────────────────────────────
  if (accessDenied || !community) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Card className="max-w-sm w-full mx-4">
          <CardContent className="py-10 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7 text-red-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Access Denied</h2>
              <p className="text-sm text-muted-foreground mt-1">
                You don't have permission to access this community dashboard.
              </p>
            </div>
            <Button onClick={() => navigate("/create-community")} className="w-full">
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to My Community
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── SECTION CONTENT ───────────────────────────────────────────────────────
  const renderContent = () => {
    switch (section) {

      // ── Dashboard ──────────────────────────────────────────────────────
      case "dashboard":
        return (
          <div className="p-6 space-y-6 max-w-4xl">
            {/* Community header */}
            <div className="rounded-2xl border bg-card p-6 space-y-3">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Users2 className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold">{community.name}</h2>
                  {community.description && <p className="text-sm text-muted-foreground mt-0.5">{community.description}</p>}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                      <CheckCircle className="w-3 h-3" /> Approved
                    </span>
                    <span className="text-xs text-muted-foreground">Owner Dashboard</span>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={copyInviteLink} className="flex-shrink-0">
                  <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy Invite Link
                </Button>
              </div>
              {community.invite_code && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50 border text-xs text-muted-foreground">
                  <Link2 className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate font-mono">{window.location.origin}{import.meta.env.BASE_URL}community/join/{community.invite_code}</span>
                </div>
              )}
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Members",  value: members.filter(m => m.status === "approved").length, icon: Users },
                { label: "Posts",    value: posts.length,   icon: MessageSquare },
                { label: "Courses",  value: courses.length, icon: BookOpen },
                { label: "AI Tools", value: tools.length,   icon: Wrench },
              ].map(({ label, value, icon: Icon }) => (
                <Card key={label}>
                  <CardContent className="py-4 px-4 flex flex-col items-center text-center gap-1">
                    <Icon className="w-5 h-5 text-primary" />
                    <span className="text-2xl font-bold">{value}</span>
                    <span className="text-xs text-muted-foreground">{label}</span>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Recent posts */}
            {posts.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Recent Posts</h3>
                {posts.slice(0, 3).map(p => (
                  <Card key={p.id}>
                    <CardContent className="py-3 px-4 flex items-start gap-3">
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        <AvatarImage src={p.users?.avatar ?? undefined} />
                        <AvatarFallback className="text-xs">{p.users?.name ? initials(p.users.name) : "?"}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{p.users?.name ?? "Unknown"}</p>
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">{p.content}</p>
                        <p className="text-xs text-muted-foreground mt-1">{formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        );

      // ── Courses ────────────────────────────────────────────────────────
      case "courses": {
        const linkedCourseIds = new Set(courses.map(r => r.course_id));
        const availableCourses = allCourses.filter(c =>
          !linkedCourseIds.has(c.id) &&
          (!courseSearch.trim() || c.title.toLowerCase().includes(courseSearch.toLowerCase()))
        );
        return (
          <div className="p-6 space-y-6 max-w-4xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" /> Courses</h2>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">{courses.length} linked</span>
                {community.isOwner && (
                  <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
                    <Plus className="w-3.5 h-3.5 mr-1.5" /> Create Course
                  </Button>
                )}
              </div>
            </div>

            {/* Create Course Dialog */}
            <Dialog open={createDialogOpen} onOpenChange={(open) => { setCreateDialogOpen(open); if (!open) resetCreateDialog(); }}>
              <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2"><BookOpen className="w-4 h-4 text-primary" /> Create New Course</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div>
                    <Label>Title <span className="text-destructive">*</span></Label>
                    <Input className="mt-1" placeholder="Course title" value={ccTitle} onChange={e => setCcTitle(e.target.value)} />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea className="mt-1" placeholder="What will members learn?" value={ccDescription} onChange={e => setCcDescription(e.target.value)} rows={3} />
                  </div>
                  <div>
                    <Label>Course Image</Label>
                    <input ref={ccImageInputRef} type="file" accept="image/*" className="hidden" onChange={e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setCcImageFile(file);
                      setCcImagePreview(URL.createObjectURL(file));
                    }} />
                    {ccImagePreview ? (
                      <div className="mt-1 relative w-full h-36 rounded-lg overflow-hidden border">
                        <img src={ccImagePreview} alt="Preview" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => { setCcImageFile(null); setCcImagePreview(null); if (ccImageInputRef.current) ccImageInputRef.current.value = ""; }}
                          className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition-colors">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => ccImageInputRef.current?.click()}
                        className="mt-1 w-full h-28 flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                        <ImageIcon className="w-6 h-6" />
                        <span className="text-sm font-medium">Click to upload image</span>
                        <span className="text-xs">PNG, JPG, GIF up to 10MB</span>
                      </button>
                    )}
                  </div>
                  <div>
                    <Label>External URL</Label>
                    <Input className="mt-1" placeholder="https://external-resource.com" value={ccExternalUrl} onChange={e => setCcExternalUrl(e.target.value)} />
                  </div>
                  <div>
                    <Label>Visibility</Label>
                    <Select value={ccVisibility} onValueChange={(v: "public" | "private") => setCcVisibility(v)}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public"><span className="flex items-center gap-2"><Globe className="w-3.5 h-3.5" /> Public — anyone can enroll</span></SelectItem>
                        <SelectItem value="private"><span className="flex items-center gap-2"><Lock className="w-3.5 h-3.5" /> Private — invite only</span></SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Enrollment Mode</Label>
                    <Select value={ccEnrollmentMode} onValueChange={(v: "open" | "approval_required") => setCcEnrollmentMode(v)}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open — students enrolled immediately</SelectItem>
                        <SelectItem value="approval_required">Requires Approval — you must approve</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-base font-semibold">Lessons ({ccLessons.length})</Label>
                      <Button type="button" variant="outline" size="sm" onClick={() => setCcLessons(l => [...l, { title: "", description: "", videoUrl: "" }])}>
                        <Plus className="w-3.5 h-3.5 mr-1" /> Add Lesson
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {ccLessons.map((lesson, i) => (
                        <div key={i} className="border rounded-lg p-3 space-y-2 bg-muted/30 relative">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-muted-foreground">Lesson {i + 1}</span>
                            {ccLessons.length > 1 && (
                              <button onClick={() => setCcLessons(l => l.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-destructive transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          <Input placeholder="Lesson title *" value={lesson.title} onChange={e => setCcLessons(l => l.map((x, idx) => idx === i ? { ...x, title: e.target.value } : x))} />
                          <Textarea placeholder="Lesson description" rows={2} value={lesson.description} onChange={e => setCcLessons(l => l.map((x, idx) => idx === i ? { ...x, description: e.target.value } : x))} />
                          <Input placeholder="Video URL (YouTube, Vimeo, etc.)" value={lesson.videoUrl} onChange={e => setCcLessons(l => l.map((x, idx) => idx === i ? { ...x, videoUrl: e.target.value } : x))} />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end pt-2">
                    <Button variant="outline" onClick={() => { setCreateDialogOpen(false); resetCreateDialog(); }}>Cancel</Button>
                    <Button onClick={createCourse} disabled={creatingCourse || !ccTitle.trim()}>
                      {creatingCourse ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />Creating…</> : "Create Course"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Linked courses */}
            {courses.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No courses linked yet. Add courses below.</CardContent></Card>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {courses.map(row => row.courses && (
                  <Card key={row.id} className="overflow-hidden">
                    {row.courses.thumbnail && (
                      <div className="h-32 overflow-hidden bg-muted">
                        <img src={row.courses.thumbnail} alt={row.courses.title} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <CardContent className="py-3 px-4 space-y-2">
                      <p className="font-semibold text-sm">{row.courses.title}</p>
                      {row.courses.description && <p className="text-xs text-muted-foreground line-clamp-2">{row.courses.description}</p>}
                      <div className="flex gap-2">
                        <Link href={`/courses/${row.courses.id}`} className="flex-1">
                          <Button size="sm" variant="outline" className="w-full">
                            <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Open
                          </Button>
                        </Link>
                        {community.isOwner && (
                          <Button size="sm" variant="outline"
                            className="text-red-500 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/20 px-2"
                            disabled={removingCourse === row.course_id}
                            onClick={() => removeCourse(row.course_id)}>
                            {removingCourse === row.course_id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Add courses picker (owner only) */}
            {community.isOwner && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2">Add Courses</span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <input
                  type="text"
                  placeholder="Search available courses…"
                  value={courseSearch}
                  onChange={e => setCourseSearch(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border bg-card focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                {availableCourses.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {allCourses.length === 0 ? "No courses on the platform yet." : "All courses are already linked."}
                  </p>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {availableCourses.slice(0, 10).map(c => (
                      <div key={c.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/40 transition-colors">
                        {c.thumbnail ? (
                          <img src={c.thumbnail} alt={c.title} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <BookOpen className="w-4 h-4 text-primary" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{c.title}</p>
                          {c.description && <p className="text-xs text-muted-foreground truncate">{c.description}</p>}
                        </div>
                        <Button size="sm" disabled={addingCourse === c.id} onClick={() => addCourse(c.id)} className="flex-shrink-0">
                          {addingCourse === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      }

      // ── AI Tools ───────────────────────────────────────────────────────
      case "tools": {
        const linkedToolIds = new Set(tools.map(r => r.tool_id));
        const availableTools = allTools.filter(t =>
          !linkedToolIds.has(t.id) &&
          (!toolSearch.trim() || t.title.toLowerCase().includes(toolSearch.toLowerCase()))
        );
        return (
          <div className="p-6 space-y-6 max-w-4xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2"><Wrench className="w-5 h-5 text-primary" /> AI Tools</h2>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">{tools.length} linked</span>
                {community.isOwner && (
                  <Button size="sm" onClick={() => setCtDialogOpen(true)}>
                    <Plus className="w-3.5 h-3.5 mr-1.5" /> Create Tool
                  </Button>
                )}
              </div>
            </div>

            {/* Create Tool Dialog */}
            <Dialog open={ctDialogOpen} onOpenChange={(open) => { setCtDialogOpen(open); if (!open) resetCreateToolDialog(); }}>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2"><Wrench className="w-4 h-4 text-primary" /> Add New AI Tool</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div>
                    <Label>Title <span className="text-destructive">*</span></Label>
                    <Input className="mt-1" placeholder="e.g. ChatGPT" value={ctTitle} onChange={e => setCtTitle(e.target.value)} />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea className="mt-1" placeholder="What this tool does…" rows={3} value={ctDescription} onChange={e => setCtDescription(e.target.value)} />
                  </div>
                  <div>
                    <Label>Tool URL</Label>
                    <Input className="mt-1" placeholder="https://chat.openai.com" value={ctToolUrl} onChange={e => setCtToolUrl(e.target.value)} />
                  </div>
                  <div>
                    <Label>Preview Video URL <span className="text-xs text-muted-foreground font-normal">(YouTube)</span></Label>
                    <Input className="mt-1" placeholder="https://youtube.com/watch?v=..." value={ctVideoUrl} onChange={e => setCtVideoUrl(e.target.value)} />
                  </div>
                  <div>
                    <Label>Thumbnail Image</Label>
                    <input ref={ctImageInputRef} type="file" accept="image/*" className="hidden" onChange={e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setCtImageFile(file);
                      setCtImagePreview(URL.createObjectURL(file));
                    }} />
                    {ctImagePreview ? (
                      <div className="mt-1 relative w-full h-40 rounded-lg overflow-hidden border">
                        <img src={ctImagePreview} alt="Preview" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => { setCtImageFile(null); setCtImagePreview(null); if (ctImageInputRef.current) ctImageInputRef.current.value = ""; }}
                          className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition-colors">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => ctImageInputRef.current?.click()}
                        className="mt-1 w-full h-36 flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                        <ImageIcon className="w-6 h-6" />
                        <span className="text-sm">Click to upload image</span>
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" className="flex-1" onClick={() => { setCtDialogOpen(false); resetCreateToolDialog(); }}>Cancel</Button>
                    <Button className="flex-1" onClick={createTool} disabled={creatingTool || !ctTitle.trim()}>
                      {creatingTool ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />Creating…</> : "Create Tool"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Linked tools */}
            {tools.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No AI tools linked yet. Add tools below.</CardContent></Card>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {tools.map(row => row.tools && (
                  <Card key={row.id}>
                    <CardContent className="py-4 px-4 flex items-start gap-3">
                      {row.tools.image_url ? (
                        <img src={row.tools.image_url} alt={row.tools.title} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Wrench className="w-4 h-4 text-primary" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{row.tools.title}</p>
                        {row.tools.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{row.tools.description}</p>}
                        <div className="flex gap-2 mt-2">
                          {row.tools.tool_url && (
                            <a href={row.tools.tool_url} target="_blank" rel="noopener noreferrer">
                              <Button size="sm" variant="outline">
                                <ExternalLink className="w-3 h-3 mr-1" /> Open
                              </Button>
                            </a>
                          )}
                          {community.isOwner && (
                            <Button size="sm" variant="outline"
                              className="text-red-500 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/20 px-2"
                              disabled={removingTool === row.tool_id}
                              onClick={() => removeTool(row.tool_id)}>
                              {removingTool === row.tool_id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Add tools picker (owner only) */}
            {community.isOwner && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2">Add AI Tools</span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <input
                  type="text"
                  placeholder="Search available tools…"
                  value={toolSearch}
                  onChange={e => setToolSearch(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border bg-card focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                {availableTools.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {allTools.length === 0 ? "No AI tools on the platform yet." : "All tools are already linked."}
                  </p>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {availableTools.slice(0, 10).map(t => (
                      <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/40 transition-colors">
                        {t.image_url ? (
                          <img src={t.image_url} alt={t.title} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Wrench className="w-4 h-4 text-primary" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{t.title}</p>
                          {t.description && <p className="text-xs text-muted-foreground truncate">{t.description}</p>}
                        </div>
                        <Button size="sm" disabled={addingTool === t.id} onClick={() => addTool(t.id)} className="flex-shrink-0">
                          {addingTool === t.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      }

      // ── VIP Posts ──────────────────────────────────────────────────────
      case "vip-posts":
        return (
          <div className="p-6 space-y-4 max-w-3xl">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-500" /> VIP Posts
              </h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                <Crown className="w-3 h-3" /> Members Only
              </span>
            </div>
            <p className="text-sm text-muted-foreground">Exclusive posts visible only to approved community members.</p>

            {/* Create post form */}
            <form onSubmit={submitVipPost} className="flex gap-2">
              <input
                type="text"
                placeholder="Share exclusive content with your members…"
                value={newVipPost}
                onChange={e => setNewVipPost(e.target.value)}
                className="flex-1 px-3 py-2 text-sm rounded-lg border bg-card focus:outline-none focus:ring-2 focus:ring-amber-400/40 transition-colors"
              />
              <Button type="submit" disabled={postingVip || !newVipPost.trim()}
                className="bg-amber-500 hover:bg-amber-600 text-white">
                {postingVip ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </form>

            {/* Post feed */}
            {vipPostsLoading ? (
              <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>
            ) : vipPosts.length === 0 ? (
              <Card className="border-amber-200/50 dark:border-amber-800/50">
                <CardContent className="py-10 text-center space-y-2">
                  <Crown className="w-8 h-8 text-amber-400/40 mx-auto" />
                  <p className="text-sm text-muted-foreground">No VIP posts yet. Share exclusive content with your members!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {vipPosts.map(p => (
                  <Card key={p.id} className="border-amber-200/40 dark:border-amber-800/30 bg-gradient-to-r from-amber-50/30 to-transparent dark:from-amber-950/10">
                    <CardContent className="py-3 px-4 flex items-start gap-3">
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        <AvatarImage src={p.users?.avatar ?? undefined} />
                        <AvatarFallback className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                          {p.users?.name ? initials(p.users.name) : "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{p.users?.name ?? "Unknown"}</p>
                            <Crown className="w-3 h-3 text-amber-500 flex-shrink-0" />
                          </div>
                          <p className="text-xs text-muted-foreground flex-shrink-0">{formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}</p>
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{p.content}</p>
                      </div>
                      {(p.user_id === user?.id || community.isOwner) && (
                        <button onClick={() => deleteVipPost(p.id)} className="text-muted-foreground hover:text-red-500 transition-colors flex-shrink-0 mt-0.5">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        );

      // ── Community Posts ────────────────────────────────────────────────
      case "posts":
        return (
          <div className="p-6 space-y-4 max-w-3xl">
            <h2 className="text-lg font-bold flex items-center gap-2"><Users className="w-5 h-5 text-primary" /> Community Posts</h2>

            {/* Post form */}
            <form onSubmit={submitPost} className="flex gap-2">
              <Input
                placeholder="Share something with the community…"
                value={newPost}
                onChange={e => setNewPost(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" disabled={posting || !newPost.trim()}>
                {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </form>

            {postsLoading ? (
              <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>
            ) : posts.length === 0 ? (
              <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No posts yet. Be the first to share!</CardContent></Card>
            ) : (
              <div className="space-y-3">
                {posts.map(p => (
                  <Card key={p.id}>
                    <CardContent className="py-3 px-4 flex items-start gap-3">
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        <AvatarImage src={p.users?.avatar ?? undefined} />
                        <AvatarFallback className="text-xs">{p.users?.name ? initials(p.users.name) : "?"}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium">{p.users?.name ?? "Unknown"}</p>
                          <p className="text-xs text-muted-foreground flex-shrink-0">{formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}</p>
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">{p.content}</p>
                      </div>
                      {(p.user_id === user?.id || community.isOwner) && (
                        <button onClick={() => deletePost(p.id)} className="text-muted-foreground hover:text-red-500 transition-colors flex-shrink-0">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        );

      // ── Messages ───────────────────────────────────────────────────────
      case "messages":
        return (
          <div className="p-6 flex flex-col h-full max-w-3xl" style={{ maxHeight: "calc(100vh - 4rem)" }}>
            <h2 className="text-lg font-bold flex items-center gap-2 mb-4"><MessageSquare className="w-5 h-5 text-primary" /> Community Messages</h2>

            {/* Messages feed */}
            <div className="flex-1 overflow-y-auto space-y-3 mb-4 min-h-0">
              {msgLoading ? (
                <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
              ) : messages.length === 0 ? (
                <Card className="flex-1"><CardContent className="py-10 text-center text-sm text-muted-foreground">No messages yet.</CardContent></Card>
              ) : (
                messages.map(m => {
                  const isMe = m.sender_id === user?.id;
                  return (
                    <div key={m.id} className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
                      <Avatar className="w-7 h-7 flex-shrink-0">
                        <AvatarImage src={m.users?.avatar ?? undefined} />
                        <AvatarFallback className="text-[10px]">{m.users?.name ? initials(m.users.name) : "?"}</AvatarFallback>
                      </Avatar>
                      <div className={`max-w-[70%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
                        <span className={`text-[11px] text-muted-foreground ${isMe ? "text-right" : ""}`}>{m.users?.name}</span>
                        <div className={`px-3 py-2 rounded-2xl text-sm ${isMe ? "bg-primary text-white rounded-tr-sm" : "bg-muted rounded-tl-sm"}`}>
                          {m.content}
                        </div>
                        <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}</span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={msgEndRef} />
            </div>

            {/* Message input */}
            <form onSubmit={sendMessage} className="flex gap-2">
              <Input
                placeholder="Type a message…"
                value={newMsg}
                onChange={e => setNewMsg(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" disabled={sending || !newMsg.trim()}>
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </form>
          </div>
        );

      // ── Members (owner only) ───────────────────────────────────────────
      case "members": {
        const pending  = members.filter(m => m.status === "pending");
        const approved = members.filter(m => m.status === "approved");
        const rejected = members.filter(m => m.status === "rejected");

        const MemberRow = ({ m, showActions }: { m: typeof members[0]; showActions: boolean }) => (
          <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
            <Avatar className="w-8 h-8 flex-shrink-0">
              <AvatarImage src={m.users?.avatar ?? undefined} />
              <AvatarFallback className="text-xs">{m.users?.name ? initials(m.users.name) : "?"}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{m.users?.name ?? "Unknown"}</p>
              <p className="text-xs text-muted-foreground truncate">{m.users?.email}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {m.status === "approved" && (
                <span className="text-xs font-medium text-green-600 dark:text-green-400 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> Approved
                </span>
              )}
              {m.status === "rejected" && (
                <span className="text-xs font-medium text-red-500 flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5" /> Rejected
                </span>
              )}
              {showActions && (
                <>
                  <Button size="sm" variant="outline"
                    className="h-7 px-2 text-xs text-green-600 border-green-300 hover:bg-green-50 dark:hover:bg-green-950/30"
                    disabled={actingMember === m.user_id}
                    onClick={() => handleMemberStatus(m.user_id, "approved")}>
                    {actingMember === m.user_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserCheck className="w-3 h-3" />}
                    <span className="ml-1">Approve</span>
                  </Button>
                  <Button size="sm" variant="outline"
                    className="h-7 px-2 text-xs text-red-500 border-red-300 hover:bg-red-50 dark:hover:bg-red-950/30"
                    disabled={actingMember === m.user_id}
                    onClick={() => handleMemberStatus(m.user_id, "rejected")}>
                    <UserX className="w-3 h-3" />
                    <span className="ml-1">Reject</span>
                  </Button>
                </>
              )}
            </div>
          </div>
        );

        return (
          <div className="p-6 space-y-6 max-w-3xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2"><UserCheck className="w-5 h-5 text-primary" /> My Approval Panel</h2>
              <Button size="sm" variant="outline" onClick={copyInviteLink}>
                <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy Invite Link
              </Button>
            </div>

            {/* Course Enrollment Requests */}
            {courseEnrollments.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  Course Enrollment Requests
                  <span className="bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{courseEnrollments.length}</span>
                </h3>
                {courseEnrollments.map(e => (
                  <div key={e.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarImage src={e.user?.avatar ?? undefined} />
                      <AvatarFallback className="text-xs">{e.user?.name ? initials(e.user.name) : "?"}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{e.user?.name ?? "Unknown"}</p>
                      <p className="text-xs text-muted-foreground truncate">{e.user?.email}</p>
                      {e.course && (
                        <p className="text-xs text-primary truncate flex items-center gap-1 mt-0.5">
                          <BookOpen className="w-3 h-3" /> {e.course.title}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button size="sm" variant="outline"
                        className="h-7 px-2 text-xs text-green-600 border-green-300 hover:bg-green-50 dark:hover:bg-green-950/30"
                        disabled={actingEnrollment === e.id}
                        onClick={() => handleCourseEnrollmentAction(e.id, "approve")}>
                        {actingEnrollment === e.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                        <span className="ml-1">Approve</span>
                      </Button>
                      <Button size="sm" variant="outline"
                        className="h-7 px-2 text-xs text-red-500 border-red-300 hover:bg-red-50 dark:hover:bg-red-950/30"
                        disabled={actingEnrollment === e.id}
                        onClick={() => handleCourseEnrollmentAction(e.id, "reject")}>
                        <XCircle className="w-3 h-3" />
                        <span className="ml-1">Reject</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Member Join Requests */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                Member Join Requests
                {pending.length > 0 && (
                  <span className="bg-yellow-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{pending.length}</span>
                )}
              </h3>
              {pending.length === 0 ? (
                <Card><CardContent className="py-6 text-center text-sm text-muted-foreground">No pending join requests.</CardContent></Card>
              ) : pending.map(m => <MemberRow key={m.id} m={m} showActions />)}
            </div>

            {/* Approved members */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Approved Members ({approved.length})
              </h3>
              {approved.length === 0 ? (
                <Card><CardContent className="py-6 text-center text-sm text-muted-foreground">No approved members yet.</CardContent></Card>
              ) : approved.map(m => <MemberRow key={m.id} m={m} showActions={false} />)}
            </div>

            {/* Rejected */}
            {rejected.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Rejected ({rejected.length})</h3>
                {rejected.map(m => <MemberRow key={m.id} m={m} showActions={false} />)}
              </div>
            )}
          </div>
        );
      }

      // ── Profile ────────────────────────────────────────────────────────
      case "profile":
        return (
          <div className="p-6 max-w-2xl">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-4"><User className="w-5 h-5 text-primary" /> Profile</h2>
            <Card>
              <CardContent className="py-8 flex flex-col items-center gap-4 text-center">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={user?.avatar ?? undefined} />
                  <AvatarFallback className="text-2xl bg-primary/20 text-primary">{userInitials}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-xl font-bold">{user?.name}</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                  <Badge variant="outline" className="mt-2">{user?.role}</Badge>
                </div>
                <Link href="/profile">
                  <Button variant="outline"><ExternalLink className="w-4 h-4 mr-1.5" /> Edit Full Profile</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  // ── MAIN LAYOUT ───────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen overflow-hidden bg-background">

      {/* Desktop sidebar */}
      <aside className={cn(
        "hidden md:flex flex-col bg-sidebar border-r border-sidebar-border flex-shrink-0 transition-all duration-300 overflow-hidden",
        collapsed ? "w-12" : "w-64"
      )}>
        {collapsed ? (
          <div className="flex flex-col items-center pt-4 gap-3 h-full">
            <button onClick={toggleCollapsed} className="p-2 rounded-lg text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors">
              <PanelLeftOpen className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <SidebarContent />
        )}
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <aside className="relative flex flex-col w-64 bg-sidebar border-r border-sidebar-border">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-card border-b border-border">
          <button onClick={() => setSidebarOpen(true)} className="p-1">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <GraduationCap className="w-5 h-5 text-primary flex-shrink-0" />
            <span className="font-bold text-base truncate">{community.name}</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <motion.div
            key={section}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="h-full"
          >
            {renderContent()}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
