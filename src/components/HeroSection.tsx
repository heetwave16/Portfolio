"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowDown, FileDown, Mail, ScanEye } from "lucide-react";
import content from "@/src/content/content.json";
import { SITE_CONFIG } from "@/src/config";
import { activateAnchorOnSpace } from "@/src/lib/keyboard";
import { useLenisScroll } from "./ShellProviders";

export default function HeroSection() {
  const portraitRef = useRef<HTMLDivElement>(null);
  const portraitRectRef = useRef<DOMRect | null>(null);
  const lastScrollYRef = useRef<number>(0);
  const { scrollToAnchor } = useLenisScroll();
  const [revealPinned, setRevealPinned] = useState(false);
  const [hoverActive, setHoverActive] = useState(false);
  const [realImgFailed, setRealImgFailed] = useState(false);
  const [wireImgFailed, setWireImgFailed] = useState(false);
  const [maskPos, setMaskPos] = useState({ x: 50, y: 45 });

  const updateMaskFromEvent = useCallback((clientX: number, clientY: number, refreshRect = false) => {
    const el = portraitRef.current;
    if (!el) return;
    const currentScrollY = window.scrollY;
    if (refreshRect || !portraitRectRef.current || lastScrollYRef.current !== currentScrollY) {
      portraitRectRef.current = el.getBoundingClientRect();
      lastScrollYRef.current = currentScrollY;
    }
    const rect = portraitRectRef.current;
    if (!rect.width || !rect.height) return;
    const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
    setMaskPos({ x, y });
  }, []);

  useEffect(() => {
    const invalidateRect = () => {
      portraitRectRef.current = null;
    };
    window.addEventListener("resize", invalidateRect, { passive: true });
    return () => window.removeEventListener("resize", invalidateRect);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && revealPinned) {
        setRevealPinned(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [revealPinned]);

  const clipRadius = revealPinned ? "150%" : hoverActive ? "115px" : "0px";

  return (
    <section
      id="top"
      tabIndex={-1}
      className="relative border-b border-[var(--border)] pt-[calc(var(--nav-height)+clamp(2.5rem,6vh,5rem))] pb-[clamp(3.5rem,8vh,6.5rem)] focus:outline-none"
    >
      <div className="mx-auto max-w-[1440px] px-[var(--space-edge)]">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-8">
          {/* Left typographic column (7 cols) */}
          <div className="flex flex-col justify-between lg:col-span-7">
            <div>
              <p
                data-hero-intro="text"
                className="font-mono-data mb-4 text-xs font-medium tracking-[var(--tracking-mono)] text-[var(--text-muted)] uppercase"
              >
                {content.hero.kicker}
              </p>

              <h1
                data-hero-intro="text"
                className="font-display font-bold tracking-[var(--tracking-display)] text-[var(--text)]"
                style={{
                  fontSize: "var(--text-mega)",
                  lineHeight: "var(--leading-mega)",
                  textWrap: "balance",
                }}
              >
                <span className="block">{content.hero.firstName}</span>
                <span className="block text-[var(--accent)]">{content.hero.lastName}</span>
              </h1>

              <p
                data-hero-intro="text"
                className="mt-6 max-w-xl text-[var(--text-muted)]"
                style={{ fontSize: "var(--text-lead)", lineHeight: "1.45" }}
              >
                {content.hero.tagline}
              </p>
            </div>

            {/* Primary & Secondary CTAs: reach Contact or Resume in <5s */}
            <div data-hero-intro="text" className="mt-8 flex flex-wrap items-center gap-4">
              <a
                href="#contact"
                onClick={(e) => {
                  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                  e.preventDefault();
                  scrollToAnchor("#contact", { focusTarget: true, updateHistory: true });
                }}
                onKeyDown={activateAnchorOnSpace}
                className="inline-flex min-h-[46px] items-center gap-2 rounded-[var(--radius-sm)] bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-[var(--on-accent)] transition-transform duration-[var(--duration-fast)] [transition-timing-function:var(--ease-snappy)] hover:-translate-y-0.5 whitespace-nowrap"
              >
                <Mail className="h-4 w-4" />
                <span>{content.hero.primaryCta}</span>
              </a>

              <a
                href={SITE_CONFIG.resumePath}
                download="Heet-Mehta-Resume.pdf"
                onKeyDown={activateAnchorOnSpace}
                className="inline-flex min-h-[46px] items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--surface)] px-6 py-3 text-sm font-semibold text-[var(--text)] transition-colors duration-[var(--duration-fast)] [transition-timing-function:var(--ease-snappy)] hover:border-[var(--accent)] hover:bg-[var(--surface-2)] whitespace-nowrap"
              >
                <FileDown className="h-4 w-4" />
                <span>{content.hero.secondaryCta}</span>
              </a>

              <a
                href="#what-i-build"
                onClick={(e) => {
                  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                  e.preventDefault();
                  scrollToAnchor("#what-i-build", { focusTarget: true, updateHistory: true });
                }}
                onKeyDown={activateAnchorOnSpace}
                className="font-mono-data ml-auto hidden items-center gap-2 rounded-[var(--radius-sm)] px-1 py-0.5 text-xs text-[var(--text-muted)] transition-colors duration-[var(--duration-fast)] hover:text-[var(--text)] sm:inline-flex whitespace-nowrap"
              >
                <span>{content.hero.scrollCue}</span>
                <ArrowDown className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

          {/* Right Two-Face Hover Reveal Portrait (5 cols) */}
          <div className="lg:col-span-5">
            <div className="relative mx-auto w-full max-w-[420px]">
              <div
                ref={portraitRef}
                data-hero-intro="portrait"
                data-testid="hero-twoface"
                data-cursor="portrait"
                data-revealed={revealPinned || hoverActive ? "true" : "false"}
                onPointerEnter={(e) => {
                  if (e.pointerType === "mouse") {
                    setHoverActive(true);
                    updateMaskFromEvent(e.clientX, e.clientY, true);
                  }
                }}
                onPointerMove={(e) => {
                  if (e.pointerType === "mouse") {
                    setHoverActive(true);
                    updateMaskFromEvent(e.clientX, e.clientY, false);
                  }
                }}
                onPointerLeave={(e) => {
                  if (e.pointerType === "mouse") {
                    setHoverActive(false);
                  }
                }}
                onClick={(e) => {
                  // Tap or click toggles reveal cleanly on touch and desktop
                  updateMaskFromEvent(e.clientX, e.clientY, true);
                  setRevealPinned((prev) => !prev);
                }}
                className="relative aspect-[3/4] w-full cursor-pointer overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-[var(--surface)] select-none"
              >
                {/* Base layer: real portrait */}
                {!realImgFailed ? (
                  <Image
                    src="/img/hero/portrait-real.jpg"
                    alt={content.hero.realPortraitAlt}
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 420px"
                    referrerPolicy="no-referrer"
                    onError={() => setRealImgFailed(true)}
                    className="object-cover object-top"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center bg-[var(--surface)] p-6 text-center">
                    <span className="font-display text-5xl font-bold text-[var(--text)]">
                      {SITE_CONFIG.monogram}
                    </span>
                    <span className="mt-2 text-sm text-[var(--text-muted)]">
                      {SITE_CONFIG.fullName}
                    </span>
                  </div>
                )}

                {/* Reveal layer: wireframe contour portrait in Beige */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-[var(--violet)] transition-[clip-path] duration-[var(--duration-fast)] [transition-timing-function:var(--ease-snappy)]"
                  style={{
                    clipPath: `circle(${clipRadius} at ${maskPos.x}% ${maskPos.y}%)`,
                  }}
                >
                  {!wireImgFailed ? (
                    <Image
                      src="/img/hero/portrait-wireframe.jpg"
                      alt={content.hero.wireframePortraitAlt}
                      fill
                      sizes="(max-width: 1024px) 100vw, 420px"
                      referrerPolicy="no-referrer"
                      onError={() => setWireImgFailed(true)}
                      className="object-cover object-top"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center border-2 border-dashed border-[var(--beige)]/50 bg-[var(--violet)]">
                      <span className="font-mono-data text-xs text-[var(--beige)]">
                        WIREFRAME TOPOLOGY
                      </span>
                    </div>
                  )}
                </div>

                {/* Subtle bottom scrim & caption */}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent p-4">
                  <p className="font-mono-data text-[11px] tracking-[var(--tracking-mono)] text-[var(--beige)]/90">
                    {revealPinned
                      ? "WIREFRAME LAYER LOCKED · CLICK OR ESC TO RESET"
                      : "HOVER TO INSPECT WIREFRAME · TAP TO TOGGLE"}
                  </p>
                </div>
              </div>

              {/* Accessible keyboard/touch toggle control */}
              <div className="mt-3 flex items-center justify-between">
                <span className="font-mono-data text-xs text-[var(--text-muted)]">
                  github.com/{SITE_CONFIG.githubUsername}
                </span>
                <button
                  type="button"
                  onClick={() => setRevealPinned((prev) => !prev)}
                  aria-pressed={revealPinned}
                  className="font-mono-data inline-flex min-h-[36px] items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--text)] transition-colors hover:border-[var(--accent)]"
                >
                  <ScanEye className="h-3.5 w-3.5 text-[var(--accent)]" />
                  <span>{revealPinned ? "Show photo" : content.hero.wireframeToggleLabel}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
