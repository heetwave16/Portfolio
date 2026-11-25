"use client";

import React, { useEffect, useState } from "react";
import { ArrowUp, ArrowUpRight } from "lucide-react";
import content from "@/src/content/content.json";
import { SITE_CONFIG } from "@/src/config";
import { activateAnchorOnSpace } from "@/src/lib/keyboard";
import { useLenisScroll } from "./ShellProviders";

function formatLocalTime(): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: SITE_CONFIG.timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date());
}

export default function Footer() {
  const [localTime, setLocalTime] = useState<string>("");
  const { scrollToTop } = useLenisScroll();

  useEffect(() => {
    const initial = setTimeout(() => setLocalTime(formatLocalTime()), 0);
    const id = setInterval(() => {
      setLocalTime(formatLocalTime());
    }, 30000);
    return () => {
      clearTimeout(initial);
      clearInterval(id);
    };
  }, []);

  return (
    <footer className="bg-[var(--bg)] pt-14 pb-10 text-[var(--text)]">
      <div className="mx-auto max-w-[1440px] px-[var(--space-edge)]">
        <div className="flex flex-col justify-between gap-8 border-b border-[var(--border)] pb-10 md:flex-row md:items-end">
          <div className="max-w-xl">
            <h2
              className="font-display font-semibold tracking-tight text-[var(--text)]"
              style={{ fontSize: "var(--text-h2)", lineHeight: "var(--leading-tight)" }}
            >
              {content.footer.ctaHeading}
            </h2>
            <div className="mt-4 flex flex-wrap items-center gap-5 text-sm">
              <a
                href={`mailto:${SITE_CONFIG.email}`}
                onKeyDown={activateAnchorOnSpace}
                className="rounded-[var(--radius-sm)] font-semibold text-[var(--text)] underline-offset-4 hover:text-[var(--text-muted)] hover:underline"
              >
                {SITE_CONFIG.email}
              </a>
              <a
                href={SITE_CONFIG.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                onKeyDown={activateAnchorOnSpace}
                className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--text)]"
              >
                <span>GitHub</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
              <a
                href={SITE_CONFIG.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                onKeyDown={activateAnchorOnSpace}
                className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--text)]"
              >
                <span>LinkedIn</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

          <button
            type="button"
            onClick={scrollToTop}
            className="inline-flex min-h-[42px] items-center gap-2 self-start rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-2 text-xs font-semibold text-[var(--text)] transition-colors hover:border-[var(--accent)] md:self-auto whitespace-nowrap"
          >
            <span>{content.footer.backToTopLabel}</span>
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="mt-6 flex flex-col justify-between gap-4 text-xs text-[var(--text-muted)] md:flex-row md:items-center">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {/* Availability status line */}
            <span className="inline-flex items-center gap-2 font-medium text-[var(--text)]">
              <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--status-green)] opacity-60 motion-reduce:hidden" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[var(--status-green)]" />
              </span>
              <span>{content.footer.statusText}</span>
            </span>

            <span className="font-mono-data tabular-nums">
              {SITE_CONFIG.cityLabel} · {localTime || "IST"}
            </span>
          </div>

          <p className="text-[var(--text-muted)]">{content.footer.credits}</p>
        </div>
      </div>
    </footer>
  );
}
