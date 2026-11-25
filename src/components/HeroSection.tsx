"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDownRight, ArrowUpRight, FileDown, Mail } from "lucide-react";
import contentRaw from "@/src/content/content.json";
import { SITE_CONFIG } from "@/src/config";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { activateAnchorOnSpace } from "@/src/lib/keyboard";
import { formatRelativeTime } from "@/src/lib/github-transform";
import type { LatestPushInfo, PortfolioContent } from "@/src/types/portfolio";
import { useLenisScroll, useTheme } from "./ShellProviders";

const content = contentRaw as PortfolioContent;

interface HeroSectionProps {
  repoCount: number;
  totalContributions: number;
  latestPush: LatestPushInfo | null;
}

interface SpatialNode {
  x: number;
  y: number;
  z: number;
  tag: string;
}

function createSpatialNodes(): SpatialNode[] {
  const labels = [
    "TS",
    "AI",
    "CLI",
    "SQL",
    "VEC",
    "AST",
    "3D",
    "API",
    "PY",
    "GIT",
    "HUD",
    "SYS",
  ];
  const nodes: SpatialNode[] = [];
  // Deterministic golden-angle spiral in 3D space (zero randomness across SSR/CSR)
  const count = 40;
  for (let i = 0; i < count; i++) {
    const t = i / count;
    const angle = i * 2.399963229728653;
    const radius = 0.22 + Math.sqrt(t) * 0.78;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius * 0.68;
    const z = ((i * 7) % count) / count; // 0 .. 1 depth planes
    nodes.push({
      x,
      y,
      z,
      tag: labels[i % labels.length],
    });
  }
  return nodes;
}

export default function HeroSection({
  repoCount,
  totalContributions,
  latestPush,
}: HeroSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lineOneRef = useRef<HTMLSpanElement>(null);
  const lineTwoRef = useRef<HTMLSpanElement>(null);
  const contentWrapRef = useRef<HTMLDivElement>(null);
  const scrollBarRef = useRef<HTMLDivElement>(null);

  const reducedMotion = useReducedMotion();
  const { scrollToAnchor } = useLenisScroll();
  const { theme } = useTheme();
  const [activeChapter, setActiveChapter] = useState(0);

  const nodes = useMemo(() => createSpatialNodes(), []);
  const chapters = content.hero.chapters;

  // Spatial vector lattice + scroll-linked kinetic aperture
  const animStateRef = useRef({
    targetProgress: 0,
    currentProgress: 0,
    targetPtrX: 0,
    targetPtrY: 0,
    currentPtrX: 0,
    currentPtrY: 0,
    rafId: 0,
    running: false,
    chapterIdx: 0,
    themeMode: theme,
  });

  useEffect(() => {
    animStateRef.current.themeMode = theme;
  }, [theme]);

  const stepFrameRef = useRef<() => void>(() => {});

  useEffect(() => {
    const state = animStateRef.current;

    const renderSpatialCanvas = (progress: number, ptrX: number, ptrY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (w === 0 || h === 0) return;

      const targetW = Math.round(w * dpr);
      const targetH = Math.round(h * dpr);
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const isLight = state.themeMode === "light";
      const rgb = isLight ? "14, 14, 14" : "255, 255, 255";

      const cx = w * 0.5 + ptrX * 26;
      const cy = h * 0.5 + ptrY * 18;
      const scaleBase = Math.min(w, h) * 0.52;

      // Subtle architectural perspective frame planes that dolly toward viewer on scroll
      const planeCount = 3;
      for (let p = 0; p < planeCount; p++) {
        const depthPhase = ((p / planeCount) + progress * 0.65) % 1;
        const planeScale = 0.28 + depthPhase * 0.85;
        const pw = w * 0.72 * planeScale;
        const ph = h * 0.56 * planeScale;
        const alpha = Math.sin(depthPhase * Math.PI) * 0.075;
        ctx.strokeStyle = `rgba(${rgb}, ${alpha.toFixed(3)})`;
        ctx.lineWidth = 1;
        ctx.strokeRect(
          Math.round(cx - pw * 0.5) + 0.5,
          Math.round(cy - ph * 0.5) + 0.5,
          Math.round(pw),
          Math.round(ph)
        );
      }

      // Project 3D nodes with dolly zoom & gentle orbital yaw
      const yaw = progress * 0.52 + ptrX * 0.18;
      const pitch = ptrY * 0.14 - progress * 0.12;
      const cosY = Math.cos(yaw);
      const sinY = Math.sin(yaw);
      const cosP = Math.cos(pitch);
      const sinP = Math.sin(pitch);

      const projected: Array<{
        sx: number;
        sy: number;
        depth: number;
        alpha: number;
        tag: string;
        idx: number;
      }> = [];

      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        // Z advances forward with scroll progress
        const zWrapped = 1.15 - (((n.z + progress * 0.72) % 1) * 0.92);
        const rx = n.x * cosY - (zWrapped - 0.65) * sinY;
        const rz = n.x * sinY + (zWrapped - 0.65) * cosY + 1.35;
        const ry = n.y * cosP - (rz - 1.35) * sinP;
        const perspective = 1.25 / Math.max(0.38, rz);

        const sx = cx + rx * scaleBase * perspective;
        const sy = cy + ry * scaleBase * perspective;
        const alpha = Math.max(0.08, Math.min(0.55, (1.75 - rz) * 0.42));

        projected.push({
          sx,
          sy,
          depth: rz,
          alpha,
          tag: n.tag,
          idx: i,
        });
      }

      // Draw crisp proximity vector hairlines
      const maxDist = Math.min(w, h) * 0.24;
      const maxDistSq = maxDist * maxDist;
      ctx.lineWidth = 0.75;

      for (let i = 0; i < projected.length; i++) {
        const a = projected[i];
        for (let j = i + 1; j < projected.length; j++) {
          const b = projected[j];
          const dx = a.sx - b.sx;
          const dy = a.sy - b.sy;
          const dSq = dx * dx + dy * dy;
          if (dSq < maxDistSq) {
            const proximity = 1 - Math.sqrt(dSq) / maxDist;
            const lineAlpha = proximity * Math.min(a.alpha, b.alpha) * 0.34;
            if (lineAlpha > 0.015) {
              ctx.strokeStyle = `rgba(${rgb}, ${lineAlpha.toFixed(3)})`;
              ctx.beginPath();
              ctx.moveTo(a.sx, a.sy);
              ctx.lineTo(b.sx, b.sy);
              ctx.stroke();
            }
          }
        }
      }

      // Draw micro `+` reticles and sparse technical node labels
      ctx.font = "500 9px monospace";
      ctx.textBaseline = "middle";

      for (let i = 0; i < projected.length; i++) {
        const p = projected[i];
        const arm = i % 5 === 0 ? 4 : 2.5;
        ctx.strokeStyle = `rgba(${rgb}, ${p.alpha.toFixed(3)})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(p.sx - arm, p.sy);
        ctx.lineTo(p.sx + arm, p.sy);
        ctx.moveTo(p.sx, p.sy - arm);
        ctx.lineTo(p.sx, p.sy + arm);
        ctx.stroke();

        if (i % 6 === 0) {
          ctx.fillStyle = `rgba(${rgb}, ${(p.alpha * 0.62).toFixed(3)})`;
          ctx.fillText(p.tag, p.sx + 7, p.sy);
        }
      }
    };

    stepFrameRef.current = () => {
      const lerp = reducedMotion ? 1 : 0.09;
      state.currentProgress += (state.targetProgress - state.currentProgress) * lerp;
      state.currentPtrX += (state.targetPtrX - state.currentPtrX) * 0.065;
      state.currentPtrY += (state.targetPtrY - state.currentPtrY) * 0.065;

      const p = state.currentProgress;

      // Split-axis kinetic typography aperture on scroll
      if (!reducedMotion) {
        const driftPx = p * Math.min(window.innerWidth * 0.08, 96);
        const fadeOut = Math.max(0, 1 - Math.max(0, (p - 0.72) / 0.28));
        if (lineOneRef.current) {
          lineOneRef.current.style.transform = `translate3d(${(-driftPx).toFixed(2)}px, 0, 0)`;
        }
        if (lineTwoRef.current) {
          lineTwoRef.current.style.transform = `translate3d(${driftPx.toFixed(2)}px, 0, 0)`;
        }
        if (contentWrapRef.current) {
          contentWrapRef.current.style.opacity = fadeOut.toFixed(3);
          contentWrapRef.current.style.transform = `translate3d(0, ${(-p * 28).toFixed(2)}px, 0)`;
        }
      }

      if (scrollBarRef.current) {
        scrollBarRef.current.style.transform = `scaleX(${Math.max(0.04, p).toFixed(4)})`;
      }

      const nextChapter = Math.min(
        chapters.length - 1,
        Math.max(0, Math.floor(p * chapters.length * 0.999))
      );
      if (nextChapter !== state.chapterIdx) {
        state.chapterIdx = nextChapter;
        setActiveChapter(nextChapter);
      }

      renderSpatialCanvas(p, state.currentPtrX, state.currentPtrY);

      const settled =
        Math.abs(state.targetProgress - state.currentProgress) < 0.0006 &&
        Math.abs(state.targetPtrX - state.currentPtrX) < 0.001 &&
        Math.abs(state.targetPtrY - state.currentPtrY) < 0.001;

      if (!settled) {
        state.rafId = requestAnimationFrame(() => stepFrameRef.current());
      } else {
        state.running = false;
      }
    };

    const wakeLoop = () => {
      if (!state.running) {
        state.running = true;
        state.rafId = requestAnimationFrame(() => stepFrameRef.current());
      }
    };

    const computeScrollTarget = () => {
      const el = sectionRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const scrollable = Math.max(1, el.offsetHeight - window.innerHeight);
      const raw = -rect.top / scrollable;
      state.targetProgress = Math.max(0, Math.min(1, raw));
      wakeLoop();
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (reducedMotion || e.pointerType !== "mouse") return;
      state.targetPtrX = (e.clientX / Math.max(1, window.innerWidth)) * 2 - 1;
      state.targetPtrY = (e.clientY / Math.max(1, window.innerHeight)) * 2 - 1;
      wakeLoop();
    };

    const handleResize = () => {
      computeScrollTarget();
      renderSpatialCanvas(state.currentProgress, state.currentPtrX, state.currentPtrY);
    };

    computeScrollTarget();
    renderSpatialCanvas(state.currentProgress, 0, 0);

    window.addEventListener("scroll", computeScrollTarget, { passive: true });
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("resize", handleResize, { passive: true });

    return () => {
      if (state.rafId) cancelAnimationFrame(state.rafId);
      state.running = false;
      window.removeEventListener("scroll", computeScrollTarget);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("resize", handleResize);
    };
  }, [chapters.length, nodes, reducedMotion, theme]);

  const handleAnchor = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    scrollToAnchor(href, { focusTarget: true, updateHistory: true });
  };

  const chapter = chapters[activeChapter] ?? chapters[0];
  const paddedRepoCount = String(Math.max(repoCount, 8)).padStart(2, "0");

  return (
    <section
      id="top"
      ref={sectionRef}
      tabIndex={-1}
      aria-label="Hero introduction"
      className="relative min-h-[100svh] border-b border-[var(--border)] bg-[var(--bg)] md:h-[var(--hero-runway)]"
    >
      <div className="sticky top-0 flex min-h-[100svh] w-full flex-col justify-between overflow-hidden pt-[var(--nav-height)]">
        {/* Portrait-free interactive 3D spatial vector & embedding canvas */}
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full opacity-90"
        />

        {/* Subtle radial edge vignette so typography stays razor-sharp */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_28%,var(--bg)_92%)]"
        />

        {/* Main Hero Stage */}
        <div
          ref={contentWrapRef}
          className="relative z-10 mx-auto flex w-full max-w-[1440px] flex-1 flex-col justify-between px-[var(--space-edge)] py-6 sm:py-9 will-change-[transform,opacity]"
        >
          {/* Top Architectural Telemetry Strip */}
          <div
            data-hero-intro="text"
            className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-4"
          >
            <div className="flex items-center gap-3">
              <span className="font-mono-data text-[11px] tracking-[var(--tracking-mono)] uppercase text-[var(--text-muted)]">
                00 // {content.hero.kicker}
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <span className="alive-dot relative inline-flex h-2 w-2 rounded-full bg-[var(--status-green)]" />
              <span className="font-mono-data text-[11px] tracking-[var(--tracking-mono)] uppercase text-[var(--text-secondary)]">
                Open to Internships · GSoC · Hackathons
              </span>
            </div>
          </div>

          {/* Centerpiece Monumental Kinetic Typography (Portrait-Free) */}
          <div className="my-auto py-6 sm:py-10">
            <div data-hero-intro="text" className="overflow-hidden">
              <h1 className="font-display select-none text-[clamp(3.9rem,12.4vw,11.2rem)] leading-[0.86] font-semibold tracking-[-0.04em] uppercase text-[var(--text)]">
                <span ref={lineOneRef} className="block will-change-transform">
                  {content.hero.firstName}
                </span>
              </h1>
            </div>

            {/* Precision Center Sightline Divider */}
            <div
              data-hero-intro="text"
              className="my-3 flex items-center gap-4 sm:my-5"
              aria-hidden="true"
            >
              <span className="font-mono-data text-[10px] tracking-[0.14em] uppercase text-[var(--text-muted)]">
                18.5204° N · 73.8567° E
              </span>
              <div className="relative h-px flex-1 bg-[var(--border-strong)]">
                <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[var(--bg)] px-2 font-mono-data text-xs leading-none text-[var(--text)]">
                  +
                </span>
              </div>
              <span className="font-mono-data hidden text-[10px] tracking-[0.14em] uppercase text-[var(--text-muted)] sm:inline">
                SYSTEMS · AI · CLI · WEB
              </span>
            </div>

            <div data-hero-intro="text" className=" flex justify-end overflow-hidden">
              <span
                ref={lineTwoRef}
                aria-hidden="true"
                className="font-display block select-none text-right text-[clamp(3.9rem,12.4vw,11.2rem)] leading-[0.86] font-semibold tracking-[-0.04em] uppercase text-[var(--text)] will-change-transform"
              >
                {content.hero.lastName}
              </span>
            </div>
            <span className="sr-only">{content.hero.lastName}</span>
          </div>

          {/* Bottom Asymmetric Engineering Ledger + Scroll-Scrubbed Chapter + CTAs */}
          <div
            data-hero-intro="text"
            className="grid grid-cols-1 items-end gap-6 border-t border-[var(--border)] pt-5 lg:grid-cols-12"
          >
            {/* Left: Scroll-scrubbed chapter readout */}
            <div className="lg:col-span-5">
              <div className="mb-2 flex items-center gap-2.5">
                <span className="font-mono-data text-[11px] tracking-[var(--tracking-mono)] uppercase text-[var(--text)]">
                  {chapter.index} / 0{chapters.length}
                </span>
                <span className="h-px w-5 bg-[var(--border-strong)]" />
                <span className="font-mono-data text-[11px] tracking-[var(--tracking-mono)] uppercase text-[var(--text-muted)]">
                  {chapter.label}
                </span>
              </div>
              <p className="font-display text-lg leading-snug font-medium tracking-[-0.02em] text-[var(--text)] sm:text-xl">
                {chapter.title}
              </p>
              <p className="mt-1.5 max-w-[46ch] text-sm leading-relaxed text-[var(--text-muted)]">
                {chapter.body}
              </p>
            </div>

            {/* Middle: Live GitHub Telemetry Readout */}
            <div className="grid grid-cols-3 gap-3 border-y border-[var(--border)] py-3 lg:col-span-4 lg:border-y-0 lg:border-x lg:px-5 lg:py-0">
              <div>
                <div className="font-mono-data text-[10px] tracking-[var(--tracking-mono)] uppercase text-[var(--text-muted)]">
                  ARCHIVE
                </div>
                <div className="font-mono-data mt-1 text-base font-semibold text-[var(--text)] sm:text-lg">
                  {paddedRepoCount} REPOS
                </div>
              </div>
              <div>
                <div className="font-mono-data text-[10px] tracking-[var(--tracking-mono)] uppercase text-[var(--text-muted)]">
                  COMMITS / YR
                </div>
                <div className="font-mono-data mt-1 text-base font-semibold text-[var(--text)] sm:text-lg">
                  {totalContributions > 0 ? totalContributions : "134"}
                </div>
              </div>
              <div>
                <div className="font-mono-data text-[10px] tracking-[var(--tracking-mono)] uppercase text-[var(--text-muted)]">
                  LATEST PUSH
                </div>
                <div className="font-mono-data mt-1 truncate text-xs font-medium text-[var(--text-secondary)] sm:text-sm">
                  {latestPush ? formatRelativeTime(latestPush.date) : "Active"}
                </div>
              </div>
            </div>

            {/* Right: Crisp 90-degree CTAs */}
            <div className="flex flex-wrap items-center gap-2.5 lg:col-span-3 lg:justify-end">
              <a
                href="#projects"
                onClick={(e) => handleAnchor(e, "#projects")}
                onKeyDown={activateAnchorOnSpace}
                className="font-mono-data inline-flex min-h-[42px] items-center gap-2 bg-[var(--accent)] px-4 py-2.5 text-xs font-semibold tracking-[var(--tracking-mono)] uppercase text-[var(--on-accent)] transition-opacity hover:opacity-88"
              >
                <span>Explore Works</span>
                <ArrowDownRight className="h-3.5 w-3.5" />
              </a>

              <a
                href="#contact"
                onClick={(e) => handleAnchor(e, "#contact")}
                onKeyDown={activateAnchorOnSpace}
                className="font-mono-data inline-flex min-h-[42px] items-center gap-1.5 border border-[var(--border-strong)] bg-[var(--surface)] px-3.5 py-2.5 text-xs font-medium tracking-[var(--tracking-mono)] uppercase text-[var(--text)] transition-colors hover:border-[var(--text)] hover:bg-[var(--surface-2)]"
              >
                <Mail className="h-3.5 w-3.5" />
                <span>{content.hero.primaryCta}</span>
              </a>

              <a
                href={SITE_CONFIG.resumePath}
                download="Heet-Mehta-Resume.pdf"
                onKeyDown={activateAnchorOnSpace}
                className="font-mono-data inline-flex min-h-[42px] items-center gap-1.5 border border-[var(--border)] bg-transparent px-3.5 py-2.5 text-xs font-medium tracking-[var(--tracking-mono)] uppercase text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text)]"
              >
                <FileDown className="h-3.5 w-3.5" />
                <span>{content.hero.secondaryCta}</span>
                <ArrowUpRight className="h-3 w-3 opacity-70" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Horizon Handoff Progress Bar into Act II (Horizontal FLIP Showcase) */}
        <div className="relative z-10 w-full border-t border-[var(--border)] bg-[var(--bg)]/85 backdrop-blur-xs">
          <div className="mx-auto flex max-w-[1440px] items-center justify-between px-[var(--space-edge)] py-2.5">
            <span className="font-mono-data text-[10px] tracking-[0.12em] uppercase text-[var(--text-muted)]">
              {content.hero.scrollCue} — 01 — {paddedRepoCount}
            </span>
            <span className="font-mono-data text-[10px] tracking-[0.12em] uppercase text-[var(--text-muted)]">
              NEXT: HORIZONTAL FLIP ARCHIVE ↓
            </span>
          </div>
          <div className="h-[2px] w-full bg-[var(--border)]">
            <div
              ref={scrollBarRef}
              className="h-full w-full origin-left scale-x-[0.04] bg-[var(--text)] will-change-transform"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
