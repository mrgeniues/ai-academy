import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { formatUser } from "./auth";
import { supabase } from "../lib/supabase";
import { broadcastNotification } from "../lib/notifications";
import { z } from "zod";

const router: IRouter = Router();

const CreatePostSchema = z.object({
  content: z.string().min(1),
  imageUrl: z.string().url().optional().nullable(),
  fileUrl: z.string().url().optional().nullable(),
  fileType: z.string().optional().nullable(),
  isVip: z.boolean().optional(),
});

const CreateCommentSchema = z.object({
  comment: z.string().min(1),
  imageUrl: z.string().url().optional().nullable(),
  fileUrl: z.string().url().optional().nullable(),
  fileType: z.string().optional().nullable(),
  parentId: z.number().int().positive().optional().nullable(),
});

router.get("/posts", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const isVipFilter = req.query.vip === "true";

  let query = supabase
    .from("posts")
    .select("*, author:users(*)")
    .order("created_at", { ascending: false });

  let filteredQuery = isVipFilter ? query.eq("is_vip", true) : query.eq("is_vip", false);
  let { data: posts, error } = await filteredQuery;

  if (error && (error.message?.includes("is_vip") || error.code === "42703" || error.code === "PGRST204")) {
    if (isVipFilter) {
      res.json([]);
      return;
    }
    const fallback = await supabase
      .from("posts")
      .select("*, author:users(*)")
      .order("created_at", { ascending: false });
    if (fallback.error) {
      res.status(500).json({ error: "Failed to fetch posts" });
      return;
    }
    posts = fallback.data;
    error = null;
  }

  if (error) {
    console.error("[GET /posts] Supabase error:", error);
    res.status(500).json({ error: "Failed to fetch posts" });
    return;
  }

  const postIds = (posts ?? []).map(p => p.id);

  const [{ data: likeCounts }, { data: commentCounts }, { data: myLikes }] = await Promise.all([
    supabase.from("likes").select("post_id").in("post_id", postIds.length ? postIds : [-1]),
    supabase.from("comments").select("post_id").in("post_id", postIds.length ? postIds : [-1]),
    supabase.from("likes").select("post_id").eq("user_id", userId).in("post_id", postIds.length ? postIds : [-1]),
  ]);

  const likeCountMap = new Map<number, number>();
  const commentCountMap = new Map<number, number>();
  const myLikeSet = new Set<number>((myLikes ?? []).map(l => l.post_id));

  for (const l of likeCounts ?? []) {
    likeCountMap.set(l.post_id, (likeCountMap.get(l.post_id) ?? 0) + 1);
  }
  for (const c of commentCounts ?? []) {
    commentCountMap.set(c.post_id, (commentCountMap.get(c.post_id) ?? 0) + 1);
  }

  const enriched = (posts ?? []).map(post => ({
    id: post.id,
    userId: post.user_id,
    content: post.content,
    imageUrl: post.image_url ?? null,
    fileUrl: (post as Record<string, unknown>).file_url ?? null,
    fileType: (post as Record<string, unknown>).file_type ?? null,
    isVip: post.is_vip ?? false,
    likeCount: likeCountMap.get(post.id) ?? 0,
    commentCount: commentCountMap.get(post.id) ?? 0,
    isLiked: myLikeSet.has(post.id),
    createdAt: post.created_at,
    author: formatUser(post.author),
  }));

  res.json(enriched);
});

router.post("/posts", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreatePostSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { content, imageUrl, fileUrl, fileType, isVip } = parsed.data;

  if (isVip && req.userRole !== "admin") {
    res.status(403).json({ error: "Only admins can create VIP posts" });
    return;
  }

  const insertPayload: Record<string, unknown> = {
    user_id: req.userId!,
    content,
    is_vip: isVip ?? false,
  };
  if (imageUrl) insertPayload.image_url = imageUrl;
  if (fileUrl) insertPayload.file_url = fileUrl;
  if (fileType) insertPayload.file_type = fileType;

  let { data: post, error } = await supabase
    .from("posts")
    .insert(insertPayload)
    .select("*, author:users(*)")
    .single();

  if (error && (error.message?.includes("is_vip") || error.code === "42703" || error.code === "PGRST204")) {
    const { is_vip: _dropped, ...payloadWithoutVip } = insertPayload as Record<string, unknown> & { is_vip?: unknown };
    const retry = await supabase
      .from("posts")
      .insert(payloadWithoutVip)
      .select("*, author:users(*)")
      .single();
    post = retry.data;
    error = retry.error;
  }

  if (error || !post) {
    console.error("[POST /posts] Supabase error:", error);
    res.status(500).json({ error: "Failed to create post" });
    return;
  }

  const isAdmin = req.userRole === "admin";
  const vipPost = isVip ?? false;
  const preview = content.slice(0, 80) + (content.length > 80 ? "…" : "");

  broadcastNotification({
    type: vipPost ? "admin_post" : isAdmin ? "admin_post" : "post",
    title: vipPost ? "New VIP Post ⭐" : isAdmin ? "New Admin Post" : "New Post",
    message: `${post.author?.name ?? "Someone"}: ${preview}`,
    postId: post.id,
    isVip: vipPost,
    excludeUserId: req.userId!,
  }).catch(err => console.error("[broadcastNotification] Failed:", err));

  res.status(201).json({
    id: post.id,
    userId: post.user_id,
    content: post.content,
    imageUrl: post.image_url ?? null,
    fileUrl: (post as Record<string, unknown>).file_url ?? null,
    fileType: (post as Record<string, unknown>).file_type ?? null,
    isVip: post.is_vip ?? false,
    likeCount: 0,
    commentCount: 0,
    isLiked: false,
    createdAt: post.created_at,
    author: formatUser(post.author),
  });
});

router.delete("/posts/:id", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid post id" });
    return;
  }

  const { data: post } = await supabase
    .from("posts")
    .select("user_id")
    .eq("id", id)
    .maybeSingle();

  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  if (post.user_id !== req.userId && req.userRole !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  await supabase.from("posts").delete().eq("id", id);
  res.sendStatus(204);
});

router.post("/posts/:id/like", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid post id" });
    return;
  }

  const { data: existing } = await supabase
    .from("likes")
    .select("id")
    .eq("post_id", id)
    .eq("user_id", req.userId!)
    .maybeSingle();

  let liked: boolean;
  if (existing) {
    await supabase.from("likes").delete().eq("post_id", id).eq("user_id", req.userId!);
    liked = false;
  } else {
    await supabase.from("likes").insert({ post_id: id, user_id: req.userId! });
    liked = true;
  }

  const { count: likeCount } = await supabase
    .from("likes")
    .select("*", { count: "exact", head: true })
    .eq("post_id", id);

  res.json({ liked, likeCount: likeCount ?? 0 });
});

router.get("/posts/:postId/comments", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.postId) ? req.params.postId[0] : req.params.postId;
  const postId = parseInt(rawId, 10);
  if (isNaN(postId)) {
    res.status(400).json({ error: "Invalid post id" });
    return;
  }

  const { data: comments } = await supabase
    .from("comments")
    .select("*, author:users(*)")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  const commentIds = (comments ?? []).map(c => c.id);
  const likesCountMap = new Map<number, number>();
  const isLikedSet = new Set<number>();

  if (commentIds.length > 0) {
    try {
      const { data: commentLikes } = await supabase
        .from("comment_likes")
        .select("comment_id, user_id")
        .in("comment_id", commentIds);
      for (const like of commentLikes ?? []) {
        likesCountMap.set(like.comment_id, (likesCountMap.get(like.comment_id) ?? 0) + 1);
        if (like.user_id === req.userId) isLikedSet.add(like.comment_id);
      }
    } catch { /* comment_likes table may not exist yet */ }
  }

  res.json((comments ?? []).map(comment => ({
    id: comment.id,
    postId: comment.post_id,
    userId: comment.user_id,
    comment: comment.comment,
    imageUrl: comment.image_url ?? null,
    fileUrl: (comment as Record<string, unknown>).file_url ?? null,
    fileType: (comment as Record<string, unknown>).file_type ?? null,
    parentId: (comment as Record<string, unknown>).parent_id ?? null,
    likesCount: likesCountMap.get(comment.id) ?? 0,
    isLiked: isLikedSet.has(comment.id),
    createdAt: comment.created_at,
    author: formatUser(comment.author),
  })));
});

router.post("/posts/:postId/comments", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.postId) ? req.params.postId[0] : req.params.postId;
  const postId = parseInt(rawId, 10);
  if (isNaN(postId)) {
    res.status(400).json({ error: "Invalid post id" });
    return;
  }

  const parsed = CreateCommentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { comment, imageUrl, fileUrl, fileType, parentId } = parsed.data;

  const insertPayload: Record<string, unknown> = {
    post_id: postId,
    user_id: req.userId!,
    comment,
  };
  if (imageUrl) insertPayload.image_url = imageUrl;
  if (fileUrl) insertPayload.file_url = fileUrl;
  if (fileType) insertPayload.file_type = fileType;
  if (parentId) insertPayload.parent_id = parentId;

  const { data: newComment, error } = await supabase
    .from("comments")
    .insert(insertPayload)
    .select("*, author:users(*)")
    .single();

  if (error || !newComment) {
    console.error("[POST /posts/:postId/comments] Supabase error:", error);
    res.status(500).json({ error: "Failed to create comment" });
    return;
  }

  broadcastNotification({
    type: "comment",
    title: "New Comment",
    message: `${newComment.author?.name ?? "Someone"} commented on a post`,
    postId: postId,
    isVip: false,
    excludeUserId: req.userId!,
  }).catch(err => console.error("[broadcastNotification] Failed:", err));

  res.status(201).json({
    id: newComment.id,
    postId: newComment.post_id,
    userId: newComment.user_id,
    comment: newComment.comment,
    imageUrl: newComment.image_url ?? null,
    fileUrl: (newComment as Record<string, unknown>).file_url ?? null,
    fileType: (newComment as Record<string, unknown>).file_type ?? null,
    parentId: (newComment as Record<string, unknown>).parent_id ?? null,
    likesCount: 0,
    isLiked: false,
    createdAt: newComment.created_at,
    author: formatUser(newComment.author),
  });
});

router.post("/comments/:id/like", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid comment id" });
    return;
  }

  try {
    const { data: existing } = await supabase
      .from("comment_likes")
      .select("id")
      .eq("comment_id", id)
      .eq("user_id", req.userId!)
      .maybeSingle();

    let liked: boolean;
    if (existing) {
      await supabase.from("comment_likes").delete().eq("comment_id", id).eq("user_id", req.userId!);
      liked = false;
    } else {
      await supabase.from("comment_likes").insert({ comment_id: id, user_id: req.userId! });
      liked = true;
    }

    const { count } = await supabase
      .from("comment_likes")
      .select("*", { count: "exact", head: true })
      .eq("comment_id", id);

    res.json({ liked, likesCount: count ?? 0 });
  } catch (err) {
    console.error("[POST /comments/:id/like] error:", err);
    res.status(500).json({ error: "Failed to toggle like" });
  }
});

router.delete("/comments/:id", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid comment id" });
    return;
  }

  const { data: comment } = await supabase
    .from("comments")
    .select("user_id")
    .eq("id", id)
    .maybeSingle();

  if (!comment) {
    res.status(404).json({ error: "Comment not found" });
    return;
  }

  if (comment.user_id !== req.userId && req.userRole !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  await supabase.from("comments").delete().eq("id", id);
  res.sendStatus(204);
});

export default router;
