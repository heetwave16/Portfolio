import fs from "node:fs/promises";
import path from "node:path";

const USERNAME = process.env.GITHUB_USERNAME || "heetwave16";
const TOKEN = process.env.GITHUB_TOKEN || "";

const LANGUAGE_COLORS = {
  TypeScript: "#3178C6",
  JavaScript: "#F1E05A",
  Python: "#3572A5",
  CSS: "#563D7C",
  HTML: "#E34C26",
  PLpgSQL: "#336790",
  Shell: "#89E051",
};

function parseContributionsHtml(html) {
  const totalMatch = html.match(/([\d,]+)\s+contributions?\s+in\s+the\s+last\s+year/i);
  const totalContributions = totalMatch ? Number(totalMatch[1].replace(/,/g, "")) : 0;

  // Map cell id -> tooltip count
  const tooltipCounts = new Map();
  const tooltipRegex = /<tool-tip[^>]*for="([^"]+)"[^>]*>([^<]+)<\/tool-tip>/g;
  let tm;
  while ((tm = tooltipRegex.exec(html)) !== null) {
    const id = tm[1];
    const text = tm[2];
    const numMatch = text.match(/^(\d+)\s+contributions?/i);
    tooltipCounts.set(id, numMatch ? Number(numMatch[1]) : 0);
  }

  const dayMap = new Map();
  const cellRegex = /<td[^>]*id="([^"]+)"[^>]*data-date="(\d{4}-\d{2}-\d{2})"[^>]*data-level="(\d)"[^>]*>/g;
  const altCellRegex = /<td[^>]*data-date="(\d{4}-\d{2}-\d{2})"[^>]*id="([^"]+)"[^>]*data-level="(\d)"[^>]*>/g;

  let cm;
  while ((cm = cellRegex.exec(html)) !== null) {
    const [, id, date, level] = cm;
    dayMap.set(date, {
      date,
      contributionCount: tooltipCounts.get(id) ?? (Number(level) > 0 ? Number(level) * 2 : 0),
      contributionLevel: Number(level),
    });
  }
  if (dayMap.size === 0) {
    while ((cm = altCellRegex.exec(html)) !== null) {
      const [, date, id, level] = cm;
      dayMap.set(date, {
        date,
        contributionCount: tooltipCounts.get(id) ?? (Number(level) > 0 ? Number(level) * 2 : 0),
        contributionLevel: Number(level),
      });
    }
  }
  if (dayMap.size === 0) {
    const fallbackRegex = /data-date="(\d{4}-\d{2}-\d{2})"[^>]*data-level="(\d)"/g;
    while ((cm = fallbackRegex.exec(html)) !== null) {
      const [, date, level] = cm;
      dayMap.set(date, {
        date,
        contributionCount: Number(level) > 0 ? Number(level) : 0,
        contributionLevel: Number(level),
      });
    }
  }

  const sortedDays = Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  const weeks = [];
  for (let i = 0; i < sortedDays.length; i += 7) {
    weeks.push({ contributionDays: sortedDays.slice(i, i + 7) });
  }

  return { totalContributions, weeks };
}

function build7DaySparkline(commits, nowMs = Date.now()) {
  const buckets = [0, 0, 0, 0, 0, 0, 0];
  if (!Array.isArray(commits)) return buckets;
  const dayMs = 86400000;
  for (const commit of commits) {
    const dateStr = commit?.commit?.author?.date;
    if (!dateStr) continue;
    const ageDays = Math.floor((nowMs - Date.parse(dateStr)) / dayMs);
    if (ageDays >= 0 && ageDays < 7) {
      buckets[6 - ageDays] += 1;
    }
  }
  return buckets;
}

async function fetchPublicSnapshot() {
  const headers = {
    "User-Agent": "heet-portfolio-snapshot",
    Accept: "application/vnd.github+json",
    ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
  };

  const [userRes, reposRes, prsRes, contribHtml] = await Promise.all([
    fetch(`https://api.github.com/users/${USERNAME}`, { headers }),
    fetch(`https://api.github.com/users/${USERNAME}/repos?per_page=100&sort=pushed`, { headers }),
    fetch(
      `https://api.github.com/search/issues?q=author:${USERNAME}+is:pr+is:merged+-user:${USERNAME}&per_page=10`,
      { headers }
    ),
    fetch(`https://github.com/users/${USERNAME}/contributions`, {
      headers: { "User-Agent": "heet-portfolio-snapshot" },
    }).then((r) => (r.ok ? r.text() : "")),
  ]);

  if (!userRes.ok || !reposRes.ok) {
    throw new Error(`GitHub REST failed: ${userRes.status} / ${reposRes.status}`);
  }

  const user = await userRes.json();
  const rawRepos = await reposRes.json();
  const prsData = prsRes.ok ? await prsRes.json() : { total_count: 0, items: [] };
  const contributions = parseContributionsHtml(contribHtml);

  const enrichedRepos = await Promise.all(
    rawRepos.map(async (repo) => {
      let languages = [];
      let latestCommitMessage = null;
      let latestCommitDate = repo.pushed_at;
      let weeklyCommitCounts = [0, 0, 0, 0, 0, 0, 0];
      let readmeExcerpt = null;

      if (!repo.fork) {
        const [langRes, commitRes, readmeRes] = await Promise.all([
          fetch(repo.languages_url, { headers }),
          fetch(`https://api.github.com/repos/${USERNAME}/${repo.name}/commits?per_page=15`, { headers }),
          fetch(`https://api.github.com/repos/${USERNAME}/${repo.name}/readme`, { headers }),
        ]);

        if (langRes.ok) {
          const langObj = await langRes.json();
          languages = Object.entries(langObj).map(([name, size]) => ({
            name,
            size: Number(size),
            color: LANGUAGE_COLORS[name] || "#B3B6B7",
          }));
        }

        if (commitRes.ok) {
          const commits = await commitRes.json();
          if (Array.isArray(commits) && commits.length > 0) {
            latestCommitMessage = commits[0].commit?.message?.split("\n")[0] || null;
            latestCommitDate = commits[0].commit?.author?.date || repo.pushed_at;
            weeklyCommitCounts = build7DaySparkline(commits);
          }
        }

        if (readmeRes.ok) {
          const readmeJson = await readmeRes.json();
          const text = Buffer.from(readmeJson.content || "", "base64")
            .toString("utf8")
            .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
            .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
            .replace(/[#*`>]/g, " ")
            .replace(/\s+/g, " ")
            .trim();
          readmeExcerpt = text.slice(0, 210) || null;
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
        isFork: Boolean(repo.fork),
        isArchived: Boolean(repo.archived),
        topics: Array.isArray(repo.topics) ? repo.topics : [],
        latestCommitMessage,
        latestCommitDate,
        weeklyCommitCounts,
        readmeExcerpt,
      };
    })
  );

  const mergedPRs = {
    totalCount: prsData.total_count || 0,
    items: (prsData.items || []).slice(0, 10).map((item) => {
      const repoNameWithOwner = item.repository_url.replace("https://api.github.com/repos/", "");
      return {
        title: item.title,
        url: item.html_url,
        repoNameWithOwner,
        repoUrl: `https://github.com/${repoNameWithOwner}`,
        mergedAt: item.pull_request?.merged_at || item.closed_at || item.updated_at,
      };
    }),
  };

  const nonForkSorted = enrichedRepos
    .filter((r) => !r.isFork && r.latestCommitMessage)
    .sort((a, b) => Date.parse(b.latestCommitDate || b.pushedAt) - Date.parse(a.latestCommitDate || a.pushedAt));

  const topPush = nonForkSorted[0];
  const latestPush = topPush
    ? {
        repo: topPush.name,
        message: topPush.latestCommitMessage,
        date: topPush.latestCommitDate || topPush.pushedAt,
        url: topPush.url,
      }
    : null;

  return {
    source: "snapshot",
    fetchedAt: new Date().toISOString(),
    username: USERNAME,
    profile: {
      name: user.name || USERNAME,
      bio: user.bio,
      location: user.location,
      followers: user.followers || 0,
      publicRepos: user.public_repos || enrichedRepos.length,
      url: user.html_url,
    },
    contributions,
    repos: enrichedRepos,
    mergedPRs,
    latestPush,
  };
}

async function main() {
  const data = await fetchPublicSnapshot();
  const outPath = path.join(process.cwd(), "public", "data", "github-snapshot.json");
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(data, null, 2), "utf8");
  console.log(
    `Saved GitHub snapshot for ${data.username}: ${data.contributions.totalContributions} contributions, ${data.repos.length} repos, ${data.mergedPRs.totalCount} merged PRs.`
  );
}

main().catch((err) => {
  console.error("Failed to generate snapshot:", err);
  process.exit(1);
});
