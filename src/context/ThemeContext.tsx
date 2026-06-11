import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type ThemeMode = "light" | "dark" | "system";

interface ThemeContextValue {
  mode: ThemeMode;
  resolvedMode: "light" | "dark";
  primaryColor: string;
  setMode: (mode: ThemeMode) => void;
  setPrimaryColor: (color: string) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);
const DEFAULT_PRIMARY = "#006c4c";

function getSystemMode(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function hexToRgb(hex: string) {
  const value = hex.replace("#", "");
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}

function mixColor(color: string, target: string, amount: number) {
  const sourceRgb = hexToRgb(color);
  const targetRgb = hexToRgb(target);
  const channel = (source: number, next: number) =>
    Math.round(source + (next - source) * amount)
      .toString(16)
      .padStart(2, "0");

  return `#${channel(sourceRgb.r, targetRgb.r)}${channel(
    sourceRgb.g,
    targetRgb.g
  )}${channel(sourceRgb.b, targetRgb.b)}`;
}

function getContrastColor(color: string) {
  const { r, g, b } = hexToRgb(color);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.58 ? "#10201a" : "#ffffff";
}

function getThemeVariables(primary: string, dark: boolean) {
  if (dark) {
    const darkPrimary = mixColor(primary, "#ffffff", 0.62);
    return {
      "--md-primary": darkPrimary,
      "--md-on-primary": mixColor(primary, "#000000", 0.72),
      "--md-primary-container": mixColor(primary, "#000000", 0.42),
      "--md-on-primary-container": mixColor(primary, "#ffffff", 0.82),
      "--md-secondary-container": mixColor(primary, "#252d2a", 0.7),
      "--md-on-secondary-container": "#d8e7df",
      "--md-surface": "#111412",
      "--md-surface-dim": "#0c0f0d",
      "--md-surface-container-low": "#191c1a",
      "--md-surface-container": "#1d211e",
      "--md-surface-container-high": "#272b28",
      "--md-surface-container-highest": "#323633",
      "--md-on-surface": "#e1e4e1",
      "--md-on-surface-variant": "#c0c9c3",
      "--md-outline": "#89928c",
      "--md-outline-variant": "#404943",
      "--md-inverse-surface": "#e1e4e1",
      "--md-inverse-on-surface": "#2d312e",
      "--md-error": "#ffb4ab",
      "--md-error-container": "#93000a",
      "--md-on-error-container": "#ffdad6",
      "--md-shadow": "rgba(0, 0, 0, 0.5)",
    };
  }

  return {
    "--md-primary": primary,
    "--md-on-primary": getContrastColor(primary),
    "--md-primary-container": mixColor(primary, "#ffffff", 0.82),
    "--md-on-primary-container": mixColor(primary, "#000000", 0.58),
    "--md-secondary-container": mixColor(primary, "#eef4ef", 0.82),
    "--md-on-secondary-container": mixColor(primary, "#000000", 0.62),
    "--md-surface": "#fbfdf9",
    "--md-surface-dim": "#d9dbd7",
    "--md-surface-container-low": "#f3f5f1",
    "--md-surface-container": "#edefe9",
    "--md-surface-container-high": "#e7e9e4",
    "--md-surface-container-highest": "#e1e3de",
    "--md-on-surface": "#191c1a",
    "--md-on-surface-variant": "#404943",
    "--md-outline": "#707973",
    "--md-outline-variant": "#c0c9c2",
    "--md-inverse-surface": "#2e312f",
    "--md-inverse-on-surface": "#f0f2ed",
    "--md-error": "#ba1a1a",
    "--md-error-container": "#ffdad6",
    "--md-on-error-container": "#410002",
    "--md-shadow": "rgba(25, 28, 26, 0.16)",
  };
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    return (localStorage.getItem("clipbridge-theme-mode") as ThemeMode) || "system";
  });
  const [primaryColor, setPrimaryColorState] = useState(
    () => localStorage.getItem("clipbridge-primary-color") || DEFAULT_PRIMARY
  );
  const [systemMode, setSystemMode] = useState(getSystemMode);
  const resolvedMode = mode === "system" ? systemMode : mode;

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => setSystemMode(media.matches ? "dark" : "light");
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === "clipbridge-theme-mode" && event.newValue) {
        setModeState(event.newValue as ThemeMode);
      }
      if (event.key === "clipbridge-primary-color" && event.newValue) {
        setPrimaryColorState(event.newValue);
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = resolvedMode;
    root.style.colorScheme = resolvedMode;
    Object.entries(getThemeVariables(primaryColor, resolvedMode === "dark")).forEach(
      ([property, value]) => root.style.setProperty(property, value)
    );
  }, [primaryColor, resolvedMode]);

  const value = useMemo(
    () => ({
      mode,
      resolvedMode,
      primaryColor,
      setMode(nextMode: ThemeMode) {
        localStorage.setItem("clipbridge-theme-mode", nextMode);
        setModeState(nextMode);
      },
      setPrimaryColor(color: string) {
        localStorage.setItem("clipbridge-primary-color", color);
        setPrimaryColorState(color);
      },
    }),
    [mode, primaryColor, resolvedMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
