import React, { createContext, useContext, useEffect, useState } from "react";

export type Theme = "light" | "dark" | "purple";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function applyThemeClass(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove("dark", "purple");
  if (theme === "dark") root.classList.add("dark");
  if (theme === "purple") root.classList.add("purple");
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem("lms_theme") as Theme | null;
    return stored === "dark" || stored === "purple" ? stored : "light";
  });

  useEffect(() => {
    applyThemeClass(theme);
    localStorage.setItem("lms_theme", theme);
  }, [theme]);

  const setTheme = (t: Theme) => {
    setThemeState(t);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
