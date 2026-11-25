"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import content from "@/src/content/content.json";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useMotionBisect } from "@/hooks/use-motion-bisect";
import { alignContributionWeeksToSunday } from "@/src/lib/github-transform";
import { computeHeatmapWaveDelayMs } from "@/src/lib/motion";
import RevealText from "./RevealText";
import type { ContributionDay, GitHubPayload } from "@/src/types/portfolio";

interface GitHubPulseSectionProps {
  data: GitHubPayload | null;
  loading?: boolean;
}

const HEAT_COLORS: Record<number, string> = {
  0: "var(--heat-0)",
  1: "var(--heat-1)",
  2: "var(--heat-2)",
  3: "var(--heat-3)",
  4: "var(--heat-4)",
};

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Deterministic (server === client) absolute date for the data stamp — never a relative "X ago". */
function formatAsOf(iso: string): string {
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return "unknown date";
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatDateLabel(isoDate: string): string {
  const parts = isoDate.split("-").map(Number);
  if (parts.length !== 3) return isoDate;
  const dt = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  return dt.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function GitHubPulseSection({ data }: GitHubPulseSectionProps) {
  const reducedMotion = useReducedMotion();
  const bisect = useMotionBisect();
  const heatmapMotionOff = reducedMotion || bisect.heatmap;
  const [hoveredDay, setHoveredDay] = useState<ContributionDay | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number; align: "center" | "left" | "right" } | null>(null);
  const [inView, setInView] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const alignedWeeks = useMemo(() => {
    const rawWeeks = (data?.contributions?.weeks || []).slice(-53);
    return alignContributionWeeksToSunday(rawWeeks);
  }, [data]);

  const monthLabels = useMemo(() => {
    const labels: Array<{ weekIndex: number; label: string }> = [];
    let lastMonth = -1;
    alignedWeeks.forEach((slots, idx) => {
      const firstDay = slots.find((d) => d !== null);
      if (!firstDay) return;
      const month = Number(firstDay.date.split("-")[1]) - 1;
      if (month !== lastMonth && idx > 0) {
        labels.push({ weekIndex: idx, label: MONTH_NAMES[month] || "" });
        lastMonth = month;
      } else if (idx === 0) {
        lastMonth = month;
      }
    });
    return labels;
  }, [alignedWeeks]);

  // Single source of truth: the headline is the same normalized payload the grid renders
  // (normalizeContributions guarantees total === sum of cells).
  const ready = Boolean(data && data.contributions.weeks.length > 0);
  const totalContributions = data?.contributions?.totalContributions ?? 0;
  const showSkeleton = !ready;

  // On narrow screens start the scroller at the most recent weeks, where the activity is.
  useEffect(() => {
    const el = scrollerRef.current;
    if (el && el.scrollWidth > el.clientWidth) el.scrollLeft = el.scrollWidth;
  }, [ready]);

  /** Tooltip anchor in gridRef's padding-box coordinates, clamped so it never spills off the card. */
  const placeTooltip = (cell: HTMLElement) => {
    const host = gridRef.current;
    if (!host) return;
    const rect = host.getBoundingClientRect();
    const cellRect = cell.getBoundingClientRect();
    const x = cellRect.left - rect.left - host.clientLeft + cellRect.width / 2;
    const y = cellRect.top - rect.top - host.clientTop;
    const edge = 96;
    const align = x < edge ? "left" : x > host.clientWidth - edge ? "right" : "center";
    setTooltipPos({ x, y, align });
  };

  const heatmapWaveState = heatmapMotionOff ? "off" : inView ? "active" : "idle";

  return (
    <section
      id="open-source"
      tabIndex={-1}
      className="border-b border-[var(--border)] pt-8 pb-[var(--space-section)] md:pt-9 focus:outline-none"
    >
      <div className="mx-auto max-w-[1440px] px-[var(--space-edge)]">
        <div
          data-reveal
          className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end"
        >
          <div className="max-w-2xl">
            <p className="font-mono-data mb-2 text-xs tracking-[var(--tracking-mono)] text-[var(--text-muted)] uppercase">
              {content.pulse.eyebrow}
            </p>
            <RevealText
              text={content.pulse.heading}
              className="font-display font-semibold tracking-tight text-[var(--text)]"
              style={{
                fontSize: "var(--text-h2)",
                lineHeight: "var(--leading-tight)",
                textWrap: "balance",
              }}
            />
            <p className="mt-3 text-sm text-[var(--text-muted)] md:text-base">
              {content.pulse.subtitle}
            </p>
          </div>

          <div className="flex flex-col items-start md:items-end">
            {showSkeleton ? null : (
              <p
                data-testid="pulse-contributions-count"
                className="font-display text-2xl font-semibold text-[var(--text)] tabular-nums sm:text-3xl"
              >
                {totalContributions.toLocaleString("en-US")}{" "}
                <span className="text-base font-normal text-[var(--text-muted)]">
                  contributions in the last year
                </span>
              </p>
            )}
            {ready && data ? (
              <p data-testid="pulse-as-of" className="font-mono-data mt-1 text-xs text-[var(--text-muted)] tabular-nums">
                {data.source === "snapshot" ? "Cached snapshot" : "From GitHub"} · as of{" "}
                <time dateTime={data.fetchedAt}>{formatAsOf(data.fetchedAt)}</time>
              </p>
            ) : null}
          </div>
        </div>

        {/* Heatmap Container */}
        <div
          ref={gridRef}
          className="relative rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6 edge-hairline"
        >
          {showSkeleton ? (
            <div role="status" className="flex min-h-[188px] flex-col items-start justify-center gap-3">
              <p className="text-base font-semibold text-[var(--text)]">
                GitHub contribution data couldn&apos;t be loaded right now.
              </p>
              <p className="text-sm text-[var(--text-muted)]">
                The GitHub API didn&apos;t respond and no cached copy was available, so no numbers are shown.
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="btn-split btn-outline"
                >
                  <span className="btn-label">Retry</span>
                </button>
                <a
                  href="https://github.com/heetwave16"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ui-link inline-flex min-h-[44px] items-center gap-1 px-2 text-sm font-medium text-[var(--text)]"
                >
                  View the graph on GitHub <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              </div>
            </div>
          ) : (
            <>
              <div
                ref={scrollerRef}
                className="overflow-x-auto pb-2"
                onScroll={() => {
                  if (tooltipPos) {
                    setHoveredDay(null);
                    setTooltipPos(null);
                  }
                }}
              >
                <div className="min-w-[680px]">
                  {/* Month labels row */}
                  <div className="relative mb-2 ml-9 h-4">
                    {monthLabels.map((m) => (
                      <span
                        key={`${m.label}-${m.weekIndex}`}
                        className="font-mono-data absolute top-0 text-[11px] text-[var(--text-muted)]"
                        style={{
                          left: `${(m.weekIndex / Math.max(1, alignedWeeks.length)) * 100}%`,
                        }}
                      >
                        {m.label}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-stretch gap-2">
                    {/* Day labels: Sunday-first 7-row grid aligned to rows 2 (Mon), 4 (Wed), 6 (Fri) */}
                    <div
                      aria-hidden="true"
                      data-testid="heatmap-day-labels"
                      className="font-mono-data grid w-7 shrink-0 grid-rows-7 items-center gap-[3px] text-[10px] leading-none text-[var(--text-muted)]"
                    >
                      <span />
                      <span className="flex items-center">Mon</span>
                      <span />
                      <span className="flex items-center">Wed</span>
                      <span />
                      <span className="flex items-center">Fri</span>
                      <span />
                    </div>

                    {/* 53x7 CSS Grid */}
                    <div
                      role="grid"
                      aria-label={`GitHub contributions heatmap for ${data?.username || "heetwave16"}`}
                      data-testid="contribution-heatmap"
                      data-heatmap-wave={heatmapWaveState}
                      className="grid flex-1 gap-[3px]"
                      style={{
                        gridTemplateColumns: `repeat(${Math.max(1, alignedWeeks.length)}, minmax(0, 1fr))`,
                      }}
                      onMouseLeave={() => {
                        setHoveredDay(null);
                        setTooltipPos(null);
                      }}
                    >
                      {alignedWeeks.map((slots, wIdx) => {
                        const colDelayMs = heatmapMotionOff
                          ? 0
                          : computeHeatmapWaveDelayMs(wIdx, 0, alignedWeeks.length, 420);

                        return (
                          <div
                            key={wIdx}
                            role="row"
                            className="hm-heat-col grid grid-rows-7 gap-[3px]"
                            style={{ ["--wave-delay" as string]: `${colDelayMs}ms` }}
                          >
                            {slots.map((day, dIdx) => {
                              if (!day) {
                                return <div key={dIdx} className="aspect-square w-full rounded-[2px]" />;
                              }

                              return (
                                <div
                                  key={day.date}
                                  role="gridcell"
                                  data-date={day.date}
                                  data-row-index={dIdx}
                                  tabIndex={wIdx === alignedWeeks.length - 1 && dIdx === 0 ? 0 : -1}
                                  aria-label={`${day.contributionCount} contribution${
                                    day.contributionCount === 1 ? "" : "s"
                                  } on ${formatDateLabel(day.date)}`}
                                  className="aspect-square w-full rounded-[2px] transition-transform duration-[var(--duration-fast)] [transition-timing-function:var(--ease-out-expo)] hover:scale-125 focus:scale-125 focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-1"
                                  style={{
                                    backgroundColor: HEAT_COLORS[day.contributionLevel] || HEAT_COLORS[0],
                                  }}
                                  onMouseEnter={(e) => {
                                    setHoveredDay(day);
                                    placeTooltip(e.currentTarget);
                                  }}
                                  onFocus={(e) => {
                                    setHoveredDay(day);
                                    placeTooltip(e.currentTarget);
                                  }}
                                  onBlur={() => {
                                    setHoveredDay(null);
                                    setTooltipPos(null);
                                  }}
                                />
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating Spring-Animated Monospace Tooltip */}
              <AnimatePresence>
                {hoveredDay && tooltipPos && (
                  <motion.div
                    key="heatmap-tooltip"
                    role="status"
                    initial={
                      reducedMotion
                        ? { opacity: 1, x: tooltipPos.x, y: tooltipPos.y }
                        : { opacity: 0, scale: 0.94, x: tooltipPos.x, y: tooltipPos.y + 6 }
                    }
                    animate={{ opacity: 1, scale: 1, x: tooltipPos.x, y: tooltipPos.y }}
                    exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
                    transition={
                      reducedMotion
                        ? { duration: 0 }
                        : { type: "spring", stiffness: 520, damping: 35, mass: 0.4 }
                    }
                    className="pointer-events-none absolute top-0 left-0 z-20"
                  >
                    <div className={`font-mono-data -translate-y-[calc(100%+10px)] ${
                      tooltipPos.align === "left"
                        ? "-translate-x-3"
                        : tooltipPos.align === "right"
                          ? "-translate-x-[calc(100%-12px)]"
                          : "-translate-x-1/2"
                    } rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--inverse-bg)] px-2.5 py-1.5 text-[11px] text-[var(--inverse-text)] shadow-lg whitespace-nowrap`}>
                      <span className="font-semibold tabular-nums">
                        {hoveredDay.contributionCount}{" "}
                        {hoveredDay.contributionCount === 1 ? "contribution" : "contributions"}
                      </span>
                      <span className="mx-1.5 opacity-55" aria-hidden="true">
                        {"//"}
                      </span>
                      <span className="opacity-85">{formatDateLabel(hoveredDay.date)}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Bottom bar: inspected day + Legend */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--border)] pt-4">
                <p className="font-mono-data text-xs text-[var(--text-muted)]">
                  {hoveredDay
                    ? `${hoveredDay.contributionCount} contribution${
                        hoveredDay.contributionCount === 1 ? "" : "s"
                      } · ${formatDateLabel(hoveredDay.date)}`
                    : "Hover or focus any cell to inspect daily contributions"}
                </p>

                <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                  <span>Less</span>
                  {[0, 1, 2, 3, 4].map((level) => (
                    <span
                      key={level}
                      aria-hidden="true"
                      className="inline-block h-3 w-3 rounded-[2px]"
                      style={{ backgroundColor: HEAT_COLORS[level] }}
                    />
                  ))}
                  <span>More</span>
                </div>
              </div>
            </>
          )}
        </div>

      </div>
    </section>
  );
}
