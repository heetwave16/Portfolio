"use client";

import { useEffect, useState, type RefObject } from "react";

/**
 * Sets `data-revealed` on the element (and returns true) the first time it enters the viewport.
 * One IntersectionObserver per element, disconnected after the first hit.
 */
export function useInViewOnce<T extends Element>(
  ref: RefObject<T | null>,
  options: { rootMargin?: string; threshold?: number; disabled?: boolean } = {}
): boolean {
  const { rootMargin = "0px 0px -12% 0px", threshold = 0.15, disabled = false } = options;
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (disabled) return;
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      el.setAttribute("data-revealed", "");
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          el.setAttribute("data-revealed", "");
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin, threshold }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, rootMargin, threshold, disabled]);

  return inView;
}
