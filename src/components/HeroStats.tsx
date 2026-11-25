"use client";

import React, { useRef } from "react";
import content from "@/src/content/content.json";
import { useInViewOnce } from "@/hooks/use-in-view-once";
import { useCountUp } from "@/hooks/use-count-up";
import type { GitHubPayload } from "@/src/types/portfolio";

interface HeroStatsProps {
  data: GitHubPayload | null;
}

function Stat({
  value,
  label,
  start,
  suffix = "",
  raw,
  index,
}: {
  value: number | null;
  label: string;
  start: boolean;
  suffix?: string;
  raw?: string;
  index: number;
}) {
  const n = useCountUp(value ?? 0, start && value !== null);
  return (
    <div className="flex flex-col gap-2 border-t border-[var(--border-strong)] pt-4 sm:pt-5">
      <dt className="font-mono-data order-2 text-[11px] leading-snug tracking-[var(--tracking-mono)] text-[var(--text-muted)] uppercase">
        {label}
      </dt>
      <dd className="order-1 font-display font-bold tracking-tight text-[var(--text)] tabular-nums" style={{ fontSize: "clamp(2rem, 4.4vw, 3.5rem)", lineHeight: 1 }}>
        {raw ? (
          raw
        ) : value === null ? (
          <span className="skeleton inline-block h-[0.8em] w-[2.2ch] rounded-[4px] align-middle" aria-label="Loading" />
        ) : (
          <>
            {n}
            {suffix ? <span className={index === 0 ? "text-[var(--accent)]" : ""}>{suffix}</span> : null}
          </>
        )}
      </dd>
    </div>
  );
}

/**
 * Stats strip directly under the hero. Every number is read from the same GitHub payload the
 * Pulse section renders (single source of truth) — nothing is hard-coded or rounded up.
 */
export default function HeroStats({ data }: HeroStatsProps) {
  const ref = useRef<HTMLDListElement>(null);
  const inView = useInViewOnce(ref, { threshold: 0.3 });
  const s = content.hero.stats;

  const contributions = data ? data.contributions.totalContributions : null;
  const originalRepos = data ? data.repos.filter((r) => !r.isFork && !r.isArchived).length : null;
  const mergedPRs = data ? data.mergedPRs.totalCount : null;

  return (
    <section aria-label="At a glance" className="relative bg-[var(--bg)]">
      <div className="mx-auto max-w-[1440px] px-[var(--space-edge)] pt-6 pb-12 sm:pb-16">
        <dl ref={ref} data-rt="quiet" className="grid grid-cols-2 gap-x-6 gap-y-8 lg:grid-cols-4 lg:gap-x-10">
          <Stat index={0} value={contributions} label={s.contributionsLabel} start={inView} />
          <Stat index={1} value={originalRepos} label={s.reposLabel} start={inView} />
          <Stat
            index={2}
            value={mergedPRs}
            label={mergedPRs === 1 ? s.prsLabel : s.prsLabelPlural}
            start={inView}
          />
          <Stat index={3} value={null} raw={s.degreeValue} label={s.degreeLabel} start={inView} />
        </dl>
      </div>
    </section>
  );
}
