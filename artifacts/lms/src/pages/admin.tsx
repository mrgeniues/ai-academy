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
import { Trash2, Users, BookOpen, MessageSquare, TrendingUp, Shield, Ban, CheckCircle, Clock, Calendar, GraduationCap } from "lucide-react";
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
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [blockingId, setBlockingId] = useState<number | null>(null);
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [pendingEnrollments, setPendingEnrollments] = useState<PendingEnrollment[]>([]);
  const [pendingEnrollmentsLoading, setPendingEnrollmentsLoading] = useState(true);
  const [approvingEnrollmentId, setApprovingEnrollmentId] = useState<number | null>(null);

  // All hooks must be called unconditionally (Rules of Hooks)
  const { data: users, isLoading: usersLoading } = useListUsers({
    query: { queryKey: getListUsersQueryKey() }
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
      const token = localStorage.getItem("lms_token");
      const resp = await fetch(`/api/users/${u.id}/block`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
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
      const token = localStorage.getItem("lms_token");
      const resp = await fetch(`/api/users/${u.id}/approve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
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

  const pendingUsers = (users as UserRow[] | undefined)?.filter(u => !u.isApproved) ?? [];

  const fetchPendingEnrollments = useCallback(async () => {
    setPendingEnrollmentsLoading(true);
    try {
      const token = localStorage.getItem("lms_token");
      const resp = await fetch("/api/enrollments/pending", {
        headers: { Authorization: `Bearer ${token}` },
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
  }, []);

  useEffect(() => {
    if (user?.role === "admin") {
      void fetchPendingEnrollments();
    }
  }, [user, fetchPendingEnrollments]);

  const handleApproveEnrollment = async (enrollment: PendingEnrollment) => {
    setApprovingEnrollmentId(enrollment.id);
    try {
      const token = localStorage.getItem("lms_token");
      const resp = await fetch(`/api/enrollments/${enrollment.id}/approve`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
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

        {/* Management tabs */}
        <Tabs defaultValue="pending">
          <TabsList className="grid grid-cols-5 w-full max-w-2xl">
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
          </TabsList>

          {/* ── Need Approval tab ─────────────────────────────────────── */}
          <TabsContent value="pending" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  Pending Approval
                  <Badge variant="secondary" className="text-xs font-normal">{pendingUsers.length}</Badge>
                </CardTitle>
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
                    {pendingUsers.map(u => (
                      <div key={u.id} className="flex items-center gap-3 py-4">
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
        </Tabs>
      </div>
    </Layout>
  );
}
