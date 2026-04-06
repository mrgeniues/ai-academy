import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { formatUser } from "./auth";
import { CreatePostBody, CreateCommentBody } from "@workspace/api-zod";
import { supabase } from "../lib/supabase";

const router: IRouter = Router();

async function enrichPost(post: Record<string, unknown>, userId: number) {
  const { data: author } = await supabase
    .from("users")
    .select("*")
    .eq("id", post.user_id as number)
    .maybeSingle();

  const { count: likeCount } = await supabase
    .from("likes")
    .select("*", { count: "exact", head: true })
    .eq("post_id", post.id as number);

  const { count: commentCount } = await supabase
    .from("comments")
    .select("*", { count: "exact", head: true })
    .eq("post_id", post.id as number);

  const { data: likedRow } = await supabase
    .from("likes")
    .select("id")
    .eq("post_id", post.id as number)
    .eq("user_id", userId)
    .maybeSingle();

  return {
    id: post.id,
    userId: post.user_id,
    content: post.content,
    likeCount: likeCount ?? 0,
    commentCount: commentCount ?? 0,
    isLiked: !!likedRow,
    createdAt: post.created_at,
    author: formatUser(author!),
  };
}

router.get("/posts", requireAuth, async (req, res): Promise<void> => {
  const { data: posts, error } = await supabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    res.status(500).json({ error: "Failed to fetch posts" });
    return;
  }

  const enriched = await Promise.all((posts ?? []).map(p => enrichPost(p, req.userId!)));
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
    .select()
    .single();

  if (error || !post) {
    res.status(500).json({ error: "Failed to create post" });
    return;
  }

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

  const { data: post } = await supabase
    .from("posts")
    .select("*")
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
    .select("*")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  const enriched = await Promise.all((comments ?? []).map(async (comment) => {
    const { data: author } = await supabase
      .from("users")
      .select("*")
      .eq("id", comment.user_id)
      .maybeSingle();

    return {
      id: comment.id,
      postId: comment.post_id,
      userId: comment.user_id,
      comment: comment.comment,
      createdAt: comment.created_at,
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

  const { data: comment, error } = await supabase
    .from("comments")
    .insert({ post_id: postId, user_id: req.userId!, comment: parsed.data.comment })
    .select()
    .single();

  if (error || !comment) {
    res.status(500).json({ error: "Failed to create comment" });
    return;
  }

  const { data: author } = await supabase
    .from("users")
    .select("*")
    .eq("id", req.userId!)
    .maybeSingle();

  res.status(201).json({
    id: comment.id,
    postId: comment.post_id,
    userId: comment.user_id,
    comment: comment.comment,
    createdAt: comment.created_at,
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

  const { data: comment } = await supabase
    .from("comments")
    .select("*")
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
