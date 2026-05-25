import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import { customFetch } from "@workspace/api-client-react";
import React, { useState, useEffect, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
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

type Tool = {
  id: number;
  title: string;
  description: string | null;
  toolUrl: string | null;
  imageUrl: string | null;
  videoUrl: string | null;
  createdBy: number;
  createdAt: string;
};

type ToolRequest = {
  id: number;
  toolId: number;
  isApproved: boolean;
  createdAt: string;
};

export default function ToolsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [tools, setTools]           = useState<Tool[]>([]);
  const [requests, setRequests]     = useState<ToolRequest[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]         = useState("");
  const [requesting, setRequesting] = useState<number | null>(null);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const fetchTools = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [toolsData, reqData] = await Promise.all([
        customFetch<Tool[]>("/api/tools"),
        customFetch<ToolRequest[]>("/api/tool-requests/my").catch(() => [] as ToolRequest[]),
      ]);
      setTools(toolsData);
      setRequests(reqData);
    } catch { /* silent */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { void fetchTools(); }, [fetchTools]);

  async function handleRequest(toolId: number) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRequesting(toolId);
    try {
      const newReq = await customFetch<ToolRequest>(`/api/tools/${toolId}/request`, {
        method: "POST",
      });
      setRequests(prev => [...prev, newReq]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Request Sent", "Your access request has been submitted for review.");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("Already")) {
        Alert.alert("Already Requested", "You have already requested access to this tool.");
      }
    } finally { setRequesting(null); }
  }

  async function openTool(url: string | null, title: string) {
    if (!url) { Alert.alert("Not Available", "This tool does not have a URL configured yet."); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      Alert.alert("Cannot Open", `Unable to open ${title}.`);
    }
  }

  const filtered = tools.filter(t =>
    search === "" ||
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    (t.description ?? "").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>AI Tools</Text>
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search tools…"
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")}>
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + (Platform.OS === "web" ? 84 : 80) },
          filtered.length === 0 ? styles.listEmpty : null,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); void fetchTools(true); }}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="tool" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              {search ? "No tools match your search" : "No AI tools available yet"}
            </Text>
          </View>
        }
        renderItem={({ item: tool }) => {
          const myRequest = requests.find(r => r.toolId === tool.id);
          const hasAccess = myRequest?.isApproved === true;
          const hasPendingRequest = myRequest && !myRequest.isApproved;

          return (
            <View
              style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={[styles.toolIcon, { backgroundColor: colors.primary + "18" }]}>
                <Feather name="zap" size={22} color={colors.primary} />
              </View>
              <View style={styles.toolInfo}>
                <Text style={[styles.toolTitle, { color: colors.foreground }]} numberOfLines={1}>
                  {tool.title}
                </Text>
                {tool.description ? (
                  <Text style={[styles.toolDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
                    {tool.description}
                  </Text>
                ) : null}
                <View style={styles.toolFooter}>
                  {hasAccess && tool.toolUrl ? (
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                      onPress={() => void openTool(tool.toolUrl, tool.title)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.actionBtnText, { color: colors.primaryForeground }]}>
                        Open Tool
                      </Text>
                      <Feather name="external-link" size={12} color={colors.primaryForeground} />
                    </TouchableOpacity>
                  ) : hasPendingRequest ? (
                    <View style={[styles.actionBtn, { backgroundColor: colors.muted }]}>
                      <Feather name="clock" size={12} color={colors.mutedForeground} />
                      <Text style={[styles.actionBtnText, { color: colors.mutedForeground }]}>
                        Pending Review
                      </Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[styles.actionBtn, { borderWidth: 1.5, borderColor: colors.primary }]}
                      onPress={() => void handleRequest(tool.id)}
                      disabled={requesting === tool.id}
                      activeOpacity={0.8}
                    >
                      {requesting === tool.id ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                      ) : (
                        <>
                          <Feather name="unlock" size={12} color={colors.primary} />
                          <Text style={[styles.actionBtnText, { color: colors.primary }]}>
                            Request Access
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", marginBottom: 12 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 44,
  },
  searchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  list: { paddingHorizontal: 16, paddingTop: 8, gap: 8 },
  listEmpty: { flex: 1 },

  card: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  toolIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  toolInfo: { flex: 1, gap: 6 },
  toolTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  toolDesc: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  toolFooter: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },

  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },

  empty: { alignItems: "center", justifyContent: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center" },
});
