import { useState, useEffect, useRef, useCallback } from "react";
import { useRoute, Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import {
  Users2, MessageSquare, BookOpen, Wrench, CheckCircle, XCircle,
  Clock, ArrowLeft, Send, Trash2, Plus, ExternalLink, Crown, UserCheck,
} from "lucide-react";

const API = "/api";
function authH(token: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}
function jsonH(token: string | null) {
  return { "Content-Type": "application/json", ...authH(token) };
}

type Community = {
  id: number; name: string; description: string | null;
  status: string; owner_id: number; isOwner: boolean;
  memberStatus: "approved" | "pending" | "rejected" | null;
  owner: { id: number; name: string; avatar: string | null } | null;
};
type Member = {
  id: number; status: string; created_at: string; user_id: number;
  users: { id: number; name: string; email: string; avatar: string | null } | null;
};
type CommunityPost = {
  id: number; content: string; created_at: string; user_id: number;
  users: { id: number; name: string; avatar: string | null } | null;
};
type CommunityMessage = {
  id: number; content: string; created_at: string; sender_id: number;
  users: { id: number; name: string; avatar: string | null } | null;
};
type CommunityCoursRow = {
  id: number; course_id: number; created_at: string;
  courses: { id: number; title: string; description: string | null; thumbnail: string | null } | null;
};
type CommunityToolRow = {
  id: number; tool_id: number; created_at: string;
  tools: { id: number; title: string; description: string | null; image_url: string | null; tool_url: string | null } | null;
};
type AllCourse = { id: number; title: string };
type AllTool = { id: number; title: string };

function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

export default function CommunityPanelPage() {
  const [, params] = useRoute("/community/:id");
  const communityId = parseInt(params?.id ?? "0", 10);
  const { token, user } = useAuth();
  const { toast } = useToast();

  const [community, setCommunity] = useState<Community | null>(null);
  const [loading, setLoading]     = useState(true);
  const [joining, setJoining]     = useState(false);

  const [members, setMembers]         = useState<Member[]>([]);
  const [membersLoading, setML]       = useState(false);
  const [actingMember, setActingM]    = useState<number | null>(null);

  const [posts, setPosts]           = useState<CommunityPost[]>([]);
  const [postsLoading, setPL]       = useState(false);
  const [newPost, setNewPost]       = useState("");
  const [posting, setPosting]       = useState(false);

  const [messages, setMessages]     = useState<CommunityMessage[]>([]);
  const [msgLoading, setMsgL]       = useState(false);
  const [newMsg, setNewMsg]         = useState("");
  const [sending, setSending]       = useState(false);
  const msgEndRef = useRef<HTMLDivElement>(null);

  const [courses, setCourses]       = useState<CommunityCoursRow[]>([]);
  const [allCourses, setAllCourses] = useState<AllCourse[]>([]);
  const [addingCourse, setAC]       = useState(false);
  const [courseSearch, setCS]       = useState("");

  const [tools, setTools]           = useState<CommunityToolRow[]>([]);
  const [allTools, setAllTools]     = useState<AllTool[]>([]);
  const [addingTool, setAT]         = useState(false);
  const [toolSearch, setTS]         = useState("");

  // ── Fetch community details ──────────────────────────────────────────────
  useEffect(() => {
    if (!communityId) return;
    setLoading(true);
    fetch(`${API}/communities/${communityId}/panel`, { headers: authH(token) })
      .then(r => r.json()).then(d => { if (!d.error) setCommunity(d); })
      .catch(() => {}).finally(() => setLoading(false));
  }, [communityId, token]);

  const canAccess = community && (community.isOwner || community.memberStatus === "approved");

  // ── Fetch data when access is confirmed ──────────────────────────────────
  const fetchPosts = useCallback(() => {
    if (!canAccess) return;
    setPL(true);
    fetch(`${API}/communities/${communityId}/posts`, { headers: authH(token) })
      .then(r => r.json()).then(d => { if (!d.error) setPosts(d); })
      .catch(() => {}).finally(() => setPL(false));
  }, [communityId, token, canAccess]);

  const fetchMembers = useCallback(() => {
    if (!community) return;
    setML(true);
    fetch(`${API}/communities/${communityId}/members`, { headers: authH(token) })
      .then(r => r.json()).then(d => { if (!d.error) setMembers(d); })
      .catch(() => {}).finally(() => setML(false));
  }, [communityId, token, community]);

  const fetchMessages = useCallback(() => {
    if (!canAccess) return;
    setMsgL(true);
    fetch(`${API}/communities/${communityId}/messages`, { headers: authH(token) })
      .then(r => r.json()).then(d => { if (!d.error) setMessages(d); })
      .catch(() => {}).finally(() => setMsgL(false));
  }, [communityId, token, canAccess]);

  const fetchCourses = useCallback(() => {
    if (!canAccess) return;
    fetch(`${API}/communities/${communityId}/courses`, { headers: authH(token) })
      .then(r => r.json()).then(d => { if (!d.error) setCourses(d); })
      .catch(() => {});
  }, [communityId, token, canAccess]);

  const fetchTools = useCallback(() => {
    if (!canAccess) return;
    fetch(`${API}/communities/${communityId}/tools`, { headers: authH(token) })
      .then(r => r.json()).then(d => { if (!d.error) setTools(d); })
      .catch(() => {});
  }, [communityId, token, canAccess]);

  useEffect(() => {
    if (canAccess) {
      fetchPosts(); fetchMembers(); fetchMessages(); fetchCourses(); fetchTools();
    } else if (community?.isOwner) {
      fetchMembers();
    }
  }, [canAccess]);

  // auto-scroll messages
  useEffect(() => { msgEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // all courses/tools for owner picker
  useEffect(() => {
    if (!community?.isOwner) return;
    fetch(`${API}/courses`, { headers: authH(token) })
      .then(r => r.json()).then(d => { if (Array.isArray(d)) setAllCourses(d); }).catch(() => {});
    fetch(`${API}/tools`, { headers: authH(token) })
      .then(r => r.json()).then(d => { if (Array.isArray(d)) setAllTools(d); }).catch(() => {});
  }, [community?.isOwner, token]);

  // ── Actions ──────────────────────────────────────────────────────────────
  const handleJoin = async () => {
    setJoining(true);
    try {
      const r = await fetch(`${API}/communities/${communityId}/join`, { method: "POST", headers: jsonH(token) });
      const d = await r.json();
      if (!r.ok) { toast({ title: d.error ?? "Error", variant: "destructive" }); return; }
      toast({ title: "Join request sent! Awaiting owner approval." });
      setCommunity(prev => prev ? { ...prev, memberStatus: "pending" } : prev);
    } catch { toast({ title: "Network error", variant: "destructive" }); }
    finally { setJoining(false); }
  };

  const handleMemberAction = async (member: Member, status: "approved" | "rejected") => {
    setActingM(member.id);
    try {
      const r = await fetch(`${API}/communities/${communityId}/members/${member.user_id}`, {
        method: "PATCH", headers: jsonH(token), body: JSON.stringify({ status }),
      });
      if (!r.ok) { const d = await r.json(); toast({ title: d.error, variant: "destructive" }); return; }
      setMembers(prev => prev.map(m => m.id === member.id ? { ...m, status } : m));
      toast({ title: status === "approved" ? `${member.users?.name} approved` : `${member.users?.name} rejected` });
    } catch { toast({ title: "Error", variant: "destructive" }); }
    finally { setActingM(null); }
  };

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.trim()) return;
    setPosting(true);
    try {
      const r = await fetch(`${API}/communities/${communityId}/posts`, {
        method: "POST", headers: jsonH(token), body: JSON.stringify({ content: newPost.trim() }),
      });
      const d = await r.json();
      if (!r.ok) { toast({ title: d.error, variant: "destructive" }); return; }
      setNewPost("");
      fetchPosts();
    } catch { toast({ title: "Error", variant: "destructive" }); }
    finally { setPosting(false); }
  };

  const handleDeletePost = async (postId: number) => {
    await fetch(`${API}/communities/${communityId}/posts/${postId}`, { method: "DELETE", headers: authH(token) });
    setPosts(prev => prev.filter(p => p.id !== postId));
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsg.trim()) return;
    setSending(true);
    try {
      const r = await fetch(`${API}/communities/${communityId}/messages`, {
        method: "POST", headers: jsonH(token), body: JSON.stringify({ content: newMsg.trim() }),
      });
      const d = await r.json();
      if (!r.ok) { toast({ title: d.error, variant: "destructive" }); return; }
      setNewMsg("");
      setMessages(prev => [...prev, { ...d, users: { id: user!.id, name: user!.name, avatar: user?.avatar ?? null } }]);
    } catch { toast({ title: "Error", variant: "destructive" }); }
    finally { setSending(false); }
  };

  const handleAddCourse = async (courseId: number) => {
    setAC(true);
    try {
      const r = await fetch(`${API}/communities/${communityId}/courses`, {
        method: "POST", headers: jsonH(token), body: JSON.stringify({ courseId }),
      });
      const d = await r.json();
      if (!r.ok) { toast({ title: d.error, variant: "destructive" }); return; }
      toast({ title: "Course added" }); fetchCourses(); setCS("");
    } catch { toast({ title: "Error", variant: "destructive" }); }
    finally { setAC(false); }
  };

  const handleRemoveCourse = async (courseId: number) => {
    await fetch(`${API}/communities/${communityId}/courses/${courseId}`, { method: "DELETE", headers: authH(token) });
    setCourses(prev => prev.filter(c => c.course_id !== courseId));
    toast({ title: "Course removed" });
  };

  const handleAddTool = async (toolId: number) => {
    setAT(true);
    try {
      const r = await fetch(`${API}/communities/${communityId}/tools`, {
        method: "POST", headers: jsonH(token), body: JSON.stringify({ toolId }),
      });
      const d = await r.json();
      if (!r.ok) { toast({ title: d.error, variant: "destructive" }); return; }
      toast({ title: "Tool added" }); fetchTools(); setTS("");
    } catch { toast({ title: "Error", variant: "destructive" }); }
    finally { setAT(false); }
  };

  const handleRemoveTool = async (toolId: number) => {
    await fetch(`${API}/communities/${communityId}/tools/${toolId}`, { method: "DELETE", headers: authH(token) });
    setTools(prev => prev.filter(t => t.tool_id !== toolId));
    toast({ title: "Tool removed" });
  };

  // ── Loading / Error states ───────────────────────────────────────────────
  if (loading) {
    return (
      <Layout>
        <div className="p-6 max-w-4xl mx-auto space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      </Layout>
    );
  }

  if (!community) {
    return (
      <Layout>
        <div className="p-6 max-w-4xl mx-auto text-center space-y-4 pt-20">
          <p className="text-muted-foreground">Community not found or not yet approved.</p>
          <Link href="/community"><Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" />Back</Button></Link>
        </div>
      </Layout>
    );
  }

  const pendingCount = members.filter(m => m.status === "pending").length;
  const approvedCount = members.filter(m => m.status === "approved").length;

  // ── Access denied states ─────────────────────────────────────────────────
  if (!canAccess) {
    return (
      <Layout>
        <div className="p-6 max-w-2xl mx-auto space-y-6">
          <Link href="/community">
            <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          </Link>
          <Card>
            <CardContent className="pt-8 pb-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                <Users2 className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold">{community.name}</h1>
              {community.description && <p className="text-muted-foreground text-sm max-w-sm mx-auto">{community.description}</p>}

              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Crown className="w-4 h-4" />
                <span>Owned by {community.owner?.name}</span>
              </div>

              {community.memberStatus === "pending" ? (
                <div className="flex items-center justify-center gap-2 text-yellow-600 dark:text-yellow-400 text-sm font-medium">
                  <Clock className="w-4 h-4" />
                  <span>Your join request is pending approval</span>
                </div>
              ) : community.memberStatus === "rejected" ? (
                <div className="flex items-center justify-center gap-2 text-destructive text-sm font-medium">
                  <XCircle className="w-4 h-4" />
                  <span>Your request was rejected</span>
                </div>
              ) : (
                <Button onClick={handleJoin} disabled={joining} className="mx-auto">
                  <UserCheck className="w-4 h-4 mr-2" />
                  {joining ? "Requesting…" : "Request to Join"}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  const filteredCourses = allCourses.filter(c =>
    c.title.toLowerCase().includes(courseSearch.toLowerCase()) &&
    !courses.some(cc => cc.course_id === c.id)
  );
  const filteredTools = allTools.filter(t =>
    t.title.toLowerCase().includes(toolSearch.toLowerCase()) &&
    !tools.some(ct => ct.tool_id === t.id)
  );

  return (
    <Layout>
      <div className="p-6 max-w-4xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Link href="/community">
              <button className="mt-1 text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="w-4 h-4" />
              </button>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{community.name}</h1>
                {community.isOwner && <Badge variant="secondary" className="text-xs gap-1"><Crown className="w-3 h-3" />Owner</Badge>}
              </div>
              {community.description && <p className="text-muted-foreground text-sm mt-0.5">{community.description}</p>}
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Users2 className="w-3 h-3" />{approvedCount} member{approvedCount !== 1 ? "s" : ""}</span>
                {pendingCount > 0 && community.isOwner && (
                  <span className="flex items-center gap-1 text-yellow-600"><Clock className="w-3 h-3" />{pendingCount} pending</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="posts">
          <TabsList className={`grid w-full ${community.isOwner ? "grid-cols-5" : "grid-cols-4"}`}>
            <TabsTrigger value="posts"><MessageSquare className="w-3.5 h-3.5 mr-1.5" />Posts</TabsTrigger>
            <TabsTrigger value="courses"><BookOpen className="w-3.5 h-3.5 mr-1.5" />Courses</TabsTrigger>
            <TabsTrigger value="tools"><Wrench className="w-3.5 h-3.5 mr-1.5" />Tools</TabsTrigger>
            <TabsTrigger value="chat"><Send className="w-3.5 h-3.5 mr-1.5" />Chat</TabsTrigger>
            {community.isOwner && (
              <TabsTrigger value="members" className="relative">
                <Users2 className="w-3.5 h-3.5 mr-1.5" />Members
                {pendingCount > 0 && (
                  <Badge variant="destructive" className="ml-1.5 text-[10px] px-1 py-0 h-4">{pendingCount}</Badge>
                )}
              </TabsTrigger>
            )}
          </TabsList>

          {/* ── POSTS ── */}
          <TabsContent value="posts" className="mt-4 space-y-4">
            <form onSubmit={handlePost} className="flex gap-2">
              <Textarea
                placeholder="Share something with the community…"
                value={newPost}
                onChange={e => setNewPost(e.target.value)}
                rows={2}
                className="resize-none flex-1"
              />
              <Button type="submit" disabled={posting || !newPost.trim()} size="sm" className="self-end">
                {posting ? "…" : <Send className="w-4 h-4" />}
              </Button>
            </form>

            {postsLoading ? (
              [1,2,3].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)
            ) : posts.length === 0 ? (
              <p className="text-center text-muted-foreground py-10 text-sm">No posts yet. Be the first!</p>
            ) : (
              posts.map(post => (
                <Card key={post.id}>
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-start gap-3">
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        <AvatarImage src={post.users?.avatar ?? undefined} />
                        <AvatarFallback className="text-xs">{initials(post.users?.name ?? "U")}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">{post.users?.name}</span>
                          <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{post.content}</p>
                      </div>
                      {(community.isOwner || post.user_id === user?.id) && (
                        <button onClick={() => handleDeletePost(post.id)} className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* ── COURSES ── */}
          <TabsContent value="courses" className="mt-4 space-y-4">
            {community.isOwner && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Add a Course</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <Input
                    placeholder="Search courses…"
                    value={courseSearch}
                    onChange={e => setCS(e.target.value)}
                  />
                  {courseSearch && (
                    <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                      {filteredCourses.length === 0 ? (
                        <p className="text-xs text-muted-foreground p-3">No courses found</p>
                      ) : filteredCourses.slice(0, 8).map(c => (
                        <div key={c.id} className="flex items-center justify-between p-2 hover:bg-accent/30">
                          <span className="text-sm truncate">{c.title}</span>
                          <Button size="sm" variant="ghost" disabled={addingCourse} onClick={() => handleAddCourse(c.id)}>
                            <Plus className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {courses.length === 0 ? (
              <p className="text-center text-muted-foreground py-10 text-sm">No courses added yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {courses.map(row => row.courses && (
                  <Card key={row.id} className="overflow-hidden">
                    {row.courses.thumbnail && (
                      <div className="aspect-video overflow-hidden bg-muted">
                        <img src={row.courses.thumbnail} alt={row.courses.title} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <CardContent className="pt-3 pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-sm leading-tight">{row.courses.title}</p>
                          {row.courses.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{row.courses.description}</p>
                          )}
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <Link href={`/courses/${row.courses.id}`}>
                            <button className="p-1 text-muted-foreground hover:text-foreground" title="Open course">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          </Link>
                          {community.isOwner && (
                            <button onClick={() => handleRemoveCourse(row.course_id)} className="p-1 text-muted-foreground hover:text-destructive">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── TOOLS ── */}
          <TabsContent value="tools" className="mt-4 space-y-4">
            {community.isOwner && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Add a Tool</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <Input
                    placeholder="Search tools…"
                    value={toolSearch}
                    onChange={e => setTS(e.target.value)}
                  />
                  {toolSearch && (
                    <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                      {filteredTools.length === 0 ? (
                        <p className="text-xs text-muted-foreground p-3">No tools found</p>
                      ) : filteredTools.slice(0, 8).map(t => (
                        <div key={t.id} className="flex items-center justify-between p-2 hover:bg-accent/30">
                          <span className="text-sm truncate">{t.title}</span>
                          <Button size="sm" variant="ghost" disabled={addingTool} onClick={() => handleAddTool(t.id)}>
                            <Plus className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {tools.length === 0 ? (
              <p className="text-center text-muted-foreground py-10 text-sm">No tools added yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {tools.map(row => row.tools && (
                  <Card key={row.id}>
                    <CardContent className="pt-3 pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-sm leading-tight">{row.tools.title}</p>
                          {row.tools.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{row.tools.description}</p>
                          )}
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          {row.tools.tool_url && (
                            <a href={row.tools.tool_url} target="_blank" rel="noopener noreferrer" className="p-1 text-muted-foreground hover:text-foreground">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {community.isOwner && (
                            <button onClick={() => handleRemoveTool(row.tool_id)} className="p-1 text-muted-foreground hover:text-destructive">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── GROUP CHAT ── */}
          <TabsContent value="chat" className="mt-4">
            <Card className="flex flex-col" style={{ height: "480px" }}>
              <CardHeader className="pb-2 flex-shrink-0">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" /> Community Chat
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto space-y-3 pb-0">
                {msgLoading ? (
                  [1,2,3].map(i => <Skeleton key={i} className="h-12 w-full rounded-lg" />)
                ) : messages.length === 0 ? (
                  <p className="text-center text-muted-foreground py-10 text-sm">No messages yet.</p>
                ) : (
                  messages.map(msg => {
                    const isMe = msg.sender_id === user?.id;
                    return (
                      <div key={msg.id} className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
                        <Avatar className="w-7 h-7 flex-shrink-0">
                          <AvatarImage src={msg.users?.avatar ?? undefined} />
                          <AvatarFallback className="text-[10px]">{initials(msg.users?.name ?? "U")}</AvatarFallback>
                        </Avatar>
                        <div className={`max-w-[72%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
                          {!isMe && <span className="text-[11px] text-muted-foreground px-1">{msg.users?.name}</span>}
                          <div className={`px-3 py-2 rounded-2xl text-sm ${isMe ? "bg-primary text-white rounded-tr-sm" : "bg-muted rounded-tl-sm"}`}>
                            {msg.content}
                          </div>
                          <span className="text-[10px] text-muted-foreground px-1">
                            {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={msgEndRef} />
              </CardContent>
              <div className="p-4 border-t flex-shrink-0">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <Input
                    placeholder="Type a message…"
                    value={newMsg}
                    onChange={e => setNewMsg(e.target.value)}
                    disabled={sending}
                  />
                  <Button type="submit" size="sm" disabled={sending || !newMsg.trim()}>
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </div>
            </Card>
          </TabsContent>

          {/* ── MEMBERS (owner only) ── */}
          {community.isOwner && (
            <TabsContent value="members" className="mt-4 space-y-3">
              {membersLoading ? (
                [1,2,3].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)
              ) : members.length === 0 ? (
                <p className="text-center text-muted-foreground py-10 text-sm">No members yet.</p>
              ) : (
                members.map(m => (
                  <div key={m.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border bg-card">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="w-9 h-9 flex-shrink-0">
                        <AvatarImage src={m.users?.avatar ?? undefined} />
                        <AvatarFallback className="text-xs">{initials(m.users?.name ?? "U")}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{m.users?.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{m.users?.email}</p>
                        <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {m.status === "approved" ? (
                        <Badge className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200">
                          <CheckCircle className="w-3 h-3 mr-1" />Approved
                        </Badge>
                      ) : m.status === "rejected" ? (
                        <Badge variant="outline" className="text-xs text-muted-foreground">Rejected</Badge>
                      ) : (
                        <>
                          <Button size="sm" variant="outline"
                            className="text-green-600 border-green-200 hover:bg-green-50 dark:hover:bg-green-950/30 h-7 text-xs"
                            disabled={actingMember === m.id}
                            onClick={() => handleMemberAction(m, "approved")}
                          >
                            <CheckCircle className="w-3 h-3 mr-1" />Approve
                          </Button>
                          <Button size="sm" variant="outline"
                            className="text-destructive border-destructive/20 hover:bg-destructive/5 h-7 text-xs"
                            disabled={actingMember === m.id}
                            onClick={() => handleMemberAction(m, "rejected")}
                          >
                            <XCircle className="w-3 h-3 mr-1" />Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </TabsContent>
          )}
        </Tabs>
      </div>
    </Layout>
  );
}
