import type {
  ContributionDay,
  ContributionWeek,
  GitHubRepoRaw,
  LanguageStat,
  ProjectCardModel,
  ProjectSortMode,
  RepoOverride,
  ReposConfig,
} from "../types/portfolio";

const LANGUAGE_COLOR_MAP: Record<string, string> = {
  TypeScript: "#3178C6",
  JavaScript: "#F1E05A",
  Python: "#3572A5",
  SQL: "#336790",
  PLpgSQL: "#336790",
  CSS: "#563D7C",
  HTML: "#E34C26",
  Shell: "#89E051",
  Dockerfile: "#384D54",
  C: "#555555",
  "C++": "#F34B7D",
  Rust: "#DEA584",
  Go: "#00ADD8",
};

export function getLanguageColor(name: string, fallback?: string): string {
  return LANGUAGE_COLOR_MAP[name] || fallback || "#B3B6B7";
}

export function transformLanguageName(
  name: string,
  config: Pick<ReposConfig, "excludeLanguages" | "languageAliases">
): string | null {
  const excluded = new Set(
    (config.excludeLanguages || []).map((lang) => lang.trim().toLowerCase())
  );
  if (excluded.has(name.trim().toLowerCase())) {
    return null;
  }

  let mapped = name;
  for (const [aliasFrom, aliasTo] of Object.entries(config.languageAliases || {})) {
    if (aliasFrom.trim().toLowerCase() === name.trim().toLowerCase()) {
      mapped = aliasTo;
      break;
    }
  }

  if (excluded.has(mapped.trim().toLowerCase())) {
    return null;
  }
  return mapped;
}

export function transformLanguageStats(
  languages: LanguageStat[],
  config: Pick<ReposConfig, "excludeLanguages" | "languageAliases">
): LanguageStat[] {
  const merged = new Map<string, { size: number; color: string }>();

  for (const lang of languages) {
    const mappedName = transformLanguageName(lang.name, config);
    if (!mappedName) continue;
    const existing = merged.get(mappedName);
    const color =
      mappedName === lang.name
        ? getLanguageColor(mappedName, lang.color)
        : getLanguageColor(mappedName);
    if (existing) {
      existing.size += lang.size;
    } else {
      merged.set(mappedName, { size: lang.size, color });
    }
  }

  return Array.from(merged.entries())
    .map(([name, data]) => ({
      name,
      size: data.size,
      color: data.color,
    }))
    .sort((a, b) => b.size - a.size);
}

/**
 * Aligns each GitHub contribution week into a fixed 7-row Sunday-first grid:
 * row 0 = Sun, 1 = Mon, 2 = Tue, 3 = Wed, 4 = Thu, 5 = Fri, 6 = Sat.
 */
export function alignContributionWeeksToSunday(
  weeks: ContributionWeek[]
): Array<Array<ContributionDay | null>> {
  return weeks.map((week) => {
    const slots: Array<ContributionDay | null> = [null, null, null, null, null, null, null];
    for (const day of week.contributionDays) {
      const dow = new Date(`${day.date}T00:00:00Z`).getUTCDay();
      if (!Number.isNaN(dow) && dow >= 0 && dow <= 6) {
        slots[dow] = day;
      }
    }
    return slots;
  });
}

function normalizeRepoName(name: string): string {
  const withoutOwner = name.includes("/") ? name.split("/").pop() || name : name;
  return withoutOwner.trim().toLowerCase();
}

function findOverride(
  overrides: Record<string, RepoOverride>,
  repoName: string
): RepoOverride | undefined {
  const target = normalizeRepoName(repoName);
  for (const [key, value] of Object.entries(overrides)) {
    if (normalizeRepoName(key) === target) {
      return value;
    }
  }
  return undefined;
}

export function buildProjectModels(
  rawRepos: GitHubRepoRaw[],
  config: ReposConfig,
  options?: { warnUnknown?: boolean }
): ProjectCardModel[] {
  const hideSet = new Set(config.hide.map(normalizeRepoName));
  const featuredOrder = new Map<string, number>();
  config.featured.forEach((name, idx) => {
    featuredOrder.set(normalizeRepoName(name), idx);
  });

  if (options?.warnUnknown) {
    const knownNames = new Set(rawRepos.map((r) => normalizeRepoName(r.name)));
    for (const candidate of [...config.hide, ...config.featured, ...Object.keys(config.overrides)]) {
      if (!knownNames.has(normalizeRepoName(candidate))) {
        console.warn(`[repos.config.json] Unknown repository name "${candidate}" ignored.`);
      }
    }
  }

  const models: ProjectCardModel[] = [];

  for (const repo of rawRepos) {
    const key = normalizeRepoName(repo.name);
    const topicsLower = new Set(repo.topics.map((t) => t.toLowerCase()));

    // hide in config always wins over everything else
    if (hideSet.has(key)) continue;

    // topic portfolio-hide hides unless explicitly featured in config
    const isFeaturedInConfig = featuredOrder.has(key);
    if (topicsLower.has("portfolio-hide") && !isFeaturedInConfig) continue;

    if (!config.includeForks && repo.isFork) continue;
    if (!config.includeArchived && repo.isArchived) continue;
    if (repo.stargazerCount < config.minStars) continue;

    if (config.mode === "featured-only" && !isFeaturedInConfig) continue;

    const isTopicFeatured = topicsLower.has("portfolio-featured");
    const featured = isFeaturedInConfig || isTopicFeatured;
    const featuredIndex = isFeaturedInConfig
      ? (featuredOrder.get(key) as number)
      : isTopicFeatured
        ? config.featured.length + 100
        : Number.MAX_SAFE_INTEGER;

    const override = findOverride(config.overrides, repo.name);
    const title = override?.title || repo.name;
    const pitch =
      override?.pitch ||
      repo.description ||
      "Public repository on GitHub — open the detail panel to inspect languages, recent commits, and source.";
    const role = override?.role || "Creator & Maintainer";
    const category = override?.category || "Other";
    const liveUrl = override?.liveUrl ?? (repo.homepageUrl || null);

    // Ensure github.com URLs are never framed
    const safePreviewIframe =
      Boolean(override?.previewIframe) &&
      Boolean(liveUrl) &&
      !String(liveUrl).toLowerCase().includes("github.com");

    const languages = transformLanguageStats(repo.languages, config);
    let primaryLanguage: ProjectCardModel["primaryLanguage"] = null;
    if (repo.primaryLanguage) {
      const mappedPrimary = transformLanguageName(repo.primaryLanguage.name, config);
      if (mappedPrimary) {
        primaryLanguage = {
          name: mappedPrimary,
          color:
            mappedPrimary === repo.primaryLanguage.name
              ? getLanguageColor(mappedPrimary, repo.primaryLanguage.color)
              : getLanguageColor(mappedPrimary),
        };
      } else if (languages[0]) {
        primaryLanguage = { name: languages[0].name, color: languages[0].color };
      }
    } else if (languages[0]) {
      primaryLanguage = { name: languages[0].name, color: languages[0].color };
    }

    models.push({
      id: key,
      repoName: repo.name,
      title,
      pitch,
      role,
      category,
      featured,
      featuredIndex,
      stargazerCount: repo.stargazerCount,
      pushedAt: repo.pushedAt,
      url: repo.url,
      liveUrl,
      image: override?.image || null,
      previewIframe: safePreviewIframe,
      primaryLanguage,
      languages,
      latestCommitMessage: repo.latestCommitMessage,
      latestCommitDate: repo.latestCommitDate,
      weeklyCommitCounts: repo.weeklyCommitCounts,
      readmeExcerpt: repo.readmeExcerpt,
      topics: repo.topics,
      year: override?.year || (repo.pushedAt ? String(new Date(repo.pushedAt).getUTCFullYear()) : ""),
      stack:
        override?.stack ||
        languages
          .slice(0, 3)
          .map((l) => l.name)
          .join(" · "),
    });
  }

  return sortProjects(models, "featured");
}

export function sortProjects(
  projects: ProjectCardModel[],
  mode: ProjectSortMode
): ProjectCardModel[] {
  const copy = [...projects];
  if (mode === "stars") {
    return copy.sort((a, b) => {
      if (b.stargazerCount !== a.stargazerCount) {
        return b.stargazerCount - a.stargazerCount;
      }
      return Date.parse(b.pushedAt) - Date.parse(a.pushedAt);
    });
  }
  if (mode === "recent") {
    return copy.sort((a, b) => Date.parse(b.pushedAt) - Date.parse(a.pushedAt));
  }
  // "featured": featured repos first in config order, then remaining by pushedAt descending
  return copy.sort((a, b) => {
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    if (a.featured && b.featured && a.featuredIndex !== b.featuredIndex) {
      return a.featuredIndex - b.featuredIndex;
    }
    return Date.parse(b.pushedAt) - Date.parse(a.pushedAt);
  });
}

export function deriveProjectCategories(projects: ProjectCardModel[]): string[] {
  const seen = new Set<string>();
  for (const p of projects) {
    seen.add(p.category);
  }
  const ordered = Array.from(seen).sort((a, b) => {
    if (a === "Other") return 1;
    if (b === "Other") return -1;
    return a.localeCompare(b);
  });
  return ["All", ...ordered];
}

export interface ComputedLanguageSkill {
  name: string;
  bytes: number;
  percentage: number;
  color: string;
  repoCount: number;
}

export function computeLanguageSkills(
  projects: ProjectCardModel[],
  maxItems = 6
): ComputedLanguageSkill[] {
  const totals = new Map<string, { bytes: number; color: string; repos: Set<string> }>();

  for (const project of projects) {
    if (project.languages.length > 0) {
      for (const lang of project.languages) {
        const current = totals.get(lang.name) || {
          bytes: 0,
          color: getLanguageColor(lang.name, lang.color),
          repos: new Set<string>(),
        };
        current.bytes += lang.size;
        current.repos.add(project.repoName);
        totals.set(lang.name, current);
      }
    } else if (project.primaryLanguage) {
      const lang = project.primaryLanguage;
      const current = totals.get(lang.name) || {
        bytes: 0,
        color: getLanguageColor(lang.name, lang.color),
        repos: new Set<string>(),
      };
      current.bytes += 1000;
      current.repos.add(project.repoName);
      totals.set(lang.name, current);
    }
  }

  const grandTotal = Array.from(totals.values()).reduce((sum, item) => sum + item.bytes, 0);
  if (grandTotal === 0) return [];

  return Array.from(totals.entries())
    .map(([name, data]) => ({
      name,
      bytes: data.bytes,
      percentage: Math.round((data.bytes / grandTotal) * 1000) / 10,
      color: data.color,
      repoCount: data.repos.size,
    }))
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, maxItems);
}

export function formatRelativeTime(isoDate: string | null | undefined, nowMs = Date.now()): string {
  if (!isoDate) return "unknown";
  const then = Date.parse(isoDate);
  if (Number.isNaN(then)) return "unknown";

  const diffSeconds = Math.max(0, Math.floor((nowMs - then) / 1000));
  if (diffSeconds < 60) return "just now";
  const minutes = Math.floor(diffSeconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(months / 12);
  return `${years}y ago`;
}
