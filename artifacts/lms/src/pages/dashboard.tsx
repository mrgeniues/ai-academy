import { useState, useCallback } from "react";
import { useGetDashboardStats, useGetRecentActivity, getGetDashboardStatsQueryKey, getGetRecentActivityQueryKey } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Users, BookOpen, TrendingUp, MessageSquare, Clock, Award } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useLocation } from "wouter";

// ── Types ────────────────────────────────────────────────────────────────────

type MemberUser = { id: number; name: string; email?: string; createdAt?: string };
type UserEnrollment = { title: string; progress: number };
type AdminEnrollmentRow = { userId: number; userName: string; courses: UserEnrollment[] };
type UserProgressData = { avgProgress: number; courses: UserEnrollment[] };
type AdminProgressData = {
  myAvg: number;
  myCourses: UserEnrollment[];
  allUsersProgress: { name: string; avgProgress: number }[];
};

type DialogType = "members" | "enrollments" | "my-courses" | "progress" | null;

// ── Clickable Stat Card ───────────────────────────────────────────────────────

function StatCard({ title, value, icon: Icon, description, color, onClick }: {
  title: string;
  value: number | string;
  icon: React.ElementType;
  description?: string;
  color: string;
  onClick?: () => void;
}) {
  return (
    <Card
      data-testid={`stat-${title.toLowerCase().replace(/\s+/g, "-")}`}
      onClick={onClick}
      className={onClick ? "cursor-pointer hover:border-primary/50 transition-colors hover:shadow-md" : ""}
    >
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
            {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
          </div>
          <div className={`p-2.5 rounded-xl ${color}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function DialogSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3 pt-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, token } = useAuth();
  const [, setLocation] = useLocation();
  const isAdmin = user?.role === "admin";

  const { data: stats, isLoading: statsLoading } = useGetDashboardStats({
    query: { queryKey: getGetDashboardStatsQueryKey() }
  });
  const { data: activity, isLoading: activityLoading } = useGetRecentActivity({
    query: { queryKey: getGetRecentActivityQueryKey() }
  });

  const [activeDialog, setActiveDialog] = useState<DialogType>(null);
  const [dialogLoading, setDialogLoading] = useState(false);
  const [membersData, setMembersData] = useState<MemberUser[] | null>(null);
  const [enrollData, setEnrollData] = useState<UserEnrollment[] | AdminEnrollmentRow[] | null>(null);
  const [progressData, setProgressData] = useState<UserProgressData | AdminProgressData | null>(null);

  const authToken = token ?? localStorage.getItem("lms_token");

  const fetchJson = useCallback(async (path: string) => {
    const resp = await fetch(path, { headers: { Authorization: `Bearer ${authToken}` } });
    if (!resp.ok) throw new Error("Failed to fetch");
    return resp.json();
  }, [authToken]);

  const openDialog = useCallback(async (type: DialogType) => {
    setActiveDialog(type);
    setDialogLoading(true);
    try {
      if (type === "members" && !membersData) {
        const data = await fetchJson("/api/dashboard/members") as MemberUser[];
        setMembersData(data);
      } else if ((type === "enrollments" || type === "my-courses") && !enrollData) {
        const data = await fetchJson("/api/dashboard/enrollments") as UserEnrollment[] | AdminEnrollmentRow[];
        setEnrollData(data);
      } else if (type === "progress" && !progressData) {
        const data = await fetchJson("/api/dashboard/progress") as UserProgressData | AdminProgressData;
        setProgressData(data);
      }
    } catch { /* silently ignore */ }
    finally { setDialogLoading(false); }
  }, [fetchJson, membersData, enrollData, progressData]);

  const hour = new Date().getHours();
  const greeting =
    hour >= 5 && hour < 12 ? "Good Morning" :
    hour >= 12 && hour < 17 ? "Good Afternoon" :
    hour >= 17 && hour < 21 ? "Good Evening" :
    "Good Night";

  // ── Dialog content renderers ───────────────────────────────────────────────

  function renderMembersDialog() {
    if (dialogLoading) return <DialogSkeleton />;
    if (!membersData || membersData.length === 0) {
      return <p className="text-sm text-muted-foreground text-center py-6">No members found.</p>;
    }
    if (isAdmin) {
      return (
        <div className="divide-y divide-border">
          {membersData.map(m => (
            <div key={m.id} className="flex items-center justify-between py-3 gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{m.name}</p>
                <p className="text-xs text-muted-foreground truncate">{m.email}</p>
              </div>
              {m.createdAt && (
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  Joined {formatDistanceToNow(new Date(m.createdAt), { addSuffix: true })}
                </span>
              )}
            </div>
          ))}
        </div>
      );
    }
    return (
      <div className="divide-y divide-border">
        {membersData.map(m => (
          <div key={m.id} className="py-2.5">
            <p className="text-sm font-medium">{m.name}</p>
          </div>
        ))}
      </div>
    );
  }

  function renderEnrollmentsDialog() {
    if (dialogLoading) return <DialogSkeleton />;
    if (!enrollData || enrollData.length === 0) {
      return <p className="text-sm text-muted-foreground text-center py-6">No enrollments found.</p>;
    }

    if (isAdmin) {
      const rows = enrollData as AdminEnrollmentRow[];
      return (
        <div className="space-y-5">
          {rows.map(row => (
            <div key={row.userId}>
              <p className="text-sm font-semibold mb-2">{row.userName}</p>
              <div className="space-y-2 pl-3">
                {row.courses.map((c, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs truncate flex-1 mr-2">{c.title}</span>
                      <span className="text-xs font-medium text-muted-foreground flex-shrink-0">{c.progress}%</span>
                    </div>
                    <Progress value={c.progress} className="h-1.5" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      );
    }

    const courses = enrollData as UserEnrollment[];
    return (
      <div className="space-y-3">
        {courses.map((c, i) => (
          <div key={i}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm truncate flex-1 mr-2">{c.title}</span>
              <span className="text-sm font-medium flex-shrink-0">{c.progress}%</span>
            </div>
            <Progress value={c.progress} className="h-1.5" />
          </div>
        ))}
      </div>
    );
  }

  function renderMyCoursesDialog() {
    if (dialogLoading) return <DialogSkeleton />;
    if (!enrollData || enrollData.length === 0) {
      return <p className="text-sm text-muted-foreground text-center py-6">No enrolled courses.</p>;
    }

    // Always show own courses (admin sees their own; user sees their own)
    const courses = isAdmin
      ? [] // Admin: we re-use enrollments endpoint which returns all users; for My Courses we use stats
      : (enrollData as UserEnrollment[]);

    if (isAdmin) {
      // For admin "My Courses" we show stats.myEnrollments count + prompt to use Enrollments card for details
      return (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            As admin, your enrolled courses appear in the Enrollments section under your name.
          </p>
          <p className="text-sm">You are enrolled in <span className="font-semibold">{stats?.myEnrollments ?? 0}</span> course(s).</p>
        </div>
      );
    }

    return (
      <div className="divide-y divide-border">
        {courses.map((c, i) => (
          <div key={i} className="flex items-center justify-between py-3 gap-4">
            <p className="text-sm font-medium truncate flex-1">{c.title}</p>
            <Badge variant="secondary" className="flex-shrink-0">{c.progress}% done</Badge>
          </div>
        ))}
      </div>
    );
  }

  function renderProgressDialog() {
    if (dialogLoading) return <DialogSkeleton />;
    if (!progressData) return <p className="text-sm text-muted-foreground text-center py-6">No data available.</p>;

    if (isAdmin) {
      const data = progressData as AdminProgressData;
      return (
        <div className="space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Your Progress</p>
            <p className="text-2xl font-bold">{data.myAvg}%</p>
            {data.myCourses.length > 0 && (
              <div className="mt-3 space-y-2">
                {data.myCourses.map((c, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="truncate flex-1 mr-2">{c.title}</span>
                      <span className="flex-shrink-0">{c.progress}%</span>
                    </div>
                    <Progress value={c.progress} className="h-1" />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">All Users</p>
            {data.allUsersProgress.length === 0 ? (
              <p className="text-sm text-muted-foreground">No enrollment data.</p>
            ) : (
              <div className="divide-y divide-border">
                {data.allUsersProgress.map((u, i) => (
                  <div key={i} className="flex items-center justify-between py-2.5 gap-4">
                    <p className="text-sm truncate flex-1">{u.name}</p>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Progress value={u.avgProgress} className="h-1.5 w-20" />
                      <span className="text-xs font-medium w-8 text-right">{u.avgProgress}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }

    const data = progressData as UserProgressData;
    return (
      <div className="space-y-4">
        <div className="text-center py-3">
          <p className="text-4xl font-bold">{data.avgProgress}%</p>
          <p className="text-xs text-muted-foreground mt-1">Average across all courses</p>
        </div>
        {data.courses.length > 0 && (
          <div className="space-y-3">
            {data.courses.map((c, i) => (
              <div key={i}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="truncate flex-1 mr-2">{c.title}</span>
                  <span className="flex-shrink-0 font-medium">{c.progress}%</span>
                </div>
                <Progress value={c.progress} className="h-1.5" />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const dialogTitles: Record<NonNullable<DialogType>, string> = {
    members: isAdmin ? "All Members" : "Members",
    enrollments: isAdmin ? "All Enrollments" : "My Enrollments",
    "my-courses": "My Courses",
    progress: isAdmin ? "Progress Overview" : "My Progress",
  };

  return (
    <Layout>
      <div className="p-6 max-w-6xl mx-auto space-y-8">
        {/* Welcome header */}
        <div>
          <h1 className="text-2xl font-bold" data-testid="dashboard-greeting">
            {greeting}, {user?.name?.split(" ")[0]}
          </h1>
          <p className="text-muted-foreground mt-1">Here's what's happening in your learning community</p>
        </div>

        {/* Stats grid */}
        {statsLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}><CardContent className="pt-6"><Skeleton className="h-20 w-full" /></CardContent></Card>
            ))}
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-2 lg:grid-cols-3 gap-4"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.08 } }
            }}
          >
            {[
              {
                title: "Total Members",
                value: stats?.totalUsers ?? 0,
                icon: Users,
                color: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
                onClick: () => openDialog("members"),
              },
              {
                title: "Total Courses",
                value: stats?.totalCourses ?? 0,
                icon: BookOpen,
                color: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
                onClick: () => setLocation("/courses"),
              },
              {
                title: "Enrollments",
                value: stats?.totalEnrollments ?? 0,
                icon: TrendingUp,
                color: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
                onClick: () => openDialog("enrollments"),
              },
              {
                title: "Community Posts",
                value: stats?.totalPosts ?? 0,
                icon: MessageSquare,
                color: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
                onClick: () => setLocation("/community"),
              },
              {
                title: "My Courses",
                value: stats?.myEnrollments ?? 0,
                icon: Award,
                description: "Enrolled courses",
                color: "bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400",
                onClick: () => openDialog("my-courses"),
              },
              {
                title: "Avg Progress",
                value: `${stats?.myProgress ?? 0}%`,
                icon: Clock,
                description: "Across all courses",
                color: "bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400",
                onClick: () => openDialog("progress"),
              },
            ].map(card => (
              <motion.div key={card.title} variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }} transition={{ duration: 0.3 }}>
                <StatCard
                  title={card.title}
                  value={card.value}
                  icon={card.icon}
                  description={card.description}
                  color={card.color}
                  onClick={card.onClick}
                />
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* User info */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Account Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Email</span>
                <span data-testid="text-user-email" className="font-medium">{user?.email}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Role</span>
                <Badge variant="secondary" data-testid="text-user-role">{user?.role}</Badge>
              </div>
              {user?.lastLogin && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Last login</span>
                  <span data-testid="text-last-login" className="font-medium">
                    {formatDistanceToNow(new Date(user.lastLogin), { addSuffix: true })}
                  </span>
                </div>
              )}
              {user?.lastLogout && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Last logout</span>
                  <span data-testid="text-last-logout" className="font-medium">
                    {formatDistanceToNow(new Date(user.lastLogout), { addSuffix: true })}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Member since</span>
                <span className="font-medium">
                  {user?.createdAt ? formatDistanceToNow(new Date(user.createdAt), { addSuffix: true }) : "—"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Recent activity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {activityLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex gap-3"><Skeleton className="w-8 h-8 rounded-full" /><div className="flex-1"><Skeleton className="h-4 w-full" /></div></div>
                  ))}
                </div>
              ) : activity && activity.length > 0 ? (
                <div className="space-y-3">
                  {activity.slice(0, 6).map(item => (
                    <div key={item.id} className="flex items-center gap-3" data-testid={`activity-item-${item.id}`}>
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        <AvatarImage src={item.userAvatar ?? undefined} />
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {item.userName.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{item.message}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs flex-shrink-0">{item.type}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Detail Dialogs */}
      <Dialog open={activeDialog !== null} onOpenChange={open => !open && setActiveDialog(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{activeDialog ? dialogTitles[activeDialog] : ""}</DialogTitle>
          </DialogHeader>
          <div className="mt-2">
            {activeDialog === "members" && renderMembersDialog()}
            {activeDialog === "enrollments" && renderEnrollmentsDialog()}
            {activeDialog === "my-courses" && renderMyCoursesDialog()}
            {activeDialog === "progress" && renderProgressDialog()}
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
