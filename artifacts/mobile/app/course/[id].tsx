import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import {
  useEnrollInCourse,
  useGetCourse,
  useListMyEnrollments,
  useUpdateProgress,
  type Lesson,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import React from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

export default function CourseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const courseId = Number(id);
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  const { data: course, isLoading } = useGetCourse(courseId);
  const { data: enrollments } = useListMyEnrollments();
  const enroll = useEnrollInCourse({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ["/api/enrollments"] });
        qc.invalidateQueries({ queryKey: [`/api/courses/${courseId}`] });
      },
    },
  });
  const updateProgress = useUpdateProgress({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ["/api/enrollments"] });
      },
    },
  });

  const enrollment = (enrollments ?? []).find((e) => e.courseId === courseId);
  const isEnrolled = !!enrollment;

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!course) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.mutedForeground }]}>Course not found.</Text>
      </View>
    );
  }

  function handleLessonPress(lesson: Lesson) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isEnrolled) {
      router.push(`/lesson/${lesson.id}?courseId=${courseId}`);
    }
  }

  async function handleEnroll() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    enroll.mutate({ data: { courseId } });
  }

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 16);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>
          {course.title}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: botPad + 80 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.courseIcon, { backgroundColor: colors.accent }]}>
            <Feather name="book-open" size={36} color={colors.primary} />
          </View>
          <Text style={[styles.courseTitle, { color: colors.foreground }]}>{course.title}</Text>
          {course.description ? (
            <Text style={[styles.courseDesc, { color: colors.mutedForeground }]}>{course.description}</Text>
          ) : null}
          <View style={styles.metaRow}>
            <View style={styles.metaChip}>
              <Feather name="layers" size={13} color={colors.mutedForeground} />
              <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                {course.lessonCount} lessons
              </Text>
            </View>
            <View style={styles.metaChip}>
              <Feather name="users" size={13} color={colors.mutedForeground} />
              <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                {course.enrollmentCount} enrolled
              </Text>
            </View>
          </View>

          {isEnrolled && enrollment ? (
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={[styles.progressLabel, { color: colors.mutedForeground }]}>Your Progress</Text>
                <Text style={[styles.progressPct, { color: colors.primary }]}>{enrollment.progress}%</Text>
              </View>
              <View style={[styles.progressBg, { backgroundColor: colors.muted }]}>
                <View
                  style={[styles.progressFill, { backgroundColor: colors.primary, width: `${enrollment.progress}%` }]}
                />
              </View>
            </View>
          ) : null}

          {!isEnrolled && (
            <Pressable
              style={({ pressed }) => [
                styles.enrollBtn,
                { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
              ]}
              onPress={handleEnroll}
              disabled={enroll.isPending}
            >
              {enroll.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.enrollBtnText}>Enroll in Course</Text>
              )}
            </Pressable>
          )}
        </View>

        <Text style={[styles.lessonsHeading, { color: colors.foreground }]}>
          Lessons ({course.lessons.length})
        </Text>

        {course.lessons.map((lesson, idx) => (
          <Pressable
            key={lesson.id}
            style={({ pressed }) => [
              styles.lessonRow,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                opacity: pressed && isEnrolled ? 0.85 : 1,
              },
            ]}
            onPress={() => handleLessonPress(lesson)}
            disabled={!isEnrolled}
          >
            <View
              style={[
                styles.lessonNum,
                { backgroundColor: isEnrolled ? colors.primary : colors.muted },
              ]}
            >
              <Text style={[styles.lessonNumText, { color: isEnrolled ? "#fff" : colors.mutedForeground }]}>
                {idx + 1}
              </Text>
            </View>
            <View style={styles.lessonInfo}>
              <Text
                style={[
                  styles.lessonTitle,
                  { color: isEnrolled ? colors.foreground : colors.mutedForeground },
                ]}
                numberOfLines={2}
              >
                {lesson.title}
              </Text>
            </View>
            {isEnrolled ? (
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            ) : (
              <Feather name="lock" size={14} color={colors.mutedForeground} />
            )}
          </Pressable>
        ))}

        {course.lessons.length === 0 && (
          <View style={styles.emptyLessons}>
            <Feather name="inbox" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No lessons yet
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  errorText: { fontSize: 15 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  backBtn: { width: 40, height: 40, justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 17, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  scroll: { paddingHorizontal: 16, paddingTop: 8, gap: 12 },
  heroCard: { borderRadius: 16, borderWidth: 1, padding: 20, gap: 12, alignItems: "center" },
  courseIcon: {
    width: 72,
    height: 72,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  courseTitle: { fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center" },
  courseDesc: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 21, textAlign: "center" },
  metaRow: { flexDirection: "row", gap: 12 },
  metaChip: { flexDirection: "row", alignItems: "center", gap: 5 },
  metaText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  progressSection: { width: "100%", gap: 6 },
  progressHeader: { flexDirection: "row", justifyContent: "space-between" },
  progressLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  progressPct: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  progressBg: { height: 6, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3 },
  enrollBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: "center",
    width: "100%",
  },
  enrollBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#fff" },
  lessonsHeading: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    marginTop: 4,
    marginBottom: 4,
  },
  lessonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  lessonNum: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  lessonNumText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  lessonInfo: { flex: 1 },
  lessonTitle: { fontSize: 14, fontFamily: "Inter_500Medium", lineHeight: 20 },
  emptyLessons: { alignItems: "center", paddingTop: 32, gap: 10 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
