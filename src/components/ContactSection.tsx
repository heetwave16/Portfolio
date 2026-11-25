"use client";

import React, { useState } from "react";
import { ArrowUpRight, Check, Copy, FileDown, Mail } from "lucide-react";
import content from "@/src/content/content.json";
import { SITE_CONFIG } from "@/src/config";
import { activateAnchorOnSpace } from "@/src/lib/keyboard";
import { useTheme } from "./ShellProviders";

export default function ContactSection() {
  const [copied, setCopied] = useState(false);
  const { contrastTheme } = useTheme();

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(SITE_CONFIG.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section
      id="contact"
      tabIndex={-1}
      data-theme={contrastTheme}
      className="border-b border-[var(--border)] bg-[var(--bg)] py-[var(--space-section)] text-[var(--text)] focus:outline-none"
    >
      <div className="mx-auto max-w-[1440px] px-[var(--space-edge)]">
        <div
          data-reveal
          className="grid grid-cols-1 items-start gap-10 rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-[var(--surface)] p-7 sm:p-10 lg:grid-cols-12"
        >
          <div className="lg:col-span-7">
            <p className="font-mono-data mb-2 text-xs tracking-[var(--tracking-mono)] text-[var(--text-muted)] uppercase">
              {content.contact.eyebrow}
            </p>
            <h2
              className="font-display font-semibold tracking-tight text-[var(--text)]"
              style={{
                fontSize: "var(--text-h1)",
                lineHeight: "var(--leading-tight)",
                textWrap: "balance",
              }}
            >
              {content.contact.heading}
            </h2>
            <p className="mt-4 max-w-xl text-base text-[var(--text-muted)] sm:text-lg">
              {content.contact.lead}
            </p>
            <p className="font-mono-data mt-4 text-xs text-[var(--text-muted)]">
              {content.contact.availabilityNote}
            </p>
          </div>

          <div className="flex flex-col gap-3 lg:col-span-5 lg:justify-self-end lg:w-full lg:max-w-sm">
            <a
              href={`mailto:${SITE_CONFIG.email}`}
              onKeyDown={activateAnchorOnSpace}
              className="inline-flex min-h-[48px] items-center justify-between rounded-[var(--radius-sm)] bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[var(--on-accent)] transition-opacity hover:opacity-90"
            >
              <span className="inline-flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <span>{content.contact.emailActionLabel}</span>
              </span>
              <span className="font-mono-data text-xs">{SITE_CONFIG.email}</span>
            </a>

            <button
              type="button"
              onClick={handleCopyEmail}
              className="inline-flex min-h-[46px] items-center justify-between rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--bg)] px-5 py-3 text-sm font-semibold text-[var(--text)] transition-colors hover:border-[var(--accent)]"
            >
              <span className="inline-flex items-center gap-2">
                {copied ? <Check className="h-4 w-4 text-[var(--status-green)]" /> : <Copy className="h-4 w-4" />}
                <span>{copied ? content.contact.copiedLabel : content.contact.copyActionLabel}</span>
              </span>
              <span className="font-mono-data text-xs text-[var(--text-muted)]">Clipboard</span>
            </button>

            <a
              href={SITE_CONFIG.resumePath}
              download="Heet-Mehta-Resume.pdf"
              onKeyDown={activateAnchorOnSpace}
              className="inline-flex min-h-[46px] items-center justify-between rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--bg)] px-5 py-3 text-sm font-semibold text-[var(--text)] transition-colors hover:border-[var(--accent)]"
            >
              <span className="inline-flex items-center gap-2">
                <FileDown className="h-4 w-4" />
                <span>{content.contact.resumeActionLabel}</span>
              </span>
              <span className="font-mono-data text-xs text-[var(--text-muted)]">PDF</span>
            </a>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <a
                href={SITE_CONFIG.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                onKeyDown={activateAnchorOnSpace}
                className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--surface-2)] px-4 py-2 text-sm font-semibold text-[var(--text)] transition-colors hover:bg-[var(--inverse-bg)] hover:text-[var(--inverse-text)]"
              >
                <span>GitHub</span>
                <ArrowUpRight className="h-4 w-4" />
              </a>
              <a
                href={SITE_CONFIG.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                onKeyDown={activateAnchorOnSpace}
                className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--surface-2)] px-4 py-2 text-sm font-semibold text-[var(--text)] transition-colors hover:bg-[var(--inverse-bg)] hover:text-[var(--inverse-text)]"
              >
                <span>LinkedIn</span>
                <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
