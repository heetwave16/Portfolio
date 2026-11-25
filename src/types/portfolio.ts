export type ContributionLevel = 0 | 1 | 2 | 3 | 4;

export interface ContributionDay {
  date: string;
  contributionCount: number;
  contributionLevel: ContributionLevel;
}

export interface ContributionWeek {
  contributionDays: ContributionDay[];
}

export interface LanguageStat {
  name: string;
  size: number;
  color: string;
}

export interface GitHubRepoRaw {
  name: string;
  description: string | null;
  stargazerCount: number;
  primaryLanguage: {
    name: string;
    color: string;
  } | null;
  pushedAt: string;
  url: string;
  homepageUrl: string | null;
  languages: LanguageStat[];
  isFork: boolean;
  isArchived: boolean;
  topics: string[];
  latestCommitMessage: string | null;
  latestCommitDate: string | null;
  weeklyCommitCounts: number[];
  readmeExcerpt: string | null;
}

export interface MergedPullRequest {
  title: string;
  url: string;
  repoNameWithOwner: string;
  repoUrl: string;
  mergedAt: string;
}

export interface LatestPushInfo {
  repo: string;
  message: string;
  date: string;
  url: string;
}

export interface GitHubPayload {
  source: "graphql" | "rest-public" | "snapshot";
  fetchedAt: string;
  username: string;
  profile: {
    name: string;
    bio: string | null;
    location: string | null;
    followers: number;
    publicRepos: number;
    url: string;
  };
  contributions: {
    totalContributions: number;
    weeks: ContributionWeek[];
  };
  repos: GitHubRepoRaw[];
  mergedPRs: {
    totalCount: number;
    items: MergedPullRequest[];
  };
  latestPush: LatestPushInfo | null;
}

export interface RepoOverride {
  title?: string;
  pitch?: string;
  role?: string;
  category?: string;
  liveUrl?: string | null;
  image?: string;
  previewIframe?: boolean;
  year?: string;
  stack?: string;
}

export interface ReposConfig {
  mode: "all" | "featured-only";
  includeForks: boolean;
  includeArchived: boolean;
  minStars: number;
  hide: string[];
  featured: string[];
  excludeLanguages?: string[];
  languageAliases?: Record<string, string>;
  openSource?: {
    claimOpenSource?: boolean;
  };
  overrides: Record<string, RepoOverride>;
}

export interface ProjectCardModel {
  id: string;
  repoName: string;
  title: string;
  pitch: string;
  role: string;
  category: string;
  featured: boolean;
  featuredIndex: number;
  stargazerCount: number;
  pushedAt: string;
  url: string;
  liveUrl: string | null;
  image: string | null;
  previewIframe: boolean;
  primaryLanguage: {
    name: string;
    color: string;
  } | null;
  languages: LanguageStat[];
  latestCommitMessage: string | null;
  latestCommitDate: string | null;
  weeklyCommitCounts: number[];
  readmeExcerpt: string | null;
  topics: string[];
  year: string;
  stack: string;
}

export type ProjectSortMode = "featured" | "recent" | "stars";
export type BioLength = "short" | "medium" | "detailed";

export interface PortfolioContent {
  meta: {
    title: string;
    description: string;
  };
  hero: {
    kicker: string;
    firstName: string;
    lastName: string;
    tagline: string;
    primaryCta: string;
    secondaryCta: string;
    scrollCue: string;
    wireframeToggleLabel: string;
    realPortraitAlt: string;
    wireframePortraitAlt: string;
    chapters: Array<{
      index: string;
      label: string;
      title: string;
      body: string;
    }>;
  };
  whatIBuild: {
    eyebrow: string;
    heading: string;
    items: Array<{
      index: string;
      title: string;
      summary: string;
      repoTarget: string;
      categoryFilter: string;
    }>;
  };
  pulse: {
    eyebrow: string;
    heading: string;
    subtitle: string;
    lastShippedLabel: string;
    snapshotNotice: string;
  };
  projects: {
    eyebrow: string;
    heading: string;
    subtitle: string;
    emptyState: string;
  };
  openSource: {
    eyebrow: string;
    heading: string;
    subtitle: string;
    zeroStateTitle: string;
    zeroStateBody: string;
  };
  about: {
    eyebrow: string;
    heading: string;
    bios: Record<BioLength, string[]>;
    highlights: Array<{
      label: string;
      value: string;
    }>;
    skillsHeading: string;
    skillsCaption: string;
  };
  contact: {
    eyebrow: string;
    heading: string;
    lead: string;
    emailActionLabel: string;
    copyActionLabel: string;
    copiedLabel: string;
    resumeActionLabel: string;
    availabilityNote: string;
  };
  footer: {
    ctaHeading: string;
    statusText: string;
    backToTopLabel: string;
    credits: string;
  };
}
