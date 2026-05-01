import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  useGetDashboardStats,
  useListCourses,
  useListMyEnrollments,
} from "@workspace/api-client-react";
import React from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  value: string | number;
  accent?: string;
}) {
  const colors = useColors();
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.statIcon, { backgroundColor: colors.accent }]}>
        <Feather name={icon} size={18} color={accent ?? colors.primary} />
      </View>
      <Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useGetDashboardStats();
  const { data: enrollments, isLoading: enrollLoading, refetch: refetchEnroll } = useListMyEnrollments();
  const { data: courses } = useListCourses();

  const isLoading = statsLoading || enrollLoading;
  const myEnrollments = enrollments ?? [];
  const allCourses = courses ?? [];

  const inProgressCourses = myEnrollments
    .filter((e) => e.progress > 0 && e.progress < 100)
    .slice(0, 3);
  const notStartedCourses = myEnrollments
    .filter((e) => e.progress === 0)
    .slice(0, 2);
  const suggestedCourses = allCourses
    .filter((c) => !myEnrollments.some((e) => e.courseId === c.id))
    .slice(0, 3);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === "web" ? 84 : 80);

  function onRefresh() {
    refetchStats();
    refetchEnroll();
  }

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const firstName = (user?.name ?? "").split(" ")[0] || "Learner";

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.container, { paddingTop: topPad + 16, paddingBottom: botPad }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={false} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      <View style={styles.greeting}>
        <Text style={[styles.greetSmall, { color: colors.mutedForeground }]}>
          Welcome back,
        </Text>
        <Text style={[styles.greetName, { color: colors.foreground }]}>{firstName}</Text>
      </View>

      <View style={styles.statsRow}>
        <StatCard icon="book-open" label="Enrolled" value={myEnrollments.length} />
        <StatCard
          icon="check-circle"
          label="Completed"
          value={myEnrollments.filter((e) => e.progress >= 100).length}
          accent="#22c55e"
        />
        <StatCard
          icon="activity"
          label="In Progress"
          value={inProgressCourses.length}
          accent="#f59e0b"
        />
      </View>

      {inProgressCourses.length > 0 && (
        <View>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Continue Learning</Text>
          <View style={styles.courseList}>
            {inProgressCourses.map((enrollment) => {
              const course = allCourses.find((c) => c.id === enrollment.courseId);
              if (!course) return null;
              return (
                <Pressable
                  key={enrollment.id}
                  style={({ pressed }) => [
                    styles.courseCard,
                    { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.9 : 1 },
                  ]}
                  onPress={() => router.push(`/course/${course.id}`)}
                >
                  <View style={[styles.courseCardIcon, { backgroundColor: colors.accent }]}>
                    <Feather name="book-open" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.courseCardContent}>
                    <Text style={[styles.courseCardTitle, { color: colors.foreground }]} numberOfLines={1}>
                      {course.title}
                    </Text>
                    <View style={styles.progressRow}>
                      <View style={[styles.progressBg, { backgroundColor: colors.muted, flex: 1 }]}>
                        <View
                          style={[
                            styles.progressFill,
                            { backgroundColor: colors.primary, width: `${enrollment.progress}%` },
                          ]}
                        />
                      </View>
                      <Text style={[styles.progressText, { color: colors.primary }]}>
                        {enrollment.progress}%
                      </Text>
                    </View>
                  </View>
                  <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {suggestedCourses.length > 0 && (
        <View>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Discover Courses</Text>
            <Pressable onPress={() => router.push("/(tabs)/courses")}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
            </Pressable>
          </View>
          <View style={styles.courseList}>
            {suggestedCourses.map((course) => (
              <Pressable
                key={course.id}
                style={({ pressed }) => [
                  styles.courseCard,
                  { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.9 : 1 },
                ]}
                onPress={() => router.push(`/course/${course.id}`)}
              >
                <View style={[styles.courseCardIcon, { backgroundColor: colors.accent }]}>
                  <Feather name="book" size={20} color={colors.primary} />
                </View>
                <View style={styles.courseCardContent}>
                  <Text style={[styles.courseCardTitle, { color: colors.foreground }]} numberOfLines={1}>
                    {course.title}
                  </Text>
                  <Text style={[styles.courseCardMeta, { color: colors.mutedForeground }]}>
                    {course.lessonCount} lessons · {course.enrollmentCount} enrolled
                  </Text>
                </View>
                <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {myEnrollments.length === 0 && suggestedCourses.length === 0 && (
        <View style={styles.emptyState}>
          <Feather name="compass" size={48} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Start your journey</Text>
          <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
            Explore courses and enroll to begin learning.
          </Text>
          <Pressable
            style={[styles.exploreBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/(tabs)/courses")}
          >
            <Text style={[styles.exploreBtnText, { color: colors.primaryForeground }]}>
              Browse Courses
            </Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, gap: 20 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  greeting: { gap: 2 },
  greetSmall: { fontSize: 14, fontFamily: "Inter_400Regular" },
  greetName: { fontSize: 26, fontFamily: "Inter_700Bold" },
  statsRow: { flexDirection: "row", gap: 10 },
  statCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    alignItems: "center",
    gap: 6,
  },
  statIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: { fontSize: 22, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  sectionTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", marginBottom: 10 },
  seeAll: { fontSize: 14, fontFamily: "Inter_500Medium" },
  courseList: { gap: 8 },
  courseCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  courseCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  courseCardContent: { flex: 1, gap: 6 },
  courseCardTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  courseCardMeta: { fontSize: 12, fontFamily: "Inter_400Regular" },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  progressBg: { height: 4, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 2 },
  progressText: { fontSize: 11, fontFamily: "Inter_600SemiBold", minWidth: 32 },
  emptyState: { alignItems: "center", paddingVertical: 40, gap: 12 },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_600SemiBold" },
  emptyDesc: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 21 },
  exploreBtn: { borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginTop: 8 },
  exploreBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
