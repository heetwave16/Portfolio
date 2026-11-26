import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseCssDurationMs } from "./motion";

const repoFile = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const tokenSheet = repoFile("src/styles/tokens.css");

function tokenValue(name: string): string {
  const match = tokenSheet.match(new RegExp(`${name}:\\s*([^;]+);`));
  assert.ok(match, `Expected ${name} in the central token sheet`);
  return match[1].trim();
}

function relativeLuminance(hex: string): number {
  const channels = hex.match(/[\da-f]{2}/gi);
  assert.equal(channels?.length, 3, `Expected a six-digit color: ${hex}`);
  const [r, g, b] = channels!.map((channel) => parseInt(channel, 16) / 255);
  const linear = [r, g, b].map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  );
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrastRatio(foreground: string, background: string): number {
  const [lighter, darker] = [relativeLuminance(foreground), relativeLuminance(background)].sort(
    (a, b) => b - a
  );
  return (lighter + 0.05) / (darker + 0.05);
}

test("E1 palette tokens match the approved light and dark palettes", () => {
  assert.equal(tokenValue("--palette-dark-ground"), "#170B1A");
  assert.equal(tokenValue("--palette-dark-surface"), "#231428");
  assert.equal(tokenValue("--palette-light-ground"), "#F4EFE6");
  assert.equal(tokenValue("--palette-light-surface"), "#EAE2D3");
  assert.equal(tokenValue("--palette-light-ink"), "#170B1A");
  assert.equal(tokenValue("--palette-light-muted"), "#5E4F63");
  assert.equal(tokenValue("--palette-dark-ink"), "#F4EFE6");
  assert.equal(tokenValue("--palette-dark-muted"), "#B9ABC0");
  assert.equal(tokenValue("--palette-light-accent"), "#B52338");
  assert.equal(tokenValue("--palette-dark-accent"), "#E2485B");
});

test("E1 type steps follow the documented 1.25 major-third ratio", () => {
  assert.equal(tokenValue("--type-ratio"), "1.25");
  const stepNames = [
    "--type-step--3",
    "--type-step--2",
    "--type-step--1",
    "--type-step-0",
    "--type-step-1",
    "--type-step-2",
    "--type-step-3",
    "--type-step-4",
    "--type-step-5",
    "--type-step-6",
    "--type-step-7",
    "--type-step-8",
    "--type-step-9",
  ];
  const steps = stepNames.map((name) => Number.parseFloat(tokenValue(name)));
  for (let index = 1; index < steps.length; index += 1) {
    assert.ok(Math.abs(steps[index] / steps[index - 1] - 1.25) < 1e-10, `${stepNames[index]} ratio`);
  }
});

test("E1 spacing and motion tokens stay within their documented scales", () => {
  assert.equal(tokenValue("--space-unit"), "0.25rem");
  assert.equal(tokenValue("--space-section-compact"), "clamp(2rem, 3vw, 2.5rem)");
  assert.equal(tokenValue("--space-section-standard"), "clamp(2.5rem, 4vw, 3.5rem)");
  assert.equal(tokenValue("--space-section-wide"), "clamp(3rem, 5vw, 4rem)");
  assert.equal(tokenValue("--space-section-handoff-before"), "2.1875rem");
  assert.equal(tokenValue("--space-section-handoff-after"), "2.25rem");

  assert.ok(parseCssDurationMs(tokenValue("--duration-hover"), 0) <= 200);
  assert.ok(parseCssDurationMs(tokenValue("--duration-press"), 0) <= 200);
  assert.ok(parseCssDurationMs(tokenValue("--duration-enter"), 0) <= 300);
  assert.equal((tokenSheet.match(/cubic-bezier\(/g) ?? []).length, 1);
  assert.equal((tokenSheet.match(/--elevation-1:/g) ?? []).length, 1);
});

test("specified red accents have reproducible contrast ratios and readable companions", () => {
  const lightAccent = tokenValue("--palette-light-accent");
  const lightGround = tokenValue("--palette-light-ground");
  const lightSurface = tokenValue("--palette-light-surface");
  const darkAccent = tokenValue("--palette-dark-accent");
  const darkGround = tokenValue("--palette-dark-ground");
  const darkSurface = tokenValue("--palette-dark-surface");

  assert.equal(contrastRatio(lightAccent, lightGround).toFixed(2), "5.62");
  assert.equal(contrastRatio(lightAccent, lightSurface).toFixed(2), "5.00");
  assert.equal(contrastRatio(darkAccent, darkGround).toFixed(2), "4.83");
  assert.equal(contrastRatio(darkAccent, darkSurface).toFixed(2), "4.42");
  assert.ok(contrastRatio(tokenValue("--accent-text"), darkSurface) >= 4.5);
  assert.ok(contrastRatio("#FFFFFF", lightAccent) >= 4.5);
  assert.ok(contrastRatio(darkGround, darkAccent) >= 4.5);
});

test("heading markup keeps literal spaces and the About spacing limit", () => {
  const about = repoFile("src/components/AboutSection.tsx");
  const hero = repoFile("src/components/HeroSection.tsx");
  const revealText = repoFile("src/components/RevealText.tsx");
  const content = repoFile("src/content/content.json");

  assert.match(about, /letterSpacing:\s*"-0\.025em"/);
  assert.match(about, /wordSpacing:\s*"0\.04em"/);
  assert.match(hero, /\{hero\.firstName\}[\s\S]*?\{\" \"\}[\s\S]*?\{hero\.lastName\}/);
  assert.equal((hero.match(/className="hero-cta /g) ?? []).length, 2);
  assert.match(hero, /hero\.positioning/);
  assert.match(revealText, /splitTextWithWhitespace\(text\)/);
  assert.doesNotMatch(hero, /SocialLinks|wireframeHint|proof-link|eyebrow/);
  assert.doesNotMatch(content, /wireframeHint/);
});

test("theme-color metadata uses the ground colors", () => {
  const layout = repoFile("app/layout.tsx");
  const manifest = repoFile("public/site.webmanifest");
  assert.match(layout, /prefers-color-scheme: dark[^\n]*#170B1A/);
  assert.match(layout, /prefers-color-scheme: light[^\n]*#F4EFE6/);
  assert.match(manifest, /"background_color": "#170B1A"/);
  assert.match(manifest, /"theme_color": "#170B1A"/);
});
