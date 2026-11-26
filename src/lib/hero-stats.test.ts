import assert from "node:assert/strict";
import test from "node:test";
import { buildHeroStats } from "./hero-stats";
import type { GitHubPayload } from "../types/portfolio";

function payload(weeks: GitHubPayload["contributions"]["weeks"] = [
  {
    contributionDays: [
      { date: "2026-11-25", contributionCount: 2, contributionLevel: 1 },
    ],
  },
]): GitHubPayload {
  return {
    source: "snapshot",
    fetchedAt: "2026-11-25T15:36:25.209Z",
    username: "heetwave16",
    profile: {
      name: "Heet Mehta",
      bio: null,
      location: "Pune, IN",
      followers: 0,
      publicRepos: 0,
      url: "https://github.com/heetwave16",
    },
    contributions: { totalContributions: 134, weeks },
    repos: [],
    mergedPRs: { totalCount: 1, items: [] },
    latestPush: null,
  };
}

test("hero metrics use the GitHub totals, latest contribution date, and featured project count", () => {
  assert.deepEqual(buildHeroStats(payload(), 3), [
    {
      id: "contributions",
      value: 134,
      label: "Contributions",
      detail: "as of Nov 25, 2026",
      dateTime: "2026-11-25",
    },
    { id: "featured-projects", value: 3, label: "Featured projects" },
    { id: "merged-prs", value: 1, label: "Merged PRs" },
  ]);
});

test("hero metrics are omitted when source data is unavailable", () => {
  assert.deepEqual(buildHeroStats(null, 0), []);
});

test("contribution totals stay visible when dated weeks are unavailable, without an as-of date", () => {
  assert.deepEqual(buildHeroStats(payload([]), 0), [
    { id: "contributions", value: 134, label: "Contributions" },
    { id: "featured-projects", value: 0, label: "Featured projects" },
    { id: "merged-prs", value: 1, label: "Merged PRs" },
  ]);
});

test("invalid numeric source figures are omitted", () => {
  const data = payload();
  data.contributions.totalContributions = Number.NaN;
  data.mergedPRs.totalCount = Number.NaN;

  assert.deepEqual(buildHeroStats(data, Number.NaN), []);
});
