"use client";

import React, { useEffect, useMemo, useState } from "react";
import reposConfigRaw from "@/src/content/repos.config.json";
import { SITE_CONFIG } from "@/src/config";
import {
  buildProjectModels,
  computeLanguageSkills,
  deriveProjectCategories,
  sortProjects,
} from "@/src/lib/github-transform";
import type { GitHubPayload, ProjectSortMode, ReposConfig } from "@/src/types/portfolio";
import ShellProviders from "./ShellProviders";
import Navbar from "./Navbar";
import HeroSection from "./HeroSection";
import WhatIBuildSection from "./WhatIBuildSection";
import GitHubPulseSection from "./GitHubPulseSection";
import ProjectsSection from "./ProjectsSection";
import OpenSourceSection from "./OpenSourceSection";
import AboutSection from "./AboutSection";
import ContactSection from "./ContactSection";
import Footer from "./Footer";
import HeroStats from "./HeroStats";
import ToolMarquee from "./ToolMarquee";

const reposConfig = reposConfigRaw as ReposConfig;

interface PortfolioAppProps {
  initialData: GitHubPayload | null;
}

export default function PortfolioApp({ initialData }: PortfolioAppProps) {
  const [data, setData] = useState<GitHubPayload | null>(initialData);
  const [loading, setLoading] = useState<boolean>(!initialData);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [sortMode, setSortMode] = useState<ProjectSortMode>("featured");

  useEffect(() => {
    let active = true;

    async function refreshGitHubData() {
      try {
        const res = await fetch(SITE_CONFIG.apiEndpoint);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as GitHubPayload;
        // Never replace real server-rendered data with an empty calendar.
        if (!json?.contributions?.weeks?.length) throw new Error("empty payload");
        if (active) {
          setData(json);
          setLoading(false);
        }
      } catch {
        // Fallback directly to static snapshot if API route fails
        try {
          const snapRes = await fetch(SITE_CONFIG.snapshotFallbackPath);
          if (snapRes.ok && !initialData) {
            const snapJson = (await snapRes.json()) as GitHubPayload;
            if (active) {
              setData({ ...snapJson, source: "snapshot" });
            }
          }
        } catch {
          // Retain initialData if present
        } finally {
          if (active) setLoading(false);
        }
      }
    }

    refreshGitHubData();
    return () => {
      active = false;
    };
  }, []);

  const allProjects = useMemo(() => {
    const raw = data?.repos || [];
    return buildProjectModels(raw, reposConfig, {
      warnUnknown: process.env.NODE_ENV === "development",
    });
  }, [data]);

  const categories = useMemo(() => deriveProjectCategories(allProjects), [allProjects]);

  const sortedProjects = useMemo(
    () => sortProjects(allProjects, sortMode),
    [allProjects, sortMode]
  );

  const languageSkills = useMemo(
    () => computeLanguageSkills(allProjects, 6),
    [allProjects]
  );

  const handleCategoryFromWhatIBuild = (cat: string) => {
    if (categories.includes(cat)) {
      setActiveCategory(cat);
    } else {
      setActiveCategory("All");
    }
  };

  return (
    <ShellProviders>
      <Navbar />
      <main id="main-content">
        <HeroSection />
        <HeroStats data={data} />
        <ToolMarquee />
        <WhatIBuildSection
          onSelectCategory={handleCategoryFromWhatIBuild}
          projects={allProjects}
        />
        <GitHubPulseSection data={data} loading={loading} />
        <ProjectsSection
          projects={sortedProjects}
          categories={categories}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          sortMode={sortMode}
          onSortChange={setSortMode}
          loading={loading}
        />
        <OpenSourceSection
          totalCount={data?.mergedPRs.totalCount ?? 0}
          items={data?.mergedPRs.items ?? []}
          loading={loading}
          claimOpenSource={Boolean(reposConfig.openSource?.claimOpenSource)}
        />
        <AboutSection skills={languageSkills} />
        <ContactSection />
      </main>
      <Footer />
    </ShellProviders>
  );
}
