import { useGetDashboardStats, useGetRecentActivity, getGetDashboardStatsQueryKey, getGetRecentActivityQueryKey } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Users, BookOpen, TrendingUp, MessageSquare, Clock, Award } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

function StatCard({ title, value, icon: Icon, description, color }: {
  title: string;
  value: number | string;
  icon: React.ElementType;
  description?: string;
  color: string;
}) {
  return (
    <Card data-testid={`stat-${title.toLowerCase().replace(/\s+/g, "-")}`}>
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

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats({
    query: { queryKey: getGetDashboardStatsQueryKey() }
  });
  const { data: activity, isLoading: activityLoading } = useGetRecentActivity({
    query: { queryKey: getGetRecentActivityQueryKey() }
  });

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

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
              { title: "Total Members", value: stats?.totalUsers ?? 0, icon: Users, color: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" },
              { title: "Total Courses", value: stats?.totalCourses ?? 0, icon: BookOpen, color: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" },
              { title: "Enrollments", value: stats?.totalEnrollments ?? 0, icon: TrendingUp, color: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" },
              { title: "Community Posts", value: stats?.totalPosts ?? 0, icon: MessageSquare, color: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400" },
              { title: "My Courses", value: stats?.myEnrollments ?? 0, icon: Award, description: "Enrolled courses", color: "bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400" },
              { title: "Avg Progress", value: `${stats?.myProgress ?? 0}%`, icon: Clock, description: "Across all courses", color: "bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400" },
            ].map(card => (
              <motion.div key={card.title} variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }} transition={{ duration: 0.3 }}>
                <StatCard title={card.title} value={card.value} icon={card.icon} description={card.description} color={card.color} />
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
    </Layout>
  );
}
