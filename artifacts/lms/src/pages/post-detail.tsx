import { useState, useEffect } from "react";
import { useRoute, Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Heart, MessageCircle, ArrowLeft, Link2, Trash2, Send, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const API = "/api";
function authHeaders(token: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface Author { id: number; name: string; avatar: string | null; role: string; }
interface Post {
  id: number; userId: number; content: string;
  imageUrl: string | null; fileUrl: string | null; fileType: string | null;
  likeCount: number; commentCount: number; isLiked: boolean;
  createdAt: string; author: Author;
}
interface Comment {
  id: number; postId: number; userId: number; comment: string;
  imageUrl: string | null; parentId: number | null;
  likesCount: number; isLiked: boolean; createdAt: string; author: Author;
}

const URL_REGEX = /(https?:\/\/[^\s]+)/g;
function ContentWithLinks({ text }: { text: string }) {
  const parts = text.split(URL_REGEX);
  return (
    <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer"
            className="text-primary underline underline-offset-2 hover:text-primary/80 inline-flex items-center gap-0.5 break-all">
            {part}<ExternalLink className="w-3 h-3 flex-shrink-0 inline" />
          </a>
        ) : <span key={i}>{part}</span>
      )}
    </p>
  );
}

export default function PostDetailPage() {
  const [, params] = useRoute("/post/:id");
  const postId = parseInt(params?.id ?? "0", 10);
  const { user, token } = useAuth();
  const { toast } = useToast();

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!postId) return;
    fetch(`${API}/posts/${postId}`, { headers: authHeaders(token) })
      .then(r => r.ok ? r.json() : null)
      .then((data: Post | null) => {
        if (data) { setPost(data); setIsLiked(data.isLiked); setLikeCount(data.likeCount); }
      })
      .finally(() => setLoading(false));

    fetch(`${API}/posts/${postId}/comments`, { headers: authHeaders(token) })
      .then(r => r.ok ? r.json() : [])
      .then((data: Comment[]) => setComments(data))
      .finally(() => setCommentsLoading(false));
  }, [postId, token]);

  const handleLike = async () => {
    setIsLiked(l => !l);
    setLikeCount(c => isLiked ? c - 1 : c + 1);
    await fetch(`${API}/posts/${postId}/like`, { method: "POST", headers: authHeaders(token) });
  };

  const handleDeleteComment = async (id: number) => {
    await fetch(`${API}/comments/${id}`, { method: "DELETE", headers: authHeaders(token) });
    setComments(prev => prev.filter(c => c.id !== id));
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/posts/${postId}/comments`, {
        method: "POST",
        headers: { ...authHeaders(token), "Content-Type": "application/json" },
        body: JSON.stringify({ comment: commentText.trim() }),
      });
      if (!res.ok) throw new Error();
      const newComment: Comment = await res.json();
      setComments(prev => [...prev, newComment]);
      setCommentText("");
      setPost(p => p ? { ...p, commentCount: p.commentCount + 1 } : p);
    } catch {
      toast({ title: "Failed to post comment", variant: "destructive" });
    } finally { setSubmitting(false); }
  };

  const handleCopyLink = () => {
    const base = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
    navigator.clipboard.writeText(`${window.location.origin}${base}/post/${postId}`);
    toast({ title: "Link copied!" });
  };

  const topLevel = comments.filter(c => c.parentId === null);
  const repliesMap = new Map<number, Comment[]>();
  comments.forEach(c => {
    if (c.parentId !== null) {
      if (!repliesMap.has(c.parentId)) repliesMap.set(c.parentId, []);
      repliesMap.get(c.parentId)!.push(c);
    }
  });

  if (loading) {
    return (
      <Layout>
        <div className="p-6 max-w-2xl mx-auto space-y-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      </Layout>
    );
  }

  if (!post) {
    return (
      <Layout>
        <div className="p-6 max-w-2xl mx-auto text-center space-y-4">
          <p className="text-muted-foreground">Post not found.</p>
          <Link href="/community"><Button variant="outline">Back to Community</Button></Link>
        </div>
      </Layout>
    );
  }

  const initials = post.author.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <Layout>
      <div className="p-6 max-w-2xl mx-auto space-y-5">
        {/* Back */}
        <div className="flex items-center justify-between">
          <Link href="/community">
            <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to Community
            </button>
          </Link>
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            title="Copy shareable link"
          >
            <Link2 className="w-4 h-4" /> Copy Link
          </button>
        </div>

        {/* Post */}
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
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
            </div>

            {post.content && <ContentWithLinks text={post.content} />}

            {post.imageUrl && (
              <div className="mt-2 rounded-xl overflow-hidden max-h-80">
                <img src={post.imageUrl} alt="attachment" className="w-full object-cover max-h-80" />
              </div>
            )}

            <div className="flex items-center gap-4 mt-3">
              <button
                onClick={handleLike}
                className={`flex items-center gap-1.5 text-sm transition-colors ${isLiked ? "text-red-500" : "text-muted-foreground hover:text-red-500"}`}
              >
                <Heart className={`w-4 h-4 ${isLiked ? "fill-current" : ""}`} />
                <span>{likeCount}</span>
              </button>
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <MessageCircle className="w-4 h-4" />
                <span>{post.commentCount}</span>
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Comments */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Comments</h2>

          {commentsLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : topLevel.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No comments yet. Be the first!</p>
          ) : (
            <div className="space-y-3">
              {topLevel.map(c => (
                <div key={c.id}>
                  <CommentRow comment={c} user={user} onDelete={handleDeleteComment} />
                  {(repliesMap.get(c.id) ?? []).length > 0 && (
                    <div className="ml-9 mt-2 space-y-2 border-l-2 border-border/60 pl-3">
                      {(repliesMap.get(c.id) ?? []).map(r => (
                        <CommentRow key={r.id} comment={r} user={user} onDelete={handleDeleteComment} isReply />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Comment input */}
          <div className="flex gap-2 mt-2">
            <Avatar className="w-7 h-7 flex-shrink-0 mt-1">
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                {user?.name?.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 flex items-center gap-1 bg-muted rounded-full px-3 py-1.5">
              <input
                type="text"
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSubmitComment()}
                placeholder="Write a comment..."
                className="flex-1 text-sm bg-transparent border-0 outline-none min-w-0"
              />
              <button onClick={handleSubmitComment} disabled={!commentText.trim() || submitting}
                className="text-primary disabled:opacity-40 transition-colors p-1">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function CommentRow({ comment, user, onDelete, isReply = false }: {
  comment: Comment;
  user: { id: number; role?: string } | null;
  onDelete: (id: number) => void;
  isReply?: boolean;
}) {
  return (
    <div className="flex gap-2">
      <Avatar className="w-7 h-7 flex-shrink-0 mt-0.5">
        <AvatarFallback className="text-xs bg-muted">{comment.author.name.slice(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className={`flex-1 rounded-lg px-3 py-2 min-w-0 ${isReply ? "bg-muted/50 border border-border/50" : "bg-muted"}`}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold">{comment.author.name}</span>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
            </span>
            {(comment.userId === user?.id || user?.role === "admin") && (
              <button onClick={() => onDelete(comment.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
        {comment.comment && comment.comment !== "📎" && (
          <p className="text-sm mt-0.5 leading-relaxed break-words">{comment.comment}</p>
        )}
        {comment.imageUrl && (
          <img src={comment.imageUrl} alt="attachment" className="mt-1.5 rounded-lg max-h-40 object-cover" />
        )}
      </div>
    </div>
  );
}
