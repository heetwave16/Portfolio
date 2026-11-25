"use client";

import React from "react";

interface ScrollProgressIndicatorProps {
  trackRef: React.RefObject<HTMLDivElement | null>;
  barRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Subtle, fixed top-of-viewport reading/scroll progress indicator.
 * Driven externally via GPU-composited `scaleX` writes on `barRef`
 * so scrolling stays lossless at 60fps with zero React re-renders.
 */
export default function ScrollProgressIndicator({
  trackRef,
  barRef,
}: ScrollProgressIndicatorProps) {
  return (
    <div
      ref={trackRef}
      role="progressbar"
      aria-label="Page scroll progress"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={0}
      data-testid="scroll-progress-track"
      data-progress="0"
      className="pointer-events-none fixed top-0 right-0 left-0 z-[105] h-[3px] bg-[var(--border)]"
    >
      <div
        ref={barRef}
        data-testid="scroll-progress-line"
        className="h-full w-full origin-left scale-x-0 bg-[var(--accent)]"
      />
    </div>
  );
}
