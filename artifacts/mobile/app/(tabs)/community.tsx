import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import {
  useCreatePost,
  useListPosts,
  useLikePost,
  useListComments,
  useCreateComment,
  type PostWithAuthor,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import React, { useState, useEffect, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
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
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ─── Types ────────────────────────────────────────────────────────────────────
type MyCommunity = {
  id: number;
  name: string;
  description: string | null;
  status: string;
  invite_code: string | null;
  member_count: number;
  pending_count: number;
};

type CommunityMember = {
  id: number;
  name: string;
  email: string;
  status: string;
  joined_at: string;
};

// ─── My Community Card ────────────────────────────────────────────────────────
function MyCommunityCard({ token }: { token: string | null }) {
  const colors = useColors();
  const [community, setCommunity]   = useState<MyCommunity | null>(null);
  const [loading, setLoading]       = useState(true);
  const [members, setMembers]       = useState<CommunityMember[]>([]);
  const [showMembers, setShowMembers] = useState(false);
  const [membersLoading, setMembersLoading] = useState(false);
  const [actioning, setActioning]   = useState<number | null>(null);

  const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

  const fetchCommunity = useCallback(async () => {
    if (!token) { setLoading(false); return; }
    try {
      // /communities/mine returns an array — pick first approved one
      const res = await fetch("/api/communities/mine", { headers: authHeader });
      if (!res.ok) { setCommunity(null); setLoading(false); return; }
      const list = await res.json() as Array<{ id: number; name: string; description: string | null; status: string }>;
      const approved = list.find(c => c.status === "approved");
      if (!approved) { setCommunity(null); setLoading(false); return; }

      // Fetch panel for invite_code + member counts
      const panelRes = await fetch(`/api/communities/${approved.id}/panel`, { headers: authHeader });
      if (!panelRes.ok) { setCommunity(null); setLoading(false); return; }
      const panel = await panelRes.json() as { id: number; name: string; description: string | null; status: string; invite_code: string | null };

      // Fetch member counts
      const membersRes = await fetch(`/api/communities/${approved.id}/members`, { headers: authHeader });
      let memberCount = 0;
      let pendingCount = 0;
      if (membersRes.ok) {
        const allMembers = await membersRes.json() as CommunityMember[];
        memberCount = allMembers.filter(m => m.status === "approved").length;
        pendingCount = allMembers.filter(m => m.status === "pending").length;
      }

      setCommunity({ ...panel, member_count: memberCount, pending_count: pendingCount });
    } catch {
      setCommunity(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchMembers = useCallback(async (communityId: number) => {
    setMembersLoading(true);
    try {
      const res = await fetch(`/api/communities/${communityId}/members`, { headers: authHeader });
      if (!res.ok) return;
      const data = await res.json() as CommunityMember[];
      setMembers(data);
    } catch { /* silent */ }
    finally { setMembersLoading(false); }
  }, [token]);

  useEffect(() => { void fetchCommunity(); }, [fetchCommunity]);

  async function toggleMembers() {
    if (!community) return;
    if (!showMembers) await fetchMembers(community.id);
    setShowMembers(v => !v);
  }

  async function handleMember(memberId: number, action: "approved" | "rejected") {
    if (!community) return;
    setActioning(memberId);
    try {
      await fetch(`/api/communities/${community.id}/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({ status: action }),
      });
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, status: action } : m));
      setCommunity(prev => prev ? {
        ...prev,
        pending_count: Math.max(0, prev.pending_count - 1),
        member_count: action === "approved" ? prev.member_count + 1 : prev.member_count,
      } : prev);
    } catch { /* silent */ }
    finally { setActioning(null); }
  }

  async function copyInvite() {
    if (!community?.invite_code) return;
    const link = `${Platform.OS === "web" ? window.location.origin : "https://your-app.replit.app"}/community/join/${community.invite_code}`;
    await Clipboard.setStringAsync(link);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Copied!", "Invite link copied to clipboard.");
  }

  if (loading) return null;
  if (!community) return null;

  const pendingMembers  = members.filter(m => m.status === "pending");
  const approvedMembers = members.filter(m => m.status === "approved");

  return (
    <View style={[styles.myCommCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Header row */}
      <View style={styles.myCommHeader}>
        <View style={[styles.myCommIcon, { backgroundColor: colors.primary + "22" }]}>
          <Feather name="shield" size={18} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.myCommTitle, { color: colors.foreground }]}>{community.name}</Text>
          <Text style={[styles.myCommSub, { color: colors.mutedForeground }]}>Your Community</Text>
        </View>
        <TouchableOpacity onPress={copyInvite} activeOpacity={0.7}
          style={[styles.inviteBtn, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "44" }]}>
          <Feather name="link" size={13} color={colors.primary} />
          <Text style={[styles.inviteBtnText, { color: colors.primary }]}>Invite</Text>
        </TouchableOpacity>
      </View>

      {/* Stats row */}
      <View style={styles.myCommStats}>
        <View style={[styles.statPill, { backgroundColor: colors.muted }]}>
          <Feather name="users" size={12} color={colors.mutedForeground} />
          <Text style={[styles.statText, { color: colors.foreground }]}>{community.member_count} members</Text>
        </View>
        {community.pending_count > 0 && (
          <View style={[styles.statPill, { backgroundColor: "#f59e0b22" }]}>
            <Feather name="clock" size={12} color="#f59e0b" />
            <Text style={[styles.statText, { color: "#f59e0b" }]}>{community.pending_count} pending</Text>
          </View>
        )}
      </View>

      {/* Members toggle */}
      <TouchableOpacity
        style={[styles.membersToggle, { borderTopColor: colors.border }]}
        onPress={toggleMembers}
        activeOpacity={0.7}
      >
        <Text style={[styles.membersToggleText, { color: colors.mutedForeground }]}>
          {showMembers ? "Hide members" : "Manage members"}
        </Text>
        <Feather name={showMembers ? "chevron-up" : "chevron-down"} size={14} color={colors.mutedForeground} />
      </TouchableOpacity>

      {/* Members list */}
      {showMembers && (
        <View style={[styles.membersList, { borderTopColor: colors.border }]}>
          {membersLoading ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 12 }} />
          ) : members.length === 0 ? (
            <Text style={[styles.noMembers, { color: colors.mutedForeground }]}>No members yet.</Text>
          ) : (
            <>
              {pendingMembers.length > 0 && (
                <>
                  <Text style={[styles.membersSection, { color: colors.mutedForeground }]}>Pending Requests</Text>
                  {pendingMembers.map(m => (
                    <View key={m.id} style={styles.memberRow}>
                      <View style={[styles.memberAvatar, { backgroundColor: "#f59e0b22" }]}>
                        <Text style={[styles.memberAvatarText, { color: "#f59e0b" }]}>{m.name[0]?.toUpperCase()}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.memberName, { color: colors.foreground }]}>{m.name}</Text>
                        <Text style={[styles.memberEmail, { color: colors.mutedForeground }]}>{m.email}</Text>
                      </View>
                      <View style={styles.memberActions}>
                        <TouchableOpacity
                          onPress={() => void handleMember(m.id, "approved")}
                          disabled={actioning === m.id}
                          style={[styles.approveBtn, { backgroundColor: "#22c55e22", borderColor: "#22c55e44" }]}
                        >
                          <Feather name="check" size={13} color="#22c55e" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => void handleMember(m.id, "rejected")}
                          disabled={actioning === m.id}
                          style={[styles.rejectBtn, { backgroundColor: "#ef444422", borderColor: "#ef444444" }]}
                        >
                          <Feather name="x" size={13} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </>
              )}
              {approvedMembers.length > 0 && (
                <>
                  <Text style={[styles.membersSection, { color: colors.mutedForeground }]}>Members</Text>
                  {approvedMembers.map(m => (
                    <View key={m.id} style={styles.memberRow}>
                      <View style={[styles.memberAvatar, { backgroundColor: colors.primary + "22" }]}>
                        <Text style={[styles.memberAvatarText, { color: colors.primary }]}>{m.name[0]?.toUpperCase()}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.memberName, { color: colors.foreground }]}>{m.name}</Text>
                        <Text style={[styles.memberEmail, { color: colors.mutedForeground }]}>{timeAgo(m.joined_at)}</Text>
                      </View>
                      <Feather name="check-circle" size={14} color="#22c55e" />
                    </View>
                  ))}
                </>
              )}
            </>
          )}
        </View>
      )}
    </View>
  );
}

// ─── Post Card ────────────────────────────────────────────────────────────────
function PostCard({ post }: { post: PostWithAuthor }) {
  const colors = useColors();
  const qc = useQueryClient();
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const { user } = useAuth();

  const like = useLikePost({
    mutation: {
      onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/posts"] }),
    },
  });

  const { data: comments } = useListComments(post.id, {
    query: { enabled: showComments },
  });

  const createComment = useCreateComment({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: [`/api/posts/${post.id}/comments`] });
        qc.invalidateQueries({ queryKey: ["/api/posts"] });
        setCommentText("");
      },
    },
  });

  async function handleLike() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    like.mutate({ id: post.id });
  }

  async function submitComment() {
    if (!commentText.trim()) return;
    createComment.mutate({ id: post.id, data: { content: commentText.trim() } });
  }

  const initials = (post.author?.name ?? "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <View style={[styles.postCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.postHeader}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={[styles.avatarText, { color: colors.primaryForeground }]}>{initials}</Text>
        </View>
        <View style={styles.postMeta}>
          <Text style={[styles.authorName, { color: colors.foreground }]}>
            {post.author?.name ?? "Unknown"}
          </Text>
          <Text style={[styles.postTime, { color: colors.mutedForeground }]}>
            {timeAgo(post.createdAt)}
          </Text>
        </View>
      </View>

      <Text style={[styles.postContent, { color: colors.foreground }]}>{post.content}</Text>

      <View style={[styles.postActions, { borderTopColor: colors.border }]}>
        <TouchableOpacity style={styles.actionBtn} onPress={handleLike} activeOpacity={0.7}>
          <Feather
            name="heart"
            size={18}
            color={post.isLiked ? "#ef4444" : colors.mutedForeground}
          />
          <Text style={[styles.actionCount, { color: colors.mutedForeground }]}>
            {post.likeCount}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => setShowComments(!showComments)}
          activeOpacity={0.7}
        >
          <Feather name="message-circle" size={18} color={colors.mutedForeground} />
          <Text style={[styles.actionCount, { color: colors.mutedForeground }]}>
            {post.commentCount}
          </Text>
        </TouchableOpacity>
      </View>

      {showComments && (
        <View style={[styles.commentsSection, { borderTopColor: colors.border }]}>
          {(comments ?? []).map((c) => (
            <View key={c.id} style={styles.commentRow}>
              <View style={[styles.commentAvatar, { backgroundColor: colors.muted }]}>
                <Text style={[styles.commentAvatarText, { color: colors.mutedForeground }]}>
                  {(c.author?.name ?? "?")[0].toUpperCase()}
                </Text>
              </View>
              <View style={[styles.commentBubble, { backgroundColor: colors.muted }]}>
                <Text style={[styles.commentAuthor, { color: colors.foreground }]}>
                  {c.author?.name ?? "Unknown"}
                </Text>
                <Text style={[styles.commentText, { color: colors.foreground }]}>{c.content}</Text>
              </View>
            </View>
          ))}

          <View style={[styles.commentInput, { borderColor: colors.border, backgroundColor: colors.background }]}>
            <TextInput
              style={[styles.commentField, { color: colors.foreground }]}
              placeholder="Write a comment..."
              placeholderTextColor={colors.mutedForeground}
              value={commentText}
              onChangeText={setCommentText}
              multiline
            />
            <Pressable
              onPress={submitComment}
              disabled={createComment.isPending || !commentText.trim()}
            >
              <Feather
                name="send"
                size={18}
                color={commentText.trim() ? colors.primary : colors.mutedForeground}
              />
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function CommunityScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { token } = useAuth();
  const [newPostText, setNewPostText] = useState("");
  const [showNewPost, setShowNewPost] = useState(false);

  const { data: posts, isLoading, refetch, isRefetching } = useListPosts();
  const createPost = useCreatePost({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ["/api/posts"] });
        setNewPostText("");
        setShowNewPost(false);
      },
    },
  });

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  async function submitPost() {
    if (!newPostText.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    createPost.mutate({ data: { content: newPostText.trim() } });
  }

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Community</Text>
        <Pressable
          style={[styles.newPostBtn, { backgroundColor: colors.primary }]}
          onPress={() => setShowNewPost(true)}
        >
          <Feather name="edit-2" size={16} color="#fff" />
        </Pressable>
      </View>

      <FlatList
        data={posts ?? []}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + (Platform.OS === "web" ? 84 : 80) },
        ]}
        ListHeaderComponent={<MyCommunityCard token={token} />}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
        scrollEnabled={!!(posts ?? []).length}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="users" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Be the first to post in the community!
            </Text>
          </View>
        }
        renderItem={({ item }) => <PostCard post={item} />}
      />

      <Modal visible={showNewPost} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View
            style={[
              styles.modalSheet,
              {
                backgroundColor: colors.card,
                paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 16),
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>New Post</Text>
              <Pressable onPress={() => setShowNewPost(false)}>
                <Feather name="x" size={22} color={colors.mutedForeground} />
              </Pressable>
            </View>
            <TextInput
              style={[styles.postTextArea, { color: colors.foreground, borderColor: colors.border }]}
              placeholder="Share something with the community..."
              placeholderTextColor={colors.mutedForeground}
              value={newPostText}
              onChangeText={setNewPostText}
              multiline
              autoFocus
            />
            <Pressable
              style={[styles.postSubmitBtn, { backgroundColor: colors.primary, opacity: newPostText.trim() ? 1 : 0.5 }]}
              onPress={submitPost}
              disabled={createPost.isPending || !newPostText.trim()}
            >
              {createPost.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.postSubmitText}>Post</Text>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { fontSize: 28, fontFamily: "Inter_700Bold" },
  newPostBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  list: { paddingHorizontal: 16, paddingTop: 8, gap: 12 },

  // My Community card
  myCommCard: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 4,
    overflow: "hidden",
  },
  myCommHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
  myCommIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  myCommTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  myCommSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  inviteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  inviteBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  myCommStats: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  statPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  membersToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  membersToggleText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  membersList: {
    borderTopWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  membersSection: { fontSize: 10, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.8, marginTop: 4, marginBottom: 2 },
  noMembers: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", paddingVertical: 8 },
  memberRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 },
  memberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  memberAvatarText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  memberName: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  memberEmail: { fontSize: 11, fontFamily: "Inter_400Regular" },
  memberActions: { flexDirection: "row", gap: 6 },
  approveBtn: {
    width: 30, height: 30, borderRadius: 8,
    alignItems: "center", justifyContent: "center", borderWidth: 1,
  },
  rejectBtn: {
    width: 30, height: 30, borderRadius: 8,
    alignItems: "center", justifyContent: "center", borderWidth: 1,
  },

  // Posts
  postCard: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 10 },
  postHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: "center", justifyContent: "center",
  },
  avatarText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  postMeta: { flex: 1 },
  authorName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  postTime: { fontSize: 12, fontFamily: "Inter_400Regular" },
  postContent: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22 },
  postActions: {
    flexDirection: "row", gap: 20,
    borderTopWidth: 1, paddingTop: 10, marginTop: 2,
  },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
  actionCount: { fontSize: 13, fontFamily: "Inter_400Regular" },
  commentsSection: { borderTopWidth: 1, paddingTop: 10, gap: 8 },
  commentRow: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  commentAvatar: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
  },
  commentAvatarText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  commentBubble: { flex: 1, borderRadius: 10, padding: 8, gap: 2 },
  commentAuthor: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  commentText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  commentInput: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderRadius: 10, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 8, marginTop: 4,
  },
  commentField: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", maxHeight: 80 },
  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center" },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 16 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  modalTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  postTextArea: {
    borderWidth: 1, borderRadius: 12, padding: 14,
    fontSize: 15, fontFamily: "Inter_400Regular",
    minHeight: 120, textAlignVertical: "top",
  },
  postSubmitBtn: { borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  postSubmitText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#fff" },
});
