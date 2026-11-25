export const PRELOADER_SESSION_KEY = "hm_preloader_seen";
export const INTRO_EVENT = "hm:intro-complete";

/**
 * Inline <head> script (runs before first paint):
 * - adds `html.js` so JS-only initial states (masked hero words) never hide content for no-JS visitors
 * - decides whether the preloader runs: home page, first visit in this session, no reduced-motion preference
 */
export function getBootScript(): string {
  return `(function(){var r=document.documentElement;r.classList.add("js");var run=false;try{var rm=window.matchMedia("(prefers-reduced-motion: reduce)").matches;var seen=window.sessionStorage.getItem(${JSON.stringify(
    PRELOADER_SESSION_KEY
  )})==="1";run=!rm&&!seen&&location.pathname==="/";}catch(e){run=false;}var m=run?"run":"skip";window.__hmPreload=m;r.setAttribute("data-preload",m);})();`;
}

declare global {
  interface Window {
    __hmIntroDone?: boolean;
    __hmPreload?: "run" | "skip";
  }
}

/**
 * React 19 resets attributes on the <html> singleton during hydration, wiping what the boot
 * script set. Re-apply them (from the global the boot script also wrote) before first paint.
 */
export function restoreBootState(): void {
  if (typeof window === "undefined") return;
  const root = document.documentElement;
  root.classList.add("js");
  if (!window.__hmIntroDone) root.setAttribute("data-preload", window.__hmPreload ?? "skip");
  else root.setAttribute("data-preload", "done");
}

function preloadMode(): string | null {
  return window.__hmPreload ?? document.documentElement.getAttribute("data-preload");
}

/** Resolves once the preloader curtain has lifted (or immediately when it was skipped). */
export function onIntroComplete(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  if (window.__hmIntroDone || preloadMode() !== "run") {
    const id = window.setTimeout(cb, 0);
    return () => window.clearTimeout(id);
  }
  const handler = () => cb();
  window.addEventListener(INTRO_EVENT, handler, { once: true });
  return () => window.removeEventListener(INTRO_EVENT, handler);
}

export function markIntroComplete(): void {
  if (typeof window === "undefined") return;
  window.__hmIntroDone = true;
  document.documentElement.setAttribute("data-preload", "done");
  window.dispatchEvent(new Event(INTRO_EVENT));
}
