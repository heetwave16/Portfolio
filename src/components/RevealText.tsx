"use client";

import React, { useRef } from "react";
import { useInViewOnce } from "@/hooks/use-in-view-once";
import { splitTextWithWhitespace } from "@/src/lib/typography";

type Variant = "mask" | "quiet";

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
 * - "mask": each word rises from a clipped mask (translateY 110% → 0, 28ms stagger, 280ms ease-out)
 * - "quiet": fade + 16px rise + an optional thin rule drawing in
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
  useInViewOnce(ref);

  const Tag = as as React.ElementType;
  const tokens = splitTextWithWhitespace(text);
  const accent = new Set(accentWords);
  const mergedStyle = { ...(style || {}), ["--rt-delay" as string]: `${delayMs}ms` } as React.CSSProperties;

  if (variant === "quiet") {
    return (
      <>
        <Tag ref={ref} id={id} data-rt="quiet" className={className} style={mergedStyle}>
          {tokens.map((token, i) => {
            if (/^\s+$/u.test(token)) {
              return <React.Fragment key={`space-${i}`}>{token}</React.Fragment>;
            }
            return (
              <React.Fragment key={`${token}-${i}`}>
                {accent.has(token) ? <span className="text-[var(--accent)]">{token}</span> : token}
              </React.Fragment>
            );
          })}
        </Tag>
        {rule ? <span aria-hidden="true" className="rt-rule" /> : null}
      </>
    );
  }

  let wordIndex = 0;
  return (
    <Tag ref={ref} id={id} data-rt={variant} className={className} style={mergedStyle} aria-label={text}>
      {tokens.map((token, i) => {
        if (/^\s+$/u.test(token)) {
          return <React.Fragment key={`space-${i}`}>{token}</React.Fragment>;
        }
        const index = wordIndex++;
        return (
          <span className="rt-w" aria-hidden="true" key={`${token}-${i}`}>
            <span
              className={`rt-i${accent.has(token) ? " text-[var(--accent)]" : ""}`}
              style={{ ["--i" as string]: index } as React.CSSProperties}
            >
              {token}
            </span>
          </span>
        );
      })}
    </Tag>
  );
}
