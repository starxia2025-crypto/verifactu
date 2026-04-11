import { createContext, useContext, useEffect, useState } from "react";

export type SidebarTheme = "azul" | "grafito" | "esmeralda" | "vino" | "ambar";

const STORAGE_KEY = "verifactu_sidebar_theme";

const themes: Record<SidebarTheme, Record<string, string>> = {
  azul: {
    "--sidebar": "216 72% 16%",
    "--sidebar-foreground": "210 40% 98%",
    "--sidebar-border": "215 42% 24%",
    "--sidebar-primary": "38 92% 50%",
    "--sidebar-primary-foreground": "222.2 47.4% 11.2%",
    "--sidebar-accent": "215 52% 23%",
    "--sidebar-accent-foreground": "210 40% 98%",
    "--sidebar-ring": "38 92% 50%",
  },
  grafito: {
    "--sidebar": "220 18% 14%",
    "--sidebar-foreground": "210 30% 96%",
    "--sidebar-border": "220 14% 24%",
    "--sidebar-primary": "210 30% 96%",
    "--sidebar-primary-foreground": "220 18% 14%",
    "--sidebar-accent": "220 14% 22%",
    "--sidebar-accent-foreground": "210 30% 96%",
    "--sidebar-ring": "210 30% 86%",
  },
  esmeralda: {
    "--sidebar": "164 64% 13%",
    "--sidebar-foreground": "160 30% 96%",
    "--sidebar-border": "163 45% 22%",
    "--sidebar-primary": "43 96% 56%",
    "--sidebar-primary-foreground": "164 64% 13%",
    "--sidebar-accent": "164 48% 20%",
    "--sidebar-accent-foreground": "160 30% 96%",
    "--sidebar-ring": "43 96% 56%",
  },
  vino: {
    "--sidebar": "345 48% 18%",
    "--sidebar-foreground": "330 38% 97%",
    "--sidebar-border": "345 36% 28%",
    "--sidebar-primary": "38 92% 56%",
    "--sidebar-primary-foreground": "345 48% 18%",
    "--sidebar-accent": "345 38% 26%",
    "--sidebar-accent-foreground": "330 38% 97%",
    "--sidebar-ring": "38 92% 56%",
  },
  ambar: {
    "--sidebar": "36 88% 19%",
    "--sidebar-foreground": "42 45% 96%",
    "--sidebar-border": "36 70% 28%",
    "--sidebar-primary": "213 100% 34%",
    "--sidebar-primary-foreground": "210 40% 98%",
    "--sidebar-accent": "36 68% 27%",
    "--sidebar-accent-foreground": "42 45% 96%",
    "--sidebar-ring": "213 100% 34%",
  },
};

interface SidebarThemeContextValue {
  theme: SidebarTheme;
  setTheme: (theme: SidebarTheme) => void;
  themes: SidebarTheme[];
}

const SidebarThemeContext = createContext<SidebarThemeContextValue | undefined>(undefined);

function getInitialTheme(): SidebarTheme {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved && saved in themes ? (saved as SidebarTheme) : "azul";
}

function applyTheme(theme: SidebarTheme) {
  const root = document.documentElement;
  Object.entries(themes[theme]).forEach(([name, value]) => {
    root.style.setProperty(name, value);
  });
}

export function SidebarThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<SidebarTheme>(getInitialTheme);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, theme);
    applyTheme(theme);
  }, [theme]);

  const setTheme = (nextTheme: SidebarTheme) => setThemeState(nextTheme);

  return (
    <SidebarThemeContext.Provider value={{ theme, setTheme, themes: Object.keys(themes) as SidebarTheme[] }}>
      {children}
    </SidebarThemeContext.Provider>
  );
}

export function useSidebarTheme() {
  const context = useContext(SidebarThemeContext);
  if (!context) {
    throw new Error("useSidebarTheme must be used within SidebarThemeProvider");
  }
  return context;
}
