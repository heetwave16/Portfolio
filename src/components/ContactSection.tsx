"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowUpRight, Check, Copy, FileDown, Mail } from "lucide-react";
import content from "@/src/content/content.json";
import { SITE_CONFIG } from "@/src/config";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { activateAnchorOnSpace } from "@/src/lib/keyboard";
import { useTheme } from "./ShellProviders";
import RevealText from "./RevealText";

export default function ContactSection() {
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reducedMotion = useReducedMotion();
  const { contrastTheme } = useTheme();

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(SITE_CONFIG.email);
      setCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 2200);
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
          className="grid grid-cols-1 items-end gap-10 rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-[var(--surface)] p-7 sm:p-10 lg:grid-cols-12 edge-hairline"
        >
          <div className="lg:col-span-7">
            <p className="font-mono-data mb-2 text-xs tracking-[var(--tracking-mono)] text-[var(--text-muted)] uppercase">
              {content.contact.eyebrow}
            </p>
            {/* Preymaker-style oversized heading */}
            <RevealText
              text={content.contact.heading}
              accentWords={["talk."]}
              className="font-display font-bold tracking-[-0.045em] text-[var(--text)]"
              style={{ fontSize: "clamp(3.25rem, 10vw, 8.5rem)", lineHeight: 0.92 }}
            />
            <a
              href={`mailto:${SITE_CONFIG.email}`}
              onKeyDown={activateAnchorOnSpace}
              className="group font-display mt-6 inline-flex max-w-full items-center gap-2 text-[clamp(1.1rem,2.6vw,1.75rem)] font-semibold tracking-tight break-all text-[var(--text)]"
            >
              <span className="u-draw u-draw-thick pb-1">{SITE_CONFIG.email}</span>
              <ArrowUpRight
                className="h-5 w-5 shrink-0 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                aria-hidden="true"
              />
            </a>
            <p className="mt-6 max-w-xl text-base text-[var(--text-muted)] sm:text-lg">
              {content.contact.lead}
            </p>
            <p className="font-mono-data mt-4 text-xs text-[var(--text-muted)]">
              {content.contact.availabilityNote}
            </p>
          </div>

          <div className="flex flex-col gap-3 lg:col-span-5 lg:w-full lg:max-w-sm lg:justify-self-end">
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

            <motion.button
              type="button"
              onClick={handleCopyEmail}
              aria-label={copied ? "Copied to clipboard" : content.contact.copyActionLabel}
              animate={reducedMotion ? undefined : { scale: copied ? 1.015 : 1 }}
              transition={{ type: "spring", stiffness: 420, damping: 24 }}
              className={`inline-flex min-h-[46px] items-center justify-between rounded-[var(--radius-sm)] border px-5 py-3 text-sm font-semibold transition-colors ${
                copied
                  ? "border-[var(--status-green)] bg-[var(--bg)] text-[var(--text)]"
                  : "border-[var(--border-strong)] bg-[var(--bg)] text-[var(--text)] hover:border-[var(--accent)]"
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <span className="relative inline-flex h-4 w-4 items-center justify-center">
                  <AnimatePresence mode="wait" initial={false}>
                    {copied ? (
                      <motion.span
                        key="check"
                        initial={
                          reducedMotion ? { opacity: 1 } : { scale: 0.4, opacity: 0, rotate: -30 }
                        }
                        animate={{ scale: 1, opacity: 1, rotate: 0 }}
                        exit={reducedMotion ? { opacity: 0 } : { scale: 0.4, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 520, damping: 26 }}
                        className="absolute inset-0 flex items-center justify-center text-[var(--status-green)]"
                      >
                        <Check className="h-4 w-4" />
                      </motion.span>
                    ) : (
                      <motion.span
                        key="copy"
                        initial={reducedMotion ? { opacity: 1 } : { scale: 0.4, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={reducedMotion ? { opacity: 0 } : { scale: 0.4, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 520, damping: 26 }}
                        className="absolute inset-0 flex items-center justify-center"
                      >
                        <Copy className="h-4 w-4" />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </span>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={copied ? "copied" : "copy"}
                    initial={reducedMotion ? { opacity: 1 } : { y: 6, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={reducedMotion ? { opacity: 0 } : { y: -6, opacity: 0 }}
                    transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {copied ? "Copied to clipboard" : content.contact.copyActionLabel}
                  </motion.span>
                </AnimatePresence>
              </span>
              <span className="font-mono-data text-xs text-[var(--text-muted)]">
                {copied ? "Done" : "Clipboard"}
              </span>
            </motion.button>

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
