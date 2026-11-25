"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowUpRight, Code2, ExternalLink, Github, Terminal, X } from "lucide-react";
import content from "@/src/content/content.json";
import { SITE_CONFIG } from "@/src/config";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { formatRelativeTime } from "@/src/lib/github-transform";
import {
  activateAnchorOnSpace,
  getFocusableElements,
  getNextRovingIndex,
} from "@/src/lib/keyboard";
import type { ProjectCardModel, ProjectSortMode } from "@/src/types/portfolio";
import RevealText from "./RevealText";

gsap.registerPlugin(ScrollTrigger);

interface ProjectsSectionProps {
  projects: ProjectCardModel[];
  categories: string[];
  activeCategory: string;
  onCategoryChange: (cat: string) => void;
  sortMode: ProjectSortMode;
  onSortChange: (sort: ProjectSortMode) => void;
  loading: boolean;
}

const SNAPPY_BEZIER = [0.22, 1, 0.36, 1] as const;

function CommitSparkline({ counts, animateKey }: { counts: number[]; animateKey: string }) {
  const safeCounts = counts.length > 0 ? counts : [0, 0, 0, 0, 0, 0, 0];
  const max = Math.max(1, ...safeCounts);
  const w = 84;
  const h = 24;
  const step = w / Math.max(1, safeCounts.length - 1);
  const points = safeCounts
    .map((val, idx) => {
      const x = idx * step;
      const y = h - 3 - (val / max) * (h - 6);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      key={animateKey}
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      aria-label="7-day commit activity sparkline"
      className="overflow-visible"
    >
      <polyline
        className="spark-draw"
        pathLength={1}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
      {safeCounts.map((val, idx) => {
        const x = idx * step;
        const y = h - 3 - (val / max) * (h - 6);
        return (
          <circle
            key={idx}
            cx={x}
            cy={y}
            r={val > 0 ? 2.2 : 1.2}
            fill={val > 0 ? "var(--text)" : "var(--border-strong)"}
          />
        );
      })}
    </svg>
  );
}

function LanguageBar({
  project,
  animateKey,
  reducedMotion,
}: {
  project: ProjectCardModel;
  animateKey: string;
  reducedMotion: boolean;
}) {
  const totalBytes = project.languages.reduce((sum, l) => sum + l.size, 0);
  if (totalBytes === 0) return null;

  return (
    <div>
      <motion.div
        key={animateKey}
        initial={reducedMotion ? { scaleX: 1 } : { scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={reducedMotion ? { duration: 0 } : { duration: 0.55, ease: SNAPPY_BEZIER }}
        className="flex h-2 w-full origin-left overflow-hidden rounded-[2px] bg-[var(--surface-2)]"
      >
        {project.languages.slice(0, 5).map((lang) => (
          <div
            key={lang.name}
            style={{
              width: `${Math.max(2, (lang.size / totalBytes) * 100)}%`,
              backgroundColor: lang.color,
            }}
            title={`${lang.name}: ${((lang.size / totalBytes) * 100).toFixed(1)}%`}
          />
        ))}
      </motion.div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--text-muted)]">
        {project.languages.slice(0, 4).map((lang) => (
          <span key={lang.name} className="inline-flex items-center gap-1.5 tabular-nums">
            <span
              aria-hidden="true"
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: lang.color }}
            />
            <span>{lang.name}</span>
            <span>{((lang.size / totalBytes) * 100).toFixed(0)}%</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function excerptText(text: string): string {
  const t = text.trim();
  return /[.!?…]$/.test(t) ? t : `${t}…`;
}

/** Typographic stand-in when a project has no web build to screenshot (never "Screenshot coming"). */
function MediaPlaceholder({ project, compact = false }: { project: ProjectCardModel; compact?: boolean }) {
  return (
    <div
      data-testid="media-placeholder"
      className="relative flex h-full w-full flex-col justify-between overflow-hidden bg-[var(--surface-2)] p-5"
    >
      <div className="font-mono-data flex items-center justify-between text-[10px] tracking-[var(--tracking-mono)] text-[var(--text-muted)] uppercase">
        <span className="inline-flex items-center gap-1.5">
          <Terminal className="h-3.5 w-3.5" aria-hidden="true" />
          {project.liveUrl ? "Live build" : "Source only · no web build"}
        </span>
        <span>{project.year}</span>
      </div>
      <p
        className={`font-display font-bold tracking-tight text-[var(--text)] ${compact ? "text-2xl" : "text-4xl"}`}
        style={{ lineHeight: 0.95 }}
      >
        {project.title}
      </p>
      <p className="font-mono-data text-xs text-[var(--text-muted)]">{project.stack}</p>
    </div>
  );
}

function ProjectMedia({
  project,
  sizes,
  failed,
  onError,
  priority = false,
}: {
  project: ProjectCardModel;
  sizes: string;
  failed: boolean;
  onError: () => void;
  priority?: boolean;
}) {
  if (!project.image || failed) return <MediaPlaceholder project={project} />;
  return (
    <Image
      src={project.image}
      alt={`Screenshot of ${project.title}`}
      fill
      sizes={sizes}
      priority={priority}
      onError={onError}
      className="card-img object-cover object-top"
    />
  );
}

/**
 * The ONE stacked/pinned moment on the site (Microsoft AI pattern): the top 3 featured builds
 * stack as you scroll on desktop. Mobile and reduced-motion get plain stacked cards, no pinning.
 */
function FeaturedStack({
  projects,
  onOpen,
  imgErrors,
  onImgError,
}: {
  projects: ProjectCardModel[];
  onOpen: (p: ProjectCardModel, el: HTMLElement) => void;
  imgErrors: Record<string, boolean>;
  onImgError: (id: string) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const mm = gsap.matchMedia();
    mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
      const cards = gsap.utils.toArray<HTMLElement>(wrap.querySelectorAll("[data-stack-card]"));
      cards.forEach((card, i) => {
        const next = cards[i + 1];
        if (!next) return;
        const inner = card.querySelector<HTMLElement>("[data-stack-inner]");
        const shade = card.querySelector<HTMLElement>(".stack-card-shade");
        gsap.to(inner, {
          scale: 0.94,
          ease: "none",
          scrollTrigger: { trigger: next, start: "top bottom", end: "top 30%", scrub: true },
        });
        if (shade) {
          gsap.to(shade, {
            opacity: 0.35,
            ease: "none",
            scrollTrigger: { trigger: next, start: "top bottom", end: "top 30%", scrub: true },
          });
        }
      });
    });
    return () => mm.revert();
  }, [projects.length]);

  if (projects.length === 0) return null;

  return (
    <div className="mb-16 sm:mb-20">
      <div className="mb-5 flex items-center gap-3">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--accent)]" aria-hidden="true" />
        <p className="font-mono-data text-xs tracking-[var(--tracking-mono)] text-[var(--text-muted)] uppercase">
          {content.projects.featuredEyebrow}
        </p>
        <span className="h-px flex-1 bg-[var(--border)]" aria-hidden="true" />
      </div>
      <div ref={wrapRef} className="flex flex-col gap-6 lg:gap-0">
        {projects.map((project, i) => (
          <div
            key={project.id}
            data-stack-card
            className="stack-card lg:sticky lg:pb-10"
            style={{ top: `calc(var(--nav-height) + 24px + ${i * 18}px)` }}
          >
            <article
              data-stack-inner
              className="card-hover group relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-[var(--surface)] edge-hairline"
              style={{ transformOrigin: "center top" }}
            >
              <div className="grid grid-cols-1 lg:grid-cols-12">
                <div className="relative aspect-[16/10] w-full overflow-hidden border-b border-[var(--border)] lg:col-span-7 lg:aspect-auto lg:min-h-[420px] lg:border-r lg:border-b-0">
                  <ProjectMedia
                    project={project}
                    sizes="(max-width: 1024px) 100vw, 760px"
                    failed={Boolean(imgErrors[project.id])}
                    onError={() => onImgError(project.id)}
                  />
                </div>
                <div className="flex flex-col justify-between gap-6 p-6 sm:p-8 lg:col-span-5">
                  <div>
                    <div className="font-mono-data flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-[var(--text-muted)] tabular-nums">
                      <span className="font-semibold text-[var(--accent-text)]">0{i + 1}</span>
                      <span aria-hidden="true">·</span>
                      <span>{project.category}</span>
                      <span aria-hidden="true">·</span>
                      <span>{project.year}</span>
                    </div>
                    <h3
                      className="font-display mt-3 font-bold tracking-tight text-[var(--text)]"
                      style={{ fontSize: "clamp(1.75rem, 3.4vw, 2.75rem)", lineHeight: 1.02 }}
                    >
                      <button
                        type="button"
                        onClick={(e) => onOpen(project, e.currentTarget.closest("article") ?? e.currentTarget)}
                        className="u-draw u-draw-thick text-left"
                      >
                        {project.title}
                      </button>
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-[var(--text-muted)] sm:text-base">
                      {project.pitch}
                    </p>
                    <p className="font-mono-data mt-4 text-xs text-[var(--text-muted)]">{project.stack}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    {project.liveUrl ? (
                      <a
                        href={project.liveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onKeyDown={activateAnchorOnSpace}
                        className="btn-split btn-primary"
                        aria-label={`Open ${project.title} live site (opens in a new tab)`}
                      >
                        <span className="btn-label">Live site</span>
                        <span className="btn-arrow" aria-hidden="true">
                          <ArrowUpRight className="h-4 w-4" />
                        </span>
                      </a>
                    ) : null}
                    <a
                      href={project.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onKeyDown={activateAnchorOnSpace}
                      className="btn-split btn-outline"
                      aria-label={`${project.title} source on GitHub (opens in a new tab)`}
                    >
                      <span className="btn-label">
                        <Github className="h-4 w-4" aria-hidden="true" />
                        Source
                      </span>
                      <span className="btn-arrow" aria-hidden="true">
                        <ArrowUpRight className="h-4 w-4" />
                      </span>
                    </a>
                    <button
                      type="button"
                      onClick={(e) => onOpen(project, e.currentTarget.closest("article") ?? e.currentTarget)}
                      className="font-mono-data inline-flex min-h-[44px] items-center gap-1.5 px-1 text-xs text-[var(--text-muted)] hover:text-[var(--text)]"
                    >
                      <span className="u-draw pb-0.5">Details</span>
                    </button>
                  </div>
                </div>
              </div>
              <span aria-hidden="true" className="stack-card-shade" />
            </article>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ProjectsSection({
  projects,
  categories,
  activeCategory,
  onCategoryChange,
  sortMode,
  onSortChange,
  loading,
}: ProjectsSectionProps) {
  const reducedMotion = useReducedMotion();
  const [hoveredProject, setHoveredProject] = useState<ProjectCardModel | null>(null);
  const [selectedRepoName, setSelectedRepoName] = useState<string>("HackStack");
  const [selectedProject, setSelectedProject] = useState<ProjectCardModel | null>(null);
  const [originRect, setOriginRect] = useState<DOMRect | null>(null);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sortGroupRef = useRef<HTMLDivElement>(null);
  const tabListRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const drawerCloseRef = useRef<HTMLButtonElement>(null);
  const lastTriggerRef = useRef<HTMLElement | null>(null);

  const onImgError = useCallback((id: string) => setImgErrors((prev) => ({ ...prev, [id]: true })), []);

  const featuredProjects = useMemo(
    () =>
      projects
        .filter((p) => p.featured)
        .sort((a, b) => a.featuredIndex - b.featuredIndex)
        .slice(0, 3),
    [projects]
  );

  const visibleProjects = useMemo(() => {
    if (activeCategory === "All") return projects;
    return projects.filter((p) => p.category === activeCategory);
  }, [projects, activeCategory]);

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, []);

  // Keep the inspector populated: default to HackStack, and derive fallback when the filter changes.
  const selectedRepo = useMemo(
    () =>
      visibleProjects.find((p) => p.repoName === selectedRepoName) ??
      visibleProjects.find((p) => p.repoName.toLowerCase() === "hackstack") ??
      visibleProjects[0] ??
      null,
    [visibleProjects, selectedRepoName]
  );

  // The live inspector shows a transient hover preview, falling back to the pinned selection.
  const inspectorRepo = hoveredProject ?? selectedRepo;
  const inspectorKey = `${activeCategory}:${inspectorRepo?.repoName ?? "empty"}`;

  const openProjectDrawer = useCallback(
    (project: ProjectCardModel, triggerEl?: HTMLElement | null) => {
      const trigger = triggerEl ?? (document.activeElement as HTMLElement | null);
      lastTriggerRef.current = trigger;
      setOriginRect(trigger ? trigger.getBoundingClientRect() : null);
      setSelectedRepoName(project.repoName);
      setSelectedProject(project);
    },
    []
  );

  const closeProjectDrawer = useCallback(() => {
    setSelectedProject(null);
    const restoreTarget = lastTriggerRef.current;
    lastTriggerRef.current = null;
    if (restoreTarget && typeof restoreTarget.focus === "function") {
      requestAnimationFrame(() => {
        // the trigger may be a non-focusable card; fall back to its first focusable child
        const focusTarget =
          restoreTarget.tabIndex >= 0 || restoreTarget.matches("a,button")
            ? restoreTarget
            : getFocusableElements(restoreTarget)[0] ?? restoreTarget;
        focusTarget.focus({ preventScroll: true });
      });
    }
  }, []);

  useEffect(() => {
    if (!selectedProject) return;

    const rafId = requestAnimationFrame(() => {
      drawerCloseRef.current?.focus();
    });

    // Lock page scroll (Lenis respects overflow on <html>) while the dialog is open.
    const root = document.documentElement;
    const prevOverflow = root.style.overflow;
    root.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeProjectDrawer();
        return;
      }
      if (e.key === "Tab" && drawerRef.current) {
        const focusables = getFocusableElements(drawerRef.current);
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (!drawerRef.current.contains(document.activeElement)) {
          e.preventDefault();
          first.focus();
        } else if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(rafId);
      root.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [selectedProject, closeProjectDrawer]);

  /** FLIP-style origin: the panel opens out of the clicked row/card's rectangle. */
  const flipClip = useMemo(() => {
    if (!originRect || typeof window === "undefined") return null;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const panelW = Math.min(vw, 576);
    const panelLeft = vw - panelW;
    const top = Math.max(0, originRect.top);
    const bottom = Math.max(0, vh - originRect.bottom);
    const left = Math.max(0, originRect.left - panelLeft);
    const right = Math.max(0, panelLeft + panelW - originRect.right);
    if (left + right >= panelW - 8) return null; // trigger is fully outside the panel column
    return `inset(${top}px ${right}px ${bottom}px ${left}px round 12px)`;
  }, [originRect]);

  const scheduleHoverPreview = (project: ProjectCardModel) => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => {
      setHoveredProject(project);
    }, SITE_CONFIG.hoverPreviewDelayMs);
  };

  const showPreviewImmediately = (project: ProjectCardModel) => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setHoveredProject(project);
  };

  const clearHoverPreview = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setHoveredProject(null);
  };

  const handleGroupArrowNav = (
    e: React.KeyboardEvent<HTMLDivElement>,
    container: HTMLDivElement | null
  ) => {
    const items = getFocusableElements(container);
    if (items.length === 0) return;
    const currentIndex = items.indexOf(document.activeElement as HTMLElement);
    const nextIndex = getNextRovingIndex(currentIndex, items.length, e.key, "horizontal");
    if (nextIndex !== null) {
      e.preventDefault();
      items[nextIndex]?.focus();
    }
  };

  return (
    <section
      id="projects"
      tabIndex={-1}
      className="border-b border-[var(--border)] py-[var(--space-section)] focus:outline-none"
    >
      <div className="mx-auto max-w-[1440px] px-[var(--space-edge)]">
        {/* Section header */}
        <div className="mb-10 max-w-2xl">
          <p className="font-mono-data mb-2 text-xs tracking-[var(--tracking-mono)] text-[var(--text-muted)] uppercase">
            {content.projects.eyebrow}
          </p>
          <RevealText
            text={content.projects.heading}
            className="font-display font-semibold tracking-tight text-[var(--text)]"
            style={{
              fontSize: "var(--text-h2)",
              lineHeight: "var(--leading-tight)",
              textWrap: "balance",
            }}
          />
          <p data-reveal className="mt-3 text-sm text-[var(--text-muted)] md:text-base">
            {content.projects.subtitle}
          </p>
        </div>

        {loading && projects.length === 0 ? (
          <div className="mb-16 space-y-4" aria-label="Loading featured projects">
            <div className="skeleton h-[420px] rounded-[var(--radius-lg)]" />
          </div>
        ) : (
          <FeaturedStack
            projects={featuredProjects}
            onOpen={openProjectDrawer}
            imgErrors={imgErrors}
            onImgError={onImgError}
          />
        )}

        {/* All repositories: filters + sort */}
        <div className="mb-6 flex flex-col justify-between gap-4 border-b border-[var(--border)] pb-4 lg:flex-row lg:items-center">
          <div
            ref={tabListRef}
            role="tablist"
            aria-label="Filter projects by category"
            onKeyDown={(e) => handleGroupArrowNav(e, tabListRef.current)}
            className="no-scrollbar -mx-[var(--space-edge)] flex items-center gap-2 overflow-x-auto px-[var(--space-edge)] lg:mx-0 lg:flex-wrap lg:px-0"
          >
            {categories.map((cat) => {
              const active = activeCategory === cat;
              return (
                <button
                  key={cat}
                  role="tab"
                  type="button"
                  aria-selected={active}
                  aria-controls="projects-list"
                  onClick={() => onCategoryChange(cat)}
                  className={`relative isolate min-h-[40px] shrink-0 rounded-[var(--radius-sm)] px-4 py-1.5 text-sm font-medium transition-colors duration-200 whitespace-nowrap ${
                    active ? "text-[var(--on-accent)]" : "text-[var(--text-muted)] hover:text-[var(--text)]"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="project-category-pill"
                      transition={
                        reducedMotion ? { duration: 0 } : { duration: 0.3, ease: SNAPPY_BEZIER }
                      }
                      className="absolute inset-0 z-0 rounded-[var(--radius-sm)] bg-[var(--accent)]"
                    />
                  )}
                  <span className="relative z-10">{cat}</span>
                </button>
              );
            })}
          </div>

          {/* Sort (Stars hidden: with a single starred repo it sorted nothing meaningful) */}
          <div className="flex items-center gap-2 self-start lg:self-auto">
            <span className="font-mono-data mr-1 text-xs text-[var(--text-muted)]">Sort:</span>
            <div
              ref={sortGroupRef}
              role="group"
              aria-label="Sort repositories"
              onKeyDown={(e) => handleGroupArrowNav(e, sortGroupRef.current)}
              className="inline-flex rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] p-1 edge-hairline"
            >
              {(
                [
                  { id: "featured", label: "Featured" },
                  { id: "recent", label: "Recent" },
                ] as const
              ).map((opt) => {
                const active = sortMode === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onSortChange(opt.id)}
                    aria-pressed={active}
                    className={`relative isolate min-h-[36px] rounded-[3px] px-3 py-1 text-xs font-medium transition-colors duration-200 whitespace-nowrap ${
                      active
                        ? "text-[var(--on-accent)]"
                        : "text-[var(--text-muted)] hover:text-[var(--text)]"
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="project-sort-pill"
                        transition={
                          reducedMotion ? { duration: 0 } : { duration: 0.26, ease: SNAPPY_BEZIER }
                        }
                        className="absolute inset-0 z-0 rounded-[3px] bg-[var(--accent)]"
                      />
                    )}
                    <span className="relative z-10">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Takumi-style list + sticky desktop Workbench inspector */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="lg:col-span-7">
            {loading && projects.length === 0 ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="skeleton h-24 rounded-[var(--radius-md)]" />
                ))}
              </div>
            ) : visibleProjects.length === 0 ? (
              <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-8 text-center text-sm text-[var(--text-muted)]">
                {content.projects.emptyState}
              </div>
            ) : (
              <ol id="projects-list" className="border-t border-[var(--border-strong)]" data-testid="projects-list">
                {visibleProjects.map((project, idx) => {
                  const isPinned = selectedRepo?.id === project.id;
                  return (
                    <li
                      key={project.id}
                      data-testid={`project-card-${project.id}`}
                      className={`list-row group relative cursor-pointer border-b border-[var(--border-strong)] px-2 py-5 sm:px-4 sm:py-6 ${
                        isPinned ? "lg:bg-[var(--surface)]/60" : ""
                      }`}
                      onMouseEnter={() => scheduleHoverPreview(project)}
                      onMouseLeave={clearHoverPreview}
                      onFocus={() => showPreviewImmediately(project)}
                      onBlur={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                          clearHoverPreview();
                        }
                      }}
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest("a, button")) return;
                        openProjectDrawer(project, e.currentTarget);
                      }}
                    >
                      <div className="grid grid-cols-[2rem_1fr_auto] items-start gap-x-3 gap-y-2 sm:grid-cols-[2.5rem_1fr_auto] sm:gap-x-5">
                        <span className="font-mono-data list-muted pt-1.5 text-xs text-[var(--text-muted)] tabular-nums">
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                        <div className="min-w-0">
                          <h3 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">
                            <button
                              type="button"
                              onClick={(e) => openProjectDrawer(project, e.currentTarget.closest("li"))}
                              className="text-left"
                              aria-haspopup="dialog"
                            >
                              <span className="u-draw pb-0.5">{project.title}</span>
                            </button>
                          </h3>
                          <p className="list-muted mt-1.5 text-sm text-[var(--text-muted)]">{project.pitch}</p>
                          <div className="font-mono-data list-muted mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-[var(--text-muted)] tabular-nums">
                            {project.featured ? (
                              <span className="list-chip rounded-[3px] border border-[var(--accent)] px-1.5 py-0.5 text-[var(--accent-text)]">
                                Featured
                              </span>
                            ) : null}
                            <span>{project.category}</span>
                            <span aria-hidden="true">·</span>
                            <span>{project.stack || project.primaryLanguage?.name}</span>
                            <span aria-hidden="true">·</span>
                            <span>{project.year}</span>
                            <span aria-hidden="true" className="hidden sm:inline">·</span>
                            <span className="hidden sm:inline">Updated {formatRelativeTime(project.pushedAt)}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
                          {project.liveUrl ? (
                            <a
                              href={project.liveUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onKeyDown={activateAnchorOnSpace}
                              aria-label={`Open ${project.title} live site (opens in a new tab)`}
                              className="list-chip font-mono-data inline-flex min-h-[40px] items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--border-strong)] px-3 text-xs font-medium whitespace-nowrap transition-colors hover:border-[var(--accent)]"
                            >
                              <span>Live</span>
                              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                            </a>
                          ) : null}
                          <a
                            href={project.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onKeyDown={activateAnchorOnSpace}
                            aria-label={`${project.title} on GitHub (opens in a new tab)`}
                            className="list-chip font-mono-data inline-flex min-h-[40px] items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--border)] px-3 text-xs font-medium whitespace-nowrap transition-colors hover:border-[var(--accent)]"
                          >
                            <Github className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Repo</span>
                          </a>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>

          {/* Desktop Live Inspector (5 cols) — defaults to HackStack so it is never empty */}
          <aside className="hidden lg:col-span-5 lg:block" aria-label="Repository inspector" aria-live="polite">
            <div className="sticky top-[calc(var(--nav-height)+24px)] rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-[var(--surface)] p-6 edge-hairline">
              {loading ? (
                <div className="min-h-[380px] animate-pulse rounded-[var(--radius-md)] bg-[var(--surface-2)]" />
              ) : inspectorRepo ? (
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={inspectorKey}
                    initial={reducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: -6 }}
                    transition={
                      reducedMotion ? { duration: 0 } : { duration: 0.24, ease: SNAPPY_BEZIER }
                    }
                    data-testid="project-hover-preview"
                    className="space-y-5"
                  >
                    {/* Active repository workbench header */}
                    <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] pb-3.5">
                      <div className="min-w-0">
                        <p className="font-mono-data text-[10px] tracking-[var(--tracking-mono)] text-[var(--text-muted)] uppercase">
                          Workbench // {inspectorRepo.category}
                        </p>
                        <h3 className="font-display mt-0.5 truncate text-xl font-semibold text-[var(--text)]">
                          {inspectorRepo.title}
                        </h3>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <a
                          href={inspectorRepo.liveUrl || inspectorRepo.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onKeyDown={activateAnchorOnSpace}
                          className="font-mono-data inline-flex items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--surface-2)] px-2.5 py-1 text-xs font-medium text-[var(--text)] transition-colors hover:border-[var(--accent)]"
                        >
                          <span>{inspectorRepo.liveUrl ? "Live" : "Repo"}</span>
                          <ArrowUpRight className="h-3 w-3" />
                        </a>
                      </div>
                    </div>

                    {/* Real screenshot, or a typographic card for source-only repos */}
                    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-2)]">
                      <ProjectMedia
                        project={inspectorRepo}
                        sizes="480px"
                        failed={Boolean(imgErrors[inspectorRepo.id])}
                        onError={() => onImgError(inspectorRepo.id)}
                      />
                    </div>

                    {/* Language bar */}
                    <LanguageBar
                      project={inspectorRepo}
                      animateKey={inspectorKey}
                      reducedMotion={reducedMotion}
                    />

                    {/* Latest commit & 7-day sparkline */}
                    <div className="flex items-center justify-between gap-4 border-t border-[var(--border)] pt-4">
                      <div className="min-w-0">
                        <p className="font-mono-data text-[11px] uppercase tracking-[var(--tracking-mono)] text-[var(--text-muted)]">
                          Latest commit · {formatRelativeTime(inspectorRepo.latestCommitDate)}
                        </p>
                        <p className="mt-1 truncate text-sm text-[var(--text)]">
                          {inspectorRepo.latestCommitMessage || "Repository initialized"}
                        </p>
                      </div>
                      <div className="shrink-0">
                        <CommitSparkline
                          counts={inspectorRepo.weeklyCommitCounts}
                          animateKey={inspectorKey}
                        />
                      </div>
                    </div>

                    {/* README excerpt */}
                    {inspectorRepo.readmeExcerpt && (
                      <div className="border-t border-[var(--border)] pt-4">
                        <p className="font-mono-data mb-1.5 text-[11px] uppercase tracking-[var(--tracking-mono)] text-[var(--text-muted)]">
                          README Excerpt
                        </p>
                        <p className="text-xs leading-relaxed text-[var(--text-muted)]">
                          {excerptText(inspectorRepo.readmeExcerpt)}
                        </p>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              ) : (
                <div className="flex min-h-[380px] flex-col items-center justify-center text-center">
                  <Code2 className="mb-3 h-7 w-7 text-[var(--accent)]" />
                  <p className="font-display text-lg font-semibold text-[var(--text)]">
                    Select a repository
                  </p>
                  <p className="mt-2 max-w-xs text-sm text-[var(--text-muted)]">
                    Inspect language bytes, the latest commit, 7-day commit sparkline, and README
                    summary here.
                  </p>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>

      {/* Accessible Project Detail Drawer / Panel (works on Touch & Keyboard) */}
      <AnimatePresence>
        {selectedProject && (
          <div
            className="fixed inset-0 z-[var(--z-dialog)] flex justify-end"
            onClick={closeProjectDrawer}
          >
            <motion.div
              aria-hidden="true"
              className="absolute inset-0 bg-black/65"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reducedMotion ? 0 : 0.25 }}
            />
            <motion.div
              ref={drawerRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="project-dialog-title"
              data-lenis-prevent
              initial={
                reducedMotion
                  ? { opacity: 0 }
                  : flipClip
                    ? { clipPath: flipClip, opacity: 0.6 }
                    : { x: "100%" }
              }
              animate={
                reducedMotion
                  ? { opacity: 1 }
                  : flipClip
                    ? { clipPath: "inset(0px 0px 0px 0px round 0px)", opacity: 1 }
                    : { x: 0 }
              }
              exit={reducedMotion ? { opacity: 0 } : { x: "100%", opacity: 1 }}
              transition={
                reducedMotion ? { duration: 0.15 } : { duration: 0.55, ease: [0.16, 1, 0.3, 1] }
              }
              onClick={(e) => e.stopPropagation()}
              className="relative h-full w-full max-w-xl overflow-y-auto overscroll-contain border-l border-[var(--border-strong)] bg-[var(--surface)] p-6 sm:p-8"
            >
              <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] pb-5">
                <div>
                  <p className="font-mono-data text-xs text-[var(--text-muted)]">
                    {selectedProject.category} · {selectedProject.role}
                  </p>
                  <h3 id="project-dialog-title" className="font-display mt-1 text-2xl font-bold text-[var(--text)] sm:text-3xl">
                    {selectedProject.title}
                  </h3>
                </div>
                <button
                  ref={drawerCloseRef}
                  type="button"
                  onClick={closeProjectDrawer}
                  aria-label="Close project details"
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--surface-2)] text-[var(--text)] transition-colors hover:border-[var(--accent)]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-6 space-y-6">
                {/* Preview image or optional safe self-deployed iframe */}
                {selectedProject.previewIframe && selectedProject.liveUrl ? (
                  <div className="aspect-[16/10] w-full overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-2)]">
                    <iframe
                      src={selectedProject.liveUrl}
                      title={`${selectedProject.title} live preview`}
                      loading="lazy"
                      sandbox="allow-scripts allow-same-origin"
                      className="h-full w-full border-0"
                    />
                  </div>
                ) : (
                  <div className="relative aspect-[16/10] w-full overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-2)]">
                    <ProjectMedia
                      project={selectedProject}
                      sizes="(max-width: 640px) 100vw, 520px"
                      failed={Boolean(imgErrors[selectedProject.id])}
                      onError={() => onImgError(selectedProject.id)}
                    />
                  </div>
                )}

                <dl className="font-mono-data grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <dt className="text-[var(--text-muted)] uppercase tracking-[var(--tracking-mono)]">Year</dt>
                    <dd className="mt-1 text-[var(--text)]">{selectedProject.year}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--text-muted)] uppercase tracking-[var(--tracking-mono)]">Stack</dt>
                    <dd className="mt-1 text-[var(--text)]">{selectedProject.stack}</dd>
                  </div>
                </dl>

                <p className="text-base leading-relaxed text-[var(--text)]">{selectedProject.pitch}</p>

                <LanguageBar
                  project={selectedProject}
                  animateKey={selectedProject.id}
                  reducedMotion={reducedMotion}
                />

                <div className="flex items-center justify-between gap-4 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-2)] p-4">
                  <div className="min-w-0">
                    <p className="font-mono-data text-[11px] uppercase tracking-[var(--tracking-mono)] text-[var(--text-muted)]">
                      Last Commit · {formatRelativeTime(selectedProject.latestCommitDate)}
                    </p>
                    <p className="mt-1 truncate text-sm text-[var(--text)]">
                      {selectedProject.latestCommitMessage || "No commit message available"}
                    </p>
                  </div>
                  <CommitSparkline
                    counts={selectedProject.weeklyCommitCounts}
                    animateKey={selectedProject.id}
                  />
                </div>

                {selectedProject.readmeExcerpt && (
                  <div>
                    <p className="font-mono-data mb-2 text-xs uppercase tracking-[var(--tracking-mono)] text-[var(--text-muted)]">
                      From README.md
                    </p>
                    <p className="text-sm leading-relaxed text-[var(--text-muted)]">
                      {excerptText(selectedProject.readmeExcerpt)}
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap gap-3 border-t border-[var(--border)] pt-6">
                  {selectedProject.liveUrl && (
                    <a
                      href={selectedProject.liveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onKeyDown={activateAnchorOnSpace}
                      className="inline-flex min-h-[44px] items-center gap-2 rounded-[var(--radius-sm)] bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-[var(--on-accent)] transition-opacity hover:opacity-90"
                    >
                      <span>Open Live Deployment</span>
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                  <a
                    href={selectedProject.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onKeyDown={activateAnchorOnSpace}
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--surface-2)] px-5 py-2.5 text-sm font-semibold text-[var(--text)] transition-colors hover:border-[var(--accent)]"
                  >
                    <span>View Source on GitHub</span>
                    <ArrowUpRight className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
