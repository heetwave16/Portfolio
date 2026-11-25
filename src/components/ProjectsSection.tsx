"use client";

import React, { useCallback, useMemo, useState } from "react";
import { ArrowUpRight, Github } from "lucide-react";
import content from "@/src/content/content.json";
import type { ProjectCardModel } from "@/src/types/portfolio";
import RevealText from "./RevealText";
import { ProjectMedia } from "./ProjectMedia";

interface ProjectsSectionProps {
  projects: ProjectCardModel[];
}

/**
 * Selected Work. Everything is visible by scanning — no filters, no inspector, no slide-in panel,
 * no stacking. Flagship builds first (config order), then compact rows for the rest.
 */
export default function ProjectsSection({ projects }: ProjectsSectionProps) {
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});
  const onImgError = useCallback((id: string) => setImgErrors((prev) => ({ ...prev, [id]: true })), []);

  const flagship = useMemo(
    () => projects.filter((p) => p.featured).sort((a, b) => a.featuredIndex - b.featuredIndex),
    [projects]
  );
  const more = useMemo(() => projects.filter((p) => !p.featured), [projects]);

  return (
    <section id="projects" aria-labelledby="projects-heading" className="border-b border-[var(--border)] py-[var(--space-section)]">
      <div className="mx-auto max-w-[1440px] px-[var(--space-edge)]">
        <div className="mb-10 max-w-2xl">
          <p className="font-mono-data mb-2 text-xs tracking-[var(--tracking-mono)] text-[var(--text-muted)] uppercase">
            {content.projects.eyebrow}
          </p>
          <RevealText
            id="projects-heading"
            text={content.projects.heading}
            className="font-display font-bold tracking-tight text-[var(--text)]"
            style={{ fontSize: "var(--text-h2)", lineHeight: "var(--leading-tight)", textWrap: "balance" }}
          />
          <p className="mt-4 text-[var(--text-muted)] md:text-lg">{content.projects.subtitle}</p>
        </div>

        {/* Flagship builds */}
        <ol className="flex flex-col gap-6" data-testid="flagship-list">
          {flagship.map((project, i) => (
            <li key={project.id}>
              <article
                data-testid={`project-card-${project.id}`}
                className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-[var(--surface)]"
              >
                <div className="grid grid-cols-1 lg:grid-cols-12">
                  <div
                    className={`relative aspect-[16/10] w-full overflow-hidden border-b border-[var(--border)] lg:col-span-7 lg:aspect-auto lg:min-h-[400px] lg:border-b-0 ${
                      i % 2 === 1 ? "lg:order-2 lg:border-l" : "lg:border-r"
                    }`}
                  >
                    <ProjectMedia
                      project={project}
                      sizes="(max-width: 1024px) 100vw, 760px"
                      failed={Boolean(imgErrors[project.id])}
                      onError={() => onImgError(project.id)}
                    />
                  </div>
                  <div className="flex flex-col justify-between gap-6 p-6 sm:p-8 lg:col-span-5">
                    <div>
                      <p className="font-mono-data flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-[var(--text-muted)] tabular-nums">
                        <span className="font-semibold text-[var(--accent-text)]">0{i + 1}</span>
                        <span aria-hidden="true">·</span>
                        <span>{project.category}</span>
                        <span aria-hidden="true">·</span>
                        <span>{project.year}</span>
                      </p>
                      <h3
                        className="mt-3 font-semibold tracking-tight text-[var(--text)]"
                        style={{ fontSize: "clamp(1.75rem, 3vw, 2rem)", lineHeight: 1.1 }}
                      >
                        {project.title}
                      </h3>
                      <p className="mt-3 leading-relaxed text-[var(--text-muted)] sm:text-lg">{project.pitch}</p>
                      <ul className="mt-5 flex flex-wrap gap-2" aria-label="Stack">
                        {project.stack
                          .split("·")
                          .map((s) => s.trim())
                          .filter(Boolean)
                          .map((s) => (
                            <li
                              key={s}
                              className="font-mono-data rounded-[6px] bg-[var(--surface-2)] px-2 py-1 text-xs text-[var(--text-muted)]"
                            >
                              {s}
                            </li>
                          ))}
                      </ul>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      {project.liveUrl ? (
                        <a
                          href={project.liveUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-split btn-primary"
                          aria-label={`${project.title} live demo (opens in a new tab)`}
                        >
                          <span className="btn-label">Live Demo</span>
                          <span className="btn-arrow" aria-hidden="true">
                            <ArrowUpRight className="h-4 w-4" />
                          </span>
                        </a>
                      ) : null}
                      <a
                        href={project.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-split btn-outline"
                        aria-label={`${project.title} source on GitHub (opens in a new tab)`}
                      >
                        <span className="btn-label">
                          <Github className="h-4 w-4" aria-hidden="true" />
                          GitHub
                        </span>
                        <span className="btn-arrow" aria-hidden="true">
                          <ArrowUpRight className="h-4 w-4" />
                        </span>
                      </a>
                    </div>
                  </div>
                </div>
              </article>
            </li>
          ))}
        </ol>

        {/* More builds — compact rows */}
        {more.length > 0 ? (
          <div className="mt-12">
            <h3 className="font-mono-data mb-3 text-xs tracking-[var(--tracking-mono)] text-[var(--text-muted)] uppercase">
              More builds
            </h3>
            <ul className="border-t border-[var(--border-strong)]" data-testid="more-builds">
              {more.map((project) => (
                <li
                  key={project.id}
                  data-testid={`project-row-${project.id}`}
                  className="grid grid-cols-1 gap-x-6 gap-y-2 border-b border-[var(--border-strong)] py-5 sm:grid-cols-12 sm:items-center"
                >
                  <p className="text-lg font-semibold text-[var(--text)] sm:col-span-3">{project.title}</p>
                  <p className="text-[var(--text-muted)] sm:col-span-6">{project.pitch}</p>
                  <div className="flex items-center gap-5 sm:col-span-3 sm:justify-end">
                    <span className="font-mono-data text-xs text-[var(--text-muted)]">
                      {project.primaryLanguage?.name ?? project.stack.split("·")[0]?.trim()}
                    </span>
                    {project.liveUrl ? (
                      <a
                        href={project.liveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-[44px] items-center gap-1 text-sm font-medium text-[var(--text)] underline-offset-4 hover:underline"
                        aria-label={`${project.title} live site (opens in a new tab)`}
                      >
                        Live <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </a>
                    ) : null}
                    <a
                      href={project.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-[44px] items-center gap-1 text-sm font-medium text-[var(--text)] underline-offset-4 hover:underline"
                      aria-label={`${project.title} source code on GitHub (opens in a new tab)`}
                    >
                      Code <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}
