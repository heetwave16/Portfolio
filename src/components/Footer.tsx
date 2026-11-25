"use client";

import React from "react";
import { ArrowUp, ArrowUpRight } from "lucide-react";
import content from "@/src/content/content.json";
import { SITE_CONFIG } from "@/src/config";
import { activateAnchorOnSpace } from "@/src/lib/keyboard";
import SocialLinks from "./SocialLinks";

const FOOTER_NAV = [
  { label: "Projects", href: "#projects" },
  { label: "Open Source", href: "#open-source" },
  { label: "About", href: "#about" },
  { label: "Contact", href: "#contact" },
];

export default function Footer() {
  return (
    <footer className="relative overflow-hidden bg-[var(--bg)] pt-16 text-[var(--text)]">
      <div className="mx-auto max-w-[1440px] px-[var(--space-edge)]">
        <div className="grid grid-cols-1 gap-10 border-b border-[var(--border)] pb-12 md:grid-cols-12">
          <div className="md:col-span-6">
            <h2
              className="font-display font-semibold tracking-tight text-[var(--text)]"
              style={{ fontSize: "var(--text-h2)", lineHeight: "var(--leading-tight)", textWrap: "balance" }}
            >
              {content.footer.ctaHeading}
            </h2>
            <a
              href={`mailto:${SITE_CONFIG.email}`}
              onKeyDown={activateAnchorOnSpace}
              className="group mt-5 inline-flex items-center gap-1.5 text-base font-semibold break-all text-[var(--text)]"
            >
              <span className="u-draw pb-0.5">{SITE_CONFIG.email}</span>
              <ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden="true" />
            </a>
            <SocialLinks className="mt-6" />
          </div>

          <nav aria-label="Footer" className="md:col-span-3">
            <p className="font-mono-data mb-4 text-[11px] tracking-[var(--tracking-mono)] text-[var(--text-muted)] uppercase">
              Sections
            </p>
            <ul className="grid grid-cols-2 gap-x-6 gap-y-1 md:grid-cols-1">
              {FOOTER_NAV.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    onKeyDown={activateAnchorOnSpace}
                    className="group inline-flex min-h-[36px] items-center text-sm text-[var(--text)]"
                  >
                    <span className="u-draw pb-0.5">{l.label}</span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex flex-col items-start gap-6 md:col-span-3 md:items-end">
            {/* Split back-to-top (label + arrow) → #top */}
            <a href="#top" onKeyDown={activateAnchorOnSpace} className="btn-split btn-outline">
              <span className="btn-label">{content.footer.backToTopLabel}</span>
              <span className="btn-arrow" aria-hidden="true">
                <ArrowUp className="h-4 w-4" />
              </span>
            </a>
            <div className="flex flex-col gap-2 text-xs text-[var(--text-muted)] md:items-end">
              <span className="inline-flex items-center gap-2 font-medium text-[var(--text)]">
                <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--status-green)] opacity-60 motion-reduce:hidden" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[var(--status-green)]" />
                </span>
                <span>{content.footer.statusText}</span>
              </span>
              <span className="font-mono-data tabular-nums">
                {SITE_CONFIG.cityLabel} · IST (UTC+5:30)
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-2 py-6 text-xs text-[var(--text-muted)] md:flex-row md:items-center">
          <p>{content.footer.copyright}</p>
          <p>{content.footer.credits}</p>
        </div>
      </div>

      {/* Giant wordmark (Takumi / Preymaker) — decorative, the name is already in the page heading */}
      <div aria-hidden="true" className="pointer-events-none select-none overflow-hidden">
        <p
          data-parallax="24"
          data-parallax-settle
          className="font-display pb-[0.06em] px-[var(--space-edge)] text-center font-bold tracking-[-0.055em] whitespace-nowrap text-[var(--text)]"
          style={{ fontSize: "clamp(3rem, 13.6vw, 15.5rem)", lineHeight: 0.9 }}
        >
          HEET <span className="text-[var(--accent)]">MEHTA</span>
        </p>
      </div>
    </footer>
  );
}
