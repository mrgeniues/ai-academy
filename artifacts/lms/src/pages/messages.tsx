import { useState, useEffect, useRef, useCallback } from "react";
import { useRoute, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Layout } from "@/components/layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, MessageCircle, ArrowLeft } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

type Conversation = {
  user: { id: number; name: string; avatar: string | null; role: string };
  lastMessage: string;
  lastMessageAt: string | null;
  isMine: boolean;
};

type Message = {
  id: number;
  sender_id: number;
  receiver_id: number;
  message: string;
  created_at: string;
};

type PartnerUser = { id: number; name: string; avatar: string | null };

function initials(name: string) {
  return name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) ?? "?";
}

export default function MessagesPage() {
  const { user, token } = useAuth();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/messages/:userId");
  const activeUserId = params?.userId ? parseInt(params.userId, 10) : null;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeUser, setActiveUser] = useState<PartnerUser | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef(0);

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

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

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

  // Poll every 3s for new messages & refresh conversation list
  useEffect(() => {
    if (!activeUserId || !token) return;
    const id = setInterval(() => {
      loadMessages(activeUserId);
      loadConversations();
    }, 3000);
    return () => clearInterval(id);
  }, [activeUserId, token, loadMessages, loadConversations]);

  // Auto-scroll only when message count increases
  useEffect(() => {
    if (messages.length > prevMessageCountRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevMessageCountRef.current = messages.length;
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !activeUserId || sending) return;
    setSending(true);
    const text = input.trim();
    setInput("");
    try {
      const res = await fetch(`/api/messages/${activeUserId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: text }),
      });
      if (res.ok) {
        await loadMessages(activeUserId);
        await loadConversations();
      } else {
        setInput(text);
      }
    } catch {
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

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
                  <Avatar className="w-10 h-10 flex-shrink-0">
                    <AvatarImage src={conv.user.avatar ?? undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                      {initials(conv.user.name)}
                    </AvatarFallback>
                  </Avatar>
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
              {/* Header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card flex-shrink-0">
                <button
                  className="md:hidden p-1 text-muted-foreground hover:text-foreground"
                  onClick={() => setLocation("/messages")}
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                {activeUser && (
                  <>
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={activeUser.avatar ?? undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                        {initials(activeUser.name)}
                      </AvatarFallback>
                    </Avatar>
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
                  messages.map(msg => {
                    const isMine = msg.sender_id === user?.id;
                    return (
                      <div key={msg.id} className={cn("flex", isMine ? "justify-end" : "justify-start")}>
                        <div className={cn(
                          "max-w-[72%] px-3 py-2 rounded-2xl text-sm",
                          isMine
                            ? "bg-primary text-primary-foreground rounded-br-sm"
                            : "bg-muted text-foreground rounded-bl-sm"
                        )}>
                          <p className="break-words leading-relaxed">{msg.message}</p>
                          <p className={cn(
                            "text-[10px] mt-1 leading-none",
                            isMine ? "text-primary-foreground/60 text-right" : "text-muted-foreground"
                          )}>
                            {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input bar */}
              <div className="px-4 py-3 border-t border-border bg-card flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Type a message…"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={sending}
                    className="flex-1"
                    autoFocus
                  />
                  <Button
                    size="icon"
                    onClick={handleSend}
                    disabled={!input.trim() || sending}
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
