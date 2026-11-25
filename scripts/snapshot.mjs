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

// Keep in sync with src/lib/contributions.ts (attribute-order-agnostic; counts from tooltips only).
function readAttr(tag, name) {
  const m = tag.match(new RegExp(`\\s${name}="([^"]*)"`, "i"));
  return m ? m[1] : null;
}

function parseTooltipCount(text) {
  const t = text.trim();
  if (/^no\s+contributions?/i.test(t)) return 0;
  const m = t.match(/^([\d,]+)\s+contributions?/i);
  return m ? Number(m[1].replace(/,/g, "")) : null;
}

function parseContributionsHtml(html) {
  const tooltipById = new Map();
  const tooltipRe = /<tool-tip\b([^>]*)>([^<]*)<\/tool-tip>/gi;
  let tm;
  while ((tm = tooltipRe.exec(html)) !== null) {
    const forId = readAttr(` ${tm[1]}`, "for");
    const count = parseTooltipCount(tm[2]);
    if (forId && count !== null) tooltipById.set(forId, count);
  }

  const days = new Map();
  const cellRe = /<td\b[^>]*\bdata-date="\d{4}-\d{2}-\d{2}"[^>]*>/gi;
  let cm;
  while ((cm = cellRe.exec(html)) !== null) {
    const tag = cm[0];
    const date = readAttr(tag, "data-date");
    const id = readAttr(tag, "id");
    const level = Math.min(4, Math.max(0, Number(readAttr(tag, "data-level") ?? 0)));
    const count = id && tooltipById.has(id) ? tooltipById.get(id) : null;
    days.set(date, { date, contributionCount: count ?? 0, contributionLevel: count === 0 ? 0 : level });
  }

  const sorted = Array.from(days.values()).sort((a, b) => a.date.localeCompare(b.date));
  const weeks = [];
  let current = [];
  for (const day of sorted) {
    const dow = new Date(`${day.date}T00:00:00Z`).getUTCDay();
    if (dow === 0 && current.length > 0) {
      weeks.push({ contributionDays: current });
      current = [];
    }
    current.push(day);
  }
  if (current.length > 0) weeks.push({ contributionDays: current });

  // Invariant: headline total === sum of rendered cells.
  const totalContributions = weeks.reduce(
    (sum, w) => sum + w.contributionDays.reduce((s, d) => s + d.contributionCount, 0),
    0
  );
  return { totalContributions, weeks };
}

function cleanReadmeText(raw) {
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
          readmeExcerpt = cleanReadmeText(Buffer.from(readmeJson.content || "", "base64").toString("utf8"));
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
