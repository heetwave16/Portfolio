# MASTER SPEC v0.7: Heet's Portfolio (Finish Plan)

Save as `docs/MASTER_SPEC.md` in the repo, replacing v0.5 and v0.6. Every agent chat must read this file. Status below is as reported by the build agent's logs on 19 Nov 2026; re-verify before relying on it.

## Opener for every agent chat (paste exactly)

```
Read docs/MASTER_SPEC.md fully. Build ONLY slice <ID>. Restate its acceptance criteria in 3 lines first. Stop when they pass. List what you did NOT do and anything you could not verify.
```

## 0. Rules (apply to every slice)

1. **Originality.** Borrow interaction mechanics only. Never reuse any reference site's headings, copy, section titles, scene sequence, layout proportions, colors, imagery or claims. Use only my tokens, my content file and my real data.
2. **No fabrication.** Never invent clients, testimonials, numbers, services, screenshots or copy. Missing content gets a clearly marked placeholder from `content.json`, and the slice report lists every placeholder.
3. **Secrets.** `GITHUB_TOKEN` lives only in server env (Vercel). Never in client code, logs or git. `.env*` is gitignored; `.env.example` is committed.
4. **Tokens.** All colors, sizes, durations and easings come from `src/styles/tokens.css`.
5. **Libraries.** Ask before adding any dependency.
6. **Scope.** Do not remove, redesign or refactor existing features. No unrelated changes. No new features outside the slice.
7. **Measurement honesty.** Headless-browser checks prove behavior, not smoothness. Do not claim "smooth" or "60fps" without a real-device or DevTools measurement, and say how a number was measured.
8. **One commit per slice**, message `slice <ID>: <summary>`.

## 1. Goal and audience

Portfolio for a 1st-year B.Tech CS (AI/ML) student, used for a college submission, internships, GSoC 2027 and hackathons.

Audience order: college evaluators, open-source mentors, internship recruiters, hackathon judges, freelance clients.

The one job: a visitor can reach Contact or Resume within 5 seconds from anywhere. Principle: evidence over claims.

## 2. Stack as built

- Next.js App Router, TypeScript, Tailwind CSS v4, GSAP (ScrollTrigger), Lenis, `next/font` (Bricolage Grotesque, Plus Jakarta Sans, JetBrains Mono).
- Data: `app/api/github/route.ts` + `src/lib/github-service.ts`. With `GITHUB_TOKEN`: GraphQL. Without: public REST fallback. On failure: `public/data/github-snapshot.json` (`npm run snapshot`).
- Content: `src/content/content.json`. Repo visibility: `src/content/repos.config.json` (hide, featured, mode, overrides, `excludeLanguages`, `languageAliases`, topics `portfolio-hide` / `portfolio-featured`).
- Theme: dark by default, light contrast bands (About, Contact) inverted against the active theme, site-wide LIGHT/DARK toggle (persisted in localStorage).
- Single page with plain `#name` anchors. Project detail drawer. No multi-page routing.

## 3. Palette and contrast

Midnight Violet `#210124`, Dark Teal `#0B3C49`, Scarlet Rush `#DF2A36` (single accent), Beige `#E6EED6`, Silver `#B3B6B7`. Ratio about 60% violet, 30% teal and beige, 10% scarlet.

- Scarlet on violet is about 4.1:1: no scarlet text under 24px. Use scarlet for large type, fills, icons, borders, focus rings.
- Text on scarlet fills is white. Never silver text on beige. On light sections: violet text, teal muted text.
- Check both themes whenever colors change.

## 4. Status

**Built and reported verified (headless):** shell (Lenis + ScrollTrigger, grid, nav, MENU, cursor), hero two-face reveal, What I build, GitHub Pulse (aligned heatmap), Projects (filters, sorting, hover preview, drawer), Open Source scoreboard ("N merged PRs outside my own repos"), About, Contact, Footer, motion pass, scroll-performance fixes, Lenis anchor scrolling, keyboard navigation, dark/light mode.

**Not verified or not done:**
- Smoothness on a real laptop and phone (the numbers so far came from headless Chromium without a GPU).
- Lighthouse on a deployed HTTPS URL.
- `GITHUB_TOKEN` GraphQL mode.
- Real project screenshots: every project shows "Screenshot coming".
- Live preview of deployed projects.
- Deployment, domain, share image, README, demo script.
- The temporary `?motion=off` bisect flag is still in the code.

## 5. Finish slices

### F0: Inputs from Heet (no agent)

See Section 6. Nothing below ships well without these.

### F1: Live preview auto-discovery

Files: `src/lib/github-service.ts`, `app/api/github/route.ts`, `scripts/snapshot.mjs`, `src/content/repos.config.json`, the preview pane in `src/components/ProjectsSection.tsx`.

1. Resolve each repo's live URL, first hit wins: `overrides[repo].liveUrl`, then repo `homepageUrl`, then the Production deployment `environmentUrl` (GraphQL `deployments`, only when a token is present). Verify field names against current GitHub docs and curl-test. Never guess URLs or scrape READMEs.
2. At revalidate/snapshot time, check each URL server-side: https only, no private IPs, 5s timeout, must be 200. Not embeddable if `X-Frame-Options` is DENY/SAMEORIGIN or CSP `frame-ancestors` excludes my domain. Store `liveUrl`, `status`, `embeddable`, `checkedAt` in the response and the snapshot. `previewIframe` stays as a manual override.
3. Preview tiers: live iframe if embeddable, else real screenshot, else the existing metadata card. Never iframe github.com.
4. Behavior: 250ms hover/focus intent, one iframe at a time, unmounted on leave; iframe rendered 1280x800 and scaled with `transform`; `pointer-events: none` while previewing; `loading="lazy"`, `sandbox="allow-scripts allow-same-origin allow-forms"`, `referrerpolicy="no-referrer"`, skeleton, 6s timeout falling back to the next tier. Touch: tap expands a panel with a "Visit live site" link. Esc and click-away close.
5. No layout reads per frame. No effect on scroll smoothness (verify with the existing `?motion=` flags).
6. Report which repos got which tier. Do not add Playwright; screenshots are supplied by Heet.

### F2: Ship prep

1. Remove the `?motion=off` bisect code, or gate it behind `process.env.NODE_ENV !== 'production'`.
2. Metadata: title, description, canonical, Open Graph and Twitter tags through the Next metadata API. A 1200x630 share image using only my name, tagline and palette (no invented claims). `robots.txt` and a sitemap. Favicon check.
3. Accessibility: skip-to-content link, landmarks (header, nav, main, footer), heading order, alt text, `aria-label` on icon buttons, visible focus in both themes. Report measured contrast for body text, muted text and the accent in both themes.
4. Content check: list every remaining placeholder, and confirm the resume PDF, email, LinkedIn and GitHub links all resolve.
5. Footer credits for fonts, icons and third-party assets.
6. README: what and why, stack, how GitHub data flows, env vars (works with and without a token), how to edit `repos.config.json`, how to run locally, screenshots section.
7. `npm run build` passes with no console errors; report the bundle size table.

### F3: Performance and accessibility loop

Heet supplies Lighthouse mobile results and FPS observations from the live URL (laptop and phone). The agent fixes only the top 3 offenders, then reports before/after. Targets: performance 85 or more, accessibility 90 or more, best practices and SEO 90 or more. No features added.

### F4: Standout layer (after submission is safe)

1. **Command palette** (Ctrl/Cmd+K). No new library unless Heet approves. Lists sections, featured projects (opens the drawer), resume, email, GitHub and the theme toggle. Focus trap, Esc closes, keyboard only, reduced-motion safe.
2. **Case-study drawer** for 2 flagship repos: problem, what I built, result, stack, real screenshots, what I would do next. Text comes from `content.json` only, with marked placeholders until Heet writes it.
3. **"Currently" strip:** latest commit from the GitHub data, plus "learning" and "seeking" lines from `content.json`.

### F5: Phase 2 hero (after submission)

Depth-displaced wireframe face in React Three Fiber, loaded only on desktop with a fine pointer, WebGL available and no reduced motion; otherwise the existing 2D reveal stays. Heet supplies `public/img/hero/portrait.webp` and `portrait-depth.webp`. Canvas sized to the portrait container, dpr [1, 1.5], `frameloop="demand"`, paused offscreen, disposed on unmount, no layout reads per frame, no `mix-blend-mode`. Hero text stays in the server-rendered HTML. Ask before installing `three`, `@react-three/fiber`, `@react-three/drei` and check versions against React and Next. Optional video (one 8-second muted clip, poster fallback, under about 4 MB) is a separate slice.
