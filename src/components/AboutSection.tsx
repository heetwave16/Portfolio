"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import content from "@/src/content/content.json";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { getFocusableElements, getNextRovingIndex } from "@/src/lib/keyboard";
import type { ComputedLanguageSkill } from "@/src/lib/github-transform";
import type { BioLength } from "@/src/types/portfolio";
import { useTheme } from "./ShellProviders";
import { SITE_CONFIG } from "@/src/config";
import RevealText from "./RevealText";
import { useInViewOnce } from "@/hooks/use-in-view-once";

/** Timeline of true dated milestones; the connecting rule draws in as it enters view. */
function Timeline() {
  const ref = useRef<HTMLOListElement>(null);
  useInViewOnce(ref, { threshold: 0.25 });
  const items = content.about.timeline;
  return (
    <div className="mt-20 sm:mt-24">
      <RevealText
        as="h3"
        variant="quiet"
        rule
        text={content.about.timelineHeading}
        className="font-display text-2xl font-semibold tracking-tight text-[var(--text)] sm:text-3xl"
      />
      <ol
        ref={ref}
        data-draw
        className="relative mt-10 grid grid-cols-1 gap-8 pl-6 md:grid-cols-5 md:gap-6 md:pl-0 md:pt-8"
      >
        {/* vertical rule (mobile) / horizontal rule (desktop) */}
        <span aria-hidden="true" className="draw-y absolute top-1 bottom-1 left-[5px] w-px bg-[var(--border-strong)] md:hidden" />
        <span aria-hidden="true" className="draw-x absolute top-[5px] right-0 left-0 hidden h-px bg-[var(--border-strong)] md:block" />
        {items.map((item, i) => (
          <li key={`${item.date}-${item.title}`} className="relative">
            <span
              aria-hidden="true"
              className={`absolute top-1 -left-6 h-[11px] w-[11px] rounded-full border-2 md:-top-8 md:left-0 ${
                i === items.length - 1
                  ? "border-[var(--accent)] bg-[var(--accent)]"
                  : "border-[var(--text)] bg-[var(--bg)]"
              }`}
            />
            <p className="font-mono-data text-xs tracking-[var(--tracking-mono)] text-[var(--accent-text)] uppercase">
              {item.date}
            </p>
            <p className="font-display mt-1.5 text-lg font-semibold leading-snug text-[var(--text)]">{item.title}</p>
            <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-muted)]">{item.body}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Three-step "How I work" row with a connector that draws between the steps. */
function Process() {
  const ref = useRef<HTMLOListElement>(null);
  useInViewOnce(ref, { threshold: 0.3 });
  return (
    <div className="mt-20 sm:mt-24">
      <RevealText
        as="h3"
        variant="quiet"
        rule
        text={content.about.processHeading}
        className="font-display text-2xl font-semibold tracking-tight text-[var(--text)] sm:text-3xl"
      />
      <ol ref={ref} data-draw className="relative mt-10 grid grid-cols-1 gap-5 md:grid-cols-3 md:gap-6">
        <span aria-hidden="true" className="draw-x absolute top-[34px] right-[16%] left-[16%] hidden h-px bg-[var(--border-strong)] md:block" />
        {content.about.process.map((step) => (
          <li
            key={step.index}
            className="relative rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--surface)] p-6"
          >
            <span className="font-mono-data relative z-[1] inline-flex h-9 min-w-9 items-center justify-center rounded-full border border-[var(--accent)] bg-[var(--bg)] px-2 text-xs font-semibold text-[var(--accent-text)]">
              {step.index}
            </span>
            <p className="font-display mt-4 text-xl font-semibold text-[var(--text)]">{step.title}</p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">{step.body}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

interface AboutSectionProps {
  skills: ComputedLanguageSkill[];
}

const PILL_SPRING = { type: "spring", stiffness: 420, damping: 34 } as const;
const SNAPPY_BEZIER = [0.22, 1, 0.36, 1] as const;

function formatBytes(bytes: number): string {
  if (bytes >= 1000000) return `${(bytes / 1000000).toFixed(1)} MB`;
  if (bytes >= 1000) return `${(bytes / 1000).toFixed(1)} KB`;
  return `${bytes} B`;
}

function IstClock() {
  const [time, setTime] = useState<string>("--:--:--");

  useEffect(() => {
    const fmt = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const tick = () => setTime(fmt.format(new Date()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="font-mono-data font-semibold text-[var(--text)] tabular-nums">
      {time} <span className="font-normal text-[var(--text-muted)]">IST</span>
    </span>
  );
}

export default function AboutSection({ skills }: AboutSectionProps) {
  const [bioLength, setBioLength] = useState<BioLength>("medium");
  const [measuredHeight, setMeasuredHeight] = useState<number | "auto">("auto");
  const bioInnerRef = useRef<HTMLDivElement>(null);
  const bioGroupRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const { contrastTheme } = useTheme();
  const paragraphs = content.about.bios[bioLength];
  const lens: BioLength[] = ["short", "medium", "detailed"];

  // Measure bio paragraph container height for smooth Editorial Light height transitions
  useEffect(() => {
    const el = bioInnerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    setMeasuredHeight(el.offsetHeight);
    const ro = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect.height;
      if (typeof next === "number" && next > 0) {
        setMeasuredHeight(Math.ceil(next));
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [bioLength]);

  const handleGroupArrowNav = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const items = getFocusableElements(bioGroupRef.current);
    if (items.length === 0) return;
    const currentIndex = items.indexOf(document.activeElement as HTMLElement);
    const nextIndex = getNextRovingIndex(currentIndex, items.length, e.key, "horizontal");
    if (nextIndex !== null) {
      e.preventDefault();
      items[nextIndex]?.focus();
      const nextLen = lens[nextIndex];
      if (nextLen) setBioLength(nextLen);
    }
  };

  return (
    <div className="bg-[var(--bg)]">
      <section
        id="about"
        tabIndex={-1}
        data-theme={contrastTheme}
        data-theme-wipe
        className="relative overflow-hidden border-b border-[var(--border)] bg-[var(--bg)] py-[var(--space-section)] text-[var(--text)] focus:outline-none"
      >
        <div
          data-theme-wipe-curtain
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[var(--z-overlay)] origin-bottom bg-[var(--inverse-bg)]"
        />
        {/* Red accent sweeps across the dark → light join */}
        <span data-accent-sweep aria-hidden="true" className="accent-sweep" />
        <div className="mx-auto max-w-[1440px] px-[var(--space-edge)]">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
            {/* Bio Column (7 cols) */}
            <div data-reveal className="lg:col-span-7">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="font-mono-data mb-2 text-xs tracking-[var(--tracking-mono)] text-[var(--text-muted)] uppercase">
                    {content.about.eyebrow}
                  </p>
                  <RevealText
                    variant="quiet"
                    text={content.about.heading}
                    className="font-display font-semibold tracking-tight text-[var(--text)]"
                    style={{
                      fontSize: "var(--text-h2)",
                      lineHeight: "var(--leading-tight)",
                      textWrap: "balance",
                    }}
                  />
                </div>

                {/* Tactile physical segmented control with sliding active pill */}
                <div
                  ref={bioGroupRef}
                  role="group"
                  aria-label="Select bio length"
                  onKeyDown={handleGroupArrowNav}
                  className="inline-flex rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--surface)] p-1 shadow-inner edge-hairline"
                >
                  {lens.map((len) => {
                    const active = bioLength === len;
                    return (
                      <button
                        key={len}
                        type="button"
                        onClick={() => setBioLength(len)}
                        aria-pressed={active}
                        className={`relative isolate min-h-[34px] rounded-[3px] px-3.5 py-1 text-xs font-semibold capitalize transition-colors duration-200 whitespace-nowrap ${
                          active
                            ? "text-[var(--inverse-text)]"
                            : "text-[var(--text-muted)] hover:text-[var(--text)]"
                        }`}
                      >
                        {active && (
                          <motion.span
                            layoutId="bio-pill"
                            transition={reducedMotion ? { duration: 0 } : PILL_SPRING}
                            className="absolute inset-0 z-0 rounded-[3px] bg-[var(--inverse-bg)] shadow-xs"
                          />
                        )}
                        <span className="relative z-10">{len}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Smooth container height transition + text crossfade */}
              <motion.div
                animate={{ height: measuredHeight }}
                transition={
                  reducedMotion ? { duration: 0 } : { duration: 0.32, ease: SNAPPY_BEZIER }
                }
                className="mt-7 overflow-hidden"
              >
                <div
                  ref={bioInnerRef}
                  className="text-base leading-relaxed text-[var(--text)] sm:text-lg"
                >
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={bioLength}
                      initial={reducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: -8 }}
                      transition={
                        reducedMotion ? { duration: 0 } : { duration: 0.24, ease: SNAPPY_BEZIER }
                      }
                    >
                      {paragraphs.map((p, idx) => (
                        <p key={idx} className={idx > 0 ? "mt-4" : ""}>
                          {p}
                        </p>
                      ))}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </motion.div>

              {/* Factual Highlights */}
              <dl className="mt-8 grid grid-cols-1 gap-4 border-t border-[var(--border)] pt-6 sm:grid-cols-2">
                {content.about.highlights.map((item) => (
                  <div key={item.label}>
                    <dt className="font-mono-data text-xs uppercase tracking-[var(--tracking-mono)] text-[var(--text-muted)]">
                      {item.label}
                    </dt>
                    <dd className="mt-1 text-sm font-semibold text-[var(--text)] sm:text-base">
                      {item.value}
                    </dd>
                  </div>
                ))}
              </dl>

              {/* Live Pune, India (IST) monospace clock */}
              <div className="mt-6 flex flex-wrap items-center gap-2.5 border-t border-[var(--border)] pt-5 text-xs text-[var(--text-muted)]">
                <span
                  className="alive-dot relative inline-flex h-2 w-2 rounded-full bg-[var(--status-green)]"
                  aria-hidden="true"
                />
                <span className="font-mono-data uppercase tracking-[var(--tracking-mono)]">
                  {SITE_CONFIG.cityLabel} ·
                </span>
                <IstClock />
              </div>
            </div>

            {/* Computed Skills Column (5 cols) */}
            <div data-reveal className="lg:col-span-5">
              <div className="rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-[var(--surface)] p-6 edge-hairline">
                <h3 className="font-display text-xl font-semibold text-[var(--text)]">
                  {content.about.skillsHeading}
                </h3>
                <p className="mt-1.5 text-sm text-[var(--text-muted)]">
                  {content.about.skillsCaption}
                </p>

                <div className="mt-6 space-y-4" data-testid="computed-skills">
                  {skills.length === 0 ? (
                    <p className="text-sm text-[var(--text-muted)]">
                      No repository language telemetry available yet.
                    </p>
                  ) : (
                    skills.map((skill, i) => (
                      <div key={skill.name}>
                        <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                          <span className="font-semibold text-[var(--text)]">{skill.name}</span>
                          <span className="font-mono-data text-xs text-[var(--text-muted)] tabular-nums">
                            {skill.percentage}% · {formatBytes(skill.bytes)} · {skill.repoCount}{" "}
                            {skill.repoCount === 1 ? "repo" : "repos"}
                          </span>
                        </div>
                        <div className="h-2.5 w-full overflow-hidden rounded-[2px] bg-[var(--surface-2)]">
                          <motion.div
                            initial={reducedMotion ? { scaleX: 1 } : { scaleX: 0 }}
                            whileInView={{ scaleX: 1 }}
                            viewport={{ once: true, amount: 0.35 }}
                            transition={
                              reducedMotion
                                ? { duration: 0 }
                                : {
                                    duration: 0.75,
                                    ease: SNAPPY_BEZIER,
                                    delay: 0.05 + i * 0.06,
                                  }
                            }
                            className="h-full origin-left rounded-[2px]"
                            style={{
                              width: `${Math.max(3, skill.percentage)}%`,
                              backgroundColor: "var(--inverse-bg)",
                            }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          <Timeline />
          <Process />
        </div>
      </section>
    </div>
  );
}
