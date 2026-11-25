"use client";

import React from "react";
import { ArrowUpRight, GitMerge } from "lucide-react";
import content from "@/src/content/content.json";
import { SITE_CONFIG } from "@/src/config";
import { activateAnchorOnSpace } from "@/src/lib/keyboard";
import type { MergedPullRequest } from "@/src/types/portfolio";
import RevealText from "./RevealText";

interface OpenSourceSectionProps {
  items: MergedPullRequest[];
  loading: boolean;
}

function formatPrDate(iso: string): string {
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return iso;
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function OpenSourceSection({
  items,
  loading,
}: OpenSourceSectionProps) {
  return (
    <section
      id="merged-prs"
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
            <RevealText
              text={content.openSource.heading}
              className="font-display font-semibold tracking-tight text-[var(--text)]"
              style={{
                fontSize: "var(--text-h2)",
                lineHeight: "var(--leading-tight)",
                textWrap: "balance",
              }}
            />
            <p className="mt-3 text-sm text-[var(--text-muted)] md:text-base">
              {content.openSource.subtitle}
            </p>
          </div>

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
              className="ui-link font-mono-data mt-4 -ml-2 inline-flex min-h-[44px] items-center gap-1.5 px-2 text-xs font-medium text-[var(--text)]"
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
                className="ui-row group flex flex-col justify-between gap-3 rounded-[var(--radius-sm)] px-2 py-5 sm:flex-row sm:items-center sm:px-3"
              >
                <div className="flex min-w-0 items-start gap-3 sm:items-center">
                  <GitMerge className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)] sm:mt-0" />
                  <div className="min-w-0">
                    <p className="font-mono-data text-xs text-[var(--text-muted)]">
                      {pr.repoNameWithOwner}
                    </p>
                    <p className="mt-0.5 text-base font-medium text-[var(--text)] underline-offset-4 group-hover:underline">
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
