"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Counts from 0 → target once `start` turns true. Before that it returns the TARGET (never "0"),
 * so server HTML, no-JS and reduced-motion visitors always see the real number.
 */
export function useCountUp(target: number, start: boolean, durationMs = 1100): number {
  const [value, setValue] = useState(target);
  const playedRef = useRef(false);

  useEffect(() => {
    if (!start || playedRef.current) {
      if (!start) setValue(target);
      return;
    }
    playedRef.current = true;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || target <= 0) {
      setValue(target);
      return;
    }
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [start, target, durationMs]);

  // after the animation has played, track later data updates directly
  useEffect(() => {
    if (playedRef.current) setValue(target);
  }, [target]);

  return value;
}
