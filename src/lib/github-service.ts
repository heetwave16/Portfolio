import fs from "node:fs/promises";
import path from "node:path";
import { SITE_CONFIG } from "@/src/config";
import { normalizeContributions, parseContributionsHtml } from "@/src/lib/contributions";
import type {
  ContributionLevel,
  ContributionWeek,
  GitHubPayload,
  GitHubRepoRaw,
  MergedPullRequest,
} from "@/src/types/portfolio";

const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: "#3178C6",
  JavaScript: "#F1E05A",
  Python: "#3572A5",
  CSS: "#563D7C",
  HTML: "#E34C26",
  PLpgSQL: "#336790",
  Shell: "#89E051",
};

const GRAPHQL_LEVEL_MAP: Record<string, ContributionLevel> = {
  NONE: 0,
  FIRST_QUARTILE: 1,
  SECOND_QUARTILE: 2,
  THIRD_QUARTILE: 3,
  FOURTH_QUARTILE: 4,
};

const GITHUB_GRAPHQL_QUERY = `
query PortfolioGitHubData($username: String!, $searchQuery: String!) {
  user(login: $username) {
    login
    name
    bio
    location
    url
    followers {
      totalCount
    }
    contributionsCollection {
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays {
            date
            contributionCount
            contributionLevel
          }
        }
      }
    }
    repositories(first: 100, privacy: PUBLIC, ownerAffiliations: OWNER, orderBy: { field: PUSHED_AT, direction: DESC }) {
      totalCount
      nodes {
        name
        description
        stargazerCount
        pushedAt
        url
        homepageUrl
        isFork
        isArchived
        primaryLanguage {
          name
          color
        }
        languages(first: 8, orderBy: { field: SIZE, direction: DESC }) {
          edges {
            size
            node {
              name
              color
            }
          }
        }
        repositoryTopics(first: 10) {
          nodes {
            topic {
              name
            }
          }
        }
        defaultBranchRef {
          target {
            ... on Commit {
              history(first: 15) {
                nodes {
                  messageHeadline
                  committedDate
                }
              }
            }
          }
        }
        object(expression: "HEAD:README.md") {
          ... on Blob {
            text
          }
        }
      }
    }
  }
  search(query: $searchQuery, type: ISSUE, first: 10) {
    issueCount
    nodes {
      ... on PullRequest {
        title
        url
        mergedAt
        repository {
          nameWithOwner
          url
        }
      }
    }
  }
}
`;

function cleanReadmeText(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const prose = raw
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .split(/\r?\n/)
    // Headings (incl. the repo title) are not prose — dropping them fixes "Title For …" run-ins.
    .filter((line) => !/^\s*#/.test(line) && !/^\s*(?:={3,}|-{3,})\s*$/.test(line))
    .join(" ")
    .replace(/\[!\[[^\]]*\]\([^)]*\)\]\([^)]*\)/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[\s*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[#*`>|_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  // Scaffold boilerplate is not a description of the work.
  if (!prose || /lovable/i.test(prose.slice(0, 80))) return null;
  // Prefer whole sentences so the excerpt never ends mid-thought.
  const window = prose.slice(0, 230);
  let lastStop = -1;
  for (const m of window.matchAll(/[A-Za-z)\]][.!?](?=\s|$)/g)) lastStop = (m.index ?? 0) + 1;
  if (lastStop >= 80) return window.slice(0, lastStop + 1);
  const cut = prose.slice(0, 210);
  return cut.slice(0, Math.max(cut.lastIndexOf(" "), 150)).replace(/[,;:\s—–-]+$/, "");
}

function build7DaySparklineFromDates(dates: string[], nowMs = Date.now()): number[] {
  const buckets = [0, 0, 0, 0, 0, 0, 0];
  const dayMs = 86400000;
  for (const iso of dates) {
    const parsed = Date.parse(iso);
    if (Number.isNaN(parsed)) continue;
    const ageDays = Math.floor((nowMs - parsed) / dayMs);
    if (ageDays >= 0 && ageDays < 7) {
      buckets[6 - ageDays] += 1;
    }
  }
  return buckets;
}

export async function readSnapshotFallback(): Promise<GitHubPayload> {
  const snapshotPath = path.join(process.cwd(), "public", "data", "github-snapshot.json");
  const raw = await fs.readFile(snapshotPath, "utf8");
  const parsed = JSON.parse(raw) as GitHubPayload;
  return normalizeContributions({
    ...parsed,
    source: "snapshot",
  });
}

async function fetchViaGraphQL(username: string, token: string): Promise<GitHubPayload> {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "heet-portfolio-app",
    },
    body: JSON.stringify({
      query: GITHUB_GRAPHQL_QUERY,
      variables: {
        username,
        searchQuery: `author:${username} is:pr is:merged -user:${username}`,
      },
    }),
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    throw new Error(`GraphQL HTTP ${res.status}`);
  }

  const json = await res.json();
  if (json.errors || !json.data?.user) {
    throw new Error(`GraphQL error: ${JSON.stringify(json.errors || "missing user")}`);
  }

  const user = json.data.user;
  const calendar = user.contributionsCollection.contributionCalendar;

  const weeks: ContributionWeek[] = (calendar.weeks || []).map(
    (w: { contributionDays: Array<{ date: string; contributionCount: number; contributionLevel: string }> }) => ({
      contributionDays: (w.contributionDays || []).map((d) => ({
        date: d.date,
        contributionCount: d.contributionCount,
        contributionLevel: GRAPHQL_LEVEL_MAP[d.contributionLevel] ?? 0,
      })),
    })
  );

  const repos: GitHubRepoRaw[] = (user.repositories?.nodes || []).map(
    (node: {
      name: string;
      description: string | null;
      stargazerCount: number;
      pushedAt: string;
      url: string;
      homepageUrl: string | null;
      isFork: boolean;
      isArchived: boolean;
      primaryLanguage: { name: string; color: string | null } | null;
      languages?: { edges?: Array<{ size: number; node: { name: string; color: string | null } }> };
      repositoryTopics?: { nodes?: Array<{ topic: { name: string } }> };
      defaultBranchRef?: { target?: { history?: { nodes?: Array<{ messageHeadline: string; committedDate: string }> } } };
      object?: { text?: string } | null;
    }) => {
      const commits = node.defaultBranchRef?.target?.history?.nodes || [];
      const latest = commits[0];
      return {
        name: node.name,
        description: node.description,
        stargazerCount: node.stargazerCount,
        primaryLanguage: node.primaryLanguage
          ? {
              name: node.primaryLanguage.name,
              color: node.primaryLanguage.color || LANGUAGE_COLORS[node.primaryLanguage.name] || "#B3B6B7",
            }
          : null,
        pushedAt: node.pushedAt,
        url: node.url,
        homepageUrl: node.homepageUrl || null,
        languages: (node.languages?.edges || []).map((edge) => ({
          name: edge.node.name,
          size: edge.size,
          color: edge.node.color || LANGUAGE_COLORS[edge.node.name] || "#B3B6B7",
        })),
        isFork: node.isFork,
        isArchived: node.isArchived,
        topics: (node.repositoryTopics?.nodes || []).map((t) => t.topic.name),
        latestCommitMessage: latest?.messageHeadline || null,
        latestCommitDate: latest?.committedDate || node.pushedAt,
        weeklyCommitCounts: build7DaySparklineFromDates(commits.map((c) => c.committedDate)),
        readmeExcerpt: cleanReadmeText(node.object?.text),
      };
    }
  );

  const mergedPRItems: MergedPullRequest[] = (json.data.search?.nodes || [])
    .filter((pr: { title?: string }) => Boolean(pr?.title))
    .map(
      (pr: {
        title: string;
        url: string;
        mergedAt: string;
        repository: { nameWithOwner: string; url: string };
      }) => ({
        title: pr.title,
        url: pr.url,
        repoNameWithOwner: pr.repository.nameWithOwner,
        repoUrl: pr.repository.url,
        mergedAt: pr.mergedAt,
      })
    );

  const nonForkLatest = repos
    .filter((r) => !r.isFork && r.latestCommitMessage)
    .sort((a, b) => Date.parse(b.latestCommitDate || b.pushedAt) - Date.parse(a.latestCommitDate || a.pushedAt))[0];

  return {
    source: "graphql",
    fetchedAt: new Date().toISOString(),
    username: user.login,
    profile: {
      name: user.name || user.login,
      bio: user.bio,
      location: user.location,
      followers: user.followers?.totalCount || 0,
      publicRepos: user.repositories?.totalCount || repos.length,
      url: user.url,
    },
    contributions: {
      totalContributions: calendar.totalContributions || 0,
      weeks,
    },
    repos,
    mergedPRs: {
      totalCount: json.data.search?.issueCount || mergedPRItems.length,
      items: mergedPRItems,
    },
    latestPush: nonForkLatest
      ? {
          repo: nonForkLatest.name,
          message: nonForkLatest.latestCommitMessage || "Updated repository",
          date: nonForkLatest.latestCommitDate || nonForkLatest.pushedAt,
          url: nonForkLatest.url,
        }
      : null,
  };
}

async function fetchViaPublicRest(username: string): Promise<GitHubPayload> {
  const headers = {
    "User-Agent": "heet-portfolio-app",
    Accept: "application/vnd.github+json",
  };

  const [userRes, reposRes, prsRes, contribRes] = await Promise.all([
    fetch(`https://api.github.com/users/${username}`, { headers, next: { revalidate: 3600 } }),
    fetch(`https://api.github.com/users/${username}/repos?per_page=100&sort=pushed`, {
      headers,
      next: { revalidate: 3600 },
    }),
    fetch(
      `https://api.github.com/search/issues?q=author:${username}+is:pr+is:merged+-user:${username}&per_page=10`,
      { headers, next: { revalidate: 3600 } }
    ),
    fetch(`https://github.com/users/${username}/contributions`, {
      headers: { "User-Agent": "heet-portfolio-app" },
      next: { revalidate: 3600 },
    }),
  ]);

  if (!userRes.ok || !reposRes.ok) {
    throw new Error(`Public REST failed: ${userRes.status}/${reposRes.status}`);
  }

  const user = await userRes.json();
  const rawRepos = (await reposRes.json()) as Array<{
    name: string;
    description: string | null;
    stargazers_count: number;
    language: string | null;
    pushed_at: string;
    html_url: string;
    homepage: string | null;
    languages_url: string;
    fork: boolean;
    archived: boolean;
    topics?: string[];
  }>;

  const prsJson = prsRes.ok ? await prsRes.json() : { total_count: 0, items: [] };
  const contribHtml = contribRes.ok ? await contribRes.text() : "";
  const contributions = parseContributionsHtml(contribHtml);

  const repos: GitHubRepoRaw[] = await Promise.all(
    rawRepos.map(async (repo) => {
      let languages: GitHubRepoRaw["languages"] = [];
      let latestCommitMessage: string | null = null;
      let latestCommitDate: string | null = repo.pushed_at;
      let weeklyCommitCounts = [0, 0, 0, 0, 0, 0, 0];
      let readmeExcerpt: string | null = null;

      if (!repo.fork) {
        const [langRes, commitRes, readmeRes] = await Promise.all([
          fetch(repo.languages_url, { headers, next: { revalidate: 3600 } }),
          fetch(`https://api.github.com/repos/${username}/${repo.name}/commits?per_page=15`, {
            headers,
            next: { revalidate: 3600 },
          }),
          fetch(`https://api.github.com/repos/${username}/${repo.name}/readme`, {
            headers,
            next: { revalidate: 3600 },
          }),
        ]);

        if (langRes.ok) {
          const langMap = (await langRes.json()) as Record<string, number>;
          languages = Object.entries(langMap).map(([name, size]) => ({
            name,
            size,
            color: LANGUAGE_COLORS[name] || "#B3B6B7",
          }));
        }

        if (commitRes.ok) {
          const commits = (await commitRes.json()) as Array<{
            commit?: { message?: string; author?: { date?: string } };
          }>;
          if (Array.isArray(commits) && commits.length > 0) {
            latestCommitMessage = commits[0].commit?.message?.split("\n")[0] || null;
            latestCommitDate = commits[0].commit?.author?.date || repo.pushed_at;
            weeklyCommitCounts = build7DaySparklineFromDates(
              commits.map((c) => c.commit?.author?.date || "").filter(Boolean)
            );
          }
        }

        if (readmeRes.ok) {
          const readmeJson = (await readmeRes.json()) as { content?: string };
          const decoded = Buffer.from(readmeJson.content || "", "base64").toString("utf8");
          readmeExcerpt = cleanReadmeText(decoded);
        }
      }

      return {
        name: repo.name,
        description: repo.description,
        stargazerCount: repo.stargazers_count || 0,
        primaryLanguage: repo.language
          ? { name: repo.language, color: LANGUAGE_COLORS[repo.language] || "#B3B6B7" }
          : null,
        pushedAt: repo.pushed_at,
        url: repo.html_url,
        homepageUrl: repo.homepage || null,
        languages,
        isFork: repo.fork,
        isArchived: repo.archived,
        topics: repo.topics || [],
        latestCommitMessage,
        latestCommitDate,
        weeklyCommitCounts,
        readmeExcerpt,
      };
    })
  );

  const mergedItems: MergedPullRequest[] = (prsJson.items || []).slice(0, 10).map(
    (item: {
      title: string;
      html_url: string;
      repository_url: string;
      closed_at?: string;
      updated_at: string;
      pull_request?: { merged_at?: string };
    }) => {
      const repoNameWithOwner = item.repository_url.replace("https://api.github.com/repos/", "");
      return {
        title: item.title,
        url: item.html_url,
        repoNameWithOwner,
        repoUrl: `https://github.com/${repoNameWithOwner}`,
        mergedAt: item.pull_request?.merged_at || item.closed_at || item.updated_at,
      };
    }
  );

  const nonForkLatest = repos
    .filter((r) => !r.isFork && r.latestCommitMessage)
    .sort((a, b) => Date.parse(b.latestCommitDate || b.pushedAt) - Date.parse(a.latestCommitDate || a.pushedAt))[0];

  return {
    source: "rest-public",
    fetchedAt: new Date().toISOString(),
    username: user.login,
    profile: {
      name: user.name || user.login,
      bio: user.bio,
      location: user.location,
      followers: user.followers || 0,
      publicRepos: user.public_repos || repos.length,
      url: user.html_url,
    },
    contributions,
    repos,
    mergedPRs: {
      totalCount: prsJson.total_count || mergedItems.length,
      items: mergedItems,
    },
    latestPush: nonForkLatest
      ? {
          repo: nonForkLatest.name,
          message: nonForkLatest.latestCommitMessage || "Updated repository",
          date: nonForkLatest.latestCommitDate || nonForkLatest.pushedAt,
          url: nonForkLatest.url,
        }
      : null,
  };
}

export async function getGitHubPortfolioData(options?: { forceFallback?: boolean }): Promise<GitHubPayload> {
  if (options?.forceFallback) {
    return readSnapshotFallback();
  }

  const username = SITE_CONFIG.githubUsername;
  const token = process.env.GITHUB_TOKEN?.trim();

  if (token) {
    try {
      return normalizeContributions(await fetchViaGraphQL(username, token));
    } catch {
      // Fall through to public REST or snapshot
    }
  }

  try {
    const live = normalizeContributions(await fetchViaPublicRest(username));
    // A scrape that yields no calendar is treated as a failure, never rendered as "0 contributions".
    if (live.contributions.weeks.length === 0) throw new Error("Empty contribution calendar");
    return live;
  } catch {
    return readSnapshotFallback();
  }
}
