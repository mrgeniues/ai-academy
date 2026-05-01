import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getMe,
  login as loginApi,
  setAuthTokenGetter,
  signup as signupApi,
  type User,
} from "@workspace/api-client-react";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

const TOKEN_KEY = "ai_academy_token";

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const applyToken = useCallback((t: string | null) => {
    setToken(t);
    setAuthTokenGetter(t ? () => t : null);
  }, []);

  useEffect(() => {
    async function loadSession() {
      try {
        const stored = await AsyncStorage.getItem(TOKEN_KEY);
        if (stored) {
          setAuthTokenGetter(() => stored);
          const me = await getMe();
          setToken(stored);
          setUser(me);
        }
      } catch {
        await AsyncStorage.removeItem(TOKEN_KEY);
        setAuthTokenGetter(null);
      } finally {
        setIsLoading(false);
      }
    }
    loadSession();
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await loginApi({ email, password });
      await AsyncStorage.setItem(TOKEN_KEY, res.token);
      applyToken(res.token);
      setUser(res.user);
    },
    [applyToken]
  );

  const signup = useCallback(
    async (email: string, password: string, name: string) => {
      const res = await signupApi({ email, password, name });
      await AsyncStorage.setItem(TOKEN_KEY, res.token);
      applyToken(res.token);
      setUser(res.user);
    },
    [applyToken]
  );

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem(TOKEN_KEY);
    applyToken(null);
    setUser(null);
  }, [applyToken]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!token && !!user,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
