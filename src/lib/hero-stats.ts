import { formatContributionDate, getLatestContributionDate } from "./contributions";
import type { GitHubPayload } from "../types/portfolio";

export interface HeroStat {
  id: "contributions" | "featured-projects" | "merged-prs";
  value: number;
  label: string;
  detail?: string;
  dateTime?: string;
}

/** Build the small hero strip only from the same server payload/config-derived count used below. */
export function buildHeroStats(data: GitHubPayload | null, featuredProjectCount: number): HeroStat[] {
  if (!data) return [];

  const stats: HeroStat[] = [];
  const latestContributionDate = data.contributions.weeks.length
    ? getLatestContributionDate(data.contributions.weeks)
    : null;

  const contributionTotal = data.contributions.totalContributions;
  if (Number.isFinite(contributionTotal) && contributionTotal >= 0) {
    stats.push({
      id: "contributions",
      value: contributionTotal,
      label: "Contributions",
      ...(latestContributionDate
        ? {
            detail: `as of ${formatContributionDate(latestContributionDate)}`,
            dateTime: latestContributionDate,
          }
        : {}),
    });
  }

  if (Number.isFinite(featuredProjectCount) && featuredProjectCount >= 0) {
    stats.push({
      id: "featured-projects",
      value: featuredProjectCount,
      label: "Featured projects",
    });
  }

  const mergedPRTotal = data.mergedPRs.totalCount;
  if (Number.isFinite(mergedPRTotal) && mergedPRTotal >= 0) {
    stats.push({
      id: "merged-prs",
      value: mergedPRTotal,
      label: "Merged PRs",
    });
  }

  return stats;
}
