import type React from "react";

/**
 * Allows Space key to activate native anchor (<a>) elements consistently alongside Enter.
 */
export function activateAnchorOnSpace(e: React.KeyboardEvent<HTMLAnchorElement>): void {
  if (e.key === " " || e.key === "Spacebar") {
    e.preventDefault();
    e.currentTarget.click();
  }
}

/**
 * Computes the next focus index for arrow/Home/End keyboard navigation with wrap-around.
 * Returns null if the pressed key is not a roving navigation key or list is empty.
 */
export function getNextRovingIndex(
  currentIndex: number,
  length: number,
  key: string,
  orientation: "vertical" | "horizontal" = "vertical"
): number | null {
  if (length <= 0) return null;
  const safeCurrent = currentIndex >= 0 && currentIndex < length ? currentIndex : 0;

  const nextKey = orientation === "vertical" ? "ArrowDown" : "ArrowRight";
  const prevKey = orientation === "vertical" ? "ArrowUp" : "ArrowLeft";

  if (key === nextKey) {
    return (safeCurrent + 1) % length;
  }
  if (key === prevKey) {
    return (safeCurrent - 1 + length) % length;
  }
  if (key === "Home") {
    return 0;
  }
  if (key === "End") {
    return length - 1;
  }
  return null;
}

/**
 * Returns visible, keyboard-focusable elements within a container in DOM order.
 */
export function getFocusableElements(container: HTMLElement | null): HTMLElement[] {
  if (!container) return [];
  const selector = [
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    "[tabindex]:not([tabindex='-1'])",
  ].join(", ");

  return Array.from(container.querySelectorAll<HTMLElement>(selector)).filter(
    (el) => !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true"
  );
}

/**
 * Computes Lenis scroll offset for a hash anchor accounting for a fixed header.
 */
export function getAnchorScrollOffset(hash: string, navHeightPx: number): number {
  if (!hash || hash === "#" || hash === "#top") return 0;
  return -Math.max(0, navHeightPx);
}

/** Breathing room between the bottom of the fixed header and an anchored section's top edge. */
export const ANCHOR_GAP_PX = 16;

/**
 * Absolute document Y to scroll to so an anchored section lands exactly `header height + gap`
 * below the viewport top. Computed from the element's live rect plus the real window.scrollY
 * (never a smooth-scroller's cached position), so a stale cache can't park a heading under the
 * header. Clamped to the scrollable range.
 */
export function getAnchorTargetY(
  hash: string,
  elementTopInViewport: number,
  currentScrollY: number,
  navHeightPx: number,
  maxScrollY: number = Number.POSITIVE_INFINITY,
  gapPx: number = ANCHOR_GAP_PX
): number {
  if (!hash || hash === "#" || hash === "#top") return 0;
  const raw = elementTopInViewport + currentScrollY - Math.max(0, navHeightPx) - Math.max(0, gapPx);
  return Math.round(Math.min(Math.max(0, raw), Math.max(0, maxScrollY)));
}
