import { useState, useEffect, useRef, useCallback } from "react";
import { useRoute, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { Layout } from "@/components/layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { OnlineDot } from "@/components/online-dot";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Send, MessageCircle, ArrowLeft, Smile, X, Image, Video, Link2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import EmojiPicker, { type EmojiClickData, Theme } from "emoji-picker-react";

type Conversation = {
  user: { id: number; name: string; avatar: string | null; role: string; isOnline?: boolean };
  lastMessage: string;
  lastMessageAt: string | null;
  isMine: boolean;
};

type Message = {
  id: number;
  sender_id: number;
  receiver_id: number;
  message: string;
  image_url: string | null;
  video_url: string | null;
  created_at: string;
};

type PartnerUser = { id: number; name: string; avatar: string | null; isOnline?: boolean };
type PendingMedia = { type: "image" | "video"; url: string; name: string };

function initials(name: string) {
  return name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) ?? "?";
}

function renderTextWithLinks(text: string, isMine: boolean) {
  const urlRegex = /https?:\/\/[^\s]+/g;
  const result: React.ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = urlRegex.exec(text)) !== null) {
    if (match.index > last) result.push(<span key={last}>{text.slice(last, match.index)}</span>);
    result.push(
      <a
        key={match.index}
        href={match[0]}
        target="_blank"
        rel="noopener noreferrer"
        className={cn("underline underline-offset-2 break-all hover:opacity-80", isMine ? "text-white" : "text-primary")}
      >
        {match[0]}
      </a>
    );
    last = match.index + match[0].length;
  }
  if (last < text.length) result.push(<span key={last}>{text.slice(last)}</span>);
  return result.length ? result : [<span key={0}>{text}</span>];
}

function MessageBubble({ msg, myId }: { msg: Message; myId: number }) {
  const isMine = msg.sender_id === myId;
  const hasMedia = !!(msg.image_url || msg.video_url);
  const hasText = !!msg.message;

  return (
    <div className={cn("flex", isMine ? "justify-end" : "justify-start")}>
      <div className={cn(
        "max-w-[72%] rounded-2xl text-sm overflow-hidden",
        isMine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted text-foreground rounded-bl-sm",
        hasMedia && !hasText ? "" : hasMedia ? "" : "px-3 py-2"
      )}>
        {/* Image */}
        {msg.image_url && (
          <a href={msg.image_url} target="_blank" rel="noopener noreferrer" className="block">
            <img
              src={msg.image_url}
              alt="Image"
              className="max-w-full max-h-64 object-cover cursor-zoom-in hover:opacity-95 transition-opacity"
              style={{ display: "block" }}
            />
          </a>
        )}
        {/* Video */}
        {msg.video_url && (
          <video
            src={msg.video_url}
            controls
            className="max-w-full max-h-64 block"
            style={{ display: "block" }}
          />
        )}
        {/* Text */}
        {hasText && (
          <p className={cn("break-words leading-relaxed whitespace-pre-wrap", hasMedia ? "px-3 pt-2 pb-0" : "")}>
            {renderTextWithLinks(msg.message, isMine)}
          </p>
        )}
        {/* Timestamp */}
        <p className={cn(
          "text-[10px] mt-1 leading-none",
          hasMedia ? "px-3 pb-2" : "",
          isMine ? "text-primary-foreground/60 text-right" : "text-muted-foreground"
        )}>
          {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}

export default function MessagesPage() {
  const { user, token } = useAuth();
  const { theme } = useTheme();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/messages/:userId");
  const activeUserId = params?.userId ? parseInt(params.userId, 10) : null;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeUser, setActiveUser] = useState<PartnerUser | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkInput, setLinkInput] = useState("");
  const [pendingMedia, setPendingMedia] = useState<PendingMedia | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(0);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadConversations = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/messages/conversations", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setConversations(await res.json());
    } catch {}
  }, [token]);

  const loadMessages = useCallback(async (userId: number) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/messages/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setMessages(await res.json());
    } catch {}
  }, [token]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  useEffect(() => {
    if (!activeUserId || !token) { setMessages([]); setActiveUser(null); return; }
    loadMessages(activeUserId);
    const conv = conversations.find(c => c.user.id === activeUserId);
    if (conv) {
      setActiveUser(conv.user);
    } else {
      fetch(`/api/users/${activeUserId}`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then((d: PartnerUser) => setActiveUser({ id: d.id, name: d.name, avatar: d.avatar }))
        .catch(() => {});
    }
  }, [activeUserId, token]);

  useEffect(() => {
    if (!activeUserId || !token) return;
    const id = setInterval(() => {
      loadMessages(activeUserId);
      loadConversations();
    }, 3000);
    return () => clearInterval(id);
  }, [activeUserId, token, loadMessages, loadConversations]);

  useEffect(() => {
    if (messages.length > prevCountRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevCountRef.current = messages.length;
  }, [messages]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingMedia(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (res.ok) {
        const { url } = await res.json() as { url: string };
        const type = file.type.startsWith("video/") ? "video" : "image";
        setPendingMedia({ type, url, name: file.name });
      }
    } catch {}
    finally {
      setUploadingMedia(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSend = async () => {
    const hasText = input.trim() !== "";
    const hasMedia = pendingMedia !== null;
    if ((!hasText && !hasMedia) || !activeUserId || sending) return;

    setSending(true);
    const text = input.trim();
    const media = pendingMedia;
    setInput("");
    setPendingMedia(null);

    const body: Record<string, string> = { message: text };
    if (media?.type === "image") body.image_url = media.url;
    if (media?.type === "video") body.video_url = media.url;

    try {
      const res = await fetch(`/api/messages/${activeUserId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        await loadMessages(activeUserId);
        await loadConversations();
      } else {
        setInput(text);
        setPendingMedia(media);
      }
    } catch {
      setInput(text);
      setPendingMedia(media);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleEmojiClick = (data: EmojiClickData) => {
    setInput(prev => prev + data.emoji);
    setEmojiOpen(false);
    inputRef.current?.focus();
  };

  const handleInsertLink = () => {
    if (!linkInput.trim()) return;
    const url = linkInput.trim().startsWith("http") ? linkInput.trim() : `https://${linkInput.trim()}`;
    setInput(prev => prev ? `${prev} ${url} ` : `${url} `);
    setLinkInput("");
    setLinkOpen(false);
    inputRef.current?.focus();
  };

  const emojiTheme = theme === "dark" || theme === "purple" ? Theme.DARK : Theme.LIGHT;

  return (
    <Layout>
      <div className="flex h-full overflow-hidden">

        {/* ── Left panel: conversation list ── */}
        <div className={cn(
          "w-full md:w-72 flex-shrink-0 border-r border-border flex flex-col bg-card",
          activeUserId ? "hidden md:flex" : "flex"
        )}>
          <div className="px-4 py-4 border-b border-border">
            <h2 className="font-semibold">Messages</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4 py-16 gap-3">
                <MessageCircle className="w-10 h-10 text-muted-foreground/25" />
                <p className="text-sm text-muted-foreground">No conversations yet.<br />Message someone from their profile.</p>
              </div>
            ) : (
              conversations.map(conv => (
                <button
                  key={conv.user.id}
                  onClick={() => setLocation(`/messages/${conv.user.id}`)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left",
                    activeUserId === conv.user.id && "bg-primary/10 border-r-2 border-primary"
                  )}
                >
                  <div className="relative flex-shrink-0">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={conv.user.avatar ?? undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                        {initials(conv.user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <OnlineDot isOnline={!!conv.user.isOnline} size="md" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{conv.user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {conv.isMine ? "You: " : ""}{conv.lastMessage}
                    </p>
                  </div>
                  {conv.lastMessageAt && (
                    <span className="text-[10px] text-muted-foreground flex-shrink-0 leading-none">
                      {formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: false })}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* ── Right panel: chat window ── */}
        <div className={cn(
          "flex-1 flex flex-col min-w-0 bg-background",
          !activeUserId ? "hidden md:flex" : "flex"
        )}>
          {!activeUserId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 p-6">
              <MessageCircle className="w-14 h-14 text-muted-foreground/15" />
              <p className="text-muted-foreground text-sm">Select a conversation to start chatting</p>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card flex-shrink-0">
                <button
                  className="md:hidden p-1 text-muted-foreground hover:text-foreground"
                  onClick={() => setLocation("/messages")}
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                {activeUser && (
                  <>
                    <div className="relative">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={activeUser.avatar ?? undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                          {initials(activeUser.name)}
                        </AvatarFallback>
                      </Avatar>
                      <OnlineDot isOnline={!!activeUser.isOnline} size="sm" />
                    </div>
                    <button
                      className="text-sm font-semibold hover:underline"
                      onClick={() => setLocation(`/users/${activeUser.id}`)}
                    >
                      {activeUser.name}
                    </button>
                  </>
                )}
              </div>

              {/* Messages area */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-sm text-muted-foreground">No messages yet. Say hello!</p>
                  </div>
                ) : (
                  messages.map(msg => (
                    <MessageBubble key={msg.id} msg={msg} myId={user?.id ?? 0} />
                  ))
                )}
                <div ref={bottomRef} />
              </div>

              {/* Pending media preview */}
              {pendingMedia && (
                <div className="px-4 py-2 border-t border-border bg-card flex-shrink-0">
                  <div className="relative inline-flex items-center gap-2 bg-muted rounded-lg p-2 pr-8 max-w-xs">
                    {pendingMedia.type === "image" ? (
                      <Image className="w-4 h-4 text-primary flex-shrink-0" />
                    ) : (
                      <Video className="w-4 h-4 text-primary flex-shrink-0" />
                    )}
                    <span className="text-xs truncate max-w-[180px]">{pendingMedia.name}</span>
                    {pendingMedia.type === "image" && (
                      <img src={pendingMedia.url} alt="" className="w-10 h-10 object-cover rounded" />
                    )}
                    <button
                      onClick={() => setPendingMedia(null)}
                      className="absolute top-1 right-1 p-0.5 rounded-full bg-background/80 hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}

              {/* Input bar */}
              <div className="border-t border-border bg-card flex-shrink-0">
                {/* Toolbar row */}
                <div className="flex items-center gap-1 px-3 pt-2">
                  {/* Emoji */}
                  <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
                    <PopoverTrigger asChild>
                      <button type="button" title="Emoji" className="flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                        <Smile className="w-4 h-4" />
                        <span className="hidden sm:inline">Emoji</span>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent side="top" align="start" className="p-0 border-0 shadow-xl w-auto" sideOffset={8}>
                      <EmojiPicker theme={emojiTheme} onEmojiClick={handleEmojiClick} searchPlaceholder="Search emojis…" lazyLoadEmojis height={380} width={320} />
                    </PopoverContent>
                  </Popover>

                  {/* Image */}
                  <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
                  <button
                    type="button"
                    disabled={uploadingMedia}
                    onClick={() => imageInputRef.current?.click()}
                    title="Send image"
                    className="flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 transition-colors disabled:opacity-40"
                  >
                    {uploadingMedia ? (
                      <span className="w-4 h-4 block rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                    ) : (
                      <Image className="w-4 h-4" />
                    )}
                    <span className="hidden sm:inline">Image</span>
                  </button>

                  {/* Video */}
                  <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={handleFileSelect} />
                  <button
                    type="button"
                    disabled={uploadingMedia}
                    onClick={() => videoInputRef.current?.click()}
                    title="Send video"
                    className="flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-purple-500 hover:bg-purple-500/10 transition-colors disabled:opacity-40"
                  >
                    <Video className="w-4 h-4" />
                    <span className="hidden sm:inline">Video</span>
                  </button>

                  {/* Link */}
                  <Popover open={linkOpen} onOpenChange={setLinkOpen}>
                    <PopoverTrigger asChild>
                      <button type="button" title="Insert link" className="flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-green-500 hover:bg-green-500/10 transition-colors">
                        <Link2 className="w-4 h-4" />
                        <span className="hidden sm:inline">Link</span>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent side="top" align="start" className="w-72 p-3 shadow-xl" sideOffset={8}>
                      <p className="text-xs font-medium mb-2 text-foreground">Insert a link</p>
                      <div className="flex gap-2">
                        <Input
                          placeholder="https://example.com"
                          value={linkInput}
                          onChange={e => setLinkInput(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") handleInsertLink(); }}
                          className="flex-1 text-sm h-8"
                          autoFocus
                        />
                        <Button size="sm" className="h-8 px-3" onClick={handleInsertLink} disabled={!linkInput.trim()}>
                          Add
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Text input row */}
                <div className="flex items-center gap-2 px-3 pb-3 pt-1">
                  <Input
                    ref={inputRef}
                    placeholder="Type a message…"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={sending}
                    className="flex-1"
                  />
                  <Button
                    size="icon"
                    onClick={handleSend}
                    disabled={(!input.trim() && !pendingMedia) || sending || uploadingMedia}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>

      </div>
    </Layout>
  );
}
