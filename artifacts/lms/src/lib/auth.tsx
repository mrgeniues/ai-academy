// @refresh reset
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { useGetMe } from "@workspace/api-client-react";
import type { User } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { useTheme, type Theme } from "@/lib/theme";
import { useHeartbeat } from "@/hooks/use-heartbeat";

interface AuthContextType {
  user: User | null | undefined;
  token: string | null;
  isLoading: boolean;
  isCommunityMember: boolean;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("lms_token"));
  const [isCommunityMember, setIsCommunityMember] = useState<boolean>(
    () => localStorage.getItem("lms_join_source") === "community"
  );
  const [, setLocation] = useLocation();
  const { setTheme } = useTheme();
  const lastAppliedTheme = useRef<string | null>(null);

  const { data: user, isLoading: isUserLoading } = useGetMe({
    query: {
      enabled: !!token,
      retry: false,
    },
  });

  const isLoading = isUserLoading && !!token;

  useHeartbeat(token);

  useEffect(() => {
    if (user?.theme && user.theme !== lastAppliedTheme.current) {
      lastAppliedTheme.current = user.theme;
      setTheme(user.theme as Theme);
    }
  }, [user?.theme]);

  const login = (newToken: string) => {
    localStorage.setItem("lms_token", newToken);
    setAuthTokenGetter(() => newToken);
    setToken(newToken);
    const isCM = localStorage.getItem("lms_join_source") === "community";
    setIsCommunityMember(isCM);
    setLocation(isCM ? "/communities" : "/dashboard");
  };

  const logout = () => {
    localStorage.removeItem("lms_token");
    setAuthTokenGetter(null);
    setToken(null);
    lastAppliedTheme.current = null;
    // preserve lms_join_source so community member status survives logout/re-login
    setLocation("/login");
  };

  useEffect(() => {
    if (token) {
      setAuthTokenGetter(() => token);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, isCommunityMember, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
