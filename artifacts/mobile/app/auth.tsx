import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function AuthScreen() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const [tab, setTab] = useState<"signin" | "signup">(mode === "signin" ? "signin" : "signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { login, signup } = useAuth();

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const nameRef = useRef<TextInput>(null);

  async function handleSubmit() {
    setError(null);
    if (!email.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }
    if (tab === "signup" && !name.trim()) {
      setError("Please enter your name.");
      return;
    }
    setLoading(true);
    try {
      if (tab === "signin") {
        await login(email.trim(), password);
      } else {
        await signup(email.trim(), password, name.trim());
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)");
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : "Something went wrong. Please try again.";
      setError(msg.includes("401") ? "Invalid email or password." : msg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  }

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  return (
    <LinearGradient colors={["#0c1220", "#0f1830"]} style={styles.bg}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: topPad + 20, paddingBottom: botPad + 20 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable
            style={[styles.backBtn, { marginBottom: 24 }]}
            onPress={() => router.back()}
          >
            <Feather name="arrow-left" size={22} color="rgba(255,255,255,0.7)" />
          </Pressable>

          <Text style={styles.headline}>
            {tab === "signin" ? "Welcome back" : "Join AI Academy"}
          </Text>
          <Text style={styles.subheadline}>
            {tab === "signin"
              ? "Sign in to continue your learning journey."
              : "Create your account and start learning today."}
          </Text>

          <View style={[styles.tabRow, { borderColor: "rgba(255,255,255,0.1)" }]}>
            {(["signin", "signup"] as const).map((t) => (
              <Pressable
                key={t}
                style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
                onPress={() => {
                  setTab(t);
                  setError(null);
                }}
              >
                <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                  {t === "signin" ? "Sign In" : "Sign Up"}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.form}>
            {tab === "signup" && (
              <View style={styles.inputWrap}>
                <Feather name="user" size={18} color="rgba(255,255,255,0.4)" style={styles.inputIcon} />
                <TextInput
                  ref={nameRef}
                  style={styles.input}
                  placeholder="Full name"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  returnKeyType="next"
                  onSubmitEditing={() => emailRef.current?.focus()}
                />
              </View>
            )}

            <View style={styles.inputWrap}>
              <Feather name="mail" size={18} color="rgba(255,255,255,0.4)" style={styles.inputIcon} />
              <TextInput
                ref={emailRef}
                style={styles.input}
                placeholder="Email address"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
              />
            </View>

            <View style={styles.inputWrap}>
              <Feather name="lock" size={18} color="rgba(255,255,255,0.4)" style={styles.inputIcon} />
              <TextInput
                ref={passwordRef}
                style={[styles.input, { flex: 1 }]}
                placeholder="Password"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPass}
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />
              <Pressable onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}>
                <Feather
                  name={showPass ? "eye-off" : "eye"}
                  size={18}
                  color="rgba(255,255,255,0.4)"
                />
              </Pressable>
            </View>

            {error ? (
              <View style={styles.errorBanner}>
                <Feather name="alert-circle" size={14} color="#ef4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Pressable
              style={({ pressed }) => [styles.submitWrap, pressed && { opacity: 0.85 }]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <LinearGradient
                colors={["#a87ff5", "#7c3aed"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.submitBtn}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitText}>
                    {tab === "signin" ? "Sign In" : "Create Account"}
                  </Text>
                )}
              </LinearGradient>
            </Pressable>

            {tab === "signup" && (
              <Text style={styles.terms}>
                By creating an account you agree to our Terms of Service.
              </Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 24, flexGrow: 1 },
  backBtn: { width: 40, height: 40, justifyContent: "center" },
  headline: {
    fontSize: 30,
    fontFamily: "Inter_700Bold",
    color: "#ffffff",
    marginBottom: 8,
  },
  subheadline: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.5)",
    marginBottom: 28,
    lineHeight: 22,
  },
  tabRow: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 28,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "transparent",
  },
  tabBtnActive: {
    backgroundColor: "#895bf5",
  },
  tabText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.5)",
  },
  tabTextActive: {
    color: "#ffffff",
  },
  form: { gap: 12 },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 14,
    height: 52,
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#ffffff",
    height: "100%",
  },
  eyeBtn: { padding: 4 },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(239,68,68,0.1)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.3)",
  },
  errorText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#ef4444",
    flex: 1,
  },
  submitWrap: { borderRadius: 14, overflow: "hidden", marginTop: 8 },
  submitBtn: { paddingVertical: 16, alignItems: "center" },
  submitText: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: "#ffffff",
  },
  terms: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.3)",
    textAlign: "center",
    lineHeight: 18,
  },
});
