import { Router, type IRouter } from "express";
import { db, enrollmentsTable, coursesTable, lessonsTable } from "@workspace/db";
import { eq, count, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { EnrollInCourseBody, UpdateProgressBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/enrollments", requireAuth, async (req, res): Promise<void> => {
  const enrollments = await db.select().from(enrollmentsTable)
    .where(eq(enrollmentsTable.userId, req.userId!));

  const enriched = await Promise.all(enrollments.map(async (enrollment) => {
    const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, enrollment.courseId));
    const [lc] = await db.select({ cnt: count() }).from(lessonsTable).where(eq(lessonsTable.courseId, enrollment.courseId));
    const [ec] = await db.select({ cnt: count() }).from(enrollmentsTable).where(eq(enrollmentsTable.courseId, enrollment.courseId));

    return {
      ...enrollment,
      createdAt: enrollment.createdAt.toISOString(),
      course: {
        ...course!,
        description: course!.description ?? null,
        thumbnail: course!.thumbnail ?? null,
        lessonCount: lc?.cnt ?? 0,
        enrollmentCount: ec?.cnt ?? 0,
        createdAt: course!.createdAt.toISOString(),
        updatedAt: course!.updatedAt.toISOString(),
      },
    };
  }));

  res.json(enriched);
});

router.post("/enrollments", requireAuth, async (req, res): Promise<void> => {
  const parsed = EnrollInCourseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { courseId } = parsed.data;

  const [existing] = await db.select().from(enrollmentsTable)
    .where(sql`${enrollmentsTable.userId} = ${req.userId} AND ${enrollmentsTable.courseId} = ${courseId}`);

  if (existing) {
    res.status(400).json({ error: "Already enrolled" });
    return;
  }

  const [enrollment] = await db.insert(enrollmentsTable)
    .values({ userId: req.userId!, courseId, progress: 0 })
    .returning();

  res.status(201).json({
    ...enrollment,
    createdAt: enrollment.createdAt.toISOString(),
  });
});

router.patch("/enrollments/:courseId/progress", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.courseId) ? req.params.courseId[0] : req.params.courseId;
  const courseId = parseInt(rawId, 10);
  if (isNaN(courseId)) {
    res.status(400).json({ error: "Invalid course id" });
    return;
  }

  const parsed = UpdateProgressBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [enrollment] = await db.update(enrollmentsTable)
    .set({ progress: parsed.data.progress })
    .where(sql`${enrollmentsTable.userId} = ${req.userId} AND ${enrollmentsTable.courseId} = ${courseId}`)
    .returning();

  if (!enrollment) {
    res.status(404).json({ error: "Enrollment not found" });
    return;
  }

  res.json({
    ...enrollment,
    createdAt: enrollment.createdAt.toISOString(),
  });
});

export default router;
