"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import reposConfigRaw from "@/src/content/repos.config.json";
import { buildProjectModels, deriveProjectCategories, sortProjects } from "@/src/lib/github-transform";
import type { GitHubPayload, ProjectSortMode, ReposConfig } from "@/src/types/portfolio";
import RepositoryLab from "./RepositoryLab";

const reposConfig = reposConfigRaw as ReposConfig;

/** Unlinked, noindex experiment page: the old home-page Repository Inspector, intact. */
export default function LabClient({ data }: { data: GitHubPayload | null }) {
  const [activeCategory, setActiveCategory] = useState("All");
  const [sortMode, setSortMode] = useState<ProjectSortMode>("featured");
  const projects = useMemo(() => buildProjectModels(data?.repos ?? [], reposConfig), [data]);
  const categories = useMemo(() => deriveProjectCategories(projects), [projects]);
  const sorted = useMemo(() => sortProjects(projects, sortMode), [projects, sortMode]);

  return (
    <div className="min-h-[100svh] bg-[var(--bg)] text-[var(--text)]">
      <header className="mx-auto flex max-w-[1440px] items-center px-[var(--space-edge)] py-6">
        <Link
          href="/"
          className="inline-flex min-h-[44px] items-center gap-2 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to the portfolio
        </Link>
      </header>
      <main id="main-content">
        <RepositoryLab
          projects={sorted}
          categories={categories}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          sortMode={sortMode}
          onSortChange={setSortMode}
          loading={false}
        />
      </main>
    </div>
  );
}
