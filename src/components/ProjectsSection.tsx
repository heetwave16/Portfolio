"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import { ArrowUpRight, Code2, ExternalLink, FolderGit2, Star, X } from "lucide-react";
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
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sortGroupRef = useRef<HTMLDivElement>(null);
  const tabListRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const drawerCloseRef = useRef<HTMLButtonElement>(null);
  const lastTriggerRef = useRef<HTMLElement | null>(null);

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
      lastTriggerRef.current = triggerEl ?? (document.activeElement as HTMLElement | null);
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
        restoreTarget.focus();
      });
    }
  }, []);

  useEffect(() => {
    if (!selectedProject) return;

    const rafId = requestAnimationFrame(() => {
      drawerCloseRef.current?.focus();
    });

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
        if (e.shiftKey && document.activeElement === first) {
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
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [selectedProject, closeProjectDrawer]);

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
        <div
          data-reveal
          className="mb-8 flex flex-col justify-between gap-6 lg:flex-row lg:items-end"
        >
          <div className="max-w-2xl">
            <p className="font-mono-data mb-2 text-xs tracking-[var(--tracking-mono)] text-[var(--text-muted)] uppercase">
              {content.projects.eyebrow}
            </p>
            <h2
              className="font-display font-semibold tracking-tight text-[var(--text)]"
              style={{
                fontSize: "var(--text-h2)",
                lineHeight: "var(--leading-tight)",
                textWrap: "balance",
              }}
            >
              {content.projects.heading}
            </h2>
            <p className="mt-3 text-sm text-[var(--text-muted)] md:text-base">
              {content.projects.subtitle}
            </p>
          </div>

          {/* Sort controls with animated active pill */}
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
                  { id: "stars", label: "Stars" },
                ] as const
              ).map((opt) => {
                const active = sortMode === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onSortChange(opt.id)}
                    aria-pressed={active}
                    className={`relative isolate min-h-[34px] rounded-[3px] px-3 py-1 text-xs font-medium transition-colors duration-200 whitespace-nowrap ${
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

        {/* Category Filter Tabs */}
        <div
          ref={tabListRef}
          role="tablist"
          aria-label="Filter projects by category"
          onKeyDown={(e) => handleGroupArrowNav(e, tabListRef.current)}
          className="mb-8 flex flex-wrap items-center gap-2 border-b border-[var(--border)] pb-4"
        >
          {categories.map((cat) => {
            const active = activeCategory === cat;
            return (
              <button
                key={cat}
                role="tab"
                type="button"
                aria-selected={active}
                onClick={() => onCategoryChange(cat)}
                className={`relative isolate min-h-[38px] rounded-[var(--radius-sm)] px-4 py-1.5 text-sm font-medium transition-colors duration-200 whitespace-nowrap ${
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

        {/* Main Projects Grid + Sticky Desktop Preview Inspector */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="lg:col-span-7">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((n) => (
                  <div
                    key={n}
                    className="h-36 animate-pulse rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)]"
                  />
                ))}
              </div>
            ) : visibleProjects.length === 0 ? (
              <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-8 text-center text-sm text-[var(--text-muted)]">
                {content.projects.emptyState}
              </div>
            ) : (
              <div className="space-y-4" data-testid="projects-list">
                {visibleProjects.map((project) => {
                  const isFocusedOrHovered = hoveredProject?.id === project.id;
                  const isPinned = selectedRepo?.id === project.id;
                  return (
                    <article
                      key={project.id}
                      data-testid={`project-card-${project.id}`}
                      className={`group cursor-pointer rounded-[var(--radius-md)] border transition-[transform,border-color,background-color] duration-200 [transition-timing-function:var(--ease-snappy)] hover:-translate-y-0.5 ${
                        isFocusedOrHovered || isPinned
                          ? "border-[var(--accent)] bg-[var(--surface)] edge-hairline"
                          : "border-[var(--border)] bg-[var(--surface)]/75 hover:border-[var(--border-strong)] hover:bg-[var(--surface)]"
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
                        setSelectedRepoName(project.repoName);
                        openProjectDrawer(project);
                      }}
                    >
                      <div className="p-5 sm:p-6">
                        {/* Unboxed typographic metadata line */}
                        <div className="font-mono-data mb-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-[var(--text-muted)] tabular-nums">
                          {project.featured && (
                            <>
                              <span className="font-semibold text-[var(--text)]">Featured</span>
                              <span aria-hidden="true">·</span>
                            </>
                          )}
                          <span>{project.category}</span>
                          {project.primaryLanguage && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>{project.primaryLanguage.name}</span>
                            </>
                          )}
                          <span aria-hidden="true">·</span>
                          <span className="inline-flex items-center gap-1">
                            <Star className="h-3 w-3" />
                            {project.stargazerCount}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>Updated {formatRelativeTime(project.pushedAt)}</span>
                        </div>

                        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                          <div className="min-w-0">
                            <h3 className="font-display text-xl font-semibold text-[var(--text)] sm:text-2xl">
                              <button
                                type="button"
                                onClick={(e) => {
                                  setSelectedRepoName(project.repoName);
                                  openProjectDrawer(project, e.currentTarget);
                                }}
                                className="rounded-[var(--radius-sm)] text-left underline-offset-4 transition-colors hover:text-[var(--text-muted)] hover:underline"
                              >
                                {project.title}
                              </button>
                            </h3>
                            <p className="mt-2 text-sm text-[var(--text-muted)] sm:text-base">
                              {project.pitch}
                            </p>
                          </div>

                          <div className="flex shrink-0 items-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                setSelectedRepoName(project.repoName);
                                openProjectDrawer(project, e.currentTarget);
                              }}
                              aria-label={`Inspect ${project.title} details`}
                              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--surface-2)] px-3.5 py-2 text-xs font-semibold text-[var(--text)] transition-colors hover:border-[var(--accent)] whitespace-nowrap"
                            >
                              <span>Inspect</span>
                            </button>

                            <a
                              href={project.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onKeyDown={activateAnchorOnSpace}
                              aria-label={`Open ${project.title} on GitHub`}
                              className="inline-flex min-h-[40px] items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--border)] px-3 py-2 text-xs font-medium text-[var(--text-muted)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text)] whitespace-nowrap"
                            >
                              <span>Repo</span>
                              <ArrowUpRight className="h-3.5 w-3.5" />
                            </a>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          {/* Desktop Live Inspector (5 cols) — defaults to HackStack so it is never empty */}
          <aside className="hidden lg:col-span-5 lg:block" aria-label="Repository inspector">
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
                        <span className="font-mono-data inline-flex items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1 text-xs text-[var(--text-muted)] tabular-nums">
                          <Star className="h-3 w-3" />
                          {inspectorRepo.stargazerCount}
                        </span>
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

                    {/* Media preview or clean Screenshot coming state */}
                    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-2)]">
                      {inspectorRepo.image && !imgErrors[inspectorRepo.id] ? (
                        <Image
                          src={inspectorRepo.image}
                          alt={`${inspectorRepo.title} preview`}
                          fill
                          sizes="(max-width: 1024px) 100vw, 480px"
                          referrerPolicy="no-referrer"
                          onError={() =>
                            setImgErrors((prev) => ({ ...prev, [inspectorRepo.id]: true }))
                          }
                          className="object-cover"
                        />
                      ) : (
                        <div
                          data-testid="screenshot-coming"
                          className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[var(--surface-2)] p-6 text-center"
                        >
                          <FolderGit2 className="h-5 w-5 text-[var(--text-muted)]" />
                          <p className="font-mono-data text-xs uppercase tracking-[var(--tracking-mono)] text-[var(--text)]">
                            Screenshot coming
                          </p>
                        </div>
                      )}
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
                          {inspectorRepo.readmeExcerpt}…
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
            className="fixed inset-0 z-[110] flex justify-end bg-black/65 backdrop-blur-xs"
            onClick={closeProjectDrawer}
          >
            <motion.div
              ref={drawerRef}
              role="dialog"
              aria-modal="true"
              aria-label={`${selectedProject.title} project details`}
              initial={reducedMotion ? { opacity: 1, x: 0 } : { x: "100%" }}
              animate={{ opacity: 1, x: 0 }}
              exit={reducedMotion ? { opacity: 0 } : { x: "100%" }}
              transition={
                reducedMotion ? { duration: 0 } : { duration: 0.3, ease: [0.16, 1, 0.3, 1] }
              }
              onClick={(e) => e.stopPropagation()}
              className="h-full w-full max-w-xl overflow-y-auto border-l border-[var(--border-strong)] bg-[var(--surface)] p-6 sm:p-8"
            >
              <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] pb-5">
                <div>
                  <p className="font-mono-data text-xs text-[var(--text-muted)]">
                    {selectedProject.category} · {selectedProject.role}
                  </p>
                  <h3 className="font-display mt-1 text-2xl font-bold text-[var(--text)] sm:text-3xl">
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
                ) : selectedProject.image && !imgErrors[selectedProject.id] ? (
                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-2)]">
                    <Image
                      src={selectedProject.image}
                      alt={`${selectedProject.title} showcase`}
                      fill
                      sizes="(max-width: 640px) 100vw, 520px"
                      referrerPolicy="no-referrer"
                      onError={() =>
                        setImgErrors((prev) => ({ ...prev, [selectedProject.id]: true }))
                      }
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div
                    data-testid="drawer-screenshot-coming"
                    className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-2)] p-6 text-center"
                  >
                    <FolderGit2 className="h-5 w-5 text-[var(--text-muted)]" />
                    <p className="font-mono-data text-xs uppercase tracking-[var(--tracking-mono)] text-[var(--text)]">
                      Screenshot coming
                    </p>
                  </div>
                )}

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
                      {selectedProject.readmeExcerpt}…
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
