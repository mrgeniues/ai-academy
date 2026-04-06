import { Router, type IRouter } from "express";
import { db, postsTable, commentsTable, likesTable, usersTable } from "@workspace/db";
import { eq, count, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { formatUser } from "./auth";
import { CreatePostBody, CreateCommentBody } from "@workspace/api-zod";

const router: IRouter = Router();

async function enrichPost(post: typeof postsTable.$inferSelect, userId: number) {
  const [author] = await db.select().from(usersTable).where(eq(usersTable.id, post.userId));
  const [lc] = await db.select({ cnt: count() }).from(likesTable).where(eq(likesTable.postId, post.id));
  const [cc] = await db.select({ cnt: count() }).from(commentsTable).where(eq(commentsTable.postId, post.id));
  const [likedRow] = await db.select().from(likesTable)
    .where(sql`${likesTable.postId} = ${post.id} AND ${likesTable.userId} = ${userId}`);

  return {
    id: post.id,
    userId: post.userId,
    content: post.content,
    likeCount: Number(lc?.cnt ?? 0),
    commentCount: Number(cc?.cnt ?? 0),
    isLiked: !!likedRow,
    createdAt: post.createdAt.toISOString(),
    author: formatUser(author!),
  };
}

router.get("/posts", requireAuth, async (req, res): Promise<void> => {
  const posts = await db.select().from(postsTable).orderBy(sql`${postsTable.createdAt} DESC`);
  const enriched = await Promise.all(posts.map(p => enrichPost(p, req.userId!)));
  res.json(enriched);
});

router.post("/posts", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreatePostBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [post] = await db.insert(postsTable)
    .values({ userId: req.userId!, content: parsed.data.content })
    .returning();

  const enriched = await enrichPost(post, req.userId!);
  res.status(201).json(enriched);
});

router.delete("/posts/:id", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid post id" });
    return;
  }

  const [post] = await db.select().from(postsTable).where(eq(postsTable.id, id));
  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  if (post.userId !== req.userId && req.userRole !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  await db.delete(postsTable).where(eq(postsTable.id, id));
  res.sendStatus(204);
});

router.post("/posts/:id/like", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid post id" });
    return;
  }

  const [existing] = await db.select().from(likesTable)
    .where(sql`${likesTable.postId} = ${id} AND ${likesTable.userId} = ${req.userId}`);

  let liked: boolean;
  if (existing) {
    await db.delete(likesTable)
      .where(sql`${likesTable.postId} = ${id} AND ${likesTable.userId} = ${req.userId}`);
    liked = false;
  } else {
    await db.insert(likesTable).values({ postId: id, userId: req.userId! });
    liked = true;
  }

  const [lc] = await db.select({ cnt: count() }).from(likesTable).where(eq(likesTable.postId, id));

  res.json({ liked, likeCount: Number(lc?.cnt ?? 0) });
});

// Comments
router.get("/posts/:postId/comments", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.postId) ? req.params.postId[0] : req.params.postId;
  const postId = parseInt(rawId, 10);
  if (isNaN(postId)) {
    res.status(400).json({ error: "Invalid post id" });
    return;
  }

  const comments = await db.select().from(commentsTable)
    .where(eq(commentsTable.postId, postId))
    .orderBy(commentsTable.createdAt);

  const enriched = await Promise.all(comments.map(async (comment) => {
    const [author] = await db.select().from(usersTable).where(eq(usersTable.id, comment.userId));
    return {
      ...comment,
      createdAt: comment.createdAt.toISOString(),
      author: formatUser(author!),
    };
  }));

  res.json(enriched);
});

router.post("/posts/:postId/comments", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.postId) ? req.params.postId[0] : req.params.postId;
  const postId = parseInt(rawId, 10);
  if (isNaN(postId)) {
    res.status(400).json({ error: "Invalid post id" });
    return;
  }

  const parsed = CreateCommentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [comment] = await db.insert(commentsTable)
    .values({ postId, userId: req.userId!, comment: parsed.data.comment })
    .returning();

  const [author] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));

  res.status(201).json({
    ...comment,
    createdAt: comment.createdAt.toISOString(),
    author: formatUser(author!),
  });
});

router.delete("/comments/:id", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid comment id" });
    return;
  }

  const [comment] = await db.select().from(commentsTable).where(eq(commentsTable.id, id));
  if (!comment) {
    res.status(404).json({ error: "Comment not found" });
    return;
  }

  if (comment.userId !== req.userId && req.userRole !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  await db.delete(commentsTable).where(eq(commentsTable.id, id));
  res.sendStatus(204);
});

export default router;
