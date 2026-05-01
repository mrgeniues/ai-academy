import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useGetCourse } from "@workspace/api-client-react";

export default function LessonScreen() {
  const { id, courseId } = useLocalSearchParams<{ id: string; courseId: string }>();
  const lessonId = Number(id);
  const cId = Number(courseId);
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const { data: course } = useGetCourse(cId, { query: { enabled: !!cId } });
  const lesson = course?.lessons?.find((l) => l.id === lessonId);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 16);

  function openVideo() {
    if (lesson?.videoUrl) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Linking.openURL(lesson.videoUrl);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>
          {lesson?.title ?? "Lesson"}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: botPad + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {lesson?.videoUrl ? (
          <Pressable
            style={({ pressed }) => [
              styles.videoCard,
              { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={openVideo}
          >
            <View style={[styles.videoPlay, { backgroundColor: colors.primary }]}>
              <Feather name="play" size={28} color="#fff" />
            </View>
            <Text style={[styles.videoLabel, { color: colors.foreground }]}>Watch Video</Text>
            <Text style={[styles.videoSub, { color: colors.mutedForeground }]}>
              Opens in browser
            </Text>
          </Pressable>
        ) : null}

        {lesson ? (
          <View style={[styles.contentCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.contentHeader}>
              <View style={[styles.lessonIcon, { backgroundColor: colors.accent }]}>
                <Feather name="file-text" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.lessonTitle, { color: colors.foreground }]}>{lesson.title}</Text>
                <Text style={[styles.lessonMeta, { color: colors.mutedForeground }]}>
                  Lesson {(course?.lessons?.findIndex((l) => l.id === lessonId) ?? 0) + 1}
                </Text>
              </View>
            </View>

            {lesson.content ? (
              <>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <Text style={[styles.lessonContent, { color: colors.foreground }]}>
                  {lesson.content}
                </Text>
              </>
            ) : (
              <View style={styles.noContent}>
                <Feather name="file" size={32} color={colors.mutedForeground} />
                <Text style={[styles.noContentText, { color: colors.mutedForeground }]}>
                  No written content for this lesson.
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.noContent}>
            <Text style={[styles.noContentText, { color: colors.mutedForeground }]}>
              Lesson not found.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  backBtn: { width: 40, height: 40, justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 17, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  scroll: { paddingHorizontal: 16, paddingTop: 8, gap: 16 },
  videoCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    gap: 12,
  },
  videoPlay: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  videoLabel: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  videoSub: { fontSize: 13, fontFamily: "Inter_400Regular" },
  contentCard: { borderRadius: 16, borderWidth: 1, padding: 20, gap: 16 },
  contentHeader: { flexDirection: "row", gap: 12, alignItems: "center" },
  lessonIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  lessonTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  lessonMeta: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  divider: { height: 1 },
  lessonContent: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 24 },
  noContent: { alignItems: "center", paddingVertical: 32, gap: 12 },
  noContentText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
});
