"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import reposConfigRaw from "@/src/content/repos.config.json";
import { SITE_CONFIG } from "@/src/config";
import { buildProjectModels, computeLanguageSkills } from "@/src/lib/github-transform";
import type { GitHubPayload, ReposConfig } from "@/src/types/portfolio";
import ShellProviders from "./ShellProviders";
import Navbar from "./Navbar";
import HeroSection from "./HeroSection";
import HorizontalFlipShowcase from "./HorizontalFlipShowcase";
import WhatIBuildSection from "./WhatIBuildSection";
import GitHubPulseSection from "./GitHubPulseSection";
import OpenSourceSection from "./OpenSourceSection";
import AboutSection from "./AboutSection";
import ContactSection from "./ContactSection";
import Footer from "./Footer";

const reposConfig = reposConfigRaw as ReposConfig;

interface PortfolioAppProps {
  initialData: GitHubPayload | null;
}

export default function PortfolioApp({ initialData }: PortfolioAppProps) {
  const [data, setData] = useState<GitHubPayload | null>(initialData);
  const [loading, setLoading] = useState<boolean>(!initialData);
  const [focusRequest, setFocusRequest] = useState<{ repoName: string; nonce: number } | null>(
    null
  );

  useEffect(() => {
    let active = true;

    async function refreshGitHubData() {
      try {
        const res = await fetch(SITE_CONFIG.apiEndpoint);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as GitHubPayload;
        if (active) {
          setData(json);
          setLoading(false);
        }
      } catch {
        try {
          const snapRes = await fetch(SITE_CONFIG.snapshotFallbackPath);
          if (snapRes.ok) {
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

  const languageSkills = useMemo(
    () => computeLanguageSkills(allProjects, 6),
    [allProjects]
  );

  const handleFocusRepo = useCallback((repoName: string) => {
    setFocusRequest((prev) => ({
      repoName,
      nonce: (prev?.nonce ?? 0) + 1,
    }));
  }, []);

  return (
    <ShellProviders>
      <Navbar />
      <main id="main-content">
        {/* Act I — Portrait-Free Spatial & Kinetic Hero */}
        <HeroSection
          repoCount={allProjects.length}
          totalContributions={data?.contributions.totalContributions ?? 0}
          latestPush={data?.latestPush ?? null}
        />

        {/* Act II — Pinned Horizontal FLIP Showcase of All Repositories & Projects */}
        <HorizontalFlipShowcase
          projects={allProjects}
          loading={loading}
          focusRequest={focusRequest}
        />

        {/* Act III — Vertical Scroll Engineering Telemetry, Bio & Contact */}
        <WhatIBuildSection onFocusRepo={handleFocusRepo} projects={allProjects} />
        <GitHubPulseSection data={data} loading={loading} />
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
