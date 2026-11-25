import type { ContributionDay, ContributionLevel, ContributionWeek, GitHubPayload } from "../types/portfolio";

/**
 * Single source of truth for contribution data.
 *
 * Historical bug (fixed here): GitHub renders `<td ... data-date="…" id="…" data-level="…">`
 * with `data-date` BEFORE `id`. The old regex required `id` first, never matched, and fell back
 * to using the colour level (0–4) as the count — so the grid summed to ~41 while the headline
 * said 134. This parser reads attributes in any order and takes counts from the tooltips.
 */

function readAttr(tag: string, name: string): string | null {
  const re = new RegExp(`\\s${name}="([^"]*)"`, "i");
  const m = tag.match(re);
  return m ? m[1] : null;
}

/** Parses "No contributions on …", "1 contribution on …", "1,204 contributions on …". */
export function parseTooltipCount(text: string): number | null {
  const t = text.trim();
  if (/^no\s+contributions?/i.test(t)) return 0;
  const m = t.match(/^([\d,]+)\s+contributions?/i);
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function clampLevel(n: number): ContributionLevel {
  return Math.min(4, Math.max(0, Math.round(n))) as ContributionLevel;
}

/** Derives a 0–4 level from a count when GitHub's level is unavailable. */
export function levelFromCount(count: number, max: number): ContributionLevel {
  if (count <= 0) return 0;
  if (max <= 0) return 1;
  const ratio = count / max;
  if (ratio > 0.75) return 4;
  if (ratio > 0.5) return 3;
  if (ratio > 0.25) return 2;
  return 1;
}

export function parseContributionsHtml(html: string): { totalContributions: number; weeks: ContributionWeek[] } {
  const tooltipById = new Map<string, number>();
  const tooltipRe = /<tool-tip\b([^>]*)>([^<]*)<\/tool-tip>/gi;
  let tm: RegExpExecArray | null;
  while ((tm = tooltipRe.exec(html)) !== null) {
    const forId = readAttr(` ${tm[1]}`, "for");
    const count = parseTooltipCount(tm[2]);
    if (forId && count !== null) tooltipById.set(forId, count);
  }

  const days = new Map<string, ContributionDay>();
  const cellRe = /<td\b[^>]*\bdata-date="\d{4}-\d{2}-\d{2}"[^>]*>/gi;
  let cm: RegExpExecArray | null;
  while ((cm = cellRe.exec(html)) !== null) {
    const tag = cm[0];
    const date = readAttr(tag, "data-date");
    if (!date) continue;
    const id = readAttr(tag, "id");
    const level = clampLevel(Number(readAttr(tag, "data-level") ?? 0));
    const count = id && tooltipById.has(id) ? (tooltipById.get(id) as number) : null;
    days.set(date, {
      date,
      // If a tooltip is missing we refuse to invent a number from the colour level.
      contributionCount: count ?? 0,
      contributionLevel: count === 0 ? 0 : level,
    });
  }

  const sorted = Array.from(days.values()).sort((a, b) => a.date.localeCompare(b.date));
  const weeks = groupDaysIntoSundayWeeks(sorted);
  return { totalContributions: sumContributionWeeks(weeks), weeks };
}

/** Groups chronologically sorted days into Sunday-first weeks (calendar-correct, not blind chunks of 7). */
export function groupDaysIntoSundayWeeks(sortedDays: ContributionDay[]): ContributionWeek[] {
  const weeks: ContributionWeek[] = [];
  let current: ContributionDay[] = [];
  for (const day of sortedDays) {
    const dow = new Date(`${day.date}T00:00:00Z`).getUTCDay();
    if (dow === 0 && current.length > 0) {
      weeks.push({ contributionDays: current });
      current = [];
    }
    current.push(day);
  }
  if (current.length > 0) weeks.push({ contributionDays: current });
  return weeks;
}

export function sumContributionWeeks(weeks: ContributionWeek[]): number {
  let total = 0;
  for (const w of weeks) for (const d of w.contributionDays) total += Math.max(0, d.contributionCount || 0);
  return total;
}

/**
 * Enforces the invariant: headline total === sum of rendered cells.
 * Also repairs levels so a non-zero day is never painted as empty and vice versa.
 */
export function normalizeContributions(payload: GitHubPayload): GitHubPayload {
  const weeks = (payload.contributions?.weeks ?? []).slice(-53);
  let max = 0;
  for (const w of weeks) for (const d of w.contributionDays) max = Math.max(max, d.contributionCount || 0);
  const fixedWeeks = weeks.map((w) => ({
    contributionDays: w.contributionDays.map((d) => {
      const count = Math.max(0, d.contributionCount || 0);
      let level = clampLevel(d.contributionLevel ?? 0);
      if (count === 0) level = 0;
      else if (level === 0) level = levelFromCount(count, max);
      return { date: d.date, contributionCount: count, contributionLevel: level };
    }),
  }));
  return {
    ...payload,
    contributions: { totalContributions: sumContributionWeeks(fixedWeeks), weeks: fixedWeeks },
  };
}
