export interface MotionTokens {
  hoverMs: number;
  pressMs: number;
  enterMs: number;
  scrollMs: number;
  hoverSec: number;
  pressSec: number;
  enterSec: number;
  scrollSec: number;
  easeUi: string;
}

const DEFAULT_TOKENS: MotionTokens = {
  hoverMs: 160,
  pressMs: 120,
  enterMs: 280,
  scrollMs: 900,
  hoverSec: 0.16,
  pressSec: 0.12,
  enterSec: 0.28,
  scrollSec: 0.9,
  easeUi: "cubic-bezier(0.16, 1, 0.3, 1)",
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
 * Falls back to the shared UI ease-out curve from tokens.css.
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

  const hoverMs = parseCssDurationMs(styles.getPropertyValue("--duration-hover"), DEFAULT_TOKENS.hoverMs);
  const pressMs = parseCssDurationMs(styles.getPropertyValue("--duration-press"), DEFAULT_TOKENS.pressMs);
  const enterMs = parseCssDurationMs(styles.getPropertyValue("--duration-enter"), DEFAULT_TOKENS.enterMs);
  const scrollMs = parseCssDurationMs(styles.getPropertyValue("--duration-scroll"), DEFAULT_TOKENS.scrollMs);
  const easeUi = styles.getPropertyValue("--ease-ui").trim() || DEFAULT_TOKENS.easeUi;

  return {
    hoverMs,
    pressMs,
    enterMs,
    scrollMs,
    hoverSec: hoverMs / 1000,
    pressSec: pressMs / 1000,
    enterSec: enterMs / 1000,
    scrollSec: scrollMs / 1000,
    easeUi,
  };
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

