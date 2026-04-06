import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { formatUser } from "./auth";
import { CreatePostBody, CreateCommentBody } from "@workspace/api-zod";
import { supabase } from "../lib/supabase";

const router: IRouter = Router();

router.get("/posts", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;

  const { data: posts, error } = await supabase
    .from("posts")
    .select("*, author:users(*)")
    .order("created_at", { ascending: false });

  if (error) {
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
    likeCount: likeCountMap.get(post.id) ?? 0,
    commentCount: commentCountMap.get(post.id) ?? 0,
    isLiked: myLikeSet.has(post.id),
    createdAt: post.created_at,
    author: formatUser(post.author),
  }));

  res.json(enriched);
});

router.post("/posts", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreatePostBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { data: post, error } = await supabase
    .from("posts")
    .insert({ user_id: req.userId!, content: parsed.data.content })
    .select("*, author:users(*)")
    .single();

  if (error || !post) {
    res.status(500).json({ error: "Failed to create post" });
    return;
  }

  res.status(201).json({
    id: post.id,
    userId: post.user_id,
    content: post.content,
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

  res.json((comments ?? []).map(comment => ({
    id: comment.id,
    postId: comment.post_id,
    userId: comment.user_id,
    comment: comment.comment,
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

  const parsed = CreateCommentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { data: comment, error } = await supabase
    .from("comments")
    .insert({ post_id: postId, user_id: req.userId!, comment: parsed.data.comment })
    .select("*, author:users(*)")
    .single();

  if (error || !comment) {
    res.status(500).json({ error: "Failed to create comment" });
    return;
  }

  res.status(201).json({
    id: comment.id,
    postId: comment.post_id,
    userId: comment.user_id,
    comment: comment.comment,
    createdAt: comment.created_at,
    author: formatUser(comment.author),
  });
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
