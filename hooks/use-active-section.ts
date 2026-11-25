"use client";

import { useEffect, useState } from "react";

/**
 * Returns the id of the section currently crossing the reading line (35% from the top of the viewport).
 * Uses one IntersectionObserver with a thin horizontal band, so it costs nothing per scroll frame.
 */
export function useActiveSection(ids: string[]): string | null {
  const [active, setActive] = useState<string | null>(null);
  const key = ids.join("|");

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const els = key
      .split("|")
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (els.length === 0) return;

    const visible = new Map<string, boolean>();
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => visible.set(e.target.id, e.isIntersecting));
        const current = els.find((el) => visible.get(el.id));
        setActive(current ? current.id : null);
      },
      { rootMargin: "-35% 0px -64% 0px", threshold: 0 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [key]);

  return active;
}
