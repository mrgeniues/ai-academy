import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import {
  getCourseQueryKey,
  useEnrollInCourse,
  useListCourses,
  useListMyEnrollments,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

export default function CoursesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const qc = useQueryClient();

  const { data: courses, isLoading, refetch, isRefetching } = useListCourses();
  const { data: enrollments } = useListMyEnrollments();
  const enroll = useEnrollInCourse({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ["/api/enrollments"] });
        qc.invalidateQueries({ queryKey: ["/api/courses"] });
      },
    },
  });

  const enrolledIds = new Set((enrollments ?? []).map((e) => e.courseId));

  const filtered = (courses ?? []).filter(
    (c) =>
      !search ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      (c.description ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  async function handleEnroll(courseId: number) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    enroll.mutate({ data: { courseId } });
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
        <Text style={[styles.title, { color: colors.foreground }]}>Courses</Text>
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search courses..."
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
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + (Platform.OS === "web" ? 84 : 80) },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
        scrollEnabled={!!filtered.length}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="book-open" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              {search ? "No courses match your search" : "No courses available yet"}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const isEnrolled = enrolledIds.has(item.id);
          const enrollment = (enrollments ?? []).find((e) => e.courseId === item.id);
          return (
            <Pressable
              style={({ pressed }) => [
                styles.card,
                { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.93 : 1 },
              ]}
              onPress={() => router.push(`/course/${item.id}`)}
            >
              <View style={styles.cardTop}>
                <View style={[styles.courseIcon, { backgroundColor: colors.accent }]}>
                  <Feather name="book-open" size={22} color={colors.primary} />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={[styles.courseTitle, { color: colors.foreground }]} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <View style={styles.metaRow}>
                    <Feather name="layers" size={12} color={colors.mutedForeground} />
                    <Text style={[styles.meta, { color: colors.mutedForeground }]}>
                      {item.lessonCount} lessons
                    </Text>
                    <Feather name="users" size={12} color={colors.mutedForeground} />
                    <Text style={[styles.meta, { color: colors.mutedForeground }]}>
                      {item.enrollmentCount} enrolled
                    </Text>
                  </View>
                </View>
              </View>

              {item.description ? (
                <Text style={[styles.desc, { color: colors.mutedForeground }]} numberOfLines={2}>
                  {item.description}
                </Text>
              ) : null}

              {isEnrolled && enrollment ? (
                <View style={styles.progressSection}>
                  <View style={styles.progressHeader}>
                    <Text style={[styles.progressLabel, { color: colors.mutedForeground }]}>
                      Progress
                    </Text>
                    <Text style={[styles.progressPct, { color: colors.primary }]}>
                      {enrollment.progress}%
                    </Text>
                  </View>
                  <View style={[styles.progressBg, { backgroundColor: colors.muted }]}>
                    <View
                      style={[
                        styles.progressFill,
                        { backgroundColor: colors.primary, width: `${enrollment.progress}%` },
                      ]}
                    />
                  </View>
                </View>
              ) : null}

              <View style={styles.cardFooter}>
                {isEnrolled ? (
                  <Pressable
                    style={[styles.continueBtn, { backgroundColor: colors.primary }]}
                    onPress={() => router.push(`/course/${item.id}`)}
                  >
                    <Text style={[styles.continueBtnText, { color: colors.primaryForeground }]}>
                      Continue
                    </Text>
                    <Feather name="arrow-right" size={14} color={colors.primaryForeground} />
                  </Pressable>
                ) : (
                  <Pressable
                    style={[styles.enrollBtn, { borderColor: colors.primary }]}
                    onPress={() => handleEnroll(item.id)}
                    disabled={enroll.isPending}
                  >
                    <Text style={[styles.enrollBtnText, { color: colors.primary }]}>
                      {enroll.isPending ? "Enrolling..." : "Enroll"}
                    </Text>
                  </Pressable>
                )}
              </View>
            </Pressable>
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
  list: { paddingHorizontal: 16, paddingTop: 8, gap: 12 },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  cardTop: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  courseIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardInfo: { flex: 1, gap: 4 },
  courseTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", lineHeight: 22 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  meta: { fontSize: 12, fontFamily: "Inter_400Regular" },
  desc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  progressSection: { gap: 6 },
  progressHeader: { flexDirection: "row", justifyContent: "space-between" },
  progressLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  progressPct: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  progressBg: { height: 5, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3 },
  cardFooter: { flexDirection: "row", justifyContent: "flex-end" },
  continueBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  continueBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  enrollBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  enrollBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  empty: { alignItems: "center", justifyContent: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center" },
});
