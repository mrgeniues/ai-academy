import { useState } from "react";
import { useListPosts, useCreatePost, useDeletePost, useLikePost, useListComments, useCreateComment, useDeleteComment, getListPostsQueryKey, getListCommentsQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart, MessageCircle, Trash2, Send, ChevronDown, ChevronUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

function CommentSection({ postId }: { postId: number }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [commentText, setCommentText] = useState("");

  const { data: comments, isLoading } = useListComments(postId, {
    query: { queryKey: getListCommentsQueryKey(postId) }
  });
  const createMutation = useCreateComment();
  const deleteMutation = useDeleteComment();

  const handleSubmit = async () => {
    if (!commentText.trim()) return;
    try {
      await createMutation.mutateAsync({ postId, data: { comment: commentText.trim() } });
      queryClient.invalidateQueries({ queryKey: getListCommentsQueryKey(postId) });
      queryClient.invalidateQueries({ queryKey: getListPostsQueryKey() });
      setCommentText("");
    } catch {
      toast({ title: "Failed to post comment", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteMutation.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListCommentsQueryKey(postId) });
      queryClient.invalidateQueries({ queryKey: getListPostsQueryKey() });
    } catch {}
  };

  return (
    <div className="mt-3 pt-3 border-t border-border space-y-3">
      {isLoading ? (
        <Skeleton className="h-16 w-full" />
      ) : comments && comments.length > 0 ? (
        <div className="space-y-2.5">
          {comments.map(comment => (
            <div key={comment.id} className="flex gap-2" data-testid={`comment-${comment.id}`}>
              <Avatar className="w-7 h-7 flex-shrink-0">
                <AvatarImage src={comment.author.avatar ?? undefined} />
                <AvatarFallback className="text-xs bg-muted">{comment.author.name.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 bg-muted rounded-lg px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">{comment.author.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                    </span>
                    {(comment.userId === user?.id || user?.role === "admin") && (
                      <button
                        onClick={() => handleDelete(comment.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                        data-testid={`button-delete-comment-${comment.id}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-sm mt-0.5">{comment.comment}</p>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* Comment input */}
      <div className="flex gap-2">
        <Avatar className="w-7 h-7 flex-shrink-0">
          <AvatarFallback className="text-xs bg-primary/10 text-primary">{user?.name?.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1 flex gap-2">
          <input
            data-testid={`input-comment-${postId}`}
            type="text"
            value={commentText}
            onChange={e => setCommentText(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            placeholder="Write a comment..."
            className="flex-1 text-sm bg-muted rounded-full px-4 py-1.5 border-0 outline-none focus:ring-2 focus:ring-primary/20"
          />
          <Button
            data-testid={`button-submit-comment-${postId}`}
            size="sm"
            onClick={handleSubmit}
            disabled={!commentText.trim() || createMutation.isPending}
            className="rounded-full"
          >
            <Send className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function PostCard({ post }: { post: ReturnType<typeof useListPosts>["data"] extends (infer T)[] | undefined ? T : never }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showComments, setShowComments] = useState(false);

  const deleteMutation = useDeletePost();
  const likeMutation = useLikePost();

  if (!post) return null;

  const handleLike = async () => {
    try {
      await likeMutation.mutateAsync({ id: post.id });
      queryClient.invalidateQueries({ queryKey: getListPostsQueryKey() });
    } catch {}
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync({ id: post.id });
      queryClient.invalidateQueries({ queryKey: getListPostsQueryKey() });
    } catch {
      toast({ title: "Failed to delete post", variant: "destructive" });
    }
  };

  const initials = post.author.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <Card data-testid={`post-${post.id}`}>
      <CardContent className="pt-4 pb-3 px-4">
        {/* Author */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <Avatar className="w-9 h-9">
              <AvatarImage src={post.author.avatar ?? undefined} />
              <AvatarFallback className="text-sm bg-primary/10 text-primary font-semibold">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-semibold">{post.author.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
              </p>
            </div>
          </div>
          {(post.userId === user?.id || user?.role === "admin") && (
            <button
              data-testid={`button-delete-post-${post.id}`}
              onClick={handleDelete}
              className="text-muted-foreground hover:text-destructive transition-colors p-1"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Content */}
        <p className="text-sm leading-relaxed" data-testid={`text-post-content-${post.id}`}>{post.content}</p>

        {/* Actions */}
        <div className="flex items-center gap-4 mt-3">
          <button
            data-testid={`button-like-${post.id}`}
            onClick={handleLike}
            disabled={likeMutation.isPending}
            className={`flex items-center gap-1.5 text-sm transition-colors ${
              post.isLiked ? "text-red-500" : "text-muted-foreground hover:text-red-500"
            }`}
          >
            <Heart className={`w-4 h-4 ${post.isLiked ? "fill-current" : ""}`} />
            <span data-testid={`text-like-count-${post.id}`}>{post.likeCount}</span>
          </button>

          <button
            data-testid={`button-toggle-comments-${post.id}`}
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            <span>{post.commentCount}</span>
            {showComments ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {/* Comments */}
        {showComments && <CommentSection postId={post.id} />}
      </CardContent>
    </Card>
  );
}

export default function CommunityPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [newPost, setNewPost] = useState("");

  const { data: posts, isLoading } = useListPosts({
    query: { queryKey: getListPostsQueryKey() }
  });
  const createMutation = useCreatePost();

  const initials = user?.name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) ?? "?";

  const handleCreatePost = async () => {
    if (!newPost.trim()) return;
    try {
      await createMutation.mutateAsync({ data: { content: newPost.trim() } });
      queryClient.invalidateQueries({ queryKey: getListPostsQueryKey() });
      setNewPost("");
    } catch {
      toast({ title: "Failed to create post", variant: "destructive" });
    }
  };

  return (
    <Layout>
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Community</h1>
          <p className="text-muted-foreground text-sm mt-1">Share your thoughts and connect with fellow learners</p>
        </div>

        {/* Create post */}
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex gap-3">
              <Avatar className="w-9 h-9 flex-shrink-0">
                <AvatarImage src={user?.avatar ?? undefined} />
                <AvatarFallback className="text-sm bg-primary/10 text-primary font-semibold">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-2">
                <Textarea
                  data-testid="input-new-post"
                  placeholder="Share something with the community..."
                  value={newPost}
                  onChange={e => setNewPost(e.target.value)}
                  className="min-h-[80px] resize-none border-0 bg-muted focus-visible:ring-0 rounded-xl"
                />
                <div className="flex justify-end">
                  <Button
                    data-testid="button-submit-post"
                    onClick={handleCreatePost}
                    disabled={!newPost.trim() || createMutation.isPending}
                    className="gap-2"
                    size="sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {createMutation.isPending ? "Posting..." : "Post"}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Posts feed */}
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}><CardContent className="pt-4"><Skeleton className="h-24 w-full" /></CardContent></Card>
            ))}
          </div>
        ) : posts && posts.length > 0 ? (
          <div className="space-y-4">
            {posts.map(post => <PostCard key={post.id} post={post} />)}
          </div>
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            <MessageCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No posts yet. Be the first to share something!</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
