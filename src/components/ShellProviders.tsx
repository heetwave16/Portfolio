"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowUpRight } from "lucide-react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useMotionBisect } from "@/hooks/use-motion-bisect";
import { getAnchorScrollOffset } from "@/src/lib/keyboard";
import {
  computeScrollProgress,
  computeScrollProgressPercent,
  createBezierEase,
  getMotionTokens,
  INTRO_SESSION_KEY,
  MOTION_BISECT_GROUPS,
  shouldPlayIntro,
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
import ScrollProgressIndicator from "./ScrollProgressIndicator";

gsap.registerPlugin(ScrollTrigger);

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
  const cursorRef = useRef<HTMLDivElement>(null);
  const progressTrackRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const introLineRef = useRef<HTMLDivElement>(null);
  const lenisRef = useRef<Lenis | null>(null);
  const [cursorMode, setCursorMode] = useState<"default" | "interactive" | "portrait">("default");
  const [cursorVisible, setCursorVisible] = useState(false);
  const [introStatus, setIntroStatus] = useState<"pending" | "played" | "skipped" | "reduced">("pending");
  const [theme, setThemeState] = useState<ThemeMode>(DEFAULT_THEME);
  const reducedMotion = useReducedMotion();
  const bisect = useMotionBisect();
  const lenisDisabled = reducedMotion || bisect.lenis;
  const scrollProgressDisabled = bisect.scrollProgress;
  const wipeDisabled = reducedMotion || bisect.wipe;
  const revealsDisabled = reducedMotion || bisect.reveals;
  const cursorDisabled = reducedMotion || bisect.cursor;

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

      if (activeLenis && !lenisDisabled) {
        const tokens = getMotionTokens();
        const scrollMarginTop = targetEl
          ? Number.parseFloat(getComputedStyle(targetEl).scrollMarginTop) || 0
          : 0;
        const offset = isTop ? 0 : Math.min(0, getAnchorScrollOffset(hash, navHeight) + scrollMarginTop);
        activeLenis.scrollTo(isTop ? 0 : (targetEl as HTMLElement), {
          offset,
          duration: tokens.slowSec + tokens.fastSec,
          easing: createBezierEase(tokens.easeOutExpo),
        });
      } else if (isTop) {
        window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
      } else if (targetEl) {
        targetEl.scrollIntoView({ behavior: "instant" as ScrollBehavior, block: "start" });
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

  // Sync scroll progress bar & Lenis + GSAP ScrollTrigger + once-per-session load intro + dark-to-light wipe
  useEffect(() => {
    const tokens = getMotionTokens();
    const outExpoEase = createBezierEase(tokens.easeOutExpo);
    const inOutEase = createBezierEase(tokens.easeInOut);

    // Cache document dimensions outside scroll/rAF handlers to avoid forced synchronous layout
    let cachedScrollHeight = document.documentElement.scrollHeight;
    let cachedInnerHeight = window.innerHeight;
    let lastRatio = -1;
    let lastPercent = -1;

    const writeProgressRatio = (ratio: number) => {
      if (!progressRef.current || scrollProgressDisabled) return;
      const clamped = Math.max(0, Math.min(1, ratio));
      if (Math.abs(clamped - lastRatio) >= 0.0002) {
        lastRatio = clamped;
        progressRef.current.style.transform = `scaleX(${clamped.toFixed(4)})`;
      }
      const percent = computeScrollProgressPercent(clamped);
      if (percent !== lastPercent && progressTrackRef.current) {
        lastPercent = percent;
        const val = String(percent);
        progressTrackRef.current.setAttribute("aria-valuenow", val);
        progressTrackRef.current.setAttribute("data-progress", val);
      }
    };

    const updateProgressFromCache = () => {
      if (scrollProgressDisabled) return;
      const ratio = computeScrollProgress(window.scrollY, cachedScrollHeight, cachedInnerHeight);
      writeProgressRatio(ratio);
    };

    const updateDimensions = () => {
      cachedScrollHeight = document.documentElement.scrollHeight;
      cachedInnerHeight = window.innerHeight;
      updateProgressFromCache();
    };

    let refreshRaf = 0;
    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            const nextH = document.documentElement.scrollHeight;
            if (Math.abs(nextH - cachedScrollHeight) > 2) {
              cachedScrollHeight = nextH;
              cachedInnerHeight = window.innerHeight;
              updateProgressFromCache();
              if (refreshRaf) cancelAnimationFrame(refreshRaf);
              refreshRaf = requestAnimationFrame(() => {
                ScrollTrigger.refresh();
              });
            }
          })
        : null;
    resizeObserver?.observe(document.documentElement);

    if (scrollProgressDisabled && progressRef.current) {
      progressRef.current.style.transform = "scaleX(0)";
    }

    let lenis: Lenis | null = null;
    let tick: ((time: number) => void) | null = null;

    if (!lenisDisabled) {
      lenis = new Lenis({
        duration: tokens.slowSec + tokens.fastSec,
        easing: outExpoEase,
        smoothWheel: true,
      });
      lenisRef.current = lenis;

      lenis.on("scroll", (e: { scroll: number; limit: number }) => {
        ScrollTrigger.update();
        if (!scrollProgressDisabled) {
          const ratio = e.limit > 0 ? e.scroll / e.limit : 0;
          writeProgressRatio(ratio);
        }
      });

      tick = (time: number) => {
        lenis?.raf(time * 1000);
      };
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);
    } else {
      lenisRef.current = null;
    }

    if (!scrollProgressDisabled) {
      if (lenisDisabled) {
        window.addEventListener("scroll", updateProgressFromCache, { passive: true });
      }
      window.addEventListener("resize", updateDimensions, { passive: true });
      updateProgressFromCache();
    }

    let alreadyPlayed = false;
    try {
      alreadyPlayed = sessionStorage.getItem(INTRO_SESSION_KEY) === "1";
    } catch {
      alreadyPlayed = false;
    }

    const playIntroNow = shouldPlayIntro(revealsDisabled, alreadyPlayed);
    if (playIntroNow) {
      try {
        sessionStorage.setItem(INTRO_SESSION_KEY, "1");
      } catch {
        // Ignore storage restrictions
      }
    }

    const introTimer = setTimeout(
      () => setIntroStatus(revealsDisabled ? "reduced" : playIntroNow ? "played" : "skipped"),
      0
    );

    const ctx = gsap.context(() => {
      // 1. Load intro (once per session, compositor-only properties)
      if (playIntroNow) {
        const textTargets = gsap.utils.toArray<HTMLElement>("[data-hero-intro='text']");
        const portraitTarget = document.querySelector<HTMLElement>("[data-hero-intro='portrait']");

        if (introLineRef.current) {
          gsap
            .timeline()
            .fromTo(
              introLineRef.current,
              { scaleX: 0, opacity: 1, transformOrigin: "left center" },
              {
                scaleX: 1,
                duration: tokens.baseSec,
                ease: outExpoEase,
                force3D: true,
              }
            )
            .to(introLineRef.current, {
              scaleX: 0,
              transformOrigin: "right center",
              duration: tokens.baseSec,
              ease: inOutEase,
              force3D: true,
              onComplete: () => {
                if (introLineRef.current) introLineRef.current.style.opacity = "0";
              },
            });
        }

        if (textTargets.length > 0) {
          gsap.from(textTargets, {
            y: 18,
            duration: tokens.introSec,
            stagger: tokens.fastSec * 0.35,
            ease: outExpoEase,
            force3D: true,
            clearProps: "transform",
          });
        }

        if (portraitTarget) {
          gsap.fromTo(
            portraitTarget,
            { clipPath: "inset(0% 0% 14% 0%)", scale: 0.985 },
            {
              clipPath: "inset(0% 0% 0% 0%)",
              scale: 1,
              duration: tokens.introSec,
              ease: outExpoEase,
              force3D: true,
              clearProps: "transform,clipPath",
            }
          );
        }
      }

      // 2. Scroll reveals (batched ScrollTrigger, compositor-only opacity + transform without layer teardown)
      if (!revealsDisabled) {
        const revealEls = gsap.utils.toArray<HTMLElement>("[data-reveal]");
        if (revealEls.length > 0) {
          gsap.set(revealEls, { y: 18, opacity: 0, force3D: true });
          ScrollTrigger.batch(revealEls, {
            start: "top 88%",
            once: true,
            onEnter: (batch) => {
              gsap.to(batch, {
                y: 0,
                opacity: 1,
                duration: tokens.slowSec,
                stagger: tokens.fastSec * 0.25,
                ease: outExpoEase,
                force3D: true,
                overwrite: true,
              });
            },
          });
        }
      }

      // 3. Dark-to-light wipe using compositor-only curtain scaleY (avoids full-section clip-path repaint)
      const wipeCurtains = gsap.utils.toArray<HTMLElement>("[data-theme-wipe-curtain]");
      if (wipeDisabled) {
        if (wipeCurtains.length > 0) {
          gsap.set(wipeCurtains, { scaleY: 0, display: "none" });
        }
      } else {
        wipeCurtains.forEach((curtain) => {
          const triggerEl = curtain.closest("[data-theme-wipe]") ?? curtain;
          gsap.fromTo(
            curtain,
            { scaleY: 1, display: "block" },
            {
              scaleY: 0,
              duration: tokens.wipeSec,
              ease: outExpoEase,
              force3D: true,
              onComplete: () => {
                gsap.set(curtain, { display: "none" });
              },
              scrollTrigger: {
                trigger: triggerEl,
                start: "top 86%",
                once: true,
              },
            }
          );
        });
      }
    });

    return () => {
      clearTimeout(introTimer);
      if (refreshRaf) cancelAnimationFrame(refreshRaf);
      resizeObserver?.disconnect();
      window.removeEventListener("scroll", updateProgressFromCache);
      window.removeEventListener("resize", updateDimensions);
      ctx.revert();
      if (tick) gsap.ticker.remove(tick);
      lenisRef.current = null;
      lenis?.destroy();
    };
  }, [lenisDisabled, scrollProgressDisabled, wipeDisabled, revealsDisabled]);

  // Custom cursor for fine pointers only (hidden on touch & reduced motion)
  useEffect(() => {
    if (cursorDisabled) {
      return;
    }

    const isFinePointer = window.matchMedia("(pointer: fine) and (hover: hover)").matches;
    if (!isFinePointer || !cursorRef.current) return;

    const tokens = getMotionTokens();
    const snappyEase = createBezierEase(tokens.easeSnappy);
    const el = cursorRef.current;
    const xTo = gsap.quickTo(el, "x", { duration: tokens.fastSec * 0.6, ease: snappyEase });
    const yTo = gsap.quickTo(el, "y", { duration: tokens.fastSec * 0.6, ease: snappyEase });
    let visibleState = false;
    let modeState: "default" | "interactive" | "portrait" = "default";

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") {
        if (visibleState) {
          visibleState = false;
          setCursorVisible(false);
        }
        return;
      }
      if (!visibleState) {
        visibleState = true;
        setCursorVisible(true);
      }
      xTo(e.clientX);
      yTo(e.clientY);

      const target = e.target as HTMLElement | null;
      if (!target) return;
      const nextMode: "default" | "interactive" | "portrait" = target.closest("[data-cursor='portrait']")
        ? "portrait"
        : target.closest("a, button, [role='button'], [role='tab']")
          ? "interactive"
          : "default";

      if (nextMode !== modeState) {
        modeState = nextMode;
        setCursorMode(nextMode);
      }
    };

    const onLeave = () => {
      if (visibleState) {
        visibleState = false;
        setCursorVisible(false);
      }
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("mouseleave", onLeave);

    return () => {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("mouseleave", onLeave);
    };
  }, [cursorDisabled]);

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

      {/* Once-per-session architectural intro hairline sweep */}
      {!revealsDisabled && (
        <div
          ref={introLineRef}
          data-testid="load-intro-line"
          aria-hidden="true"
          className="pointer-events-none fixed top-0 right-0 left-0 z-[125] h-[3px] origin-left scale-x-0 bg-[var(--accent)] opacity-0"
        />
      )}

      {/* Subtle fixed scroll progress indicator at the top of the viewport */}
      {!scrollProgressDisabled && (
        <ScrollProgressIndicator trackRef={progressTrackRef} barRef={progressRef} />
      )}

      {/* Custom desktop cursor */}
      <div
        ref={cursorRef}
        aria-hidden="true"
        className={`pointer-events-none fixed top-0 left-0 z-[120] -translate-x-1/2 -translate-y-1/2 rounded-full transition-[width,height,background-color,border-color,opacity] duration-[var(--duration-fast)] ${
          cursorVisible && !cursorDisabled ? "opacity-100" : "opacity-0"
        } ${
          cursorMode === "interactive"
            ? "flex h-9 w-9 items-center justify-center border-2 border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--accent)]"
            : cursorMode === "portrait"
              ? "h-7 w-7 border border-[var(--beige)] bg-transparent"
              : "h-2.5 w-2.5 bg-[var(--accent)]"
        }`}
      >
        {cursorMode === "interactive" && <ArrowUpRight className="h-3.5 w-3.5 opacity-80" />}
      </div>

      <div
        data-intro-status={introStatus}
        data-motion-disabled={disabledGroupsList.length > 0 ? disabledGroupsList.join(",") : "none"}
        className="relative z-[var(--z-content)]"
      >
        {children}
      </div>
      </LenisScrollContext.Provider>
    </ThemeContext.Provider>
  );
}
