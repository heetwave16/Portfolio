"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowDown, FileText } from "lucide-react";
import content from "@/src/content/content.json";
import { SITE_CONFIG } from "@/src/config";

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
      <div className="mx-auto grid w-full min-w-0 max-w-[1440px] grid-cols-1 gap-10 px-[var(--space-edge)] pt-[var(--space-section-standard)] pb-[var(--space-section-standard)] lg:grid-cols-12 lg:items-center lg:gap-12 lg:pt-[var(--space-section-wide)] lg:pb-[var(--space-section-standard)]">
        {/* Content — 7 cols */}
        <div className="min-w-0 lg:col-span-7">
          {/* One line at every width ≥ 320px: below 380px the badge tightens (10px, 0.02em, slimmer padding). */}
          <p className="font-mono-data inline-flex min-h-[32px] max-w-full items-center gap-1.5 rounded-full border border-[var(--border-strong)] px-2.5 text-[length:var(--text-micro)] tracking-[0.02em] whitespace-nowrap text-[var(--text)] uppercase min-[380px]:gap-2.5 min-[380px]:px-3.5 min-[380px]:tracking-[var(--tracking-mono)] sm:text-[length:var(--text-ui)]">
            <span aria-hidden="true" className="inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
            {hero.availability}
          </p>

          <p className="font-mono-data mt-6 text-[length:var(--text-ui)] tracking-[var(--tracking-mono)] text-[var(--text-muted)] uppercase">
            {hero.kicker}
          </p>

          <h1
            ref={headingRef}
            id="hero-heading"
            data-rt="hero"
            aria-label={`${hero.firstName} ${hero.lastName}`}
            className="font-display mt-3 font-bold text-[var(--text)]"
            style={{ fontSize: "var(--text-mega)", lineHeight: "var(--leading-mega)", letterSpacing: "-0.03em" }}
          >
            <span className="block">
              <span className="rt-w" aria-hidden="true">
                <span className="rt-i" style={{ ["--i" as string]: 0 } as React.CSSProperties}>
                  {hero.firstName}
                </span>
              </span>
            </span>
            {" "}
            <span className="block">
              <span className="rt-w" aria-hidden="true">
                <span className="rt-i text-[var(--accent)]" style={{ ["--i" as string]: 1 } as React.CSSProperties}>
                  {hero.lastName}
                </span>
              </span>
            </span>
          </h1>

          <p className="mt-6 max-w-[34ch] text-[length:var(--text-lead)] leading-[1.35] text-[var(--text)]">
            {hero.positioning}
          </p>

          <p className="mt-4 text-[length:var(--text-ui)] text-[var(--text-muted)] tabular-nums">
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
          </div>
        </div>

        {/* Portrait — 5 cols; after the headline block on mobile */}
        <div className="min-w-0 lg:col-span-5">
          <button
            type="button"
            aria-pressed={linesOn}
            onClick={() => setLinesOn((v) => !v)}
            className="portrait-reveal ui-press group relative mx-auto block aspect-[5/6] max-h-[40vh] w-auto max-w-full overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-[var(--surface)] lg:max-h-none lg:w-full lg:max-w-[440px]"
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
        </div>
      </div>
    </section>
  );
}
