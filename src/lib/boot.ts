/**
 * Inline <head> script (runs before first paint): adds `html.js` so JS-only initial states
 * (masked section-heading words) never hide content for visitors without JavaScript.
 * There is no preloader — the hero is the first paint.
 */
export function getBootScript(): string {
  return `document.documentElement.classList.add("js");`;
}

/**
 * React 19 resets attributes on the <html> singleton during hydration, wiping what the boot
 * script set. Re-apply them before first paint.
 */
export function restoreBootState(): void {
  if (typeof window === "undefined") return;
  document.documentElement.classList.add("js");
}
