"use client";

import React from "react";
import Image from "next/image";
import { Terminal } from "lucide-react";
import type { ProjectCardModel } from "@/src/types/portfolio";

/** Typographic stand-in when a project has no web build to screenshot (never "Screenshot coming"). */
export function MediaPlaceholder({ project, compact = false }: { project: ProjectCardModel; compact?: boolean }) {
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

export function ProjectMedia({
  project,
  sizes,
  failed,
  onError,
  priority = false,
  fit = "cover",
}: {
  project: ProjectCardModel;
  sizes: string;
  failed: boolean;
  onError: () => void;
  priority?: boolean;
  fit?: "cover" | "contain";
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
      className={`card-img ${fit === "contain" ? "object-contain" : "object-cover object-top"}`}
    />
  );
}

