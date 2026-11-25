"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { ArrowUpRight, Star } from "lucide-react";
import content from "@/src/content/content.json";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useMotionBisect } from "@/hooks/use-motion-bisect";
import { createBezierEase, getMotionTokens } from "@/src/lib/motion";
import { activateAnchorOnSpace } from "@/src/lib/keyboard";
import type { ProjectCardModel } from "@/src/types/portfolio";

interface WhatIBuildSectionProps {
  onFocusRepo: (repoName: string) => void;
  projects: ProjectCardModel[];
}

function MiniSparkline({ counts }: { counts: number[] }) {
  const safeCounts = counts.length > 0 ? counts : [0, 0, 0, 0, 0, 0, 0];
  const max = Math.max(1, ...safeCounts);
  const w = 88;
  const h = 24;
  const step = w / Math.max(1, safeCounts.length - 1);
  const points = safeCounts
    .map((val, idx) => {
      const x = idx * step;
      const y = h - 3 - (val / max) * (h - 6);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true" className="overflow-visible">
      <polyline
        fill="none"
        stroke="var(--accent)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

export default function WhatIBuildSection({ onFocusRepo, projects }: WhatIBuildSectionProps) {
  const reducedMotion = useReducedMotion();
  const bisect = useMotionBisect();
  const hoverThumbDisabled = reducedMotion || bisect.hoverThumb;
  const thumbRef = useRef<HTMLDivElement>(null);
  const quickXRef = useRef<((val: number) => void) | null>(null);
  const quickYRef = useRef<((val: number) => void) | null>(null);
  const [desktopHoverCapable, setDesktopHoverCapable] = useState(false);
  const [activeIndex, setActiveIndex] = useState<string | null>(null);

  const projectByRepo = useMemo(() => {
    const map = new Map<string, ProjectCardModel>();
    for (const p of projects) {
      map.set(p.repoName.toLowerCase(), p);
    }
    return map;
  }, [projects]);

  useEffect(() => {
    if (hoverThumbDisabled) {
      const id = setTimeout(() => {
        setDesktopHoverCapable(false);
        setActiveIndex(null);
      }, 0);
      return () => clearTimeout(id);
    }

    const updateCapable = () => {
      const isFineDesktop =
        window.matchMedia("(pointer: fine) and (hover: hover)").matches &&
        window.innerWidth >= 1024;
      setDesktopHoverCapable(isFineDesktop);
    };

    updateCapable();
    const handleScroll = () => setActiveIndex((prev) => (prev === null ? prev : null));
    window.addEventListener("resize", updateCapable);
    window.addEventListener("scroll", handleScroll, { passive: true });

    if (thumbRef.current) {
      const tokens = getMotionTokens();
      const snappyEase = createBezierEase(tokens.easeSnappy);
      quickXRef.current = gsap.quickTo(thumbRef.current, "x", {
        duration: tokens.fastSec,
        ease: snappyEase,
      });
      quickYRef.current = gsap.quickTo(thumbRef.current, "y", {
        duration: tokens.fastSec,
        ease: snappyEase,
      });
    }

    return () => {
      window.removeEventListener("resize", updateCapable);
      window.removeEventListener("scroll", handleScroll);
      quickXRef.current = null;
      quickYRef.current = null;
    };
  }, [hoverThumbDisabled]);

  const moveThumbnail = (clientX: number, clientY: number) => {
    if (!desktopHoverCapable || hoverThumbDisabled) return;
    const cardW = 280;
    const cardH = 248;
    const x = Math.min(window.innerWidth - cardW - 24, clientX + 24);
    const y = Math.max(80, Math.min(window.innerHeight - cardH - 24, clientY - cardH / 2));
    quickXRef.current?.(x);
    quickYRef.current?.(y);
  };

  const activeItem = content.whatIBuild.items.find((it) => it.index === activeIndex) || null;
  const activeProject = activeItem
    ? projectByRepo.get(activeItem.repoTarget.toLowerCase()) || null
    : null;

  const handleRowSpotlight = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    e.currentTarget.style.setProperty("--mx", `${x}%`);
    e.currentTarget.style.setProperty("--my", `${y}%`);
  };

  return (
    <section
      id="what-i-build"
      tabIndex={-1}
      className="relative border-b border-[var(--border)] py-[var(--space-section)] focus:outline-none"
    >
      <div className="mx-auto max-w-[1440px] px-[var(--space-edge)]">
        <div
          data-reveal
          className="mb-12 flex flex-col justify-between gap-4 md:flex-row md:items-end"
        >
          <div className="max-w-2xl">
            <p className="font-mono-data mb-2 text-xs tracking-[var(--tracking-mono)] text-[var(--text-muted)] uppercase">
              ACT III // {content.whatIBuild.eyebrow}
            </p>
            <h2
              className="font-display font-semibold tracking-tight text-[var(--text)]"
              style={{
                fontSize: "var(--text-h2)",
                lineHeight: "var(--leading-tight)",
                textWrap: "balance",
              }}
            >
              {content.whatIBuild.heading}
            </h2>
          </div>

          <p className="font-mono-data text-[11px] tracking-[var(--tracking-mono)] uppercase text-[var(--text-muted)]">
            SELECT ANY DISCIPLINE TO FOCUS ITS REPOSITORY IN THE STRIP ↑
          </p>
        </div>

        <div
          className="divide-y divide-[var(--border)] border-t border-b border-[var(--border)]"
          onPointerLeave={() => setActiveIndex(null)}
        >
          {content.whatIBuild.items.map((item) => (
            <div
              key={item.index}
              data-reveal
              data-testid={`what-i-build-row-${item.index}`}
              onPointerEnter={(e) => {
                if (e.pointerType !== "mouse" || !desktopHoverCapable || hoverThumbDisabled) return;
                setActiveIndex(item.index);
                moveThumbnail(e.clientX, e.clientY);
              }}
              onPointerMove={(e) => {
                handleRowSpotlight(e);
                if (e.pointerType !== "mouse" || !desktopHoverCapable || hoverThumbDisabled) return;
                moveThumbnail(e.clientX, e.clientY);
              }}
              className="group relative grid grid-cols-1 items-baseline gap-4 overflow-hidden py-7 transition-colors duration-[var(--duration-fast)] [transition-timing-function:var(--ease-snappy)] hover:bg-[var(--surface)]/55 md:grid-cols-12 md:gap-6 md:px-3"
            >
              {/* cursor-tracking radial spotlight */}
              <span
                aria-hidden="true"
                className="row-spotlight pointer-events-none absolute inset-0 z-0 opacity-0 transition-opacity duration-[var(--duration-fast)] group-hover:opacity-100"
              />

              <span className="relative z-[1] font-mono-data text-xs text-[var(--text-muted)] transition-colors duration-[var(--duration-fast)] [transition-timing-function:var(--ease-snappy)] group-hover:text-[var(--text)] md:col-span-1">
                {item.index}.
              </span>

              <h3 className="relative z-[1] font-display text-xl font-semibold tracking-[-0.02em] text-[var(--text)] transition-transform duration-[var(--duration-fast)] [transition-timing-function:var(--ease-snappy)] group-hover:translate-x-2 md:col-span-4 sm:text-2xl">
                {item.title}
              </h3>

              <p className="relative z-[1] text-sm text-[var(--text-muted)] md:col-span-5 md:text-base">
                {item.summary}
              </p>

              <div className="relative z-[1] flex items-center md:col-span-2 md:justify-end">
                <a
                  href="#projects"
                  onClick={(e) => {
                    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                    e.preventDefault();
                    e.stopPropagation();
                    onFocusRepo(item.repoTarget);
                  }}
                  onKeyDown={activateAnchorOnSpace}
                  className="font-mono-data inline-flex min-h-[40px] items-center gap-1.5 text-xs font-medium tracking-[0.04em] text-[var(--text)] underline-offset-4 transition-colors duration-[var(--duration-fast)] hover:text-[var(--text-muted)] hover:underline whitespace-nowrap"
                >
                  <span>{item.repoTarget}</span>
                  <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-[var(--duration-fast)] [transition-timing-function:var(--ease-snappy)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Desktop-only hover-follow editorial preview card */}
      {!hoverThumbDisabled && (
        <div
          ref={thumbRef}
          data-testid="what-i-build-thumbnail"
          aria-hidden="true"
          className={`pointer-events-none fixed top-0 left-0 z-[var(--z-overlay)] hidden w-[280px] border border-[var(--border-strong)] bg-[var(--surface)] shadow-2xl transition-[opacity,transform] duration-[var(--duration-fast)] [transition-timing-function:var(--ease-snappy)] edge-hairline lg:block ${
            desktopHoverCapable && activeItem ? "scale-100 opacity-100" : "scale-95 opacity-0"
          }`}
        >
          {activeItem && (
            <div>
              {activeProject?.image && (
                <div className="h-[132px] w-full overflow-hidden border-b border-[var(--border)] bg-black">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={activeProject.image}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
              <div className="space-y-3 p-4">
                <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                  <span className="font-mono-data">
                    {activeItem.index} {"//"} {activeItem.categoryFilter}
                  </span>
                  {activeProject && (
                    <span className="font-mono-data inline-flex items-center gap-1 tabular-nums">
                      <Star className="h-3 w-3" />
                      {activeProject.stargazerCount}
                    </span>
                  )}
                </div>

                <div>
                  <p className="font-display text-lg font-semibold tracking-[-0.02em] text-[var(--text)]">
                    {activeProject?.title || activeItem.repoTarget}
                  </p>
                  <p className="font-mono-data mt-0.5 text-[11px] text-[var(--text-muted)]">
                    {activeProject?.primaryLanguage?.name || activeItem.repoTarget}
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-[var(--border)] pt-2.5">
                  <span className="font-mono-data text-[10px] uppercase tracking-[var(--tracking-mono)] text-[var(--text-muted)]">
                    7d activity
                  </span>
                  <MiniSparkline counts={activeProject?.weeklyCommitCounts || []} />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
