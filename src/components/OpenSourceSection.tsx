"use client";

import React, { useMemo } from "react";
import { ArrowUpRight, GitMerge } from "lucide-react";
import content from "@/src/content/content.json";
import { SITE_CONFIG } from "@/src/config";
import { activateAnchorOnSpace } from "@/src/lib/keyboard";
import type { MergedPullRequest } from "@/src/types/portfolio";

interface OpenSourceSectionProps {
  totalCount: number;
  items: MergedPullRequest[];
  loading: boolean;
  claimOpenSource?: boolean;
}

function formatPrDate(iso: string): string {
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return iso;
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function OpenSourceSection({
  totalCount,
  items,
  loading,
  claimOpenSource = false,
}: OpenSourceSectionProps) {
  const distinctProjectsCount = useMemo(() => {
    const repos = new Set(items.map((item) => item.repoNameWithOwner.toLowerCase()));
    return repos.size;
  }, [items]);

  return (
    <section
      id="open-source"
      tabIndex={-1}
      className="border-b border-[var(--border)] py-[var(--space-section)] focus:outline-none"
    >
      <div className="mx-auto max-w-[1440px] px-[var(--space-edge)]">
        <div
          data-reveal
          className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end"
        >
          <div className="max-w-2xl">
            <p className="font-mono-data mb-2 text-xs tracking-[var(--tracking-mono)] text-[var(--text-muted)] uppercase">
              {content.openSource.eyebrow}
            </p>
            <h2
              className="font-display font-semibold tracking-tight text-[var(--text)]"
              style={{
                fontSize: "var(--text-h2)",
                lineHeight: "var(--leading-tight)",
                textWrap: "balance",
              }}
            >
              {content.openSource.heading}
            </h2>
            <p className="mt-3 text-sm text-[var(--text-muted)] md:text-base">
              {content.openSource.subtitle}
            </p>
          </div>

          {!loading && (
            <div className="rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--surface)] px-5 py-3.5 edge-hairline">
              <p
                data-testid="oss-scoreboard"
                className="font-display text-lg font-semibold text-[var(--text)] tabular-nums sm:text-xl"
              >
                {claimOpenSource
                  ? `${totalCount} merged PR${totalCount === 1 ? "" : "s"} to ${distinctProjectsCount} open-source project${distinctProjectsCount === 1 ? "" : "s"}`
                  : `${totalCount} merged PR${totalCount === 1 ? "" : "s"} outside my own repos`}
              </p>
            </div>
          )}
        </div>

        {loading ? (
          <div className="h-24 animate-pulse rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)]" />
        ) : items.length === 0 ? (
          <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-6">
            <p className="font-display text-lg font-semibold text-[var(--text)]">
              {content.openSource.zeroStateTitle}
            </p>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              {content.openSource.zeroStateBody}
            </p>
            <a
              href={SITE_CONFIG.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              onKeyDown={activateAnchorOnSpace}
              className="font-mono-data mt-4 inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] text-xs font-medium text-[var(--text)] underline-offset-4 hover:text-[var(--text-muted)] hover:underline"
            >
              <span>View GitHub profile</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)] border-t border-b border-[var(--border)]">
            {items.slice(0, 10).map((pr) => (
              <a
                key={pr.url}
                href={pr.url}
                target="_blank"
                rel="noopener noreferrer"
                onKeyDown={activateAnchorOnSpace}
                className="group flex flex-col justify-between gap-3 rounded-[var(--radius-sm)] py-5 transition-colors hover:bg-[var(--surface)]/50 sm:flex-row sm:items-center sm:px-3"
              >
                <div className="flex min-w-0 items-start gap-3 sm:items-center">
                  <GitMerge className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)] sm:mt-0" />
                  <div className="min-w-0">
                    <p className="font-mono-data text-xs text-[var(--text-muted)]">
                      {pr.repoNameWithOwner}
                    </p>
                    <p className="mt-0.5 truncate text-base font-medium text-[var(--text)] underline-offset-4 group-hover:underline">
                      {pr.title}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-3 pl-7 sm:pl-0">
                  <span className="font-mono-data text-xs text-[var(--text-muted)] tabular-nums">
                    {formatPrDate(pr.mergedAt)}
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-[var(--text-muted)] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[var(--text)]" />
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
