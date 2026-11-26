# Heet Mehta — Portfolio (`heetwave16`)

Personal engineering portfolio for a 1st-year CS (AI/ML) student, built with Next.js App Router, Tailwind CSS v4, GSAP (ScrollTrigger), Lenis, and live GitHub data.

## Architecture & Data Flow

1. **Design Tokens (`src/styles/tokens.css`)**: Single source of truth for the dark plum / warm paper palettes, semantic colors, a 1.25 major-third type scale, 4px spacing unit and section paddings, one ease-out motion curve, interaction/entrance timing, and shared elevation.
2. **Content & Repo Config**:
   - `src/content/content.json` holds all editorial copy and bio variations (`short`, `medium`, `detailed`).
   - `src/content/repos.config.json` controls repository visibility (`mode`, `includeForks`, `includeArchived`, `hide`, `featured`, and `overrides`).
3. **GitHub API Route (`app/api/github/route.ts`)**:
   - Reads optional `GITHUB_TOKEN` from server environment variables (never exposed to the browser) to query GitHub GraphQL.
   - Falls back to live public GitHub REST + contributions HTML when `GITHUB_TOKEN` is unset.
   - Falls back to `public/data/github-snapshot.json` if GitHub is unreachable or rate-limited (`?fallback=1` tests this path deterministically).

## Local Development

```bash
npm install
npm run snapshot   # Optional: refresh public/data/github-snapshot.json
npm run dev        # Starts on http://localhost:3000
```

## Verification

```bash
npx --yes tsx --test src/lib/github-transform.test.ts
npm run lint
npm run build
```
