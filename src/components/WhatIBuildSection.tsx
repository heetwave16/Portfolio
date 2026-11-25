"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { ArrowUpRight, Bot, Gamepad2, LayoutTemplate, SquareTerminal, type LucideIcon } from "lucide-react";
import content from "@/src/content/content.json";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useMotionBisect } from "@/hooks/use-motion-bisect";
import { createBezierEase, getMotionTokens } from "@/src/lib/motion";
import { activateAnchorOnSpace } from "@/src/lib/keyboard";
import { useLenisScroll } from "./ShellProviders";
import RevealText from "./RevealText";

const ROW_ICONS: Record<string, LucideIcon> = {
  AI: Bot,
  CLI: SquareTerminal,
  Web: LayoutTemplate,
  Games: Gamepad2,
};
import type { ProjectCardModel } from "@/src/types/portfolio";

interface WhatIBuildSectionProps {
  onSelectCategory: (category: string) => void;
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
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

export default function WhatIBuildSection({ onSelectCategory, projects }: WhatIBuildSectionProps) {
  const reducedMotion = useReducedMotion();
  const bisect = useMotionBisect();
  const hoverThumbDisabled = reducedMotion || bisect.hoverThumb;
  const { scrollToAnchor } = useLenisScroll();
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
    const cardW = 264;
    const cardH = 300;
    const x = Math.min(window.innerWidth - cardW - 20, clientX + 24);
    const y = Math.max(80, Math.min(window.innerHeight - cardH - 20, clientY - cardH / 2));
    quickXRef.current?.(x);
    quickYRef.current?.(y);
  };

  const activeItem = content.whatIBuild.items.find((it) => it.index === activeIndex) || null;
  const activeProject = activeItem
    ? projectByRepo.get(activeItem.repoTarget.toLowerCase()) || null
    : null;

  const handleRowSpotlight = (e: React.PointerEvent<HTMLElement>) => {
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
        <div data-reveal className="mb-10 max-w-2xl">
          <p className="font-mono-data mb-2 text-xs tracking-[var(--tracking-mono)] text-[var(--text-muted)] uppercase">
            {content.whatIBuild.eyebrow}
          </p>
          <RevealText
            text={content.whatIBuild.heading}
            className="font-display font-semibold tracking-tight text-[var(--text)]"
            style={{
              fontSize: "var(--text-h2)",
              lineHeight: "var(--leading-tight)",
              textWrap: "balance",
            }}
          />
        </div>

        <div
          className="divide-y divide-[var(--border)] border-t border-b border-[var(--border)]"
          onPointerLeave={() => setActiveIndex(null)}
        >
          {content.whatIBuild.items.map((item) => {
            const Icon = ROW_ICONS[item.categoryFilter] ?? ArrowUpRight;
            const project = projectByRepo.get(item.repoTarget.toLowerCase());
            return (
              // Whole row is one link (§4): click anywhere → Projects, pre-filtered to this category.
              <a
                key={item.index}
                href="#projects"
                data-reveal
                data-testid={`what-i-build-row-${item.index}`}
                aria-label={`${item.title} — see ${item.categoryFilter} projects`}
                onClick={(e) => {
                  onSelectCategory(item.categoryFilter);
                  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                  e.preventDefault();
                  scrollToAnchor("#projects", { focusTarget: true, updateHistory: true });
                }}
                onKeyDown={activateAnchorOnSpace}
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
                className="group relative grid grid-cols-[auto_1fr_auto] items-center gap-x-4 gap-y-2 overflow-hidden py-6 transition-colors duration-[var(--duration-fast)] [transition-timing-function:var(--ease-snappy)] hover:bg-[var(--surface)]/35 focus-visible:bg-[var(--surface)]/35 md:grid-cols-12 md:gap-6 md:px-2"
              >
                {/* cursor-tracking radial spotlight */}
                <span
                  aria-hidden="true"
                  className="row-spotlight pointer-events-none absolute inset-0 z-0 opacity-0 transition-opacity duration-[var(--duration-fast)] group-hover:opacity-100"
                />

                <span className="relative z-[1] flex items-center gap-3 md:col-span-1">
                  <span className="font-mono-data hidden text-xs text-[var(--text-muted)] transition-colors group-hover:text-[var(--text)] md:inline">
                    {item.index}
                  </span>
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border-strong)] text-[var(--text)] transition-colors duration-200 group-hover:border-[var(--accent)] group-hover:text-[var(--accent-text)]">
                    <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden="true" />
                  </span>
                </span>

                <h3 className="relative z-[1] font-display text-xl font-semibold text-[var(--text)] transition-transform duration-[var(--duration-fast)] [transition-timing-function:var(--ease-snappy)] group-hover:translate-x-2 md:col-span-4 md:text-2xl">
                  <span className="u-draw pb-0.5">{item.title}</span>
                </h3>

                <span className="relative z-[1] inline-flex h-10 w-10 items-center justify-center justify-self-end rounded-full border border-[var(--border-strong)] text-[var(--text)] transition-[transform,background-color,border-color,color] duration-300 group-hover:rotate-45 group-hover:border-[var(--accent)] group-hover:bg-[var(--accent)] group-hover:text-[var(--on-accent)] md:order-last md:col-span-1">
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </span>

                <p className="relative z-[1] col-span-3 text-sm text-[var(--text-muted)] md:col-span-4 md:text-base">
                  {item.summary}
                </p>

                <span className="font-mono-data relative z-[1] col-span-3 text-xs text-[var(--text-muted)] md:col-span-2 md:text-right">
                  {project?.title ?? item.repoTarget}
                </span>
              </a>
            );
          })}
        </div>
      </div>

      {/* Desktop-only hover-follow thumbnail card */}
      {!hoverThumbDisabled && (
        <div
          ref={thumbRef}
          data-testid="what-i-build-thumbnail"
          aria-hidden="true"
          className={`pointer-events-none fixed top-0 left-0 z-[var(--z-overlay)] hidden w-[264px] rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--surface)] p-4 shadow-2xl transition-[opacity,transform] duration-[var(--duration-fast)] [transition-timing-function:var(--ease-snappy)] edge-hairline lg:block ${
            desktopHoverCapable && activeItem ? "scale-100 opacity-100" : "scale-95 opacity-0"
          }`}
        >
          {activeItem && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                <span className="font-mono-data">
                  {activeItem.index} · {activeItem.categoryFilter}
                </span>
                {activeProject?.year ? (
                  <span className="font-mono-data tabular-nums">{activeProject.year}</span>
                ) : null}
              </div>

              {activeProject?.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={activeProject.image}
                  alt=""
                  width={232}
                  height={130}
                  className="aspect-[16/9] w-full rounded-[var(--radius-sm)] border border-[var(--border)] object-cover object-top"
                />
              ) : null}

              <div>
                <p className="font-display text-lg font-semibold text-[var(--text)]">
                  {activeProject?.title || activeItem.repoTarget}
                </p>
                <p className="font-mono-data mt-0.5 text-[11px] text-[var(--text-muted)]">
                  {activeProject?.stack || activeProject?.primaryLanguage?.name || activeItem.repoTarget}
                </p>
              </div>

              <div className="flex items-center justify-between border-t border-[var(--border)] pt-2.5">
                <span className="font-mono-data text-[10px] uppercase tracking-[var(--tracking-mono)] text-[var(--text-muted)]">
                  7d activity
                </span>
                <MiniSparkline counts={activeProject?.weeklyCommitCounts || []} />
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
