"use client";

import React, { useEffect, useRef } from "react";
import { useInViewOnce } from "@/hooks/use-in-view-once";
import { onIntroComplete } from "@/src/lib/boot";

type Variant = "mask" | "quiet" | "hero";

interface RevealTextProps {
  text: string;
  as?: "h1" | "h2" | "h3" | "p" | "span";
  variant?: Variant;
  /** Words (exact, including punctuation) to paint in the red accent. */
  accentWords?: string[];
  className?: string;
  style?: React.CSSProperties;
  id?: string;
  /** Draw a thin rule under quiet headings (Santalarch). */
  rule?: boolean;
  /** Extra delay before the stagger starts (ms). */
  delayMs?: number;
}

/**
 * The site's default text animation.
 * - "hero" / "mask": each word rises from a clipped mask (translateY 110% → 0, 60ms stagger, 0.7s ease-out)
 * - "quiet": fade + 16px rise + a thin rule drawing in (for light/cream sections)
 * Under prefers-reduced-motion the CSS turns every variant into a plain fade/instant reveal.
 */
export default function RevealText({
  text,
  as = "h2",
  variant = "mask",
  accentWords = [],
  className,
  style,
  id,
  rule = false,
  delayMs = 0,
}: RevealTextProps) {
  const ref = useRef<HTMLElement>(null);
  useInViewOnce(ref, { disabled: variant === "hero" });

  useEffect(() => {
    if (variant !== "hero") return;
    return onIntroComplete(() => {
      // two frames so the masked start state is committed before transitioning
      requestAnimationFrame(() =>
        requestAnimationFrame(() => ref.current?.setAttribute("data-revealed", ""))
      );
    });
  }, [variant]);

  const Tag = as as React.ElementType;
  const words = text.split(/\s+/).filter(Boolean);
  const accent = new Set(accentWords);
  const mergedStyle = { ...(style || {}), ["--rt-delay" as string]: `${delayMs}ms` } as React.CSSProperties;

  if (variant === "quiet") {
    return (
      <>
        <Tag ref={ref} id={id} data-rt="quiet" className={className} style={mergedStyle}>
          {words.map((w, i) => (
            <React.Fragment key={`${w}-${i}`}>
              {accent.has(w) ? <span className="text-[var(--accent)]">{w}</span> : w}
              {i < words.length - 1 ? " " : null}
            </React.Fragment>
          ))}
        </Tag>
        {rule ? <span aria-hidden="true" className="rt-rule" /> : null}
      </>
    );
  }

  return (
    <Tag ref={ref} id={id} data-rt={variant} className={className} style={mergedStyle} aria-label={text}>
      {words.map((w, i) => (
        <React.Fragment key={`${w}-${i}`}>
          <span className="rt-w" aria-hidden="true">
            <span
              className={`rt-i${accent.has(w) ? " text-[var(--accent)]" : ""}`}
              style={{ ["--i" as string]: i } as React.CSSProperties}
            >
              {w}
            </span>
          </span>
          {i < words.length - 1 ? " " : null}
        </React.Fragment>
      ))}
    </Tag>
  );
}
