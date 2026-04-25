export type Theme = "light" | "dark";

export const THEME_KEY = "tc-theme";
export const DEFAULT_THEME: Theme = "dark";

export function getTheme(): Theme {
  if (typeof window === "undefined") return DEFAULT_THEME;
  const stored = localStorage.getItem(THEME_KEY) as Theme | null;
  if (stored === "light" || stored === "dark") return stored;
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "dark" : "light";
}

export function setTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(THEME_KEY, theme);
}

export function toggleTheme(): Theme {
  const current = document.documentElement.getAttribute("data-theme") as Theme;
  const next: Theme = current === "dark" ? "light" : "dark";
  setTheme(next);
  return next;
}

/* Inline script string: runs before React hydrates to prevent flash */
export const noFlashScript = `(function(){
  var k = "${THEME_KEY}";
  var stored = localStorage.getItem(k);
  var theme = (stored === "light" || stored === "dark")
    ? stored
    : (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  document.documentElement.setAttribute("data-theme", theme);
})();`;
