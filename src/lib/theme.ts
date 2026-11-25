export type ThemeMode = "dark" | "light";

export const THEME_STORAGE_KEY = "hm-portfolio-theme";
export const DEFAULT_THEME: ThemeMode = "dark";

export function parseThemeMode(value: unknown): ThemeMode | null {
  if (value === "dark" || value === "light") {
    return value;
  }
  return null;
}

export function resolveInitialTheme(options: {
  storedTheme?: unknown;
  systemPrefersLight?: boolean;
}): ThemeMode {
  const parsed = parseThemeMode(options.storedTheme);
  if (parsed) return parsed;
  if (options.systemPrefersLight) return "light";
  return DEFAULT_THEME;
}

export function getNextTheme(current: ThemeMode): ThemeMode {
  return current === "dark" ? "light" : "dark";
}

export function getContrastBandTheme(rootTheme: ThemeMode): ThemeMode {
  return rootTheme === "dark" ? "light" : "dark";
}

export function applyThemeToDocument(theme: ThemeMode, root?: HTMLElement | null): void {
  const target = root ?? (typeof document !== "undefined" ? document.documentElement : null);
  if (!target) return;
  target.setAttribute("data-theme", theme);
  target.classList.toggle("dark", theme === "dark");
  target.style.colorScheme = theme;
}

export function getThemeInitScript(): string {
  return `(function(){try{var k=${JSON.stringify(
    THEME_STORAGE_KEY
  )};var s=window.localStorage.getItem(k);var t=(s==="dark"||s==="light")?s:"dark";var r=document.documentElement;r.setAttribute("data-theme",t);r.classList.toggle("dark",t==="dark");r.style.colorScheme=t;}catch(e){}})();`;
}
