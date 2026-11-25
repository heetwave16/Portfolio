import reposConfigRaw from "../content/repos.config.json";
import githubSnapshotRaw from "../../public/data/github-snapshot.json";
import type { GitHubPayload, ReposConfig } from "../types/portfolio";

const reposConfig = reposConfigRaw as ReposConfig;
const snapshot = githubSnapshotRaw as GitHubPayload;
const hackStackOverride = reposConfig.overrides.HackStack;
const hackStackRepo = snapshot.repos.find((repo) => repo.name === "HackStack");

if (
  !hackStackOverride?.title ||
  !hackStackOverride.pitch ||
  !hackStackOverride.role ||
  !hackStackOverride.stack ||
  !hackStackOverride.liveUrl ||
  !hackStackOverride.image ||
  !hackStackOverride.year ||
  !hackStackRepo
) {
  throw new Error("HackStack case study requires its local data-layer entry and GitHub URL.");
}

export const HACKSTACK_PROJECT = {
  id: "hackstack",
  title: hackStackOverride.title,
  oneLiner: hackStackOverride.pitch,
  role: hackStackOverride.role,
  stack: hackStackOverride.stack.split("·").map((item) => item.trim()).filter(Boolean),
  liveUrl: hackStackOverride.liveUrl,
  repoUrl: hackStackRepo.url,
  year: hackStackOverride.year,
  screenshotPath: hackStackOverride.image,
} as const;

// The next-project destination is the existing Home card; no Slate Vision case-study copy is used.
export const SLATE_VISION_PROJECT = {
  id: "slate_vision-cli",
  title: "Slate Vision CLI",
} as const;

/** Exact UI text visible in public/img/projects/HackStack.webp. */
export const HACKSTACK_SCREEN = {
  briefPrompt: "Two sentences: who has the problem, and what the app does about it.",
  stackSelection: "Next.js + Node + Postgres",
  featurePrompt: "Add a feature and press En…",
  generationStages: ["Brief", "Model", "Schema & API", "Preview", "Deck", "Demo"] as const,
  previewLabel: "Sample data",
  previewTitle: "CampusSplit AI",
  previewDescription: "Instant UPI bill-splitting and late-night hostel order pooling for college campuses.",
  buildStatus: "Offline build · no model answered",
  sessionNote: "No run yet. Each step of a generation appears here with its timing.",
} as const;

export const HACKSTACK_STEPS = [
  {
    number: "01",
    title: "Write the brief",
    body: "The form asks for two sentences about who has the problem and what the app does.",
  },
  {
    number: "02",
    title: "Choose the stack and features",
    body: "The screenshot shows a stack selector and a must-have-features field before the Generate control.",
  },
  {
    number: "03",
    title: "Follow the stages and inspect the preview",
    body: "The visible sequence runs from Brief through Model, Schema & API, Preview, Deck, and Demo; the displayed CampusSplit AI view is labeled Sample data.",
  },
] as const;

export const HACKSTACK_PLACEHOLDERS = [
  "[NEEDS HEET] actual problem / intended users beyond the screenshot prompt",
  "[NEEDS HEET] exact personal contribution scope / what you built",
  "[NEEDS HEET] implementation decisions / architecture details",
  "[NEEDS HEET] testing / validation evidence",
  "[NEEDS HEET] verified outcome / what this led to",
  "[NEEDS HEET] real product metrics / usage numbers and user counts",
  "[NEEDS HEET] user feedback / testimonials",
  "[NEEDS HEET] personal reflection / lessons learned",
  "[NEEDS HEET] specific milestone dates / build timeline beyond 2026",
] as const;
