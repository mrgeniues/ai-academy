import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Heart, MessageCircle, Trash2, Send, ChevronDown, ChevronUp,
  Smile, ImageIcon, Video, X, Loader2, Crown, Lock
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import EmojiPicker, { type EmojiClickData, Theme } from "emoji-picker-react";
import { useTheme } from "@/lib/theme";

const API = "/api";

function authHeaders(token: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface Author {
  id: number;
  name: string;
  avatar: string | null;
  role: string;
}

interface Post {
  id: number;
  userId: number;
  content: string;
  imageUrl: string | null;
  videoUrl: string | null;
  isVip: boolean;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  createdAt: string;
  author: Author;
}

interface Comment {
  id: number;
  postId: number;
  userId: number;
  comment: string;
  imageUrl: string | null;
  videoUrl: string | null;
  createdAt: string;
  author: Author;
}

async function uploadFile(file: File, token: string | null): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${API}/upload`, {
    method: "POST",
    headers: authHeaders(token),
    body: fd,
  });
  if (!res.ok) throw new Error("Upload failed");
  const data = await res.json();
  return data.url as string;
}

function MediaPreview({
  imageUrl, videoUrl, imageFile, videoFile, onRemoveImage, onRemoveVideo
}: {
  imageUrl?: string | null;
  videoUrl?: string | null;
  imageFile?: File | null;
  videoFile?: File | null;
  onRemoveImage?: () => void;
  onRemoveVideo?: () => void;
}) {
  const imageSrc = imageFile ? URL.createObjectURL(imageFile) : imageUrl;
  const videoSrc = videoFile ? URL.createObjectURL(videoFile) : videoUrl;
  return (
    <>
      {imageSrc && (
        <div className="relative mt-2 rounded-xl overflow-hidden max-h-80">
          <img src={imageSrc} alt="attachment" className="w-full object-cover max-h-80" />
          {onRemoveImage && (
            <button onClick={onRemoveImage} className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
      {videoSrc && (
        <div className="relative mt-2 rounded-xl overflow-hidden">
          <video src={videoSrc} controls className="w-full rounded-xl max-h-64" />
          {onRemoveVideo && (
            <button onClick={onRemoveVideo} className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </>
  );
}

function EmojiButton({ onEmojiSelect, small = false }: { onEmojiSelect: (emoji: string) => void; small?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded" title="Add emoji">
        <Smile className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute bottom-full mb-1 z-50" style={{ right: small ? 0 : "auto" }}>
          <EmojiPicker theme={theme === "dark" ? Theme.DARK : Theme.LIGHT}
            onEmojiClick={(data: EmojiClickData) => { onEmojiSelect(data.emoji); setOpen(false); }}
            width={300} height={350} searchDisabled={false} skinTonesDisabled />
        </div>
      )}
    </div>
  );
}

function CommentSection({ postId, token }: { postId: number; token: string | null }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [commentText, setCommentText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const fetchComments = async () => {
    try {
      const res = await fetch(`${API}/posts/${postId}/comments`, { headers: authHeaders(token) });
      if (res.ok) setComments(await res.json());
    } catch { /* silent */ } finally { setLoading(false); }
  };

  useEffect(() => { fetchComments(); }, [postId]);

  const handleSubmit = async () => {
    if (!commentText.trim() && !imageFile && !videoFile) return;
    setUploading(true);
    try {
      let imageUrl: string | null = null;
      let videoUrl: string | null = null;
      if (imageFile) imageUrl = await uploadFile(imageFile, token);
      if (videoFile) videoUrl = await uploadFile(videoFile, token);
      const res = await fetch(`${API}/posts/${postId}/comments`, {
        method: "POST",
        headers: { ...authHeaders(token), "Content-Type": "application/json" },
        body: JSON.stringify({ comment: commentText.trim() || "📎", imageUrl, videoUrl }),
      });
      if (!res.ok) throw new Error();
      setCommentText("");
      setImageFile(null);
      setVideoFile(null);
      fetchComments();
    } catch {
      toast({ title: "Failed to post comment", variant: "destructive" });
    } finally { setUploading(false); }
  };

  const handleDelete = async (id: number) => {
    try {
      await fetch(`${API}/comments/${id}`, { method: "DELETE", headers: authHeaders(token) });
      setComments(prev => prev.filter(c => c.id !== id));
    } catch {}
  };

  return (
    <div className="mt-3 pt-3 border-t border-border space-y-3">
      {loading ? (
        <Skeleton className="h-16 w-full" />
      ) : comments.length > 0 ? (
        <div className="space-y-2.5">
          {comments.map(comment => (
            <div key={comment.id} className="flex gap-2">
              <Avatar className="w-7 h-7 flex-shrink-0">
                <AvatarImage src={comment.author.avatar ?? undefined} />
                <AvatarFallback className="text-xs bg-muted">{comment.author.name.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 bg-muted rounded-lg px-3 py-2 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold">{comment.author.name}</span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                    </span>
                    {(comment.userId === user?.id || user?.role === "admin") && (
                      <button onClick={() => handleDelete(comment.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
                {comment.comment && comment.comment !== "📎" && (
                  <p className="text-sm mt-0.5 break-words">{comment.comment}</p>
                )}
                <MediaPreview imageUrl={comment.imageUrl} videoUrl={comment.videoUrl} />
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* Comment input */}
      <div className="flex gap-2">
        <Avatar className="w-7 h-7 flex-shrink-0">
          <AvatarImage src={user?.avatar ?? undefined} />
          <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
            {user?.name?.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-1.5">
          <div className="flex items-center gap-1 bg-muted rounded-lg px-3 py-1.5">
            <Textarea
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              placeholder="Write a comment..."
              className="border-0 bg-transparent p-0 resize-none focus-visible:ring-0 text-sm min-h-0 h-auto"
              rows={1}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
            />
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <EmojiButton onEmojiSelect={e => setCommentText(t => t + e)} small />
              <button type="button" onClick={() => imageInputRef.current?.click()}
                className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded" title="Add image">
                <ImageIcon className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => videoInputRef.current?.click()}
                className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded" title="Add video">
                <Video className="w-4 h-4" />
              </button>
              <button onClick={handleSubmit} disabled={!commentText.trim() && !imageFile && !videoFile}
                className="text-primary hover:text-primary/80 disabled:opacity-30 transition-colors p-1 rounded">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {(imageFile || videoFile) && (
            <MediaPreview imageFile={imageFile} videoFile={videoFile}
              onRemoveImage={() => setImageFile(null)} onRemoveVideo={() => setVideoFile(null)} />
          )}
        </div>
      </div>
      <input ref={imageInputRef} type="file" accept="image/*" className="hidden"
        onChange={e => setImageFile(e.target.files?.[0] ?? null)} />
      <input ref={videoInputRef} type="file" accept="video/*" className="hidden"
        onChange={e => setVideoFile(e.target.files?.[0] ?? null)} />
    </div>
  );
}

function VipPostCard({ post, token, onDelete }: { post: Post; token: string | null; onDelete: (id: number) => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showComments, setShowComments] = useState(false);
  const [isLiked, setIsLiked] = useState(post.isLiked);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [liking, setLiking] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleLike = async () => {
    if (liking) return;
    setLiking(true);
    const prev = { isLiked, likeCount };
    setIsLiked(l => !l);
    setLikeCount(c => isLiked ? c - 1 : c + 1);
    try {
      await fetch(`${API}/posts/${post.id}/like`, { method: "POST", headers: authHeaders(token) });
    } catch {
      setIsLiked(prev.isLiked);
      setLikeCount(prev.likeCount);
    } finally { setLiking(false); }
  };

  const handleDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await fetch(`${API}/posts/${post.id}`, { method: "DELETE", headers: authHeaders(token) });
      onDelete(post.id);
    } catch {
      toast({ title: "Failed to delete post", variant: "destructive" });
      setDeleting(false);
    }
  };

  const initials = post.author.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <motion.div whileHover={{ scale: 1.02 }} transition={{ type: "tween", duration: 0.2 }}>
      <Card className="border-amber-200/40 dark:border-amber-800/30 bg-gradient-to-br from-amber-50/30 to-card dark:from-amber-950/10">
        <CardContent className="pt-4 pb-3 px-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <Avatar className="w-9 h-9">
                  <AvatarImage src={post.author.avatar ?? undefined} />
                  <AvatarFallback className="text-sm bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute -bottom-0.5 -right-0.5 text-[10px]">👑</span>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold leading-none">{post.author.name}</span>
                  <Badge className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 border-amber-200 dark:border-amber-800">
                    Admin
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                </span>
              </div>
            </div>
            {user?.role === "admin" && (
              <button onClick={handleDelete} disabled={deleting}
                className="text-muted-foreground hover:text-destructive transition-colors p-1">
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              </button>
            )}
          </div>

          <p className="text-sm leading-relaxed break-words">{post.content}</p>
          <MediaPreview imageUrl={post.imageUrl} videoUrl={post.videoUrl} />

          <div className="flex items-center gap-4 mt-3">
            <button onClick={handleLike}
              className={`flex items-center gap-1.5 text-sm transition-colors ${isLiked ? "text-red-500" : "text-muted-foreground hover:text-red-500"}`}>
              <Heart className={`w-4 h-4 ${isLiked ? "fill-current" : ""}`} />
              <span>{likeCount}</span>
            </button>
            <button onClick={() => setShowComments(s => !s)}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <MessageCircle className="w-4 h-4" />
              <span>{post.commentCount}</span>
              {showComments ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          {showComments && <CommentSection postId={post.id} token={token} />}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function VipPostsPage() {
  const { user, token } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === "admin";

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const fetchPosts = async () => {
    try {
      const res = await fetch(`${API}/posts?vip=true`, { headers: authHeaders(token) });
      if (res.ok) setPosts(await res.json());
    } catch { /* silent */ } finally { setLoading(false); }
  };

  useEffect(() => { fetchPosts(); }, []);

  const handleSubmit = async () => {
    if (!newPost.trim() && !imageFile && !videoFile) return;
    setUploading(true);
    try {
      let imageUrl: string | null = null;
      let videoUrl: string | null = null;
      if (imageFile) imageUrl = await uploadFile(imageFile, token);
      if (videoFile) videoUrl = await uploadFile(videoFile, token);

      const res = await fetch(`${API}/posts`, {
        method: "POST",
        headers: { ...authHeaders(token), "Content-Type": "application/json" },
        body: JSON.stringify({ content: newPost.trim() || "📎", imageUrl, videoUrl, isVip: true }),
      });
      if (!res.ok) throw new Error();
      const created = await res.json();
      setPosts(prev => [created, ...prev]);
      setNewPost("");
      setImageFile(null);
      setVideoFile(null);
    } catch {
      toast({ title: "Failed to post", variant: "destructive" });
    } finally { setUploading(false); }
  };

  const canSubmit = (newPost.trim() || imageFile || videoFile) && !uploading;
  const initials = user?.name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) ?? "?";

  return (
    <Layout>
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-md">
              <Crown className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">VIP Posts</h1>
              <p className="text-sm text-muted-foreground">Exclusive updates from the admin team</p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30 text-sm text-amber-700 dark:text-amber-400">
            <Crown className="w-4 h-4 flex-shrink-0" />
            {isAdmin
              ? "You can post here as an admin. All members can read and interact."
              : "Only admins can post here. You can read, like, and comment on all posts."}
          </div>
        </div>

        {/* Admin post composer */}
        {isAdmin && (
          <Card className="border-amber-200/50 dark:border-amber-800/30">
            <CardContent className="pt-4 pb-4 px-4">
              <div className="flex gap-3">
                <div className="relative flex-shrink-0">
                  <Avatar className="w-9 h-9">
                    <AvatarImage src={user?.avatar ?? undefined} />
                    <AvatarFallback className="text-sm bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute -bottom-0.5 -right-0.5 text-[10px]">👑</span>
                </div>
                <div className="flex-1 space-y-2">
                  <Textarea
                    data-testid="input-vip-post"
                    value={newPost}
                    onChange={e => setNewPost(e.target.value)}
                    placeholder="Share a VIP update with the community..."
                    className="min-h-[80px] resize-none bg-muted/40"
                    onKeyDown={e => { if (e.key === "Enter" && e.ctrlKey) handleSubmit(); }}
                  />
                  {(imageFile || videoFile) && (
                    <MediaPreview imageFile={imageFile} videoFile={videoFile}
                      onRemoveImage={() => setImageFile(null)} onRemoveVideo={() => setVideoFile(null)} />
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <EmojiButton onEmojiSelect={e => setNewPost(t => t + e)} />
                      <button type="button" onClick={() => imageInputRef.current?.click()}
                        className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded" title="Add image">
                        <ImageIcon className="w-4 h-4" />
                      </button>
                      <button type="button" onClick={() => videoInputRef.current?.click()}
                        className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded" title="Add video">
                        <Video className="w-4 h-4" />
                      </button>
                    </div>
                    <Button
                      data-testid="button-submit-vip-post"
                      onClick={handleSubmit}
                      disabled={!canSubmit}
                      className="gap-2 bg-amber-500 hover:bg-amber-600 text-white border-amber-600"
                      size="sm"
                    >
                      {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crown className="w-4 h-4" />}
                      Post VIP Update
                    </Button>
                  </div>
                </div>
              </div>
              <input ref={imageInputRef} type="file" accept="image/*" className="hidden"
                onChange={e => setImageFile(e.target.files?.[0] ?? null)} />
              <input ref={videoInputRef} type="file" accept="video/*" className="hidden"
                onChange={e => setVideoFile(e.target.files?.[0] ?? null)} />
            </CardContent>
          </Card>
        )}

        {/* Non-admin read notice */}
        {!isAdmin && (
          <Card className="border-dashed border-amber-200/50 dark:border-amber-800/30 bg-amber-50/30 dark:bg-amber-950/10">
            <CardContent className="py-4 px-4 flex items-center gap-3 text-sm text-muted-foreground">
              <Lock className="w-4 h-4 text-amber-500 flex-shrink-0" />
              Only the admin can post VIP updates. You can like and comment below.
            </CardContent>
          </Card>
        )}

        {/* Posts feed */}
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-4">
                  <Skeleton className="h-24 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : posts.length > 0 ? (
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {posts.map(post => (
              <VipPostCard
                key={post.id}
                post={post}
                token={token}
                onDelete={id => setPosts(prev => prev.filter(p => p.id !== id))}
              />
            ))}
          </motion.div>
        ) : (
          <div className="text-center py-20 text-muted-foreground">
            <Crown className="w-12 h-12 mx-auto mb-3 text-amber-400/40" />
            <p className="font-medium">No VIP posts yet</p>
            {isAdmin && (
              <p className="text-sm mt-1">Share the first VIP update with your community</p>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
