import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  computeScrollProgress,
  computeScrollProgressPercent,
  createBezierEase,
  getMotionTokens,
} from "./motion";

// This module is imported on idle from ShellProviders so these engines stay out of first-load JS.
gsap.registerPlugin(ScrollTrigger);

type RefCell<T> = { current: T };

export interface ShellMotionOptions {
  progressTrackRef: RefCell<HTMLDivElement | null>;
  progressRef: RefCell<HTMLDivElement | null>;
  lenisRef: RefCell<Lenis | null>;
  lenisDisabled: boolean;
  scrollProgressDisabled: boolean;
  wipeDisabled: boolean;
  revealsDisabled: boolean;
}

export function initializeShellMotion({
  progressTrackRef,
  progressRef,
  lenisRef,
  lenisDisabled,
  scrollProgressDisabled,
  wipeDisabled,
  revealsDisabled,
}: ShellMotionOptions): () => void {
  const tokens = getMotionTokens();
  const uiEase = createBezierEase(tokens.easeUi);

  // Cache document dimensions outside scroll/rAF handlers to avoid forced synchronous layout.
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
      duration: tokens.scrollSec,
      easing: uiEase,
      smoothWheel: true,
    });
    lenisRef.current = lenis;

    lenis.on("scroll", (event: { scroll: number; limit: number }) => {
      ScrollTrigger.update();
      if (!scrollProgressDisabled) {
        const ratio = event.limit > 0 ? event.scroll / event.limit : 0;
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

  const context = gsap.context(() => {
    // Restrained parallax on decorative layers only; the hero itself has no scroll animation.
    if (!revealsDisabled) {
      gsap.utils.toArray<HTMLElement>("[data-parallax]").forEach((element) => {
        const amount = Math.min(24, Number(element.dataset.parallax) || 16);
        const settle = element.dataset.parallaxSettle !== undefined;
        gsap.fromTo(
          element,
          { y: amount },
          {
            y: settle ? 0 : -amount,
            ease: "none",
            force3D: true,
            scrollTrigger: {
              trigger: element,
              start: "top bottom",
              end: settle ? "max" : "bottom top",
              scrub: true,
            },
          }
        );
      });

      // Red accent line sweeps across the one dark-to-light join.
      gsap.utils.toArray<HTMLElement>("[data-accent-sweep]").forEach((element) => {
        gsap.to(element, {
          scaleX: 1,
          duration: tokens.enterSec,
          ease: uiEase,
          scrollTrigger: { trigger: element.parentElement ?? element, start: "top 80%", once: true },
        });
      });

      // Scroll reveals use compositor-only opacity + transform.
      const revealElements = gsap.utils.toArray<HTMLElement>("[data-reveal]");
      if (revealElements.length > 0) {
        gsap.set(revealElements, { y: 18, opacity: 0, force3D: true });
        ScrollTrigger.batch(revealElements, {
          start: "top 88%",
          once: true,
          onEnter: (batch) => {
            gsap.to(batch, {
              y: 0,
              opacity: 1,
              duration: tokens.enterSec,
              stagger: tokens.hoverSec * 0.25,
              ease: uiEase,
              force3D: true,
              overwrite: true,
            });
          },
        });
      }
    }

    // Dark-to-light wipe uses a compositor-only curtain scaleY.
    const wipeCurtains = gsap.utils.toArray<HTMLElement>("[data-theme-wipe-curtain]");
    if (wipeDisabled) {
      if (wipeCurtains.length > 0) gsap.set(wipeCurtains, { scaleY: 0, display: "none" });
    } else {
      wipeCurtains.forEach((curtain) => {
        const triggerElement = curtain.closest("[data-theme-wipe]") ?? curtain;
        gsap.fromTo(
          curtain,
          { scaleY: 1, display: "block" },
          {
            scaleY: 0,
            duration: tokens.enterSec,
            ease: uiEase,
            force3D: true,
            onComplete: () => gsap.set(curtain, { display: "none" }),
            scrollTrigger: {
              trigger: triggerElement,
              start: "top 86%",
              once: true,
            },
          }
        );
      });
    }
  });

  return () => {
    if (refreshRaf) cancelAnimationFrame(refreshRaf);
    resizeObserver?.disconnect();
    window.removeEventListener("scroll", updateProgressFromCache);
    window.removeEventListener("resize", updateDimensions);
    context.revert();
    if (tick) gsap.ticker.remove(tick);
    lenisRef.current = null;
    lenis?.destroy();
  };
}
