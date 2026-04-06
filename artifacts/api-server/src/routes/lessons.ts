import { Router, type IRouter } from "express";
import { db, lessonsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { CreateLessonBody, UpdateLessonBody } from "@workspace/api-zod";

const router: IRouter = Router();

function formatLesson(lesson: typeof lessonsTable.$inferSelect) {
  return {
    ...lesson,
    videoUrl: lesson.videoUrl ?? null,
    content: lesson.content ?? null,
    createdAt: lesson.createdAt.toISOString(),
  };
}

router.get("/courses/:courseId/lessons", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.courseId) ? req.params.courseId[0] : req.params.courseId;
  const courseId = parseInt(rawId, 10);
  if (isNaN(courseId)) {
    res.status(400).json({ error: "Invalid course id" });
    return;
  }

  const lessons = await db.select().from(lessonsTable)
    .where(eq(lessonsTable.courseId, courseId))
    .orderBy(lessonsTable.order);

  res.json(lessons.map(formatLesson));
});

router.post("/courses/:courseId/lessons", requireAuth, async (req, res): Promise<void> => {
  if (req.userRole !== "admin" && req.userRole !== "creator") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const rawId = Array.isArray(req.params.courseId) ? req.params.courseId[0] : req.params.courseId;
  const courseId = parseInt(rawId, 10);
  if (isNaN(courseId)) {
    res.status(400).json({ error: "Invalid course id" });
    return;
  }

  const parsed = CreateLessonBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [lesson] = await db.insert(lessonsTable)
    .values({ ...parsed.data, courseId })
    .returning();

  res.status(201).json(formatLesson(lesson));
});

router.patch("/lessons/:id", requireAuth, async (req, res): Promise<void> => {
  if (req.userRole !== "admin" && req.userRole !== "creator") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid lesson id" });
    return;
  }

  const parsed = UpdateLessonBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [lesson] = await db.update(lessonsTable)
    .set(parsed.data)
    .where(eq(lessonsTable.id, id))
    .returning();

  if (!lesson) {
    res.status(404).json({ error: "Lesson not found" });
    return;
  }

  res.json(formatLesson(lesson));
});

router.delete("/lessons/:id", requireAuth, async (req, res): Promise<void> => {
  if (req.userRole !== "admin" && req.userRole !== "creator") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid lesson id" });
    return;
  }

  await db.delete(lessonsTable).where(eq(lessonsTable.id, id));
  res.sendStatus(204);
});

export default router;
