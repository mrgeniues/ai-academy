import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
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
import { useAuth } from "@/context/AuthContext";

type Tool = {
  id: number;
  title: string;
  description: string | null;
  url: string;
  category: string | null;
  is_active: boolean;
  is_public: boolean;
  hasAccess?: boolean;
};

type ToolRequest = {
  id: number;
  toolId: number;
  status: string;
};

export default function ToolsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const [tools, setTools]             = useState<Tool[]>([]);
  const [requests, setRequests]       = useState<ToolRequest[]>([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [search, setSearch]           = useState("");
  const [requesting, setRequesting]   = useState<number | null>(null);

  const authHeader: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const fetchTools = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [toolsRes, reqRes] = await Promise.all([
        fetch("/api/tools", { headers: authHeader }),
        fetch("/api/tool-requests/my", { headers: authHeader }).catch(() => null),
      ]);
      if (toolsRes.ok) {
        const data = await toolsRes.json() as Tool[];
        setTools(data);
      }
      if (reqRes?.ok) {
        const reqData = await reqRes.json() as ToolRequest[];
        setRequests(reqData);
      }
    } catch { /* silent */ }
    finally { setLoading(false); setRefreshing(false); }
  }, [token]);

  useEffect(() => { void fetchTools(); }, [fetchTools]);

  async function handleRequest(toolId: number) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRequesting(toolId);
    try {
      const res = await fetch("/api/tool-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({ toolId }),
      });
      if (res.ok) {
        const newReq = await res.json() as ToolRequest;
        setRequests(prev => [...prev, newReq]);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("Request Sent", "Your access request has been submitted for review.");
      } else {
        const d = await res.json().catch(() => ({})) as { error?: string };
        if (d.error?.includes("already")) {
          Alert.alert("Already Requested", "You have already requested access to this tool.");
        }
      }
    } catch { /* silent */ }
    finally { setRequesting(null); }
  }

  async function openTool(url: string, title: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      Alert.alert("Cannot Open", `Unable to open ${title}.`);
    }
  }

  const filtered = tools.filter(t =>
    t.is_active &&
    (search === "" ||
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      (t.category ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (t.description ?? "").toLowerCase().includes(search.toLowerCase()))
  );

  const grouped = filtered.reduce<Record<string, Tool[]>>((acc, tool) => {
    const cat = tool.category ?? "Other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(tool);
    return acc;
  }, {});

  const sections = Object.entries(grouped);

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
        data={sections}
        keyExtractor={([cat]) => cat}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + (Platform.OS === "web" ? 84 : 80) },
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
        renderItem={({ item: [category, categoryTools] }) => (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
              {category.toUpperCase()}
            </Text>
            {categoryTools.map(tool => {
              const myRequest = requests.find(r => r.toolId === tool.id);
              const hasPendingRequest = myRequest?.status === "pending";
              const hasAccess = tool.is_public || tool.hasAccess || myRequest?.status === "approved";

              return (
                <View
                  key={tool.id}
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
                      {tool.is_public && (
                        <View style={[styles.badge, { backgroundColor: colors.primary + "18" }]}>
                          <Text style={[styles.badgeText, { color: colors.primary }]}>Public</Text>
                        </View>
                      )}
                      {hasAccess ? (
                        <TouchableOpacity
                          style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                          onPress={() => void openTool(tool.url, tool.title)}
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
                            Requested
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
            })}
          </View>
        )}
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
  list: { paddingHorizontal: 16, paddingTop: 8, gap: 4 },

  section: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
    marginBottom: 10,
    paddingHorizontal: 4,
  },

  card: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 12,
    marginBottom: 8,
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

  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },

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
