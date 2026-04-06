import { Router, type IRouter } from "express";
import { db, usersTable, coursesTable, enrollmentsTable, postsTable } from "@workspace/db";
import { eq, count, avg } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.get("/dashboard/stats", requireAuth, async (req, res): Promise<void> => {
  const [userCount] = await db.select({ cnt: count() }).from(usersTable);
  const [courseCount] = await db.select({ cnt: count() }).from(coursesTable);
  const [enrollmentCount] = await db.select({ cnt: count() }).from(enrollmentsTable);
  const [postCount] = await db.select({ cnt: count() }).from(postsTable);

  const myEnrollments = await db.select().from(enrollmentsTable)
    .where(eq(enrollmentsTable.userId, req.userId!));

  const myProgress = myEnrollments.length > 0
    ? Math.round(myEnrollments.reduce((sum, e) => sum + e.progress, 0) / myEnrollments.length)
    : 0;

  res.json({
    totalUsers: Number(userCount?.cnt ?? 0),
    totalCourses: Number(courseCount?.cnt ?? 0),
    totalEnrollments: Number(enrollmentCount?.cnt ?? 0),
    totalPosts: Number(postCount?.cnt ?? 0),
    myEnrollments: myEnrollments.length,
    myProgress,
  });
});

router.get("/dashboard/activity", requireAuth, async (_req, res): Promise<void> => {
  // Pull recent posts as activity
  const recentPosts = await db.select({
    id: postsTable.id,
    userId: postsTable.userId,
    createdAt: postsTable.createdAt,
  }).from(postsTable).orderBy(postsTable.createdAt).limit(10);

  const recentEnrollments = await db.select({
    id: enrollmentsTable.id,
    userId: enrollmentsTable.userId,
    courseId: enrollmentsTable.courseId,
    createdAt: enrollmentsTable.createdAt,
  }).from(enrollmentsTable).orderBy(enrollmentsTable.createdAt).limit(10);

  const activity = [];

  for (const post of recentPosts) {
    const [user] = await db.select({ name: usersTable.name, avatar: usersTable.avatar })
      .from(usersTable).where(eq(usersTable.id, post.userId));
    activity.push({
      id: post.id,
      type: "post",
      message: `${user?.name ?? "Someone"} shared a new post`,
      createdAt: post.createdAt.toISOString(),
      userId: post.userId,
      userName: user?.name ?? "Unknown",
      userAvatar: user?.avatar ?? null,
    });
  }

  for (const enrollment of recentEnrollments) {
    const [user] = await db.select({ name: usersTable.name, avatar: usersTable.avatar })
      .from(usersTable).where(eq(usersTable.id, enrollment.userId));
    const [course] = await db.select({ title: coursesTable.title })
      .from(coursesTable).where(eq(coursesTable.id, enrollment.courseId));
    activity.push({
      id: enrollment.id + 100000,
      type: "enrollment",
      message: `${user?.name ?? "Someone"} enrolled in ${course?.title ?? "a course"}`,
      createdAt: enrollment.createdAt.toISOString(),
      userId: enrollment.userId,
      userName: user?.name ?? "Unknown",
      userAvatar: user?.avatar ?? null,
    });
  }

  // Sort by date descending
  activity.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json(activity.slice(0, 15));
});

export default router;
