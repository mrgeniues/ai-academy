import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Heart, MessageCircle, Trash2, Send, ChevronDown, ChevronUp,
  Smile, ImageIcon, Video, X, Loader2
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
            <button
              onClick={onRemoveImage}
              className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
      {videoSrc && (
        <div className="relative mt-2 rounded-xl overflow-hidden">
          <video src={videoSrc} controls className="w-full rounded-xl max-h-64" />
          {onRemoveVideo && (
            <button
              onClick={onRemoveVideo}
              className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </>
  );
}

function EmojiButton({
  onEmojiSelect,
  small = false
}: {
  onEmojiSelect: (emoji: string) => void;
  small?: boolean;
}) {
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
      <button
        type="button"
        onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded"
        title="Add emoji"
      >
        <Smile className={small ? "w-4 h-4" : "w-4 h-4"} />
      </button>
      {open && (
        <div className="absolute bottom-full mb-1 z-50" style={{ right: small ? 0 : "auto" }}>
          <EmojiPicker
            theme={theme === "dark" ? Theme.DARK : Theme.LIGHT}
            onEmojiClick={(data: EmojiClickData) => {
              onEmojiSelect(data.emoji);
              setOpen(false);
            }}
            width={300}
            height={350}
            searchDisabled={false}
            skinTonesDisabled
          />
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
    } catch { /* silent */ } finally {
      setLoading(false);
    }
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
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await fetch(`${API}/comments/${id}`, { method: "DELETE", headers: authHeaders(token) });
      setComments(prev => prev.filter(c => c.id !== id));
    } catch {}
  };

  const canSubmit = (commentText.trim() || imageFile || videoFile) && !uploading;

  return (
    <div className="mt-3 pt-3 border-t border-border space-y-3">
      {loading ? (
        <Skeleton className="h-16 w-full" />
      ) : comments.length > 0 ? (
        <div className="space-y-2.5">
          {comments.map(comment => (
            <div key={comment.id} className="flex gap-2" data-testid={`comment-${comment.id}`}>
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
        <Avatar className="w-7 h-7 flex-shrink-0 mt-1">
          <AvatarFallback className="text-xs bg-primary/10 text-primary">
            {user?.name?.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-1.5">
          <div className="flex items-center gap-1 bg-muted rounded-full px-3 py-1.5">
            <input
              data-testid={`input-comment-${postId}`}
              type="text"
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSubmit()}
              placeholder="Write a comment..."
              className="flex-1 text-sm bg-transparent border-0 outline-none min-w-0"
            />
            <EmojiButton small onEmojiSelect={emoji => setCommentText(t => t + emoji)} />
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className="text-muted-foreground hover:text-foreground transition-colors p-1"
              title="Add image"
            >
              <ImageIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => videoInputRef.current?.click()}
              className="text-muted-foreground hover:text-foreground transition-colors p-1"
              title="Add video"
            >
              <Video className="w-4 h-4" />
            </button>
            <button
              data-testid={`button-submit-comment-${postId}`}
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="text-primary disabled:opacity-40 transition-colors p-1"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>

          {(imageFile || videoFile) && (
            <MediaPreview
              imageFile={imageFile}
              videoFile={videoFile}
              onRemoveImage={() => setImageFile(null)}
              onRemoveVideo={() => setVideoFile(null)}
            />
          )}
        </div>
      </div>

      <input ref={imageInputRef} type="file" accept="image/*" className="hidden"
        onChange={e => { setImageFile(e.target.files?.[0] ?? null); e.target.value = ""; }} />
      <input ref={videoInputRef} type="file" accept="video/*" className="hidden"
        onChange={e => { setVideoFile(e.target.files?.[0] ?? null); e.target.value = ""; }} />
    </div>
  );
}

function PostCard({ post, token, onDelete }: { post: Post; token: string | null; onDelete: (id: number) => void }) {
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
    setIsLiked(l => !l);
    setLikeCount(c => isLiked ? c - 1 : c + 1);
    try {
      await fetch(`${API}/posts/${post.id}/like`, { method: "POST", headers: authHeaders(token) });
    } catch { setIsLiked(post.isLiked); setLikeCount(post.likeCount); }
    finally { setLiking(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await fetch(`${API}/posts/${post.id}`, { method: "DELETE", headers: authHeaders(token) });
      onDelete(post.id);
    } catch {
      toast({ title: "Failed to delete post", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const initials = post.author.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <motion.div whileHover={{ scale: 1.02 }} transition={{ type: "tween", duration: 0.2 }}>
    <Card data-testid={`post-${post.id}`}>
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
          {(post.userId === user?.id || user?.role === "admin") && (
            <button
              data-testid={`button-delete-post-${post.id}`}
              onClick={handleDelete}
              disabled={deleting}
              className="text-muted-foreground hover:text-destructive transition-colors p-1"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {post.content && (
          <p className="text-sm leading-relaxed break-words" data-testid={`text-post-content-${post.id}`}>{post.content}</p>
        )}

        <MediaPreview imageUrl={post.imageUrl} videoUrl={post.videoUrl} />

        <div className="flex items-center gap-4 mt-3">
          <button
            data-testid={`button-like-${post.id}`}
            onClick={handleLike}
            disabled={liking}
            className={`flex items-center gap-1.5 text-sm transition-colors ${
              isLiked ? "text-red-500" : "text-muted-foreground hover:text-red-500"
            }`}
          >
            <Heart className={`w-4 h-4 ${isLiked ? "fill-current" : ""}`} />
            <span data-testid={`text-like-count-${post.id}`}>{likeCount}</span>
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

        {showComments && <CommentSection postId={post.id} token={token} />}
      </CardContent>
    </Card>
    </motion.div>
  );
}

export default function CommunityPage() {
  const { user, token } = useAuth();
  const { toast } = useToast();
  const [newPost, setNewPost] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const initials = user?.name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) ?? "?";

  const fetchPosts = async () => {
    try {
      const res = await fetch(`${API}/posts`, { headers: authHeaders(token) });
      if (res.ok) setPosts(await res.json());
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPosts(); }, [token]);

  const handleCreatePost = async () => {
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
        body: JSON.stringify({ content: newPost.trim() || "📎", imageUrl, videoUrl }),
      });
      if (!res.ok) throw new Error();
      setNewPost("");
      setImageFile(null);
      setVideoFile(null);
      fetchPosts();
    } catch {
      toast({ title: "Failed to create post", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    const ta = textareaRef.current;
    if (!ta) { setNewPost(p => p + emoji); return; }
    const start = ta.selectionStart ?? newPost.length;
    const end = ta.selectionEnd ?? newPost.length;
    setNewPost(p => p.slice(0, start) + emoji + p.slice(end));
    setTimeout(() => { ta.selectionStart = ta.selectionEnd = start + emoji.length; ta.focus(); }, 0);
  };

  const canSubmit = (newPost.trim() || imageFile || videoFile) && !uploading;

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
                  ref={textareaRef}
                  data-testid="input-new-post"
                  placeholder="Share something with the community..."
                  value={newPost}
                  onChange={e => setNewPost(e.target.value)}
                  className="min-h-[80px] resize-none border-0 bg-muted focus-visible:ring-0 rounded-xl"
                />

                {(imageFile || videoFile) && (
                  <MediaPreview
                    imageFile={imageFile}
                    videoFile={videoFile}
                    onRemoveImage={() => setImageFile(null)}
                    onRemoveVideo={() => setVideoFile(null)}
                  />
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <EmojiButton onEmojiSelect={handleEmojiSelect} />
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded hover:bg-muted"
                      title="Add image"
                    >
                      <ImageIcon className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => videoInputRef.current?.click()}
                      className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded hover:bg-muted"
                      title="Add video"
                    >
                      <Video className="w-4 h-4" />
                    </button>
                    {imageFile && (
                      <span className="text-xs text-muted-foreground ml-1 truncate max-w-[120px]">
                        📷 {imageFile.name}
                      </span>
                    )}
                    {videoFile && (
                      <span className="text-xs text-muted-foreground ml-1 truncate max-w-[120px]">
                        🎬 {videoFile.name}
                      </span>
                    )}
                  </div>

                  <Button
                    data-testid="button-submit-post"
                    onClick={handleCreatePost}
                    disabled={!canSubmit}
                    className="gap-2"
                    size="sm"
                  >
                    {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    {uploading ? "Uploading..." : "Post"}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Posts feed */}
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}><CardContent className="pt-4"><Skeleton className="h-24 w-full" /></CardContent></Card>
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
              <PostCard
                key={post.id}
                post={post}
                token={token}
                onDelete={id => setPosts(prev => prev.filter(p => p.id !== id))}
              />
            ))}
          </motion.div>
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            <MessageCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No posts yet. Be the first to share something!</p>
          </div>
        )}
      </div>

      <input ref={imageInputRef} type="file" accept="image/*" className="hidden"
        onChange={e => { setImageFile(e.target.files?.[0] ?? null); e.target.value = ""; }} />
      <input ref={videoInputRef} type="file" accept="video/*" className="hidden"
        onChange={e => { setVideoFile(e.target.files?.[0] ?? null); e.target.value = ""; }} />
    </Layout>
  );
}
