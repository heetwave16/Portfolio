export interface MotionTokens {
  fastMs: number;
  baseMs: number;
  slowMs: number;
  introMs: number;
  countMs: number;
  wipeMs: number;
  fastSec: number;
  baseSec: number;
  slowSec: number;
  introSec: number;
  countSec: number;
  wipeSec: number;
  easeOutExpo: string;
  easeSnappy: string;
  easeInOut: string;
}

export const INTRO_SESSION_KEY = "hm_portfolio_intro_played";

const DEFAULT_TOKENS: MotionTokens = {
  fastMs: 200,
  baseMs: 400,
  slowMs: 800,
  introMs: 700,
  countMs: 900,
  wipeMs: 750,
  fastSec: 0.2,
  baseSec: 0.4,
  slowSec: 0.8,
  introSec: 0.7,
  countSec: 0.9,
  wipeSec: 0.75,
  easeOutExpo: "cubic-bezier(0.16, 1, 0.3, 1)",
  easeSnappy: "cubic-bezier(0.22, 1, 0.36, 1)",
  easeInOut: "cubic-bezier(0.65, 0, 0.35, 1)",
};

export function parseCssDurationMs(raw: string | null | undefined, fallbackMs: number): number {
  if (!raw) return fallbackMs;
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return fallbackMs;
  if (trimmed.endsWith("ms")) {
    const n = Number.parseFloat(trimmed.slice(0, -2));
    return Number.isFinite(n) && n >= 0 ? n : fallbackMs;
  }
  if (trimmed.endsWith("s")) {
    const n = Number.parseFloat(trimmed.slice(0, -1));
    return Number.isFinite(n) && n >= 0 ? n * 1000 : fallbackMs;
  }
  const n = Number.parseFloat(trimmed);
  return Number.isFinite(n) && n >= 0 ? n : fallbackMs;
}

/**
 * Converts a CSS cubic-bezier(...) string into a JS easing function f(t) for GSAP.
 * Falls back to an exponential ease-out curve matching --ease-out-expo.
 */
export function createBezierEase(cssEase: string): (t: number) => number {
  const match = cssEase.match(/cubic-bezier\(\s*([\d.-]+)\s*,\s*([\d.-]+)\s*,\s*([\d.-]+)\s*,\s*([\d.-]+)\s*\)/i);
  if (!match) {
    return (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));
  }
  const x1 = Number.parseFloat(match[1]);
  const y1 = Number.parseFloat(match[2]);
  const x2 = Number.parseFloat(match[3]);
  const y2 = Number.parseFloat(match[4]);

  const sampleCurveX = (t: number) => ((1 - 3 * x2 + 3 * x1) * t + (3 * x2 - 6 * x1)) * t * t + 3 * x1 * t;
  const sampleCurveY = (t: number) => ((1 - 3 * y2 + 3 * y1) * t + (3 * y2 - 6 * y1)) * t * t + 3 * y1 * t;
  const sampleCurveDerivX = (t: number) => (3 * (1 - 3 * x2 + 3 * x1) * t + 2 * (3 * x2 - 6 * x1)) * t + 3 * x1;

  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 6; i++) {
      const xEst = sampleCurveX(t) - x;
      const dEst = sampleCurveDerivX(t);
      if (Math.abs(xEst) < 1e-5) break;
      if (Math.abs(dEst) < 1e-6) break;
      t = Math.max(0, Math.min(1, t - xEst / dEst));
    }
    return sampleCurveY(t);
  };
}

export function getMotionTokens(): MotionTokens {
  if (typeof window === "undefined") return DEFAULT_TOKENS;
  const styles = getComputedStyle(document.documentElement);

  const fastMs = parseCssDurationMs(styles.getPropertyValue("--duration-fast"), DEFAULT_TOKENS.fastMs);
  const baseMs = parseCssDurationMs(styles.getPropertyValue("--duration-base"), DEFAULT_TOKENS.baseMs);
  const slowMs = parseCssDurationMs(styles.getPropertyValue("--duration-slow"), DEFAULT_TOKENS.slowMs);
  const introMs = parseCssDurationMs(styles.getPropertyValue("--duration-intro"), DEFAULT_TOKENS.introMs);
  const countMs = parseCssDurationMs(styles.getPropertyValue("--duration-count"), DEFAULT_TOKENS.countMs);
  const wipeMs = parseCssDurationMs(styles.getPropertyValue("--duration-wipe"), DEFAULT_TOKENS.wipeMs);

  const easeOutExpo = styles.getPropertyValue("--ease-out-expo").trim() || DEFAULT_TOKENS.easeOutExpo;
  const easeSnappy = styles.getPropertyValue("--ease-snappy").trim() || DEFAULT_TOKENS.easeSnappy;
  const easeInOut = styles.getPropertyValue("--ease-in-out").trim() || DEFAULT_TOKENS.easeInOut;

  return {
    fastMs,
    baseMs,
    slowMs,
    introMs,
    countMs,
    wipeMs,
    fastSec: fastMs / 1000,
    baseSec: baseMs / 1000,
    slowSec: slowMs / 1000,
    introSec: introMs / 1000,
    countSec: countMs / 1000,
    wipeSec: wipeMs / 1000,
    easeOutExpo,
    easeSnappy,
    easeInOut,
  };
}

export function shouldPlayIntro(reducedMotion: boolean, alreadyPlayed: boolean): boolean {
  return !reducedMotion && !alreadyPlayed;
}

export function computeHeatmapWaveDelayMs(
  weekIndex: number,
  dayIndex: number,
  totalWeeks: number,
  baseDelayCapMs = 420
): number {
  const safeWeeks = Math.max(1, totalWeeks);
  const weekProgress = Math.max(0, Math.min(1, weekIndex / Math.max(1, safeWeeks - 1)));
  const rowOffset = Math.max(0, dayIndex) * 22;
  const raw = Math.round(weekProgress * (baseDelayCapMs - 140) + rowOffset);
  return Math.max(0, Math.min(baseDelayCapMs, raw));
}

export function computeScrollProgress(scrollY: number, scrollHeight: number, innerHeight: number): number {
  const maxScroll = Math.max(0, scrollHeight - innerHeight);
  if (maxScroll <= 0) return 0;
  return Math.max(0, Math.min(1, scrollY / maxScroll));
}

export function computeScrollProgressPercent(ratio: number): number {
  if (!Number.isFinite(ratio)) return 0;
  return Math.round(Math.max(0, Math.min(1, ratio)) * 100);
}

export const MOTION_BISECT_GROUPS = [
  "lenis",
  "scrollProgress",
  "wipe",
  "heatmap",
  "reveals",
  "cursor",
  "hoverThumb",
] as const;

export type MotionBisectGroup = (typeof MOTION_BISECT_GROUPS)[number];

export type MotionDisabledFlags = Record<MotionBisectGroup, boolean>;

export const ALL_MOTION_ENABLED: MotionDisabledFlags = {
  lenis: false,
  scrollProgress: false,
  wipe: false,
  heatmap: false,
  reveals: false,
  cursor: false,
  hoverThumb: false,
};

/**
 * Parses URL query flags for performance bisection:
 * - ?motion=off disables all groups (can selectively re-enable via &lenis=on)
 * - ?motion=off:lenis,wipe or ?motion=lenis,wipe disables only the listed groups
 * - ?<group>=off (e.g. ?lenis=off&wipe=off) disables individual groups
 */
export function parseMotionBisectFlags(search: string): MotionDisabledFlags {
  const flags: MotionDisabledFlags = { ...ALL_MOTION_ENABLED };
  if (!search) return flags;

  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const motionParam = params.get("motion");

  if (motionParam) {
    const normalized = motionParam.trim();
    if (normalized === "off" || normalized === "0" || normalized === "false") {
      for (const group of MOTION_BISECT_GROUPS) {
        flags[group] = true;
      }
    } else {
      const listPart = normalized.startsWith("off:") ? normalized.slice(4) : normalized;
      const requested = listPart
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      for (const item of requested) {
        const match = MOTION_BISECT_GROUPS.find((g) => g.toLowerCase() === item.toLowerCase());
        if (match) {
          flags[match] = true;
        }
      }
    }
  }

  for (const group of MOTION_BISECT_GROUPS) {
    const val = params.get(group);
    if (val === "off" || val === "0" || val === "false") {
      flags[group] = true;
    } else if (val === "on" || val === "1" || val === "true") {
      flags[group] = false;
    }
  }

  return flags;
}

