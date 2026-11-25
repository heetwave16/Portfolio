"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { markIntroComplete, PRELOADER_SESSION_KEY, restoreBootState } from "@/src/lib/boot";

const MIN_MS = 900;
const CAP_MS = 1200; // curtain starts lifting by 1.2s at the latest — never blocks beyond 2s
const EXIT_MS = 800; // 0.7s lift + 0.1s stagger

function loadImage(src: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = src;
  });
}

/**
 * First-visit preloader (Camille Mormal pattern): huge wordmark, thin progress line,
 * JetBrains Mono percentage driven by real asset loading (fonts, hero portraits, window load).
 * Skipped entirely under prefers-reduced-motion and on repeat visits in the same session
 * (decided by the inline boot script before first paint, so nothing flashes).
 */
export default function Preloader() {
  const [state, setState] = useState<"idle" | "loading" | "exit" | "gone">("idle");
  const counterRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    restoreBootState();
  }, []);

  useEffect(() => {
    if (window.__hmPreload !== "run" || window.__hmIntroDone) {
      markIntroComplete();
      const id = window.setTimeout(() => setState("gone"), 0);
      return () => window.clearTimeout(id);
    }

    try {
      window.sessionStorage.setItem(PRELOADER_SESSION_KEY, "1");
    } catch {
      /* storage blocked: loader simply plays again next time */
    }

    const startId = window.setTimeout(() => setState("loading"), 0);
    const start = performance.now();
    let done = 0;
    const tasks: Array<Promise<unknown>> = [
      document.fonts?.ready ?? Promise.resolve(),
      loadImage("/img/hero/portrait-real.jpg"),
      loadImage("/img/hero/portrait-wireframe.jpg"),
      document.readyState === "complete"
        ? Promise.resolve()
        : new Promise<void>((r) => window.addEventListener("load", () => r(), { once: true })),
    ];
    const total = tasks.length;
    tasks.forEach((t) => t.then(() => (done += 1)));

    let shown = 0;
    let raf = 0;
    let finished = false;

    const finish = () => {
      if (finished) return;
      finished = true;
      setState("exit");
      // Reveal hero content as the curtain starts to lift.
      markIntroComplete();
      window.setTimeout(() => setState("gone"), EXIT_MS);
    };

    const tick = () => {
      const elapsed = performance.now() - start;
      const loadRatio = done / total;
      const timeRatio = Math.min(1, elapsed / CAP_MS);
      // Real progress leads; time guarantees we never stall past the cap.
      const target = Math.min(100, Math.max(loadRatio * 100 * Math.min(1, elapsed / MIN_MS), timeRatio * 100));
      shown += (target - shown) * 0.18;
      if (target >= 100 && shown > 99.5) shown = 100;
      const pct = Math.round(shown);
      if (counterRef.current) counterRef.current.textContent = String(pct).padStart(3, "0");
      if (barRef.current) barRef.current.style.transform = `scaleX(${(shown / 100).toFixed(4)})`;
      if (pct >= 100 || elapsed >= CAP_MS + 150) {
        finish();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      window.clearTimeout(startId);
      cancelAnimationFrame(raf);
    };
  }, []);

  if (state === "gone") return null;

  return (
    <div
      className="preloader fixed inset-0 z-[var(--z-preloader)]"
      data-state={state}
      role="status"
      aria-live="polite"
      aria-label="Loading Heet Mehta's portfolio"
    >
      <div aria-hidden="true" className="preloader-panel" data-side="left" />
      <div aria-hidden="true" className="preloader-panel" data-side="right" />
      <div className="preloader-content absolute inset-0 flex flex-col justify-between px-[var(--space-edge)] py-8 text-[#E6EED6]">
        <div className="font-mono-data flex items-center justify-between text-[11px] tracking-[0.12em] uppercase text-[#B3B6B7]">
          <span>github.com/heetwave16</span>
          <span>Pune, IN</span>
        </div>
        <div>
          <p
            className="font-display font-bold tracking-[-0.04em] leading-[0.85]"
            style={{ fontSize: "clamp(3.25rem, 13vw, 13rem)" }}
          >
            HEET <span className="text-[#DF2A36]">MEHTA</span>
          </p>
          <div className="mt-8 flex items-end justify-between gap-6">
            <div className="relative h-px flex-1 overflow-hidden bg-[#E6EED6]/15">
              <div ref={barRef} className="absolute inset-0 origin-left scale-x-0 bg-[#DF2A36]" />
            </div>
            <span className="font-mono-data text-sm tabular-nums tracking-[0.08em] text-[#E6EED6]">
              <span ref={counterRef}>000</span>%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
