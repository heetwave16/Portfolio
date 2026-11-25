import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import reposConfigRaw from "../content/repos.config.json";
import githubSnapshotRaw from "../../public/data/github-snapshot.json";
import type { GitHubPayload, ReposConfig } from "../types/portfolio";
import {
  HACKSTACK_PLACEHOLDERS,
  HACKSTACK_PROJECT,
  HACKSTACK_SCREEN,
  HACKSTACK_STEPS,
  SLATE_VISION_PROJECT,
} from "./hackstack-case-study";

const reposConfig = reposConfigRaw as ReposConfig;
const snapshot = githubSnapshotRaw as GitHubPayload;
const routeSource = readFileSync(resolve(process.cwd(), "app/projects/hackstack/page.tsx"), "utf8");
const homeProjectsSource = readFileSync(resolve(process.cwd(), "src/components/ProjectsSection.tsx"), "utf8");

test("HackStack case-study identity, pitch, stack, links, year, role, and image come from its data-layer entry", () => {
  const override = reposConfig.overrides.HackStack;
  const repo = snapshot.repos.find((candidate) => candidate.name === "HackStack");
  assert.ok(override);
  assert.ok(repo);
  assert.equal(HACKSTACK_PROJECT.title, override.title);
  assert.equal(HACKSTACK_PROJECT.oneLiner, override.pitch);
  assert.equal(HACKSTACK_PROJECT.role, override.role);
  assert.deepEqual(
    HACKSTACK_PROJECT.stack,
    override.stack?.split("·").map((item) => item.trim()).filter(Boolean)
  );
  assert.equal(HACKSTACK_PROJECT.liveUrl, override.liveUrl);
  assert.equal(HACKSTACK_PROJECT.repoUrl, repo.url);
  assert.equal(HACKSTACK_PROJECT.year, override.year);
  assert.equal(HACKSTACK_PROJECT.screenshotPath, override.image);
  assert.equal(SLATE_VISION_PROJECT.title, "Slate Vision CLI");
});

test("HackStack flow copy stays within the visible screenshot sequence", () => {
  assert.equal(HACKSTACK_STEPS.length, 3);
  assert.deepEqual(HACKSTACK_SCREEN.generationStages, [
    "Brief",
    "Model",
    "Schema & API",
    "Preview",
    "Deck",
    "Demo",
  ]);
  assert.equal(HACKSTACK_SCREEN.previewLabel, "Sample data");
  assert.equal(HACKSTACK_SCREEN.buildStatus, "Offline build · no model answered");
  assert.equal(HACKSTACK_SCREEN.featurePrompt, "Add a feature and press En…");
  assert.ok(HACKSTACK_STEPS.every((step) => step.title && step.body));
});

test("HackStack route includes the required content, screenshot framing, and next-project affordance", () => {
  assert.match(routeSource, /aria-label="Breadcrumb"/);
  assert.match(routeSource, /Home Projects/);
  assert.match(routeSource, /aria-labelledby="brief-heading"/);
  assert.match(routeSource, /The brief/);
  assert.match(routeSource, /How it works/);
  assert.match(routeSource, /className="object-contain"/);
  assert.match(routeSource, /HACKSTACK_PLACEHOLDERS\.map/);
  assert.match(routeSource, /SLATE_VISION_PROJECT\.title/);
  assert.match(routeSource, /href=\{`\/#project-\$\{SLATE_VISION_PROJECT\.id\}`\}/);
});

test("Home HackStack title and Details link target the case study without replacing Live or Repo", () => {
  assert.match(homeProjectsSource, /href="\/projects\/hackstack"/);
  assert.match(homeProjectsSource, /Details/);
  assert.match(homeProjectsSource, /project\.liveUrl/);
  assert.match(homeProjectsSource, /project\.url/);
  assert.match(homeProjectsSource, /project\.id === "hackstack"/);
});

test("every unsupported case-study fact is represented by a literal NEEDS HEET placeholder", () => {
  assert.ok(HACKSTACK_PLACEHOLDERS.length >= 5);
  assert.ok(HACKSTACK_PLACEHOLDERS.every((line) => line.startsWith("[NEEDS HEET] ")));
  assert.ok(HACKSTACK_PLACEHOLDERS.some((line) => line.includes("problem / intended users")));
  assert.ok(HACKSTACK_PLACEHOLDERS.some((line) => line.includes("contribution scope")));
  assert.ok(HACKSTACK_PLACEHOLDERS.some((line) => line.includes("testing / validation")));
  assert.ok(HACKSTACK_PLACEHOLDERS.some((line) => line.includes("outcome")));
  assert.ok(HACKSTACK_PLACEHOLDERS.some((line) => line.includes("metrics")));
  assert.ok(HACKSTACK_PLACEHOLDERS.some((line) => line.includes("testimonials")));
  assert.ok(HACKSTACK_PLACEHOLDERS.some((line) => line.includes("reflection")));
  assert.ok(HACKSTACK_PLACEHOLDERS.some((line) => line.includes("architecture")));
  assert.ok(HACKSTACK_PLACEHOLDERS.some((line) => line.includes("dates")));
});
