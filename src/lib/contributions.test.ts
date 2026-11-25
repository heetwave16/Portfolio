import test from "node:test";
import assert from "node:assert/strict";
import {
  groupDaysIntoSundayWeeks,
  levelFromCount,
  normalizeContributions,
  parseContributionsHtml,
  parseTooltipCount,
  sumContributionWeeks,
} from "./contributions";
import type { GitHubPayload } from "../types/portfolio";

// Mirrors GitHub's real markup: data-date BEFORE id (the order that broke the old regex).
const HTML = `
<table><tbody>
<tr>
  <td tabindex="0" data-ix="0" aria-selected="false" data-date="2026-11-01" id="contribution-day-component-0-0" data-level="0" class="ContributionCalendar-day"></td>
  <td tabindex="0" data-ix="1" data-date="2026-11-08" id="contribution-day-component-0-1" data-level="1" class="ContributionCalendar-day"></td>
</tr>
<tr>
  <td data-date="2026-11-02" data-level="2" id="contribution-day-component-1-0" class="ContributionCalendar-day"></td>
  <td id="contribution-day-component-1-1" data-date="2026-11-09" data-level="4" class="ContributionCalendar-day"></td>
</tr>
<tr>
  <td data-date="2026-11-03" id="contribution-day-component-2-0" data-level="4"></td>
</tr>
</tbody></table>
<tool-tip id="tooltip-a" for="contribution-day-component-0-0" popover="manual">No contributions on November 1st.</tool-tip>
<tool-tip id="tooltip-b" for="contribution-day-component-0-1" popover="manual">1 contribution on November 8th.</tool-tip>
<tool-tip id="tooltip-c" for="contribution-day-component-1-0" popover="manual">5 contributions on November 2nd.</tool-tip>
<tool-tip id="tooltip-d" for="contribution-day-component-1-1" popover="manual">1,204 contributions on November 9th.</tool-tip>
<tool-tip id="tooltip-e" for="contribution-day-component-2-0" popover="manual">42 contributions on November 3rd.</tool-tip>
`;

test("parseTooltipCount handles zero, singular, plural and thousands separators", () => {
  assert.equal(parseTooltipCount("No contributions on November 1st."), 0);
  assert.equal(parseTooltipCount("1 contribution on November 8th."), 1);
  assert.equal(parseTooltipCount("  42 contributions on November 3rd. "), 42);
  assert.equal(parseTooltipCount("1,204 contributions on November 9th."), 1204);
  assert.equal(parseTooltipCount("garbage"), null);
});

test("parseContributionsHtml reads attributes in any order and takes counts from tooltips, not levels", () => {
  const { totalContributions, weeks } = parseContributionsHtml(HTML);
  const days = weeks.flatMap((w) => w.contributionDays);
  const byDate = Object.fromEntries(days.map((d) => [d.date, d.contributionCount]));
  assert.deepEqual(byDate, {
    "2026-11-01": 0,
    "2026-11-02": 5,
    "2026-11-03": 42,
    "2026-11-08": 1,
    "2026-11-09": 1204,
  });
  // headline === sum of cells
  assert.equal(totalContributions, 0 + 5 + 42 + 1 + 1204);
  assert.equal(totalContributions, sumContributionWeeks(weeks));
});

test("groupDaysIntoSundayWeeks starts a new week on every Sunday", () => {
  const { weeks } = parseContributionsHtml(HTML);
  // 2026-11-01 and 2026-11-08 are Sundays
  assert.equal(weeks.length, 2);
  assert.deepEqual(
    weeks.map((w) => w.contributionDays.map((d) => d.date)),
    [
      ["2026-11-01", "2026-11-02", "2026-11-03"],
      ["2026-11-08", "2026-11-09"],
    ]
  );
  // a partial first week (starting mid-week) stays a single week until Sunday
  const partial = groupDaysIntoSundayWeeks([
    { date: "2026-11-05", contributionCount: 1, contributionLevel: 1 },
    { date: "2026-11-06", contributionCount: 0, contributionLevel: 0 },
    { date: "2026-11-08", contributionCount: 2, contributionLevel: 2 },
  ]);
  assert.equal(partial.length, 2);
});

test("levelFromCount maps ratios to GitHub's 0–4 scale", () => {
  assert.equal(levelFromCount(0, 10), 0);
  assert.equal(levelFromCount(1, 10), 1);
  assert.equal(levelFromCount(4, 10), 2);
  assert.equal(levelFromCount(6, 10), 3);
  assert.equal(levelFromCount(10, 10), 4);
});

test("normalizeContributions enforces total === sum, trims to 53 weeks and repairs levels", () => {
  const weeks = Array.from({ length: 60 }, (_, i) => ({
    contributionDays: [
      { date: `2026-01-${String((i % 28) + 1).padStart(2, "0")}`, contributionCount: i === 59 ? 10 : 1, contributionLevel: 0 as const },
    ],
  }));
  const payload = {
    source: "snapshot",
    fetchedAt: "2026-11-25T00:00:00Z",
    username: "heetwave16",
    profile: { name: "Heet", bio: null, location: null, followers: 0, publicRepos: 0, url: "" },
    contributions: { totalContributions: 999, weeks },
    repos: [],
    mergedPRs: { totalCount: 0, items: [] },
    latestPush: null,
  } as GitHubPayload;
  const out = normalizeContributions(payload);
  assert.equal(out.contributions.weeks.length, 53);
  assert.equal(out.contributions.totalContributions, 52 * 1 + 10);
  assert.equal(out.contributions.totalContributions, sumContributionWeeks(out.contributions.weeks));
  // non-zero days are never painted empty
  assert.ok(out.contributions.weeks.every((w) => w.contributionDays.every((d) => d.contributionLevel > 0)));
});
