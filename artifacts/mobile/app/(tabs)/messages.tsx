import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

type Conversation = {
  userId: number;
  name: string;
  email: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
};

type Message = {
  id: number;
  senderId: number;
  receiverId: number;
  content: string;
  createdAt: string;
  isRead: boolean;
};

function ConversationItem({
  conv,
  onPress,
  colors,
}: {
  conv: Conversation;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const initials = conv.name
    .split(" ")
    .map(w => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <TouchableOpacity
      style={[styles.convItem, { borderBottomColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.convAvatar, { backgroundColor: colors.primary }]}>
        <Text style={[styles.convAvatarText, { color: colors.primaryForeground }]}>{initials}</Text>
      </View>
      <View style={styles.convInfo}>
        <View style={styles.convTop}>
          <Text style={[styles.convName, { color: colors.foreground }]} numberOfLines={1}>
            {conv.name}
          </Text>
          <Text style={[styles.convTime, { color: colors.mutedForeground }]}>
            {timeAgo(conv.lastMessageAt)}
          </Text>
        </View>
        <View style={styles.convBottom}>
          <Text style={[styles.convPreview, { color: colors.mutedForeground }]} numberOfLines={1}>
            {conv.lastMessage}
          </Text>
          {conv.unreadCount > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.primary }]}>
              <Text style={[styles.badgeText, { color: colors.primaryForeground }]}>
                {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

function ChatScreen({
  otherId,
  otherName,
  token,
  myId,
  onBack,
}: {
  otherId: number;
  otherName: string;
  token: string | null;
  myId: number;
  onBack: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [messages, setMessages]   = useState<Message[]>([]);
  const [loading, setLoading]     = useState(true);
  const [text, setText]           = useState("");
  const [sending, setSending]     = useState(false);
  const listRef = useRef<FlatList>(null);
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const authHeader: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/messages/${otherId}`, { headers: authHeader });
      if (!res.ok) return;
      const data = await res.json() as Message[];
      setMessages(data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [otherId, token]);

  useEffect(() => {
    void fetchMessages();
    const interval = setInterval(() => void fetchMessages(), 5000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  async function sendMessage() {
    if (!text.trim() || sending) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSending(true);
    try {
      const res = await fetch(`/api/messages/${otherId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({ content: text.trim() }),
      });
      if (res.ok) {
        setText("");
        await fetchMessages();
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
      }
    } catch { /* silent */ }
    finally { setSending(false); }
  }

  const initials = otherName
    .split(" ")
    .map(w => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.chatHeader, { paddingTop: topPad + 12, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      {/* Header */}
      <View style={[styles.chatHeader, { paddingTop: topPad + 12, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={[styles.chatAvatar, { backgroundColor: colors.primary }]}>
          <Text style={[styles.chatAvatarText, { color: colors.primaryForeground }]}>{initials}</Text>
        </View>
        <Text style={[styles.chatName, { color: colors.foreground }]}>{otherName}</Text>
      </View>

      {/* Messages */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={[styles.messageList, { paddingBottom: 8 }]}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <View style={styles.center}>
            <Feather name="message-circle" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No messages yet. Say hello!
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const isMe = item.senderId === myId;
          return (
            <View style={[styles.msgRow, isMe ? styles.msgRowMe : styles.msgRowThem]}>
              <View style={[
                styles.bubble,
                {
                  backgroundColor: isMe ? colors.primary : colors.card,
                  borderColor: isMe ? colors.primary : colors.border,
                },
              ]}>
                <Text style={[styles.bubbleText, { color: isMe ? colors.primaryForeground : colors.foreground }]}>
                  {item.content}
                </Text>
                <Text style={[styles.msgTime, { color: isMe ? colors.primaryForeground + "99" : colors.mutedForeground }]}>
                  {timeAgo(item.createdAt)}
                </Text>
              </View>
            </View>
          );
        }}
      />

      {/* Input */}
      <View style={[styles.inputBar, { borderTopColor: colors.border, backgroundColor: colors.background, paddingBottom: insets.bottom + (Platform.OS === "web" ? 84 : 16) }]}>
        <TextInput
          style={[styles.inputField, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
          placeholder="Type a message…"
          placeholderTextColor={colors.mutedForeground}
          value={text}
          onChangeText={setText}
          multiline
          onSubmitEditing={sendMessage}
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[styles.sendBtn, { backgroundColor: text.trim() ? colors.primary : colors.muted }]}
          onPress={sendMessage}
          disabled={!text.trim() || sending}
          activeOpacity={0.7}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Feather name="send" size={16} color={text.trim() ? "#fff" : colors.mutedForeground} />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

export default function MessagesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { token, user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeConv, setActiveConv] = useState<{ userId: number; name: string } | null>(null);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const authHeader: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  const fetchConversations = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch("/api/messages/conversations", { headers: authHeader });
      if (!res.ok) { setConversations([]); return; }
      const data = await res.json() as Conversation[];
      setConversations(data);
    } catch { setConversations([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, [token]);

  useEffect(() => { void fetchConversations(); }, [fetchConversations]);

  if (activeConv && user) {
    return (
      <ChatScreen
        otherId={activeConv.userId}
        otherName={activeConv.name}
        token={token}
        myId={user.id}
        onBack={() => { setActiveConv(null); void fetchConversations(true); }}
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Messages</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={item => String(item.userId)}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); void fetchConversations(true); }}
              tintColor={colors.primary}
            />
          }
          contentContainerStyle={[
            conversations.length === 0 ? styles.center : null,
            { paddingBottom: insets.bottom + (Platform.OS === "web" ? 84 : 80) },
          ]}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Feather name="message-circle" size={44} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No conversations</Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                Your direct messages will appear here.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <ConversationItem
              conv={item}
              colors={colors}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveConv({ userId: item.userId, name: item.name });
              }}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: { fontSize: 28, fontFamily: "Inter_700Bold" },

  // Conversation list
  convItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  convAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  convAvatarText: { fontSize: 17, fontFamily: "Inter_700Bold" },
  convInfo: { flex: 1, gap: 3 },
  convTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  convName: { fontSize: 15, fontFamily: "Inter_600SemiBold", flex: 1 },
  convTime: { fontSize: 11, fontFamily: "Inter_400Regular" },
  convBottom: { flexDirection: "row", alignItems: "center", gap: 8 },
  convPreview: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: { fontSize: 10, fontFamily: "Inter_700Bold" },

  // Empty
  emptyState: { alignItems: "center", paddingTop: 80, gap: 10 },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },

  // Chat screen
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { padding: 4 },
  chatAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  chatAvatarText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  chatName: { fontSize: 16, fontFamily: "Inter_600SemiBold", flex: 1 },

  messageList: { paddingHorizontal: 16, paddingTop: 16, gap: 10 },
  msgRow: { flexDirection: "row" },
  msgRowMe: { justifyContent: "flex-end" },
  msgRowThem: { justifyContent: "flex-start" },
  bubble: {
    maxWidth: "75%",
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 4,
  },
  bubbleText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  msgTime: { fontSize: 10, fontFamily: "Inter_400Regular", textAlign: "right" },

  // Input bar
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  inputField: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});
