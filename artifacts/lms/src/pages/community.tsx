import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { OnlineDot } from "@/components/online-dot";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Heart, MessageCircle, Trash2, Send, ChevronDown, ChevronUp,
  Smile, ImageIcon, Paperclip, X, Loader2, Link2, ExternalLink,
  FileText, Download
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
  is_online?: boolean;
}

interface Post {
  id: number;
  userId: number;
  content: string;
  imageUrl: string | null;
  fileUrl: string | null;
  fileType: string | null;
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
  fileUrl: string | null;
  fileType: string | null;
  parentId: number | null;
  likesCount: number;
  isLiked: boolean;
  createdAt: string;
  author: Author;
}

async function uploadFile(file: File, token: string | null): Promise<{ url: string; fileType: string }> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${API}/upload`, {
    method: "POST",
    headers: authHeaders(token),
    body: fd,
  });
  if (!res.ok) throw new Error("Upload failed");
  const data = await res.json();
  return { url: data.url as string, fileType: data.fileType as string };
}

const URL_REGEX = /(https?:\/\/[^\s]+)/g;

function ContentWithLinks({ text }: { text: string }) {
  const parts = text.split(URL_REGEX);
  return (
    <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2 hover:text-primary/80 inline-flex items-center gap-0.5 break-all"
          >
            {part}<ExternalLink className="w-3 h-3 flex-shrink-0 inline" />
          </a>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </p>
  );
}

function LinkPreviewChip({ url, onRemove }: { url: string; onRemove?: () => void }) {
  let hostname = url;
  try { hostname = new URL(url).hostname.replace("www.", ""); } catch {}
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-xs w-fit max-w-full">
      <Link2 className="w-3.5 h-3.5 text-primary flex-shrink-0" />
      <a href={url} target="_blank" rel="noopener noreferrer"
        className="text-primary hover:underline truncate max-w-[220px]">{hostname}</a>
      {onRemove && (
        <button onClick={onRemove} className="text-muted-foreground hover:text-destructive ml-1 flex-shrink-0">
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

function docLabel(mime: string | null, file?: File | null): string {
  if (file) return file.name;
  if (!mime) return "Document";
  if (mime.includes("pdf")) return "PDF Document";
  if (mime.includes("msword") || mime.includes("wordprocessingml")) return "Word Document";
  if (mime.startsWith("text/")) return "Text File";
  if (mime.includes("zip")) return "ZIP Archive";
  return "Document";
}

function docBadge(mime: string | null): string {
  if (!mime) return "FILE";
  if (mime.includes("pdf")) return "PDF";
  if (mime.includes("msword") || mime.includes("wordprocessingml")) return "DOC";
  if (mime.startsWith("text/")) return "TXT";
  if (mime.includes("zip")) return "ZIP";
  return "FILE";
}

function MediaPreview({
  imageUrl, fileUrl, fileType, imageFile, docFile, onRemoveImage, onRemoveDoc
}: {
  imageUrl?: string | null;
  fileUrl?: string | null;
  fileType?: string | null;
  imageFile?: File | null;
  docFile?: File | null;
  onRemoveImage?: () => void;
  onRemoveDoc?: () => void;
}) {
  const imageSrc = imageFile ? URL.createObjectURL(imageFile) : imageUrl;

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
      {(fileUrl || docFile) && (
        <div className="relative mt-2 flex items-center gap-3 p-3 bg-muted rounded-xl border border-border">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{docLabel(fileType ?? null, docFile ?? null)}</p>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{docBadge(fileType ?? null)}</p>
          </div>
          {fileUrl && !docFile && (
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="flex-shrink-0 p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors"
              title="Download"
            >
              <Download className="w-4 h-4" />
            </a>
          )}
          {onRemoveDoc && (
            <button
              onClick={onRemoveDoc}
              className="flex-shrink-0 text-muted-foreground hover:text-destructive transition-colors p-1"
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
        <Smile className="w-4 h-4" />
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
  const [, setLocation] = useLocation();

  const [commentText, setCommentText] = useState("");
  const [commentLink, setCommentLink] = useState("");
  const [showCommentLink, setShowCommentLink] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replyImageFile, setReplyImageFile] = useState<File | null>(null);
  const [replyDocFile, setReplyDocFile] = useState<File | null>(null);
  const [submittingReply, setSubmittingReply] = useState(false);
  const replyImageInputRef = useRef<HTMLInputElement>(null);
  const replyDocInputRef = useRef<HTMLInputElement>(null);

  const topLevelComments = comments.filter(c => c.parentId === null);
  const repliesMap = new Map<number, Comment[]>();
  comments.forEach(c => {
    if (c.parentId !== null) {
      if (!repliesMap.has(c.parentId)) repliesMap.set(c.parentId, []);
      repliesMap.get(c.parentId)!.push(c);
    }
  });

  const fetchComments = async () => {
    try {
      const res = await fetch(`${API}/posts/${postId}/comments`, { headers: authHeaders(token) });
      if (res.ok) setComments(await res.json());
    } catch { /* silent */ } finally { setLoading(false); }
  };

  useEffect(() => { fetchComments(); }, [postId]);

  const handleSubmit = async () => {
    const linkPart = commentLink.trim();
    const fullComment = [commentText.trim(), linkPart].filter(Boolean).join("\n") || "📎";
    if (!commentText.trim() && !linkPart && !imageFile && !docFile) return;
    setUploading(true);
    try {
      let imageUrl: string | null = null;
      let fileUrl: string | null = null;
      let fileType: string | null = null;
      if (imageFile) { const r = await uploadFile(imageFile, token); imageUrl = r.url; }
      if (docFile) { const r = await uploadFile(docFile, token); fileUrl = r.url; fileType = r.fileType; }
      const res = await fetch(`${API}/posts/${postId}/comments`, {
        method: "POST",
        headers: { ...authHeaders(token), "Content-Type": "application/json" },
        body: JSON.stringify({ comment: fullComment, imageUrl, fileUrl, fileType }),
      });
      if (!res.ok) throw new Error();
      const newComment: Comment = await res.json();
      setComments(prev => [...prev, newComment]);
      setCommentText(""); setCommentLink(""); setShowCommentLink(false);
      setImageFile(null); setDocFile(null);
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

  const handleLikeComment = async (commentId: number, currentlyLiked: boolean) => {
    setComments(prev => prev.map(c =>
      c.id === commentId
        ? { ...c, isLiked: !currentlyLiked, likesCount: currentlyLiked ? c.likesCount - 1 : c.likesCount + 1 }
        : c
    ));
    try {
      await fetch(`${API}/comments/${commentId}/like`, { method: "POST", headers: authHeaders(token) });
    } catch {
      setComments(prev => prev.map(c =>
        c.id === commentId
          ? { ...c, isLiked: currentlyLiked, likesCount: currentlyLiked ? c.likesCount + 1 : c.likesCount - 1 }
          : c
      ));
    }
  };

  const handleSubmitReply = async (parentId: number) => {
    if (!replyText.trim() && !replyImageFile && !replyDocFile) return;
    setSubmittingReply(true);
    try {
      let imageUrl: string | null = null;
      let fileUrl: string | null = null;
      let fileType: string | null = null;
      if (replyImageFile) { const r = await uploadFile(replyImageFile, token); imageUrl = r.url; }
      if (replyDocFile) { const r = await uploadFile(replyDocFile, token); fileUrl = r.url; fileType = r.fileType; }
      const res = await fetch(`${API}/posts/${postId}/comments`, {
        method: "POST",
        headers: { ...authHeaders(token), "Content-Type": "application/json" },
        body: JSON.stringify({ comment: replyText.trim() || "📎", imageUrl, fileUrl, fileType, parentId }),
      });
      if (!res.ok) throw new Error();
      const newReply: Comment = await res.json();
      setComments(prev => [...prev, newReply]);
      setReplyText(""); setReplyImageFile(null); setReplyDocFile(null); setReplyingTo(null);
      fetchComments();
    } catch {
      toast({ title: "Failed to post reply", variant: "destructive" });
    } finally { setSubmittingReply(false); }
  };

  const cancelReply = () => { setReplyingTo(null); setReplyText(""); setReplyImageFile(null); setReplyDocFile(null); };

  const canSubmitMain = (commentText.trim() || commentLink.trim() || imageFile || docFile) && !uploading;
  const canSubmitReply = (replyText.trim() || replyImageFile || replyDocFile) && !submittingReply;

  const renderCommentBody = (comment: Comment, isReply: boolean) => (
    <div className="flex gap-2">
      <button onClick={() => setLocation(`/users/${comment.author.id}`)} className="flex-shrink-0 mt-0.5">
        <Avatar className="w-7 h-7 hover:opacity-80 transition-opacity">
          <AvatarImage src={comment.author.avatar ?? undefined} />
          <AvatarFallback className="text-xs bg-muted">{comment.author.name.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
      </button>
      <div className={`flex-1 rounded-lg px-3 py-2 min-w-0 ${isReply ? "bg-muted/50 border border-border/50" : "bg-muted"}`}>
        <div className="flex items-center justify-between gap-2">
          <button onClick={() => setLocation(`/users/${comment.author.id}`)} className="text-xs font-semibold hover:underline underline-offset-2">
            {comment.author.name}
          </button>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}</span>
            {(comment.userId === user?.id || user?.role === "admin") && (
              <button onClick={() => handleDelete(comment.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
        {comment.comment && comment.comment !== "📎" && <ContentWithLinks text={comment.comment} />}
        <MediaPreview imageUrl={comment.imageUrl} fileUrl={comment.fileUrl} fileType={comment.fileType} />
        <div className="flex items-center gap-3 mt-1.5">
          <button
            onClick={() => handleLikeComment(comment.id, comment.isLiked)}
            className={`flex items-center gap-1 text-xs transition-colors ${comment.isLiked ? "text-red-500" : "text-muted-foreground hover:text-red-500"}`}
          >
            <Heart className={`w-3 h-3 ${comment.isLiked ? "fill-current" : ""}`} />
            {comment.likesCount > 0 && <span>{comment.likesCount}</span>}
          </button>
          {!isReply && (
            <button
              onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
              className="text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              Reply
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="mt-3 pt-3 border-t border-border space-y-3">
      {loading ? (
        <Skeleton className="h-16 w-full" />
      ) : topLevelComments.length > 0 ? (
        <div className="space-y-3">
          {topLevelComments.map(comment => (
            <div key={comment.id} data-testid={`comment-${comment.id}`}>
              {renderCommentBody(comment, false)}

              {(repliesMap.get(comment.id) ?? []).length > 0 && (
                <div className="ml-9 mt-2 space-y-2 border-l-2 border-border/60 pl-3">
                  {(repliesMap.get(comment.id) ?? []).map(reply => (
                    <div key={reply.id}>{renderCommentBody(reply, true)}</div>
                  ))}
                </div>
              )}

              {replyingTo === comment.id && (
                <div className="ml-9 mt-2">
                  <div className="flex gap-2">
                    <Avatar className="w-6 h-6 flex-shrink-0 mt-1">
                      <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                        {user?.name?.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-1 bg-muted rounded-full px-3 py-1.5">
                        <input
                          type="text"
                          value={replyText}
                          onChange={e => setReplyText(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSubmitReply(comment.id)}
                          placeholder={`Reply to ${comment.author.name}…`}
                          className="flex-1 text-xs bg-transparent border-0 outline-none min-w-0"
                          autoFocus
                        />
                        <button type="button" onClick={() => replyImageInputRef.current?.click()}
                          className="text-muted-foreground hover:text-foreground transition-colors p-0.5" title="Add image">
                          <ImageIcon className="w-3.5 h-3.5" />
                        </button>
                        <button type="button" onClick={() => replyDocInputRef.current?.click()}
                          className="text-muted-foreground hover:text-foreground transition-colors p-0.5" title="Attach document">
                          <Paperclip className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleSubmitReply(comment.id)} disabled={!canSubmitReply}
                          className="text-primary disabled:opacity-40 transition-colors p-0.5">
                          {submittingReply ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={cancelReply} className="text-muted-foreground hover:text-destructive transition-colors p-0.5">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {(replyImageFile || replyDocFile) && (
                        <MediaPreview imageFile={replyImageFile} docFile={replyDocFile}
                          onRemoveImage={() => setReplyImageFile(null)} onRemoveDoc={() => setReplyDocFile(null)} />
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : null}

      {/* Main comment input */}
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
            <button type="button" onClick={() => setShowCommentLink(s => !s)}
              className={`transition-colors p-1 ${showCommentLink ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
              title="Add link">
              <Link2 className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => imageInputRef.current?.click()}
              className="text-muted-foreground hover:text-foreground transition-colors p-1" title="Add image">
              <ImageIcon className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => docInputRef.current?.click()}
              className="text-muted-foreground hover:text-foreground transition-colors p-1" title="Attach document">
              <Paperclip className="w-4 h-4" />
            </button>
            <button data-testid={`button-submit-comment-${postId}`} onClick={handleSubmit}
              disabled={!canSubmitMain}
              className="text-primary disabled:opacity-40 transition-colors p-1">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>

          {showCommentLink && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted rounded-lg border border-primary/20">
              <Link2 className="w-3.5 h-3.5 text-primary flex-shrink-0" />
              <input type="url" value={commentLink} onChange={e => setCommentLink(e.target.value)}
                placeholder="https://..." className="flex-1 text-xs bg-transparent border-0 outline-none min-w-0"
                onKeyDown={e => e.key === "Enter" && handleSubmit()} />
              {commentLink && <button onClick={() => setCommentLink("")} className="text-muted-foreground hover:text-destructive"><X className="w-3 h-3" /></button>}
            </div>
          )}

          {(imageFile || docFile) && (
            <MediaPreview imageFile={imageFile} docFile={docFile}
              onRemoveImage={() => setImageFile(null)} onRemoveDoc={() => setDocFile(null)} />
          )}
        </div>
      </div>

      <input ref={imageInputRef} type="file" accept="image/*" className="hidden"
        onChange={e => { setImageFile(e.target.files?.[0] ?? null); e.target.value = ""; }} />
      <input ref={docInputRef} type="file" accept=".pdf,.doc,.docx,.txt,.zip,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,application/zip" className="hidden"
        onChange={e => { setDocFile(e.target.files?.[0] ?? null); e.target.value = ""; }} />
      <input ref={replyImageInputRef} type="file" accept="image/*" className="hidden"
        onChange={e => { setReplyImageFile(e.target.files?.[0] ?? null); e.target.value = ""; }} />
      <input ref={replyDocInputRef} type="file" accept=".pdf,.doc,.docx,.txt,.zip,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,application/zip" className="hidden"
        onChange={e => { setReplyDocFile(e.target.files?.[0] ?? null); e.target.value = ""; }} />
    </div>
  );
}

function PostCard({ post, token, onDelete }: { post: Post; token: string | null; onDelete: (id: number) => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
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
          <button
            className="flex items-center gap-2.5 hover:opacity-80 transition-opacity text-left"
            onClick={() => setLocation(`/users/${post.author.id}`)}
          >
            <div className="relative">
              <Avatar className="w-9 h-9">
                <AvatarImage src={post.author.avatar ?? undefined} />
                <AvatarFallback className="text-sm bg-primary/10 text-primary font-semibold">{initials}</AvatarFallback>
              </Avatar>
              <OnlineDot isOnline={!!post.author.is_online} size="sm" />
            </div>
            <div>
              <p className="text-sm font-semibold hover:underline underline-offset-2">{post.author.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
              </p>
            </div>
          </button>
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
          <ContentWithLinks text={post.content} />
        )}

        <MediaPreview imageUrl={post.imageUrl} fileUrl={post.fileUrl} fileType={post.fileType} />

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
  const [linkUrl, setLinkUrl] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const initials = user?.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) ?? "?";

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
    const trimmedLink = linkUrl.trim();
    const fullContent = [newPost.trim(), trimmedLink].filter(Boolean).join("\n") || "📎";
    if (!newPost.trim() && !trimmedLink && !imageFile && !docFile) return;
    setUploading(true);
    try {
      let imageUrl: string | null = null;
      let fileUrl: string | null = null;
      let fileType: string | null = null;
      if (imageFile) {
        const result = await uploadFile(imageFile, token);
        imageUrl = result.url;
      }
      if (docFile) {
        const result = await uploadFile(docFile, token);
        fileUrl = result.url;
        fileType = result.fileType;
      }

      const res = await fetch(`${API}/posts`, {
        method: "POST",
        headers: { ...authHeaders(token), "Content-Type": "application/json" },
        body: JSON.stringify({ content: fullContent, imageUrl, fileUrl, fileType }),
      });
      if (!res.ok) throw new Error();
      setNewPost("");
      setLinkUrl("");
      setShowLinkInput(false);
      setImageFile(null);
      setDocFile(null);
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

  const canSubmit = (newPost.trim() || linkUrl.trim() || imageFile || docFile) && !uploading;

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

                {/* Link input */}
                {showLinkInput && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-xl border border-primary/20">
                    <Link2 className="w-4 h-4 text-primary flex-shrink-0" />
                    <Input
                      type="url"
                      value={linkUrl}
                      onChange={e => setLinkUrl(e.target.value)}
                      placeholder="https://paste-your-link-here.com"
                      className="flex-1 text-sm border-0 bg-transparent p-0 h-auto focus-visible:ring-0 shadow-none"
                    />
                    {linkUrl && (
                      <button onClick={() => setLinkUrl("")} className="text-muted-foreground hover:text-destructive">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}

                {/* Link preview chip */}
                {linkUrl.trim() && !showLinkInput && (
                  <LinkPreviewChip url={linkUrl} onRemove={() => setLinkUrl("")} />
                )}

                {(imageFile || docFile) && (
                  <MediaPreview
                    imageFile={imageFile}
                    docFile={docFile}
                    onRemoveImage={() => setImageFile(null)}
                    onRemoveDoc={() => setDocFile(null)}
                  />
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <EmojiButton onEmojiSelect={handleEmojiSelect} />
                    <button
                      type="button"
                      onClick={() => setShowLinkInput(s => !s)}
                      className={`transition-colors p-1.5 rounded hover:bg-muted ${showLinkInput ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
                      title="Add link"
                    >
                      <Link2 className="w-4 h-4" />
                    </button>
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
                      onClick={() => docInputRef.current?.click()}
                      className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded hover:bg-muted"
                      title="Attach document"
                    >
                      <Paperclip className="w-4 h-4" />
                    </button>
                    {linkUrl && (
                      <LinkPreviewChip url={linkUrl} onRemove={() => { setLinkUrl(""); setShowLinkInput(false); }} />
                    )}
                    {imageFile && !linkUrl && (
                      <span className="text-xs text-muted-foreground ml-1 truncate max-w-[120px]">
                        📷 {imageFile.name}
                      </span>
                    )}
                    {docFile && !linkUrl && (
                      <span className="text-xs text-muted-foreground ml-1 truncate max-w-[120px]">
                        📄 {docFile.name}
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
      <input ref={docInputRef} type="file" accept=".pdf,.doc,.docx,.txt,.zip,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,application/zip" className="hidden"
        onChange={e => { setDocFile(e.target.files?.[0] ?? null); e.target.value = ""; }} />
    </Layout>
  );
}
