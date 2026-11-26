"use client";

import React, { useMemo } from "react";
import reposConfigRaw from "@/src/content/repos.config.json";
import { buildProjectModels, sortProjects } from "@/src/lib/github-transform";
import type { GitHubPayload, ReposConfig } from "@/src/types/portfolio";
import ShellProviders from "./ShellProviders";
import Navbar from "./Navbar";
import HeroSection from "./HeroSection";
import GitHubPulseSection from "./GitHubPulseSection";
import ProjectsSection from "./ProjectsSection";
import OpenSourceSection from "./OpenSourceSection";
import AboutSection from "./AboutSection";
import ContactSection from "./ContactSection";
import Footer from "./Footer";

const reposConfig = reposConfigRaw as ReposConfig;

interface PortfolioAppProps {
  initialData: GitHubPayload | null;
}

/**
 * GitHub data comes ONLY from the server render (ISR, hourly, cached snapshot fallback).
 * There is deliberately no client re-fetch: a number that paints is the number that stays.
 */
export default function PortfolioApp({ initialData }: PortfolioAppProps) {
  const data = initialData;

  const projects = useMemo(
    () =>
      sortProjects(
        buildProjectModels(data?.repos ?? [], reposConfig, {
          warnUnknown: process.env.NODE_ENV === "development",
        }),
        "featured"
      ),
    [data]
  );

  const featuredProjectCount = projects.filter((project) => project.featured).length;

  return (
    <ShellProviders>
      <Navbar />
      <main id="main-content">
        <HeroSection data={data} featuredProjectCount={featuredProjectCount} />
        <ProjectsSection projects={projects} />
        <GitHubPulseSection data={data} />
        <OpenSourceSection items={data?.mergedPRs.items ?? []} loading={false} />
        <AboutSection />
        <ContactSection />
      </main>
      <Footer />
    </ShellProviders>
  );
}
