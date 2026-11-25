"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { Flip } from "gsap/Flip";
import { ArrowUpRight, ExternalLink, GitCommit, Star, X } from "lucide-react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { formatRelativeTime } from "@/src/lib/github-transform";
import type { ProjectCardModel } from "@/src/types/portfolio";
import { useLenisScroll } from "./ShellProviders";

gsap.registerPlugin(Flip);

interface FocusProjectRequest {
  repoName: string;
  nonce: number;
}

interface HorizontalFlipShowcaseProps {
  projects: ProjectCardModel[];
  loading: boolean;
  focusRequest?: FocusProjectRequest | null;
}

interface StripMetrics {
  vw: number;
  vh: number;
  cardW: number;
  cardH: number;
  gap: number;
  step: number;
  startPad: number;
  stripTop: number;
  maxTranslateX: number;
  startBuffer: number;
  endBuffer: number;
  runwayTravel: number;
  sectionHeight: number;
  thumbW: number;
  thumbH: number;
  thumbGap: number;
  dockRight: number;
  dockBottom: number;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function computeMetrics(vw: number, vh: number, count: number): StripMetrics {
  const safeCount = Math.max(1, count);
  let cardW: number;
  let cardH: number;
  let gap: number;

  if (vw >= 1024) {
    cardW = Math.round(clamp(vw * 0.195, 224, 304));
    cardH = Math.round(clamp(vh * 0.54, 332, 472));
    gap = Math.round(clamp(vw * 0.024, 22, 38));
  } else if (vw >= 768) {
    cardW = Math.round(clamp(vw * 0.28, 210, 264));
    cardH = Math.round(clamp(vh * 0.5, 308, 420));
    gap = 22;
  } else {
    cardW = Math.round(clamp(vw * 0.62, 204, 272));
    cardH = Math.round(clamp(vh * 0.46, 280, 384));
    gap = 16;
  }

  const step = cardW + gap;
  const startPad = Math.round((vw - cardW) * 0.5);
  // Offset slightly below fixed navbar optical center
  const navOffset = 30;
  const stripTop = Math.round((vh - cardH) * 0.5 + navOffset * 0.4);
  const maxTranslateX = Math.max(0, (safeCount - 1) * step);
  const startBuffer = 110;
  const endBuffer = 130;
  const runwayTravel = Math.max(1, Math.round(maxTranslateX * 1.32));
  const sectionHeight = vh + startBuffer + runwayTravel + endBuffer;

  const isMobile = vw < 640;
  const thumbW = isMobile ? 38 : 72;
  const thumbH = isMobile ? 26 : 48;
  const thumbGap = isMobile ? 4 : 6;
  const dockRight = isMobile ? 16 : 24;
  const dockBottom = isMobile ? 18 : 22;

  return {
    vw,
    vh,
    cardW,
    cardH,
    gap,
    step,
    startPad,
    stripTop,
    maxTranslateX,
    startBuffer,
    endBuffer,
    runwayTravel,
    sectionHeight,
    thumbW,
    thumbH,
    thumbGap,
    dockRight,
    dockBottom,
  };
}

/**
 * Rolling odometer `<current> — <total>` counter with directional slide mask.
 */
function RollingOdometer({
  current,
  total,
  reducedMotion,
}: {
  current: number;
  total: number;
  reducedMotion: boolean;
}) {
  const prevRef = useRef<number>(current);
  const incomingRef = useRef<HTMLSpanElement>(null);
  const outgoingRef = useRef<HTMLSpanElement>(null);
  const [pair, setPair] = useState<{ prev: number; curr: number; dir: 1 | -1 }>({
    prev: current,
    curr: current,
    dir: 1,
  });

  useEffect(() => {
    if (current === prevRef.current) return;
    const prevVal = prevRef.current;
    const dir: 1 | -1 = current > prevVal ? 1 : -1;
    prevRef.current = current;
    const timer = setTimeout(() => {
      setPair({ prev: prevVal, curr: current, dir });
    }, 0);
    return () => clearTimeout(timer);
  }, [current]);

  useEffect(() => {
    if (pair.prev === pair.curr || reducedMotion) return;
    const inEl = incomingRef.current;
    const outEl = outgoingRef.current;
    if (!inEl || !outEl) return;

    const ease = "cubic-bezier(0.76, 0, 0.24, 1)";
    gsap.killTweensOf([inEl, outEl]);
    gsap.fromTo(
      outEl,
      { yPercent: 0, opacity: 1 },
      { yPercent: pair.dir > 0 ? -105 : 105, opacity: 0.2, duration: 0.45, ease }
    );
    gsap.fromTo(
      inEl,
      { yPercent: pair.dir > 0 ? 105 : -105, opacity: 0.4 },
      { yPercent: 0, opacity: 1, duration: 0.45, ease }
    );
  }, [pair, reducedMotion]);

  return (
    <div
      className="font-mono-data inline-flex items-baseline gap-2.5 text-sm font-medium tracking-[0.04em] text-white select-none sm:text-[15px]"
      aria-live="polite"
      aria-atomic="true"
    >
      <span className="odometer-slot">
        {pair.prev !== pair.curr && !reducedMotion && (
          <span ref={outgoingRef} aria-hidden="true" className="odometer-digit tabular-nums">
            {pair.prev}
          </span>
        )}
        <span ref={incomingRef} className="odometer-digit tabular-nums">
          {pair.curr}
        </span>
      </span>
      <span className="text-white/45">—</span>
      <span className="tabular-nums text-white/85">{total}</span>
    </div>
  );
}

export default function HorizontalFlipShowcase({
  projects,
  loading,
  focusRequest,
}: HorizontalFlipShowcaseProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);
  const imgRefs = useRef<Array<HTMLImageElement | null>>([]);
  const cardBadgeRefs = useRef<Array<HTMLDivElement | null>>([]);

  // Center & flanking `+` crosshair markers
  const leftCrossRef = useRef<HTMLDivElement>(null);
  const rightCrossRef = useRef<HTMLDivElement>(null);

  // Hero Detail Mode overlay refs
  const heroOverlayRef = useRef<HTMLDivElement>(null);
  const heroScrimRef = useRef<HTMLDivElement>(null);
  const heroTitleInnerRef = useRef<HTMLHeadingElement>(null);
  const heroMetaInnerRef = useRef<HTMLDivElement>(null);
  const heroActionsRef = useRef<HTMLDivElement>(null);

  const reducedMotion = useReducedMotion();
  const { scrollToY, setScrollLocked } = useLenisScroll();

  const [mode, setMode] = useState<"strip" | "detail">("strip");
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [detailIndex, setDetailIndex] = useState<number>(0);
  const [sectionHeight, setSectionHeight] = useState<number>(4200);

  const count = projects.length;

  // Mutable animation & physics state (never triggers re-renders on rAF ticks)
  const physRef = useRef<{
    metrics: StripMetrics;
    targetX: number;
    currentX: number;
    rafId: number;
    running: boolean;
    mode: "strip" | "detail";
    isAnimating: boolean;
    activeIdx: number;
    detailIdx: number;
    dragging: boolean;
    dragMoved: boolean;
    dragStartX: number;
    dragStartTargetX: number;
  }>({
    metrics: computeMetrics(1440, 900, Math.max(1, count)),
    targetX: 0,
    currentX: 0,
    rafId: 0,
    running: false,
    mode: "strip",
    isAnimating: false,
    activeIdx: 0,
    detailIdx: 0,
    dragging: false,
    dragMoved: false,
    dragStartX: 0,
    dragStartTargetX: 0,
  });

  const getSectionTopDocY = useCallback((): number => {
    const el = sectionRef.current;
    if (!el || typeof window === "undefined") return 0;
    return el.getBoundingClientRect().top + window.scrollY;
  }, []);

  const getScrollYForCard = useCallback(
    (index: number): number => {
      const m = physRef.current.metrics;
      const sectionTop = getSectionTopDocY();
      if (count <= 1 || m.maxTranslateX <= 0) return sectionTop;
      const ratio = clamp(index / (count - 1), 0, 1);
      return sectionTop + m.startBuffer + ratio * m.runwayTravel;
    },
    [count, getSectionTopDocY]
  );

  // Position all N cards directly inside `stageRef` in Strip Mode (pure GPU translate3d)
  const applyStripTransforms = useCallback(
    (translateX: number) => {
      const m = physRef.current.metrics;
      for (let i = 0; i < count; i++) {
        const card = cardRefs.current[i];
        if (!card) continue;
        const x = m.startPad + i * m.step - translateX;
        const y = m.stripTop;
        card.style.left = "0px";
        card.style.top = "0px";
        card.style.right = "auto";
        card.style.bottom = "auto";
        card.style.width = `${m.cardW}px`;
        card.style.height = `${m.cardH}px`;
        card.style.zIndex = i === physRef.current.activeIdx ? "14" : "10";
        card.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;

        // Optical horizontal parallax on inner image (`34% 50%` -> `66% 50%`)
        const img = imgRefs.current[i];
        if (img) {
          const cardCenter = x + m.cardW * 0.5;
          const norm = clamp(cardCenter / Math.max(1, m.vw), -0.25, 1.25);
          const objX = 50 + (norm - 0.5) * 32;
          img.style.objectPosition = `${objX.toFixed(1)}% 50%`;
        }

        const badge = cardBadgeRefs.current[i];
        if (badge) {
          badge.style.opacity = i === physRef.current.activeIdx ? "1" : "0.42";
        }
      }
    },
    [count]
  );

  // Apply Detail Mode target boxes (Hero = 100%x100%, remaining N-1 = bottom-right dock)
  const applyDetailBoxes = useCallback(
    (heroIdx: number) => {
      const m = physRef.current.metrics;
      let dockCursor = 0;
      const dockTotal = Math.max(0, count - 1);

      for (let i = 0; i < count; i++) {
        const card = cardRefs.current[i];
        if (!card) continue;
        gsap.set(card, { clearProps: "transform" });

        const badge = cardBadgeRefs.current[i];
        if (badge) {
          badge.style.opacity = "0";
        }

        if (i === heroIdx) {
          card.style.left = "0px";
          card.style.top = "0px";
          card.style.right = "auto";
          card.style.bottom = "auto";
          card.style.width = `${m.vw}px`;
          card.style.height = `${m.vh}px`;
          card.style.zIndex = "20";
          const img = imgRefs.current[i];
          if (img) {
            img.style.objectPosition = "50% 50%";
          }
        } else {
          const fromRight = dockTotal - 1 - dockCursor;
          const x = m.vw - m.dockRight - m.thumbW - fromRight * (m.thumbW + m.thumbGap);
          const y = m.vh - m.dockBottom - m.thumbH;
          card.style.left = `${x}px`;
          card.style.top = `${y}px`;
          card.style.right = "auto";
          card.style.bottom = "auto";
          card.style.width = `${m.thumbW}px`;
          card.style.height = `${m.thumbH}px`;
          card.style.zIndex = "35";
          const img = imgRefs.current[i];
          if (img) {
            img.style.objectPosition = "50% 50%";
          }
          dockCursor += 1;
        }
      }
    },
    [count]
  );

  const revealHeroTypography = useCallback(
    (delaySec: number) => {
      const scrim = heroScrimRef.current;
      const title = heroTitleInnerRef.current;
      const meta = heroMetaInnerRef.current;
      const actions = heroActionsRef.current;

      if (scrim) {
        gsap.killTweensOf(scrim);
        gsap.to(scrim, {
          opacity: 1,
          duration: reducedMotion ? 0.01 : 0.55,
          delay: reducedMotion ? 0 : delaySec * 0.65,
          ease: "power2.out",
        });
      }
      if (title) {
        gsap.killTweensOf(title);
        gsap.fromTo(
          title,
          { yPercent: 112, opacity: 0 },
          {
            yPercent: 0,
            opacity: 1,
            duration: reducedMotion ? 0.01 : 0.64,
            delay: reducedMotion ? 0 : delaySec,
            ease: "power3.out",
          }
        );
      }
      if (meta) {
        gsap.killTweensOf(meta);
        gsap.fromTo(
          meta,
          { y: 18, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: reducedMotion ? 0.01 : 0.52,
            delay: reducedMotion ? 0 : delaySec + 0.08,
            ease: "power3.out",
          }
        );
      }
      if (actions) {
        gsap.killTweensOf(actions);
        gsap.fromTo(
          actions,
          { y: 14, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: reducedMotion ? 0.01 : 0.48,
            delay: reducedMotion ? 0 : delaySec + 0.14,
            ease: "power3.out",
          }
        );
      }
    },
    [reducedMotion]
  );

  const hideHeroTypography = useCallback(
    (onDone?: () => void) => {
      const scrim = heroScrimRef.current;
      const title = heroTitleInnerRef.current;
      const meta = heroMetaInnerRef.current;
      const actions = heroActionsRef.current;

      if (reducedMotion) {
        if (scrim) gsap.set(scrim, { opacity: 0 });
        if (title) gsap.set(title, { yPercent: 112, opacity: 0 });
        if (meta) gsap.set(meta, { y: 18, opacity: 0 });
        if (actions) gsap.set(actions, { y: 14, opacity: 0 });
        onDone?.();
        return;
      }

      const tl = gsap.timeline({ onComplete: onDone });
      if (actions) {
        tl.to(actions, { y: 12, opacity: 0, duration: 0.18, ease: "power2.in" }, 0);
      }
      if (meta) {
        tl.to(meta, { y: 14, opacity: 0, duration: 0.2, ease: "power2.in" }, 0.02);
      }
      if (title) {
        tl.to(title, { yPercent: 112, opacity: 0, duration: 0.24, ease: "power3.in" }, 0.03);
      }
      if (scrim) {
        tl.to(scrim, { opacity: 0, duration: 0.26, ease: "power2.inOut" }, 0.04);
      }
    },
    [reducedMotion]
  );

  const animateCrosshairs = useCallback(
    (targetMode: "strip" | "detail") => {
      const leftEl = leftCrossRef.current;
      const rightEl = rightCrossRef.current;
      if (!leftEl || !rightEl) return;

      const splitOffsetVw = physRef.current.metrics.vw < 768 ? 42 : 34; // 50 - 34 = 16vw & 84vw!
      const dx = (physRef.current.metrics.vw * splitOffsetVw) / 100;

      gsap.killTweensOf([leftEl, rightEl]);
      if (targetMode === "detail") {
        gsap.to(leftEl, {
          x: -dx,
          duration: reducedMotion ? 0.01 : 0.86,
          ease: "power4.inOut",
        });
        gsap.to(rightEl, {
          x: dx,
          opacity: 1,
          duration: reducedMotion ? 0.01 : 0.86,
          ease: "power4.inOut",
        });
      } else {
        gsap.to(leftEl, {
          x: 0,
          duration: reducedMotion ? 0.01 : 0.82,
          ease: "power4.inOut",
        });
        gsap.to(rightEl, {
          x: 0,
          opacity: 0,
          duration: reducedMotion ? 0.01 : 0.82,
          ease: "power4.inOut",
        });
      }
    },
    [reducedMotion]
  );

  // Enter Full-Bleed Hero Mode via Shared-Element GSAP Flip
  const enterDetailMode = useCallback(
    (index: number) => {
      const st = physRef.current;
      if (st.isAnimating || count === 0) return;
      const validIndex = clamp(index, 0, count - 1);

      // If already in detail mode and user clicked a miniature dock thumbnail, swap FLIP!
      if (st.mode === "detail") {
        if (validIndex === st.detailIdx) return;
        st.isAnimating = true;
        const prevHeroIdx = st.detailIdx;
        const cards = cardRefs.current.filter((c): c is HTMLDivElement => Boolean(c));

        hideHeroTypography(() => {
          const flipState = Flip.getState(cards);
          st.detailIdx = validIndex;
          st.activeIdx = validIndex;
          setDetailIndex(validIndex);
          setActiveIndex(validIndex);

          applyDetailBoxes(validIndex);
          // Keep incoming hero visually above outgoing hero during morph
          const incomingCard = cardRefs.current[validIndex];
          const outgoingCard = cardRefs.current[prevHeroIdx];
          if (incomingCard) incomingCard.style.zIndex = "24";
          if (outgoingCard) outgoingCard.style.zIndex = "19";

          Flip.from(flipState, {
            duration: reducedMotion ? 0.01 : 0.88,
            ease: "power4.inOut",
            scale: false,
            onComplete: () => {
              if (incomingCard) incomingCard.style.zIndex = "20";
              if (outgoingCard) outgoingCard.style.zIndex = "35";
              st.isAnimating = false;
            },
          });

          revealHeroTypography(0.46);
        });
        return;
      }

      // Transition from Strip Mode -> Full-Bleed Hero Mode
      st.isAnimating = true;
      st.mode = "detail";
      st.detailIdx = validIndex;
      st.activeIdx = validIndex;
      setMode("detail");
      setDetailIndex(validIndex);
      setActiveIndex(validIndex);
      setScrollLocked(true);

      // Ensure stage is flush with viewport top before full-bleed expansion
      const targetScrollY = getScrollYForCard(validIndex);
      scrollToY(targetScrollY, { immediate: true });

      const cards = cardRefs.current.filter((c): c is HTMLDivElement => Boolean(c));
      const flipState = Flip.getState(cards);

      applyDetailBoxes(validIndex);
      animateCrosshairs("detail");

      Flip.from(flipState, {
        duration: reducedMotion ? 0.01 : 0.94,
        ease: "power4.inOut",
        scale: false,
        stagger: (idx) => {
          if (idx === validIndex || reducedMotion) return 0;
          const dockOrder = idx < validIndex ? idx : idx - 1;
          return 0.034 * dockOrder;
        },
        onComplete: () => {
          st.isAnimating = false;
        },
      });

      // Reveal title + repo metadata at ~65% expansion
      revealHeroTypography(0.58);
    },
    [
      animateCrosshairs,
      applyDetailBoxes,
      count,
      getScrollYForCard,
      hideHeroTypography,
      reducedMotion,
      revealHeroTypography,
      scrollToY,
      setScrollLocked,
    ]
  );

  // Reverse-FLIP from Full-Bleed Hero Mode back to Strip Mode
  const exitDetailMode = useCallback(
    (momentumDeltaY = 0) => {
      const st = physRef.current;
      if (st.isAnimating || st.mode !== "detail" || count === 0) return;

      st.isAnimating = true;
      const activeIdx = st.detailIdx;
      const alignedX = activeIdx * st.metrics.step;
      st.currentX = alignedX;
      st.targetX = alignedX;
      st.activeIdx = activeIdx;

      // Align document scrollY to the active card's exact slot on the strip
      const alignedScrollY = getScrollYForCard(activeIdx);
      scrollToY(alignedScrollY, { immediate: true });

      animateCrosshairs("strip");

      hideHeroTypography(() => {
        const cards = cardRefs.current.filter((c): c is HTMLDivElement => Boolean(c));
        const flipState = Flip.getState(cards);

        applyStripTransforms(alignedX);

        Flip.from(flipState, {
          duration: reducedMotion ? 0.01 : 0.86,
          ease: "power4.inOut",
          scale: false,
          stagger: (idx) => {
            if (idx === activeIdx || reducedMotion) return 0;
            return 0.025 * Math.abs(idx - activeIdx);
          },
          onComplete: () => {
            st.mode = "strip";
            st.isAnimating = false;
            setMode("strip");
            setScrollLocked(false);

            // Carry scroll momentum seamlessly into the horizontal strip if exited via scroll
            if (Math.abs(momentumDeltaY) > 4) {
              const carry = clamp(momentumDeltaY * 1.15, -220, 220);
              scrollToY(alignedScrollY + carry, { immediate: false, duration: 0.55 });
            }
          },
        });
      });
    },
    [
      animateCrosshairs,
      applyStripTransforms,
      count,
      getScrollYForCard,
      hideHeroTypography,
      reducedMotion,
      scrollToY,
      setScrollLocked,
    ]
  );

  // Inertial Strip rAF loop + Scroll/Resize synchronization
  const stepStripRef = useRef<() => void>(() => {});

  useEffect(() => {
    const st = physRef.current;

    stepStripRef.current = () => {
      if (st.mode !== "strip" || st.isAnimating) {
        st.running = false;
        return;
      }

      const lerp = reducedMotion ? 1 : 0.092;
      st.currentX += (st.targetX - st.currentX) * lerp;

      if (Math.abs(st.targetX - st.currentX) < 0.08) {
        st.currentX = st.targetX;
      }

      const nextActive =
        st.metrics.step > 0
          ? clamp(Math.round(st.currentX / st.metrics.step), 0, Math.max(0, count - 1))
          : 0;

      if (nextActive !== st.activeIdx) {
        st.activeIdx = nextActive;
        setActiveIndex(nextActive);
      }

      applyStripTransforms(st.currentX);

      if (Math.abs(st.targetX - st.currentX) >= 0.08) {
        st.rafId = requestAnimationFrame(() => stepStripRef.current());
      } else {
        st.running = false;
      }
    };

    const wakeStrip = () => {
      if (!st.running && st.mode === "strip" && !st.isAnimating) {
        st.running = true;
        st.rafId = requestAnimationFrame(() => stepStripRef.current());
      }
    };

    const syncFromScroll = () => {
      if (st.mode !== "strip" || st.isAnimating) return;
      const el = sectionRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const m = st.metrics;
      const scrolledIntoRunway = -rect.top - m.startBuffer;
      const progress = clamp(scrolledIntoRunway / Math.max(1, m.runwayTravel), 0, 1);
      st.targetX = progress * m.maxTranslateX;
      wakeStrip();
    };

    const recalcLayout = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const nextMetrics = computeMetrics(vw, vh, count);
      st.metrics = nextMetrics;
      setSectionHeight(nextMetrics.sectionHeight);

      if (st.mode === "detail" && !st.isAnimating) {
        applyDetailBoxes(st.detailIdx);
        animateCrosshairs("detail");
      } else if (st.mode === "strip" && !st.isAnimating) {
        const el = sectionRef.current;
        if (el) {
          const rect = el.getBoundingClientRect();
          const scrolledIntoRunway = -rect.top - nextMetrics.startBuffer;
          const progress = clamp(
            scrolledIntoRunway / Math.max(1, nextMetrics.runwayTravel),
            0,
            1
          );
          st.targetX = progress * nextMetrics.maxTranslateX;
          st.currentX = st.targetX;
        }
        applyStripTransforms(st.currentX);
      }
    };

    recalcLayout();
    window.addEventListener("scroll", syncFromScroll, { passive: true });
    window.addEventListener("resize", recalcLayout, { passive: true });

    return () => {
      if (st.rafId) cancelAnimationFrame(st.rafId);
      st.running = false;
      window.removeEventListener("scroll", syncFromScroll);
      window.removeEventListener("resize", recalcLayout);
    };
  }, [animateCrosshairs, applyDetailBoxes, applyStripTransforms, count, reducedMotion]);

  // Ensure scroll lock is always cleaned up on unmount
  useEffect(() => {
    return () => {
      setScrollLocked(false);
    };
  }, [setScrollLocked]);

  // Detail Mode Exit Listeners: Wheel, Touch-Vertical Swipe, and Keyboard (`Escape` / `ArrowLeft` / `ArrowRight`)
  useEffect(() => {
    let touchStartY = 0;

    const onWheel = (e: WheelEvent) => {
      const st = physRef.current;
      if (st.mode !== "detail") return;
      e.preventDefault();
      if (st.isAnimating) return;
      if (Math.abs(e.deltaY) > 6 || Math.abs(e.deltaX) > 6) {
        exitDetailMode(e.deltaY || e.deltaX);
      }
    };

    const onTouchStart = (e: TouchEvent) => {
      if (physRef.current.mode !== "detail") return;
      touchStartY = e.touches[0]?.clientY ?? 0;
    };

    const onTouchMove = (e: TouchEvent) => {
      const st = physRef.current;
      if (st.mode !== "detail") return;
      const dy = touchStartY - (e.touches[0]?.clientY ?? touchStartY);
      if (Math.abs(dy) > 18 && !st.isAnimating) {
        e.preventDefault();
        exitDetailMode(dy * 1.4);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const st = physRef.current;
      if (st.isAnimating || count === 0) return;

      if (st.mode === "detail") {
        if (e.key === "Escape") {
          e.preventDefault();
          exitDetailMode(0);
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          enterDetailMode((st.detailIdx + 1) % count);
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          enterDetailMode((st.detailIdx - 1 + count) % count);
        }
        return;
      }

      // In Strip Mode, handle ArrowLeft/ArrowRight when showcase is prominently in viewport
      const sec = sectionRef.current;
      if (!sec) return;
      const rect = sec.getBoundingClientRect();
      const inView = rect.top <= 80 && rect.bottom >= window.innerHeight - 80;
      if (!inView) return;

      if (e.key === "ArrowRight") {
        e.preventDefault();
        const nextIdx = clamp(st.activeIdx + 1, 0, count - 1);
        scrollToY(getScrollYForCard(nextIdx), { immediate: false, duration: 0.6 });
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        const prevIdx = clamp(st.activeIdx - 1, 0, count - 1);
        scrollToY(getScrollYForCard(prevIdx), { immediate: false, duration: 0.6 });
      }
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [count, enterDetailMode, exitDetailMode, getScrollYForCard, scrollToY]);

  // Respond to external focus requests (e.g. from WhatIBuildSection rows)
  useEffect(() => {
    if (!focusRequest || count === 0) return;
    const targetLower = focusRequest.repoName.trim().toLowerCase();
    const idx = projects.findIndex(
      (p) =>
        p.repoName.toLowerCase() === targetLower ||
        p.id.toLowerCase() === targetLower
    );
    if (idx >= 0) {
      if (physRef.current.mode === "detail") {
        enterDetailMode(idx);
      } else {
        scrollToY(getScrollYForCard(idx), { immediate: false, duration: 0.85 });
      }
    }
  }, [count, enterDetailMode, focusRequest, getScrollYForCard, projects, scrollToY]);

  // Horizontal Click-and-Drag scrubbing in Strip Mode
  const handleStagePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const st = physRef.current;
    if (st.mode !== "strip" || st.isAnimating || e.button !== 0) return;
    st.dragging = true;
    st.dragMoved = false;
    st.dragStartX = e.clientX;
    st.dragStartTargetX = st.targetX;
  };

  const handleStagePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const st = physRef.current;
    if (!st.dragging || st.mode !== "strip" || st.isAnimating) return;
    const dx = e.clientX - st.dragStartX;
    if (Math.abs(dx) > 7) {
      st.dragMoved = true;
    }
    if (!st.dragMoved) return;

    const m = st.metrics;
    const nextX = clamp(st.dragStartTargetX - dx * 1.35, 0, m.maxTranslateX);
    const ratio = m.maxTranslateX > 0 ? nextX / m.maxTranslateX : 0;
    const targetDocY = getSectionTopDocY() + m.startBuffer + ratio * m.runwayTravel;
    scrollToY(targetDocY, { immediate: true });
  };

  const handleStagePointerUp = () => {
    const st = physRef.current;
    st.dragging = false;
    // Reset dragMoved on next tick so card onClick can inspect it synchronously
    setTimeout(() => {
      st.dragMoved = false;
    }, 0);
  };

  const handleCardActivate = (idx: number, e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    if (physRef.current.dragMoved) return;
    enterDetailMode(idx);
  };

  const handleBackdropClick = () => {
    if (physRef.current.mode === "detail" && !physRef.current.isAnimating) {
      exitDetailMode(0);
    }
  };

  const activeProject = useMemo(
    () => projects[activeIndex] ?? projects[0] ?? null,
    [activeIndex, projects]
  );

  const detailProject = useMemo(
    () => projects[detailIndex] ?? projects[0] ?? null,
    [detailIndex, projects]
  );

  if (loading && count === 0) {
    return (
      <section
        id="projects"
        aria-label="Projects showcase loading"
        className="flex h-screen w-full items-center justify-center bg-[#0E0E0E] text-white"
      >
        <span className="font-mono-data text-xs tracking-[0.14em] uppercase text-white/50">
          INITIALIZING REPOSITORY FILMSTRIP...
        </span>
      </section>
    );
  }

  return (
    <section
      id="projects"
      ref={sectionRef}
      tabIndex={-1}
      aria-label="Selected repositories horizontal FLIP showcase"
      style={{ height: `${sectionHeight}px` }}
      className="relative w-full border-b border-white/10 bg-[#0E0E0E] text-white select-none"
    >
      {/* Sticky 100vw x 100vh Gallery Viewport — Zero parent transform so Flip coordinates are pure */}
      <div
        ref={stageRef}
        onClick={handleBackdropClick}
        onPointerDown={handleStagePointerDown}
        onPointerMove={handleStagePointerMove}
        onPointerUp={handleStagePointerUp}
        onPointerCancel={handleStagePointerUp}
        className={`sticky top-0 h-screen w-full overflow-hidden bg-[#0E0E0E] ${
          mode === "strip" ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-out"
        }`}
      >
        {/* Top Minimalist Gallery Sub-Bar (Below Fixed Navbar) */}
        <div
          className={`pointer-events-none absolute top-[calc(var(--nav-height)+14px)] right-[var(--space-edge)] left-[var(--space-edge)] z-30 flex items-center justify-between transition-opacity duration-300`}
        >
          <div className="flex items-center gap-3">
            <span className="font-mono-data text-[10px] tracking-[0.14em] uppercase text-white/45">
              ACT II // SELECTED WORKS &amp; REPOSITORIES
            </span>
            <span className="hidden h-px w-6 bg-white/20 sm:inline-block" />
            <span className="font-mono-data hidden text-[10px] tracking-[0.12em] uppercase text-white/75 sm:inline">
              {mode === "strip"
                ? "SCROLL · DRAG · CLICK PLATE TO EXPAND"
                : "CLICK THUMBNAIL TO SWAP · SCROLL OR ESC TO EXIT"}
            </span>
          </div>

          {mode === "detail" ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                exitDetailMode(0);
              }}
              className="pointer-events-auto font-mono-data inline-flex items-center gap-1.5 border border-white/30 bg-[#0E0E0E]/75 px-3 py-1.5 text-[11px] tracking-[0.12em] uppercase text-white backdrop-blur-sm transition-colors hover:border-white hover:bg-white hover:text-[#0E0E0E]"
            >
              <span>Close</span>
              <X className="h-3.5 w-3.5" />
            </button>
          ) : (
            <div className="pointer-events-auto hidden items-center gap-1.5 md:flex">
              {projects.map((proj, idx) => {
                const isCurrent = idx === activeIndex;
                return (
                  <button
                    key={proj.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      scrollToY(getScrollYForCard(idx), { immediate: false, duration: 0.65 });
                    }}
                    aria-label={`Scroll to ${proj.title}`}
                    className={`h-[3px] transition-all duration-300 ${
                      isCurrent ? "w-7 bg-white" : "w-2.5 bg-white/25 hover:bg-white/55"
                    }`}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Persistent N Project DOM Nodes — Shared Elements for GSAP Flip */}
        {projects.map((project, idx) => {
          const isDetailHero = mode === "detail" && idx === detailIndex;
          const isDockThumb = mode === "detail" && idx !== detailIndex;

          return (
            <div
              key={project.id}
              ref={(el) => {
                cardRefs.current[idx] = el;
              }}
              data-flip-id={project.id}
              data-cursor={isDetailHero ? undefined : "showcase"}
              role="button"
              tabIndex={0}
              aria-label={
                isDetailHero
                  ? `${project.title} full-bleed view — click backdrop or press Escape to return to strip`
                  : `Inspect ${project.title} (${idx + 1} of ${count})`
              }
              onClick={(e) => {
                if (isDetailHero) {
                  // Allow backdrop exit when clicking empty areas of the full-bleed hero image
                  exitDetailMode(0);
                  return;
                }
                handleCardActivate(idx, e);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  if (isDetailHero) {
                    exitDetailMode(0);
                  } else {
                    handleCardActivate(idx, e);
                  }
                }
              }}
              className={`group absolute overflow-hidden bg-[#161616] ${
                isDockThumb
                  ? "cursor-pointer ring-1 ring-white/25 transition-opacity hover:ring-white"
                  : isDetailHero
                    ? "cursor-zoom-out"
                    : "cursor-pointer ring-1 ring-white/12 hover:ring-white/45"
              }`}
            >
              {/* Crisp 90-degree editorial photograph (native img preserves full-res texture during 72px -> 100vw GSAP Flip morph) */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={(el) => {
                  imgRefs.current[idx] = el;
                }}
                src={project.image || "/img/projects/hackstack.jpg"}
                alt={`${project.title} — ${project.category} repository`}
                draggable={false}
                className="h-full w-full object-cover transition-transform duration-700 ease-out select-none group-hover:scale-[1.03]"
                style={{ objectPosition: "50% 50%" }}
              />

              {/* Subtle Strip-Mode Micro Index Plate (fades to 0 during Detail Mode) */}
              <div
                ref={(el) => {
                  cardBadgeRefs.current[idx] = el;
                }}
                className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/80 via-black/25 to-transparent p-3.5 transition-opacity duration-300"
              >
                <div>
                  <div className="font-mono-data text-[10px] tracking-[0.12em] uppercase text-white/55">
                    0{idx + 1} {"//"} {project.category}
                  </div>
                  <div className="font-display mt-0.5 text-sm font-medium tracking-[-0.02em] text-white sm:text-base">
                    {project.title}
                  </div>
                </div>
                {project.primaryLanguage && (
                  <span className="font-mono-data border border-white/20 bg-black/55 px-1.5 py-0.5 text-[9px] tracking-[0.1em] uppercase text-white/75">
                    {project.primaryLanguage.name}
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {/* Atmospheric Gradient Scrim over Full-Bleed Hero (z-25, below text & dock) */}
        <div
          ref={heroScrimRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[25] bg-[linear-gradient(180deg,rgba(14,14,14,0.45)_0%,rgba(14,14,14,0.28)_42%,rgba(14,14,14,0.88)_100%)] opacity-0"
        />

        {/* Precision Center `+` Reticle (Splits to 16vw & 84vw Flanking `+` Markers in Hero Mode) */}
        <div
          ref={leftCrossRef}
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-1/2 z-[32] h-3 w-3 -translate-x-1/2 -translate-y-1/2"
        >
          <span className="absolute top-1/2 left-0 h-px w-3 -translate-y-1/2 bg-white shadow-[0_0_8px_rgba(0,0,0,0.65)]" />
          <span className="absolute top-0 left-1/2 h-3 w-px -translate-x-1/2 bg-white shadow-[0_0_8px_rgba(0,0,0,0.65)]" />
        </div>
        <div
          ref={rightCrossRef}
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-1/2 z-[32] h-3 w-3 -translate-x-1/2 -translate-y-1/2 opacity-0"
        >
          <span className="absolute top-1/2 left-0 h-px w-3 -translate-y-1/2 bg-white shadow-[0_0_8px_rgba(0,0,0,0.65)]" />
          <span className="absolute top-0 left-1/2 h-3 w-px -translate-x-1/2 bg-white shadow-[0_0_8px_rgba(0,0,0,0.65)]" />
        </div>

        {/* Full-Bleed Hero Mode Typography & Live Repository Telemetry (Flanked between 16vw & 84vw) */}
        {detailProject && (
          <div
            ref={heroOverlayRef}
            className={`pointer-events-none absolute inset-0 z-[30] flex flex-col justify-center px-[var(--space-edge)] md:px-[18vw] ${
              mode === "detail" ? "visible" : "invisible"
            }`}
          >
            <div className="max-w-[780px]">
              {/* Masked Project Title */}
              <div className="overflow-hidden py-1">
                <h2
                  ref={heroTitleInnerRef}
                  className="font-display text-[clamp(2.4rem,5.6vw,5rem)] leading-[0.96] font-semibold tracking-[-0.03em] text-white opacity-0"
                >
                  {detailProject.title}
                </h2>
              </div>

              {/* Repository Pitch + Language Telemetry */}
              <div ref={heroMetaInnerRef} className="mt-4 opacity-0">
                <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 font-mono-data text-[11px] tracking-[0.1em] uppercase text-white/65">
                  <span className="text-white">{detailProject.category}</span>
                  <span>·</span>
                  <span>{detailProject.role}</span>
                  {detailProject.primaryLanguage && (
                    <>
                      <span>·</span>
                      <span>{detailProject.primaryLanguage.name}</span>
                    </>
                  )}
                  <span>·</span>
                  <span className="inline-flex items-center gap-1">
                    <GitCommit className="h-3 w-3" />
                    Updated {formatRelativeTime(detailProject.pushedAt)}
                  </span>
                  {detailProject.stargazerCount > 0 && (
                    <>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1 text-white">
                        <Star className="h-3 w-3 fill-white" />
                        {detailProject.stargazerCount}
                      </span>
                    </>
                  )}
                </div>

                <p className="max-w-[58ch] text-sm leading-relaxed text-white/82 sm:text-base">
                  {detailProject.pitch}
                </p>

                {detailProject.latestCommitMessage && (
                  <p className="font-mono-data mt-3 truncate max-w-[56ch] text-[11px] text-white/50">
                    LATEST COMMIT: &ldquo;{detailProject.latestCommitMessage}&rdquo;
                  </p>
                )}
              </div>

              {/* Interactive Action Links (stopPropagation so clicking links does not close hero) */}
              <div
                ref={heroActionsRef}
                onClick={(e) => e.stopPropagation()}
                className="pointer-events-auto mt-6 flex flex-wrap items-center gap-3 opacity-0"
              >
                {detailProject.liveUrl && (
                  <a
                    href={detailProject.liveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono-data inline-flex min-h-[42px] items-center gap-2 bg-white px-4 py-2.5 text-xs font-semibold tracking-[0.08em] uppercase text-[#0E0E0E] transition-opacity hover:opacity-90"
                  >
                    <span>Live Deployment</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}

                <a
                  href={detailProject.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono-data inline-flex min-h-[42px] items-center gap-2 border border-white/40 bg-[#0E0E0E]/70 px-4 py-2.5 text-xs font-medium tracking-[0.08em] uppercase text-white backdrop-blur-xs transition-colors hover:border-white hover:bg-white hover:text-[#0E0E0E]"
                >
                  <span>GitHub Source</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Bottom-Left Fixed Rolling Counter (`1 — 8`) + Active Centered Repo Readout */}
        <div className="pointer-events-none absolute bottom-[22px] left-[var(--space-edge)] z-[36] flex flex-col gap-1">
          <RollingOdometer
            current={Math.min(count, activeIndex + 1)}
            total={count}
            reducedMotion={reducedMotion}
          />
          {activeProject && (
            <div className="font-mono-data flex items-center gap-2 text-[10px] tracking-[0.12em] uppercase text-white/45">
              <span className="truncate max-w-[200px] sm:max-w-[280px]">
                {activeProject.title}
              </span>
              <span>·</span>
              <span>{activeProject.category}</span>
            </div>
          )}
        </div>

        {/* Bottom-Right Subtle Scroll Handoff Cue in Strip Mode */}
        {mode === "strip" && (
          <div className="pointer-events-none absolute right-[var(--space-edge)] bottom-[22px] z-[30] hidden items-center gap-2 font-mono-data text-[10px] tracking-[0.12em] uppercase text-white/45 sm:flex">
            <span>
              {activeIndex >= count - 1
                ? "CONTINUE SCROLLING FOR ENGINEERING TELEMETRY ↓"
                : "SCROLL TO ADVANCE FILMSTRIP →"}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
