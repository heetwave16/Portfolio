"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowDown, FileText } from "lucide-react";
import content from "@/src/content/content.json";
import { SITE_CONFIG } from "@/src/config";
import SocialLinks from "./SocialLinks";

const hero = content.hero;

/**
 * One-screen hero. No pinning, no scroll-scrubbed sequence, no frame counter, no stats strip.
 * Order (mobile + desktop): badge → eyebrow → name → positioning line → proof line → CTAs → portrait.
 * The portrait reveals a line-work rendering of the SAME photo on hover (fine pointers) or tap.
 */
export default function HeroSection() {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [linesOn, setLinesOn] = useState(false);

  // One-time masked name reveal; CSS failsafe + html.js gating mean it can never stay hidden.
  useEffect(() => {
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => headingRef.current?.setAttribute("data-revealed", ""))
    );
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <section
      id="top"
      aria-labelledby="hero-heading"
      className="relative flex items-center border-b border-[var(--border)] pt-[var(--nav-height)]"
    >
      <div className="mx-auto grid w-full max-w-[1440px] grid-cols-1 gap-10 px-[var(--space-edge)] pt-10 pb-10 lg:grid-cols-12 lg:items-center lg:gap-12 lg:pt-14 lg:pb-12">
        {/* Content — 7 cols */}
        <div className="lg:col-span-7">
          {/* One line at every width ≥ 320px: below 380px the badge tightens (10px, 0.02em, slimmer padding). */}
          <p className="font-mono-data inline-flex min-h-[32px] max-w-full items-center gap-1.5 rounded-full border border-[var(--border-strong)] px-2.5 text-[10px] tracking-[0.02em] whitespace-nowrap text-[var(--text)] uppercase min-[380px]:gap-2.5 min-[380px]:px-3.5 min-[380px]:text-[11px] min-[380px]:tracking-[var(--tracking-mono)] sm:text-xs">
            <span aria-hidden="true" className="alive-dot relative inline-flex h-2 w-2 shrink-0 rounded-full bg-[var(--status-green)]" />
            {hero.availability}
          </p>

          <p className="font-mono-data mt-6 text-xs tracking-[var(--tracking-mono)] text-[var(--text-muted)] uppercase">
            {hero.kicker}
          </p>

          <h1
            ref={headingRef}
            id="hero-heading"
            data-rt="hero"
            aria-label={`${hero.firstName} ${hero.lastName}`}
            className="font-display mt-3 font-bold text-[var(--text)]"
            style={{ fontSize: "clamp(4rem, 11vw, 8.25rem)", lineHeight: 0.95, letterSpacing: "-0.03em" }}
          >
            <span className="block">
              <span className="rt-w" aria-hidden="true">
                <span className="rt-i" style={{ ["--i" as string]: 0 } as React.CSSProperties}>
                  {hero.firstName}
                </span>
              </span>
            </span>
            <span className="block">
              <span className="rt-w" aria-hidden="true">
                <span className="rt-i text-[var(--accent)]" style={{ ["--i" as string]: 1 } as React.CSSProperties}>
                  {hero.lastName}
                </span>
              </span>
            </span>
          </h1>

          <p className="mt-6 max-w-[34ch] text-[clamp(1.25rem,2.2vw,1.75rem)] leading-[1.35] text-[var(--text)]">
            {hero.positioning}
          </p>

          <p className="mt-4 text-sm text-[var(--text-muted)] tabular-nums">
            Builder of{" "}
            <a href={hero.proof.hackstackUrl} target="_blank" rel="noopener noreferrer" className="proof-link">
              HackStack
            </a>{" "}
            &amp;{" "}
            <a href={hero.proof.slateUrl} target="_blank" rel="noopener noreferrer" className="proof-link">
              Slate Vision CLI
            </a>
            <span aria-hidden="true"> · </span>
            <a href={hero.proof.prUrl} target="_blank" rel="noopener noreferrer" className="proof-link">
              1 merged open-source PR
            </a>
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a href="#projects" className="btn-split btn-primary">
              <span className="btn-label">{hero.primaryCta}</span>
              <span className="btn-arrow" aria-hidden="true">
                <ArrowDown className="h-4 w-4" />
              </span>
            </a>
            <a
              href={SITE_CONFIG.resumePath}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-split btn-outline"
              aria-label="Resume (PDF, opens in a new tab)"
            >
              <span className="btn-label">{hero.secondaryCta}</span>
              <span className="btn-arrow" aria-hidden="true">
                <FileText className="h-4 w-4" />
              </span>
            </a>
            <SocialLinks className="sm:ml-2" />
          </div>
        </div>

        {/* Portrait — 5 cols; after the headline block on mobile */}
        <div className="lg:col-span-5">
          <button
            type="button"
            aria-pressed={linesOn}
            onClick={() => setLinesOn((v) => !v)}
            className="portrait-reveal ui-press group relative mx-auto block aspect-[5/6] max-h-[40vh] w-auto overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-[var(--surface)] lg:max-h-none lg:w-full lg:max-w-[440px]"
            data-lines={linesOn ? "on" : "off"}
          >
            <span className="sr-only">
              {linesOn ? "Show the photo" : "Show the line-work version of the portrait"}
            </span>
            <Image
              src="/img/hero/portrait.webp"
              alt={hero.realPortraitAlt}
              width={720}
              height={864}
              priority
              fetchPriority="high"
              sizes="(max-width: 1024px) 40vh, 440px"
              className="h-full w-full object-cover"
            />
            <Image
              src="/img/hero/portrait-lines.webp"
              alt=""
              aria-hidden="true"
              width={720}
              height={864}
              sizes="(max-width: 1024px) 40vh, 440px"
              className="portrait-lines absolute inset-0 h-full w-full object-cover"
            />
          </button>
          <p className="font-mono-data mt-3 text-center text-[11px] text-[var(--text-muted)] lg:max-w-[440px] lg:mx-auto">
            <span className="hidden [@media(hover:hover)]:inline">{hero.wireframeHint}</span>
            <span className="[@media(hover:hover)]:hidden">{hero.wireframeHintTouch}</span>
          </p>
        </div>
      </div>
    </section>
  );
}
