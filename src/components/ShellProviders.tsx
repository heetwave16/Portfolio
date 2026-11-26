"use client";

import React, { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type Lenis from "lenis";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useMotionBisect } from "@/hooks/use-motion-bisect";
import { getAnchorTargetY } from "@/src/lib/keyboard";
import {
  createBezierEase,
  getMotionTokens,
  MOTION_BISECT_GROUPS,
} from "@/src/lib/motion";
import {
  applyThemeToDocument,
  DEFAULT_THEME,
  getContrastBandTheme,
  getNextTheme,
  parseThemeMode,
  THEME_STORAGE_KEY,
  type ThemeMode,
} from "@/src/lib/theme";
import { restoreBootState } from "@/src/lib/boot";
import ScrollProgressIndicator from "./ScrollProgressIndicator";


interface ScrollToAnchorOptions {
  focusTarget?: boolean;
  updateHistory?: boolean;
}

interface LenisScrollContextValue {
  scrollToAnchor: (hash: string, options?: ScrollToAnchorOptions) => boolean;
  scrollToTop: () => void;
}

const LenisScrollContext = createContext<LenisScrollContextValue>({
  scrollToAnchor: () => false,
  scrollToTop: () => {},
});

export function useLenisScroll() {
  return useContext(LenisScrollContext);
}

interface ThemeContextValue {
  theme: ThemeMode;
  contrastTheme: ThemeMode;
  setTheme: (next: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: DEFAULT_THEME,
  contrastTheme: getContrastBandTheme(DEFAULT_THEME),
  setTheme: () => {},
  toggleTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

function getNavHeightPx(): number {
  if (typeof window === "undefined") return 64;
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--nav-height").trim();
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 64;
}

export default function ShellProviders({ children }: { children: React.ReactNode }) {
  const progressTrackRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const lenisRef = useRef<Lenis | null>(null);
  const [theme, setThemeState] = useState<ThemeMode>(DEFAULT_THEME);
  const reducedMotion = useReducedMotion();
  const bisect = useMotionBisect();
  const lenisDisabled = reducedMotion || bisect.lenis;
  const scrollProgressDisabled = bisect.scrollProgress;
  const wipeDisabled = reducedMotion || bisect.wipe;
  const revealsDisabled = reducedMotion || bisect.reveals;

  // Enables the CSS reveal start-states only once JS is alive (no-JS visitors always see content).
  useLayoutEffect(() => {
    restoreBootState();
  }, []);

  useEffect(() => {
    document.documentElement.classList.add("motion-ready");
  }, []);

  useEffect(() => {
    let initial: ThemeMode = DEFAULT_THEME;
    try {
      const stored = parseThemeMode(window.localStorage.getItem(THEME_STORAGE_KEY));
      const attr = parseThemeMode(document.documentElement.getAttribute("data-theme"));
      initial = stored ?? attr ?? DEFAULT_THEME;
    } catch {
      initial = DEFAULT_THEME;
    }
    applyThemeToDocument(initial);
    const id = setTimeout(() => setThemeState(initial), 0);
    return () => clearTimeout(id);
  }, []);

  const setTheme = useCallback((next: ThemeMode) => {
    setThemeState(next);
    applyThemeToDocument(next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Ignore storage restrictions
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = getNextTheme(prev);
      applyThemeToDocument(next);
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        // Ignore storage restrictions
      }
      return next;
    });
  }, []);

  const themeContextValue = useMemo<ThemeContextValue>(
    () => ({
      theme,
      contrastTheme: getContrastBandTheme(theme),
      setTheme,
      toggleTheme,
    }),
    [theme, setTheme, toggleTheme]
  );

  const scrollToAnchor = useCallback(
    (hash: string, options: ScrollToAnchorOptions = {}): boolean => {
      if (typeof window === "undefined" || !hash || !hash.startsWith("#")) return false;
      const { focusTarget = true, updateHistory = true } = options;

      const isTop = hash === "#" || hash === "#top";
      const targetId = isTop ? "top" : hash.slice(1);
      const targetEl = document.getElementById(targetId);

      if (!isTop && !targetEl) return false;

      if (updateHistory && window.location.hash !== hash) {
        try {
          window.history.pushState(null, "", hash);
        } catch {
          // Ignore restricted history state
        }
      }

      const navHeight = getNavHeightPx();
      const activeLenis = lenisRef.current;
      // Absolute landing Y from the live rect + real window.scrollY (header height + 16px gap).
      const computeTargetY = () =>
        isTop || !targetEl
          ? 0
          : getAnchorTargetY(
              hash,
              targetEl.getBoundingClientRect().top,
              window.scrollY,
              navHeight,
              document.documentElement.scrollHeight - window.innerHeight
            );

      if (activeLenis && !lenisDisabled) {
        const tokens = getMotionTokens();
        // Resync Lenis with the real scroll position first (native/touch scrolls can leave it stale).
        activeLenis.scrollTo(window.scrollY, { immediate: true, force: true });
        activeLenis.scrollTo(computeTargetY(), {
          duration: tokens.scrollSec,
          easing: createBezierEase(tokens.easeUi),
          force: true,
          onComplete: () => {
            // If anything above the target changed height mid-flight, snap to the exact spot.
            const corrected = computeTargetY();
            if (Math.abs(corrected - window.scrollY) > 2) {
              activeLenis.scrollTo(corrected, { immediate: true, force: true });
            }
          },
        });
      } else {
        window.scrollTo({ top: computeTargetY(), behavior: "instant" as ScrollBehavior });
      }

      if (focusTarget && targetEl) {
        targetEl.focus({ preventScroll: true });
      }

      return true;
    },
    [lenisDisabled]
  );

  const scrollToTop = useCallback(() => {
    scrollToAnchor("#top", { focusTarget: true, updateHistory: true });
  }, [scrollToAnchor]);

  const scrollContextValue = useMemo(
    () => ({ scrollToAnchor, scrollToTop }),
    [scrollToAnchor, scrollToTop]
  );

  // Deep link (e.g. /#projects): once layout has settled, land the section below the header.
  useEffect(() => {
    if (!window.location.hash || window.location.hash === "#top") return;
    const id = window.setTimeout(() => {
      const el = document.getElementById(window.location.hash.slice(1));
      if (!el) return;
      const y = getAnchorTargetY(
        window.location.hash,
        el.getBoundingClientRect().top,
        window.scrollY,
        getNavHeightPx(),
        document.documentElement.scrollHeight - window.innerHeight
      );
      if (Math.abs(y - window.scrollY) > 2) {
        if (lenisRef.current) lenisRef.current.scrollTo(y, { immediate: true, force: true });
        else window.scrollTo({ top: y, behavior: "instant" as ScrollBehavior });
      }
    }, 120);
    return () => window.clearTimeout(id);
  }, []);

  // Delegated smooth anchor click + browser hashchange navigation via Lenis
  useEffect(() => {
    const onDocumentClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest<HTMLAnchorElement>("a[href^='#']");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || !href.startsWith("#")) return;
      if (scrollToAnchor(href, { focusTarget: true, updateHistory: true })) {
        e.preventDefault();
      }
    };

    const onHashChange = () => {
      if (window.location.hash) {
        scrollToAnchor(window.location.hash, { focusTarget: true, updateHistory: false });
      }
    };

    document.addEventListener("click", onDocumentClick);
    window.addEventListener("hashchange", onHashChange);
    return () => {
      document.removeEventListener("click", onDocumentClick);
      window.removeEventListener("hashchange", onHashChange);
    };
  }, [scrollToAnchor]);

  // Keep the larger scroll engines out of the initial transfer until the visitor scrolls.
  useEffect(() => {
    let active = true;
    let motionStarted = false;
    let cleanupMotion: (() => void) | null = null;

    const startMotion = async () => {
      try {
        const { initializeShellMotion } = await import("@/src/lib/shell-motion-client");
        if (!active) return;
        cleanupMotion = initializeShellMotion({
          progressTrackRef,
          progressRef,
          lenisRef,
          lenisDisabled,
          scrollProgressDisabled,
          wipeDisabled,
          revealsDisabled,
        });
      } catch {
        if (active) {
          // Optional animation chunks must never leave JS-gated content hidden.
          document.documentElement.classList.remove("motion-ready");
        }
      }
    };

    const onScrollIntent = () => {
      if (motionStarted) return;
      motionStarted = true;
      window.removeEventListener("scroll", onScrollIntent);
      window.removeEventListener("wheel", onScrollIntent);
      window.removeEventListener("touchmove", onScrollIntent);
      window.removeEventListener("keydown", onScrollKeyDown);
      void startMotion();
    };

    const onScrollKeyDown = (event: KeyboardEvent) => {
      if ([" ", "ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End"].includes(event.key)) {
        onScrollIntent();
      }
    };

    window.addEventListener("scroll", onScrollIntent, { passive: true });
    window.addEventListener("wheel", onScrollIntent, { passive: true });
    window.addEventListener("touchmove", onScrollIntent, { passive: true });
    window.addEventListener("keydown", onScrollKeyDown);

    return () => {
      active = false;
      window.removeEventListener("scroll", onScrollIntent);
      window.removeEventListener("wheel", onScrollIntent);
      window.removeEventListener("touchmove", onScrollIntent);
      window.removeEventListener("keydown", onScrollKeyDown);
      cleanupMotion?.();
    };
  }, [lenisDisabled, scrollProgressDisabled, wipeDisabled, revealsDisabled]);

  const disabledGroupsList = MOTION_BISECT_GROUPS.filter((g) => bisect[g]);

  return (
    <ThemeContext.Provider value={themeContextValue}>
      <LenisScrollContext.Provider value={scrollContextValue}>

      {/* 4-column architectural hairline background grid */}
      <div aria-hidden="true" className="hairline-grid">
        <div />
        <div />
        <div />
        <div />
      </div>

      {/* Fixed film-grain / paper texture (non-blocking, GPU-composited) */}
      <div aria-hidden="true" className="film-grain" />

      {/* Subtle fixed scroll progress indicator at the top of the viewport */}
      {!scrollProgressDisabled && (
        <ScrollProgressIndicator trackRef={progressTrackRef} barRef={progressRef} />
      )}

      <div
        data-motion-disabled={disabledGroupsList.length > 0 ? disabledGroupsList.join(",") : "none"}
        className="relative z-[var(--z-content)]"
      >
        {children}
      </div>
      </LenisScrollContext.Provider>
    </ThemeContext.Provider>
  );
}
