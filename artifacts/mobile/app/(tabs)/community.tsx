import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import {
  useCreatePost,
  useListPosts,
  useLikePost,
  useListComments,
  useCreateComment,
  type PostWithAuthor,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
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
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

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

export default function CommunityScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
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
  postCard: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 10 },
  postHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  postMeta: { flex: 1 },
  authorName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  postTime: { fontSize: 12, fontFamily: "Inter_400Regular" },
  postContent: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22 },
  postActions: {
    flexDirection: "row",
    gap: 20,
    borderTopWidth: 1,
    paddingTop: 10,
    marginTop: 2,
  },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
  actionCount: { fontSize: 13, fontFamily: "Inter_400Regular" },
  commentsSection: { borderTopWidth: 1, paddingTop: 10, gap: 8 },
  commentRow: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  commentAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  commentAvatarText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  commentBubble: { flex: 1, borderRadius: 10, padding: 8, gap: 2 },
  commentAuthor: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  commentText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  commentInput: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 4,
  },
  commentField: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", maxHeight: 80 },
  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center" },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 16 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  modalTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  postTextArea: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    minHeight: 120,
    textAlignVertical: "top",
  },
  postSubmitBtn: { borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  postSubmitText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#fff" },
});
