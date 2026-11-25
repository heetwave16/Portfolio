"use client";

import React, { useRef } from "react";
import content from "@/src/content/content.json";
import { useTheme } from "./ShellProviders";
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

export default function AboutSection() {
  const { contrastTheme } = useTheme();
  const paragraphs = content.about.bios.medium;

  return (
    <div className="bg-[var(--bg)]">
      <section
        id="about"
        aria-labelledby="about-heading"
        data-theme={contrastTheme}
        data-theme-wipe
        className="relative overflow-hidden border-b border-[var(--border)] bg-[var(--bg)] py-[var(--space-section)] text-[var(--text)]"
      >
        <div
          data-theme-wipe-curtain
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[var(--z-overlay)] origin-bottom bg-[var(--inverse-bg)]"
        />
        {/* Red accent sweeps across the dark → light join */}
        <span data-accent-sweep aria-hidden="true" className="accent-sweep" />
        <div className="mx-auto max-w-[1440px] px-[var(--space-edge)]">
          <div className="max-w-[66ch]">
            <p className="font-mono-data mb-2 text-xs tracking-[var(--tracking-mono)] text-[var(--text-muted)] uppercase">
              {content.about.eyebrow}
            </p>
            <RevealText
              id="about-heading"
              variant="quiet"
              text={content.about.heading}
              className="font-display font-bold tracking-tight text-[var(--text)]"
              style={{
                fontSize: "var(--text-h2)",
                lineHeight: "var(--leading-tight)",
                textWrap: "balance",
              }}
            />
            <div className="mt-4 space-y-4 text-lg leading-[1.6] text-[var(--text)]">
              {paragraphs.map((p, idx) => (
                <p key={idx}>{p}</p>
              ))}
            </div>
          </div>

          {/* Facts */}
          <dl className="mt-12 grid grid-cols-1 gap-6 border-t border-[var(--border)] pt-6 sm:grid-cols-2 lg:grid-cols-4">
            {content.about.highlights.map((item) => (
              <div key={item.label}>
                <dt className="font-mono-data text-xs uppercase tracking-[var(--tracking-mono)] text-[var(--text-muted)]">
                  {item.label}
                </dt>
                <dd className="mt-1 font-semibold text-[var(--text)]">{item.value}</dd>
              </div>
            ))}
          </dl>

          <Timeline />
          <Process />
        </div>
      </section>
    </div>
  );
}
