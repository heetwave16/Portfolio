import test from "node:test";
import assert from "node:assert/strict";
import {
  alignContributionWeeksToSunday,
  buildProjectModels,
  computeLanguageSkills,
  deriveProjectCategories,
  formatRelativeTime,
  sortProjects,
  transformLanguageStats,
} from "./github-transform";
import reposConfigRaw from "../content/repos.config.json";
import githubSnapshotRaw from "../../public/data/github-snapshot.json";
import type { GitHubPayload, GitHubRepoRaw, ReposConfig } from "../types/portfolio";

const SAMPLE_REPOS: GitHubRepoRaw[] = [
  {
    name: "HackStack",
    description: "Turns a 2-3 sentence idea into a full-stack codebase.",
    stargazerCount: 1,
    primaryLanguage: { name: "TypeScript", color: "#3178C6" },
    pushedAt: "2026-11-05T09:54:53Z",
    url: "https://github.com/heetwave16/HackStack",
    homepageUrl: "https://hack-stack-sooty.vercel.app",
    languages: [
      { name: "TypeScript", size: 274654, color: "#3178C6" },
      { name: "JavaScript", size: 12812, color: "#F1E05A" },
    ],
    isFork: false,
    isArchived: false,
    topics: [],
    latestCommitMessage: "Merge pull request #16",
    latestCommitDate: "2026-11-04T17:40:28Z",
    weeklyCommitCounts: [0, 1, 0, 2, 1, 0, 0],
    readmeExcerpt: "HackStack builds schema-validated codebases for hackathon teams.",
  },
  {
    name: "Snugg",
    description: null,
    stargazerCount: 0,
    primaryLanguage: { name: "TypeScript", color: "#3178C6" },
    pushedAt: "2026-09-23T01:52:51Z",
    url: "https://github.com/heetwave16/Snugg",
    homepageUrl: null,
    languages: [{ name: "TypeScript", size: 379092, color: "#3178C6" }],
    isFork: false,
    isArchived: false,
    topics: [],
    latestCommitMessage: "Redesign mobile system",
    latestCommitDate: "2026-09-18T04:30:12Z",
    weeklyCommitCounts: [0, 0, 0, 0, 0, 0, 0],
    readmeExcerpt: null,
  },
  {
    name: "py_game_vault",
    description: "Classic Python arcade vault.",
    stargazerCount: 3,
    primaryLanguage: { name: "Python", color: "#3572A5" },
    pushedAt: "2026-10-14T20:02:19Z",
    url: "https://github.com/heetwave16/py_game_vault",
    homepageUrl: null,
    languages: [{ name: "Python", size: 6854, color: "#3572A5" }],
    isFork: false,
    isArchived: false,
    topics: [],
    latestCommitMessage: "Add Tetris game description",
    latestCommitDate: "2026-10-14T20:02:17Z",
    weeklyCommitCounts: [0, 0, 0, 0, 0, 0, 0],
    readmeExcerpt: null,
  },
  {
    name: "Blue10.1",
    description: "Forked repo",
    stargazerCount: 0,
    primaryLanguage: null,
    pushedAt: "2026-10-24T20:41:20Z",
    url: "https://github.com/heetwave16/Blue10.1",
    homepageUrl: null,
    languages: [],
    isFork: true,
    isArchived: false,
    topics: [],
    latestCommitMessage: null,
    latestCommitDate: null,
    weeklyCommitCounts: [0, 0, 0, 0, 0, 0, 0],
    readmeExcerpt: null,
  },
  {
    name: "old-archived-experiment",
    description: "Archived",
    stargazerCount: 10,
    primaryLanguage: { name: "Python", color: "#3572A5" },
    pushedAt: "2025-01-01T00:00:00Z",
    url: "https://github.com/heetwave16/old-archived-experiment",
    homepageUrl: null,
    languages: [{ name: "Python", size: 1000, color: "#3572A5" }],
    isFork: false,
    isArchived: true,
    topics: [],
    latestCommitMessage: null,
    latestCommitDate: null,
    weeklyCommitCounts: [0, 0, 0, 0, 0, 0, 0],
    readmeExcerpt: null,
  },
];

const BASE_CONFIG: ReposConfig = {
  mode: "all",
  includeForks: false,
  includeArchived: false,
  minStars: 0,
  hide: ["snugg"],
  featured: ["Snugg", "HackStack"],
  overrides: {
    hackstack: {
      category: "AI",
      liveUrl: "https://hack-stack-sooty.vercel.app",
      previewIframe: true,
    },
  },
};

test("Snugg keeps its GitHub repository link but has no live URL in the data layer", () => {
  const reposConfig = reposConfigRaw as ReposConfig;
  const snapshot = githubSnapshotRaw as GitHubPayload;
  const rawSnugg = snapshot.repos.find((repo) => repo.name === "Snugg");
  assert.ok(rawSnugg);
  assert.equal(reposConfig.overrides.Snugg?.liveUrl, null);
  assert.equal(rawSnugg.homepageUrl, null);

  const snugg = buildProjectModels([rawSnugg], reposConfig).find((repo) => repo.repoName === "Snugg");
  assert.equal(snugg?.liveUrl, null);
  assert.equal(snugg?.url, "https://github.com/heetwave16/Snugg");
});

test("an explicit null live URL override suppresses a stale repository homepage fallback", () => {
  const snuggWithStaleHomepage: GitHubRepoRaw = {
    ...SAMPLE_REPOS[1],
    homepageUrl: "https://retired.example.invalid",
  };
  const config: ReposConfig = {
    ...BASE_CONFIG,
    hide: [],
    overrides: { Snugg: { liveUrl: null } },
  };
  const snugg = buildProjectModels([snuggWithStaleHomepage], config).find((repo) => repo.repoName === "Snugg");
  assert.equal(snugg?.liveUrl, null);
});

test("buildProjectModels excludes forks, archived repos, and hidden repos (hide wins over featured)", () => {
  const result = buildProjectModels(SAMPLE_REPOS, BASE_CONFIG);
  assert.deepEqual(
    result.map((r) => r.repoName),
    ["HackStack", "py_game_vault"]
  );
  assert.equal(result[0].featured, true);
  assert.equal(result[0].category, "AI");
  assert.equal(result[1].featured, false);
  assert.equal(result[1].category, "Other");
});

test("buildProjectModels respects featured ordering case-insensitively and featured-only mode", () => {
  const config: ReposConfig = {
    ...BASE_CONFIG,
    hide: [],
    mode: "featured-only",
    featured: ["snugg", "HACKSTACK"],
  };
  const result = buildProjectModels(SAMPLE_REPOS, config);
  assert.deepEqual(
    result.map((r) => r.repoName),
    ["Snugg", "HackStack"]
  );
});

test("buildProjectModels blocks github.com iframes even if previewIframe is true", () => {
  const config: ReposConfig = {
    ...BASE_CONFIG,
    hide: [],
    overrides: {
      HackStack: {
        liveUrl: "https://github.com/heetwave16/HackStack",
        previewIframe: true,
      },
    },
  };
  const result = buildProjectModels(SAMPLE_REPOS, config);
  const hackstack = result.find((r) => r.repoName === "HackStack");
  assert.equal(hackstack?.previewIframe, false);
});

test("sortProjects sorts by stars and recent correctly", () => {
  const config: ReposConfig = { ...BASE_CONFIG, hide: [] };
  const models = buildProjectModels(SAMPLE_REPOS, config);
  assert.deepEqual(
    sortProjects(models, "stars").map((r) => r.repoName),
    ["py_game_vault", "HackStack", "Snugg"]
  );
  assert.deepEqual(
    sortProjects(models, "recent").map((r) => r.repoName),
    ["HackStack", "py_game_vault", "Snugg"]
  );
});

test("deriveProjectCategories builds All + sorted categories with Other last", () => {
  const config: ReposConfig = { ...BASE_CONFIG, hide: [] };
  const models = buildProjectModels(SAMPLE_REPOS, config);
  assert.deepEqual(deriveProjectCategories(models), ["All", "AI", "Other"]);
});

test("computeLanguageSkills aggregates real byte totals across visible repos", () => {
  const config: ReposConfig = { ...BASE_CONFIG, hide: ["snugg"] };
  const models = buildProjectModels(SAMPLE_REPOS, config);
  const skills = computeLanguageSkills(models);
  assert.equal(skills[0].name, "TypeScript");
  assert.equal(skills[1].name, "JavaScript");
  assert.equal(skills[2].name, "Python");
});

test("formatRelativeTime formats relative durations cleanly", () => {
  const base = Date.parse("2026-11-15T00:00:00Z");
  assert.equal(formatRelativeTime("2026-11-14T23:59:30Z", base), "just now");
  assert.equal(formatRelativeTime("2026-11-14T21:00:00Z", base), "3h ago");
  assert.equal(formatRelativeTime("2026-11-10T00:00:00Z", base), "5d ago");
});

test("transformLanguageStats maps PLpgSQL to SQL and excludes configured languages", () => {
  const transformed = transformLanguageStats(
    [
      { name: "TypeScript", size: 20000, color: "#3178C6" },
      { name: "PLpgSQL", size: 4200, color: "#336790" },
      { name: "SQL", size: 800, color: "#336790" },
      { name: "Shell", size: 500, color: "#89E051" },
    ],
    {
      excludeLanguages: ["shell"],
      languageAliases: { PLpgSQL: "SQL" },
    }
  );
  assert.deepEqual(
    transformed.map((l) => [l.name, l.size]),
    [
      ["TypeScript", 20000],
      ["SQL", 5000],
    ]
  );
});

test("buildProjectModels leaves image null without an override (no 404 placeholder) and applies languageAliases", () => {
  const repoWithPlpgsql: GitHubRepoRaw = {
    ...SAMPLE_REPOS[1],
    primaryLanguage: { name: "PLpgSQL", color: "#336790" },
    languages: [
      { name: "TypeScript", size: 10000, color: "#3178C6" },
      { name: "PLpgSQL", size: 3000, color: "#336790" },
    ],
  };
  const result = buildProjectModels([SAMPLE_REPOS[0], repoWithPlpgsql], {
    ...BASE_CONFIG,
    hide: [],
    languageAliases: { PLpgSQL: "SQL" },
  });
  const snugg = result.find((r) => r.repoName === "Snugg");
  assert.equal(snugg?.image, null);
  assert.equal(snugg?.primaryLanguage?.name, "SQL");
  assert.equal(snugg?.languages.some((l) => l.name === "SQL"), true);
  assert.equal(snugg?.languages.some((l) => l.name === "PLpgSQL"), false);
});

test("alignContributionWeeksToSunday aligns known dates to rows 0..6 (Mon=1, Wed=3, Fri=5)", () => {
  const aligned = alignContributionWeeksToSunday([
    {
      contributionDays: [
        // Partial week starting Wednesday 2025-11-19 and Friday 2025-11-21
        { date: "2025-11-19", contributionCount: 2, contributionLevel: 1 },
        { date: "2025-11-21", contributionCount: 4, contributionLevel: 2 },
      ],
    },
    {
      contributionDays: [
        // Full week starting Sunday 2025-11-16
        { date: "2025-11-16", contributionCount: 1, contributionLevel: 1 },
        { date: "2025-11-17", contributionCount: 3, contributionLevel: 2 },
        { date: "2025-11-18", contributionCount: 0, contributionLevel: 0 },
        { date: "2025-11-19", contributionCount: 5, contributionLevel: 3 },
        { date: "2025-11-20", contributionCount: 0, contributionLevel: 0 },
        { date: "2025-11-21", contributionCount: 2, contributionLevel: 1 },
        { date: "2025-11-22", contributionCount: 0, contributionLevel: 0 },
      ],
    },
    {
      contributionDays: [
        // Known dates from 2026 snapshot: 2026-09-28 is Monday (row 2 / idx 1), 2026-09-04 is Friday (row 6 / idx 5)
        { date: "2026-09-28", contributionCount: 1, contributionLevel: 1 },
        { date: "2026-09-04", contributionCount: 5, contributionLevel: 4 },
      ],
    },
  ]);

  // Row 2 = index 1 (Mon), Row 4 = index 3 (Wed), Row 6 = index 5 (Fri)
  assert.equal(aligned[0][0], null);
  assert.equal(aligned[0][3]?.date, "2025-11-19"); // Wednesday -> row 4 (index 3)
  assert.equal(aligned[0][5]?.date, "2025-11-21"); // Friday -> row 6 (index 5)

  assert.equal(aligned[1][0]?.date, "2025-11-16"); // Sunday -> row 1 (index 0)
  assert.equal(aligned[1][1]?.date, "2025-11-17"); // Monday -> row 2 (index 1)
  assert.equal(aligned[1][3]?.date, "2025-11-19"); // Wednesday -> row 4 (index 3)
  assert.equal(aligned[1][5]?.date, "2025-11-21"); // Friday -> row 6 (index 5)

  assert.equal(aligned[2][1]?.date, "2026-09-28"); // Monday -> row 2 (index 1)
  assert.equal(aligned[2][5]?.date, "2026-09-04"); // Friday -> row 6 (index 5)
});
