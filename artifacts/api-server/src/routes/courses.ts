import { Router, type IRouter } from "express";
import { db, coursesTable, lessonsTable, enrollmentsTable } from "@workspace/db";
import { eq, count, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { CreateCourseBody, UpdateCourseBody } from "@workspace/api-zod";

const router: IRouter = Router();

async function getCourseWithCounts(courseId: number) {
  const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, courseId));
  if (!course) return null;

  const [lc] = await db.select({ cnt: count() }).from(lessonsTable).where(eq(lessonsTable.courseId, courseId));
  const [ec] = await db.select({ cnt: count() }).from(enrollmentsTable).where(eq(enrollmentsTable.courseId, courseId));

  return {
    ...course,
    description: course.description ?? null,
    thumbnail: course.thumbnail ?? null,
    lessonCount: lc?.cnt ?? 0,
    enrollmentCount: ec?.cnt ?? 0,
    createdAt: course.createdAt.toISOString(),
    updatedAt: course.updatedAt.toISOString(),
  };
}

router.get("/courses", requireAuth, async (_req, res): Promise<void> => {
  const courses = await db.select().from(coursesTable).orderBy(coursesTable.createdAt);

  const enriched = await Promise.all(courses.map(async (course) => {
    const [lc] = await db.select({ cnt: count() }).from(lessonsTable).where(eq(lessonsTable.courseId, course.id));
    const [ec] = await db.select({ cnt: count() }).from(enrollmentsTable).where(eq(enrollmentsTable.courseId, course.id));
    return {
      ...course,
      description: course.description ?? null,
      thumbnail: course.thumbnail ?? null,
      lessonCount: lc?.cnt ?? 0,
      enrollmentCount: ec?.cnt ?? 0,
      createdAt: course.createdAt.toISOString(),
      updatedAt: course.updatedAt.toISOString(),
    };
  }));

  res.json(enriched);
});

router.post("/courses", requireAuth, async (req, res): Promise<void> => {
  if (req.userRole !== "admin" && req.userRole !== "creator") {
    res.status(403).json({ error: "Only admins or creators can create courses" });
    return;
  }

  const parsed = CreateCourseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [course] = await db.insert(coursesTable)
    .values({ ...parsed.data, createdBy: req.userId! })
    .returning();

  res.status(201).json({
    ...course,
    description: course.description ?? null,
    thumbnail: course.thumbnail ?? null,
    lessonCount: 0,
    enrollmentCount: 0,
    createdAt: course.createdAt.toISOString(),
    updatedAt: course.updatedAt.toISOString(),
  });
});

router.get("/courses/:id", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid course id" });
    return;
  }

  const course = await getCourseWithCounts(id);
  if (!course) {
    res.status(404).json({ error: "Course not found" });
    return;
  }

  const lessons = await db.select().from(lessonsTable)
    .where(eq(lessonsTable.courseId, id))
    .orderBy(lessonsTable.order);

  const [enrollment] = await db.select()
    .from(enrollmentsTable)
    .where(sql`${enrollmentsTable.courseId} = ${id} AND ${enrollmentsTable.userId} = ${req.userId}`);

  res.json({
    ...course,
    lessons: lessons.map(l => ({
      ...l,
      videoUrl: l.videoUrl ?? null,
      content: l.content ?? null,
      createdAt: l.createdAt.toISOString(),
    })),
    isEnrolled: !!enrollment,
    progress: enrollment?.progress ?? null,
  });
});

router.patch("/courses/:id", requireAuth, async (req, res): Promise<void> => {
  if (req.userRole !== "admin" && req.userRole !== "creator") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid course id" });
    return;
  }

  const parsed = UpdateCourseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const course = await getCourseWithCounts(id);
  if (!course) {
    res.status(404).json({ error: "Course not found" });
    return;
  }

  const [updated] = await db.update(coursesTable)
    .set(parsed.data)
    .where(eq(coursesTable.id, id))
    .returning();

  const updatedWithCounts = await getCourseWithCounts(id);
  res.json(updatedWithCounts);
});

router.delete("/courses/:id", requireAuth, async (req, res): Promise<void> => {
  if (req.userRole !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid course id" });
    return;
  }

  await db.delete(coursesTable).where(eq(coursesTable.id, id));
  res.sendStatus(204);
});

export default router;
