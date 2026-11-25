"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUpRight, FileDown, ScanEye } from "lucide-react";
import content from "@/src/content/content.json";
import { SITE_CONFIG } from "@/src/config";
import { activateAnchorOnSpace } from "@/src/lib/keyboard";
import { onIntroComplete } from "@/src/lib/boot";
import { useLenisScroll } from "./ShellProviders";
import Magnetic from "./Magnetic";
import SocialLinks from "./SocialLinks";

/**
 * Optional 8s muted scrollytelling clip. Drop an MP4/WebM at /public/img/hero/hero.mp4 and
 * set HERO_VIDEO_SRC = "/img/hero/hero.mp4" to drive <video>.currentTime via the same
 * rAF + lerp(0.12) + readyState/duration/delta-threshold scrubber contract below.
 */
const HERO_VIDEO_SRC = "";
const TOTAL_FRAMES = 120;

/* ----------------------------- math helpers ----------------------------- */
const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smoothstep = (e0: number, e1: number, x: number) => {
  if (e1 === e0) return x >= e1 ? 1 : 0;
  const t = clamp((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};
const pad = (n: number, len = 3) => String(Math.max(0, Math.round(n))).padStart(len, "0");

/**
 * Chapter envelope across normalized scroll p in [0, 1].
 * Chapter 01 starts 100% sharp at p = 0; Chapter 04 stays 100% sharp through p = 1.
 * Transitions cross-dissolve smoothly across 0.10 windows around 0.25 / 0.50 / 0.75.
 */
const CHAPTER_CUTS = [0.25, 0.5, 0.75] as const;
const DISSOLVE_HALF = 0.055;

function computeChapterState(p: number, index: number): { act: number; offsetY: number } {
  const enterIn = index === 0 ? 1 : smoothstep(CHAPTER_CUTS[index - 1] - DISSOLVE_HALF, CHAPTER_CUTS[index - 1] + DISSOLVE_HALF, p);
  const exitOut =
    index === 3 ? 0 : smoothstep(CHAPTER_CUTS[index] - DISSOLVE_HALF, CHAPTER_CUTS[index] + DISSOLVE_HALF, p);
  const act = clamp(enterIn * (1 - exitOut));
  // Incoming rises from +12px -> 0; outgoing drifts 0 -> -10px
  const enterOffset = (1 - enterIn) * 12;
  const exitOffset = -exitOut * 10;
  return { act, offsetY: enterOffset + exitOffset };
}

/** Automatic mesh engagement during Chapter 03 ("Under the Hood", p ~ 0.50..0.75) */
function chapterThreeMeshEnvelope(p: number): number {
  const rise = smoothstep(0.45, 0.55, p);
  const fall = 1 - smoothstep(0.73, 0.83, p);
  return clamp(rise * fall);
}

/* --------- Calibrated 300x400 CV topology registered to portrait-real.jpg -------- */
interface CvPath {
  d: string;
  phase: number; // 0..0.45 stagger start within [0, 1] draw progress
  weight?: number;
  opacity?: number;
}

const CV_PATHS: CvPath[] = [
  // Phase 0: Ocular & nasal core landmarks
  { d: "M 127 110 Q 136 105 144 110 Q 136 114 127 110 Z", phase: 0.0, opacity: 0.95 },
  { d: "M 158 108 Q 167 103 176 108 Q 167 112 158 108 Z", phase: 0.02, opacity: 0.95 },
  { d: "M 123 102 Q 135 97 146 102", phase: 0.04, opacity: 0.85 },
  { d: "M 156 101 Q 169 96 183 101", phase: 0.05, opacity: 0.85 },
  { d: "M 151 94 L 151 109 L 150 129 L 151 143", phase: 0.06, opacity: 0.9 },
  { d: "M 144 110 L 151 109 L 158 108", phase: 0.07, opacity: 0.8 },
  { d: "M 151 109 L 141 131 L 150 133 L 160 130 L 151 109", phase: 0.09, opacity: 0.85 },

  // Phase 1: Oral & zygomatic triangulation
  { d: "M 139 146 Q 151 142 164 145 Q 152 152 139 146 Z", phase: 0.12, opacity: 0.9 },
  { d: "M 127 110 L 122 124 L 141 131 L 136 114", phase: 0.14, opacity: 0.72 },
  { d: "M 176 108 L 186 121 L 160 130 L 167 112", phase: 0.15, opacity: 0.72 },
  { d: "M 122 124 L 139 146 L 141 131", phase: 0.17, opacity: 0.68 },
  { d: "M 186 121 L 164 145 L 160 130", phase: 0.18, opacity: 0.68 },

  // Phase 2: Cranial dome, hairline & jaw contour
  { d: "M 120 112 L 118 86 L 133 76 L 151 75 L 171 76 L 188 85 L 193 110", phase: 0.2, opacity: 0.78 },
  { d: "M 133 76 L 135 98 L 151 94 L 169 97 L 171 76", phase: 0.22, opacity: 0.65 },
  { d: "M 151 75 L 151 94", phase: 0.23, opacity: 0.65 },
  { d: "M 118 86 Q 122 46 153 41 Q 190 45 196 84", phase: 0.25, opacity: 0.62 },
  { d: "M 120 112 L 124 142 L 135 159 L 152 167 L 172 158 L 187 139 L 193 110", phase: 0.26, opacity: 0.88 },
  { d: "M 139 146 L 135 159 M 151 151 L 152 167 M 164 145 L 172 158", phase: 0.28, opacity: 0.68 },
  { d: "M 122 124 L 124 142 M 186 121 L 187 139", phase: 0.29, opacity: 0.65 },

  // Phase 3: Neck, collar & shoulder structural mesh
  { d: "M 137 161 L 136 186 L 153 206 L 178 182 L 175 156", phase: 0.32, opacity: 0.72 },
  { d: "M 136 186 L 96 208 L 76 286", phase: 0.35, opacity: 0.65 },
  { d: "M 178 182 L 240 198 L 260 284", phase: 0.36, opacity: 0.65 },
  { d: "M 96 208 L 130 226 L 153 206 L 184 222 L 240 198", phase: 0.38, opacity: 0.55 },
  { d: "M 153 206 L 148 264 L 145 332", phase: 0.4, opacity: 0.55 },
  { d: "M 130 226 L 114 304 L 148 264 L 194 298 L 184 222", phase: 0.42, opacity: 0.46 },
];

const CV_NODES = [
  { x: 136, y: 110, tag: "OCULAR_L" },
  { x: 167, y: 108, tag: "OCULAR_R" },
  { x: 150, y: 129, tag: "APEX" },
  { x: 152, y: 167, tag: "MENTON" },
];

const BEZEL_CORNERS = [
  { x: 14, y: 14 },
  { x: 286, y: 14 },
  { x: 14, y: 386 },
  { x: 286, y: 386 },
];

/**
 * Precomputes an offscreen 300x400 Sobel edge-contour buffer directly from portrait-real.jpg
 * using identical object-cover geometry, guaranteeing 1:1 pixel registration with the subject.
 */
function buildSobelContourCanvas(img: HTMLImageElement): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;
  const W = 300;
  const H = 400;
  const srcCanvas = document.createElement("canvas");
  srcCanvas.width = W;
  srcCanvas.height = H;
  const sctx = srcCanvas.getContext("2d", { willReadFrequently: true });
  if (!sctx) return null;

  const iw = img.naturalWidth || W;
  const ih = img.naturalHeight || H;
  const scale = Math.max(W / iw, H / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  sctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);

  let imgData: ImageData;
  try {
    imgData = sctx.getImageData(0, 0, W, H);
  } catch {
    return null;
  }

  const src = imgData.data;
  const lum = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) {
    const o = i * 4;
    lum[i] = 0.299 * src[o] + 0.587 * src[o + 1] + 0.114 * src[o + 2];
  }

  const outCanvas = document.createElement("canvas");
  outCanvas.width = W;
  outCanvas.height = H;
  const octx = outCanvas.getContext("2d");
  if (!octx) return null;

  const outImg = octx.createImageData(W, H);
  const dst = outImg.data;

  // Midnight Violet (#18011B) base + Beige (#E6EED6) Sobel luminance contours
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const idx = y * W + x;
      const tl = lum[idx - W - 1];
      const tc = lum[idx - W];
      const tr = lum[idx - W + 1];
      const ml = lum[idx - 1];
      const mr = lum[idx + 1];
      const bl = lum[idx + W - 1];
      const bc = lum[idx + W];
      const br = lum[idx + W + 1];

      const gx = -tl + tr - 2 * ml + 2 * mr - bl + br;
      const gy = -tl - 2 * tc - tr + bl + 2 * bc + br;
      const mag = Math.hypot(gx, gy);
      const edge = clamp((mag - 26) / 145, 0, 1);

      const o = idx * 4;
      dst[o] = Math.round(lerp(24, 230, edge));
      dst[o + 1] = Math.round(lerp(2, 238, edge));
      dst[o + 2] = Math.round(lerp(28, 214, edge));
      dst[o + 3] = 255;
    }
  }

  octx.putImageData(outImg, 0, 0);
  return outCanvas;
}

export default function HeroSection() {
  const { scrollToAnchor } = useLenisScroll();
  const runwayRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const cameraPlaneRef = useRef<HTMLDivElement>(null);
  const bezelHudRef = useRef<SVGSVGElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const meshGroupRef = useRef<SVGGElement>(null);
  const pathElsRef = useRef<Array<SVGPathElement | null>>([]);
  const nodeGroupRef = useRef<SVGGElement>(null);
  const scanLineRef = useRef<SVGLineElement>(null);
  const frameReadoutRef = useRef<HTMLSpanElement>(null);
  const chapterReadoutRef = useRef<HTMLSpanElement>(null);
  const progressFillRef = useRef<HTMLDivElement>(null);
  const chapterBlocksRef = useRef<Array<HTMLDivElement | null>>([]);

  const [wireframeActive, setWireframeActive] = useState(false);
  const [portraitHover, setPortraitHover] = useState(false);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const [activeChapter, setActiveChapter] = useState(0);
  const [portraitFailed, setPortraitFailed] = useState(false);

  // Non-reactive engine state so rAF never closes over stale React renders
  const wireframeActiveRef = useRef(false);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const sobelRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 });

  const currentPRef = useRef(0);
  const targetPRef = useRef(0);
  const currentMeshRef = useRef(0);
  const currentPxRef = useRef(0);
  const currentPyRef = useRef(0);
  const targetPxRef = useRef(0);
  const targetPyRef = useRef(0);

  const reducedRef = useRef(false);
  const inViewportRef = useRef(true);
  const rafRef = useRef(0);
  const runningRef = useRef(false);
  const lastChapterRef = useRef(0);

  /* ----------------------------- canvas sizing ---------------------------- */
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;
    const rect = wrapper.getBoundingClientRect();
    const dpr = Math.min(2, typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1);
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctxRef.current = ctx;
    }
    sizeRef.current = { w, h, dpr };
  }, []);

  /* ----------------------------- portrait draw ---------------------------- */
  const drawPortrait = useCallback((p: number, meshMix: number) => {
    const ctx = ctxRef.current;
    const img = imgRef.current;
    if (!ctx) return;
    const { w, h } = sizeRef.current;
    if (w <= 0 || h <= 0) return;

    ctx.clearRect(0, 0, w, h);

    // High-craft poster base gradient (never flashes blank while frames buffer)
    const base = ctx.createLinearGradient(0, 0, 0, h);
    base.addColorStop(0, "#0B3C49");
    base.addColorStop(1, "#210124");
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);

    if (!img || !img.complete || !img.naturalWidth) {
      ctx.save();
      ctx.globalAlpha = 0.92;
      ctx.fillStyle = "#E6EED6";
      ctx.font = `700 ${Math.round(w * 0.2)}px "Bricolage Grotesque", system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(SITE_CONFIG.monogram, w / 2, h / 2 - w * 0.04);
      ctx.font = `500 ${Math.max(10, Math.round(w * 0.033))}px "JetBrains Mono", ui-monospace, monospace`;
      ctx.fillStyle = "rgba(230,238,214,0.6)";
      ctx.fillText("STAGE READY // BUFFERING", w / 2, h / 2 + w * 0.14);
      ctx.restore();
      return;
    }

    // Exact 1:1 object-cover match to <svg viewBox="0 0 300 400" preserveAspectRatio="xMidYMid slice">
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    const cover = Math.max(w / iw, h / ih);
    const dw = iw * cover;
    const dh = ih * cover;
    const dx = (w - dw) / 2;
    const dy = (h - dh) / 2;
    ctx.drawImage(img, dx, dy, dw, dh);

    // Pixel-locked Sobel topological contour crossfade when mesh engages
    const sobel = sobelRef.current;
    const contourAlpha = smoothstep(0.02, 0.9, meshMix) * 0.84;
    if (sobel && contourAlpha > 0.005) {
      ctx.save();
      ctx.globalAlpha = contourAlpha;
      ctx.drawImage(sobel, 0, 0, w, h);
      ctx.restore();
    }

    // Subtle scroll-reactive editorial vignette
    const vg = ctx.createRadialGradient(
      w * 0.5,
      h * (0.34 - 0.04 * p),
      h * 0.16,
      w * 0.5,
      h * 0.5,
      h * 0.78
    );
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, `rgba(12,1,15,${(0.46 + 0.18 * p).toFixed(3)})`);
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
  }, []);

  /* ------------------------------- renderer ------------------------------- */
  const render = useCallback(
    (p: number, meshMix: number, px: number, py: number) => {
      const reduced = reducedRef.current;

      // 1. Video scrubbing (strict readyState, finite duration, and >= 0.02s delta guards)
      const video = videoRef.current;
      let videoPainted = false;
      if (video && HERO_VIDEO_SRC) {
        if (video.readyState >= 2 && Number.isFinite(video.duration) && video.duration > 0) {
          videoPainted = true;
          const targetTime = clamp(p) * video.duration;
          if (Math.abs(targetTime - video.currentTime) >= 0.02) {
            try {
              video.currentTime = targetTime;
            } catch {
              /* ignore transient unbuffered seek */
            }
          }
        }
      }
      if (!videoPainted) {
        drawPortrait(p, meshMix);
      }

      // 2. Shared camera plane transform (locks portrait + CV mesh 1:1 with +/-6px parallax)
      if (cameraPlaneRef.current) {
        if (reduced) {
          cameraPlaneRef.current.style.transform = "none";
        } else {
          const scale = 1.025 + 0.065 * p;
          const tx = px * 6;
          const ty = py * 6;
          cameraPlaneRef.current.style.transform = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`;
        }
      }

      // Subtle counter-parallax on outer bezel registration marks (+/-2.5px)
      if (bezelHudRef.current) {
        bezelHudRef.current.style.transform = reduced
          ? "none"
          : `translate3d(${(-px * 2.5).toFixed(2)}px, ${(-py * 2.5).toFixed(2)}px, 0)`;
      }

      // 3. Animated stroke-dashoffset across calibrated 0.75px CV vector paths
      if (meshGroupRef.current) {
        meshGroupRef.current.style.opacity = clamp(meshMix * 1.15).toFixed(3);
      }
      for (let i = 0; i < CV_PATHS.length; i++) {
        const el = pathElsRef.current[i];
        if (!el) continue;
        const spec = CV_PATHS[i];
        const localProgress = reduced
          ? meshMix > 0.5
            ? 1
            : 0
          : clamp((meshMix - spec.phase) / (1 - spec.phase));
        el.style.strokeDashoffset = (1 - localProgress).toFixed(3);
      }
      if (nodeGroupRef.current) {
        const nodeAlpha = smoothstep(0.35, 0.88, meshMix);
        nodeGroupRef.current.style.opacity = nodeAlpha.toFixed(3);
      }
      if (scanLineRef.current) {
        const scanAlpha = Math.sin(clamp(meshMix) * Math.PI) * 0.55 + (meshMix > 0.85 ? 0.22 : 0);
        const scanY = 36 + ((p * 2.4 + meshMix * 0.6) % 1) * 328;
        scanLineRef.current.setAttribute("y1", scanY.toFixed(1));
        scanLineRef.current.setAttribute("y2", scanY.toFixed(1));
        scanLineRef.current.style.opacity = reduced ? "0" : scanAlpha.toFixed(3);
      }

      // 4. Chapter sync (01 -> 04) with opacity + translateY + blur(4px -> 0px)
      let dominantIdx = 0;
      let dominantAct = -1;
      chapterBlocksRef.current.forEach((el, idx) => {
        if (!el) return;
        if (reduced) {
          const activeIdx = Math.min(3, Math.floor(p * 4));
          const isCurrent = idx === activeIdx;
          el.style.opacity = isCurrent ? "1" : "0";
          el.style.transform = "translate3d(0, 0, 0)";
          el.style.filter = "none";
          if (isCurrent) {
            dominantIdx = idx;
            el.removeAttribute("aria-hidden");
          } else {
            el.setAttribute("aria-hidden", "true");
          }
          return;
        }

        const { act, offsetY } = computeChapterState(p, idx);
        if (act > dominantAct) {
          dominantAct = act;
          dominantIdx = idx;
        }
        el.style.opacity = act.toFixed(3);
        el.style.transform = `translate3d(0, ${offsetY.toFixed(2)}px, 0)`;
        el.style.filter = act > 0.985 ? "none" : `blur(${((1 - act) * 4).toFixed(2)}px)`;
        el.style.pointerEvents = act > 0.6 ? "auto" : "none";
        if (act < 0.5) el.setAttribute("aria-hidden", "true");
        else el.removeAttribute("aria-hidden");
      });

      if (dominantIdx !== lastChapterRef.current) {
        lastChapterRef.current = dominantIdx;
        setActiveChapter(dominantIdx);
      }

      // 5. Monospace HUD telemetry & scroll rail
      const frameIndex = Math.round(clamp(p) * TOTAL_FRAMES);
      const meshStatus = meshMix > 0.45 ? "MESH_ACTIVE" : "STANDBY";
      if (frameReadoutRef.current) {
        frameReadoutRef.current.textContent = `FRAME ${pad(frameIndex)} // ${meshStatus}`;
      }
      if (chapterReadoutRef.current) {
        const ch = content.hero.chapters[dominantIdx] ?? content.hero.chapters[0];
        chapterReadoutRef.current.textContent = `${ch.index} / 04 · ${ch.label.toUpperCase()}`;
      }
      if (progressFillRef.current) {
        progressFillRef.current.style.transform = `scaleX(${clamp(p).toFixed(4)})`;
      }
    },
    [drawPortrait]
  );

  /* ------------------------------- engine loop ---------------------------- */
  const computeTargetProgress = useCallback(() => {
    const runway = runwayRef.current;
    if (!runway || typeof window === "undefined") return 0;
    const rect = runway.getBoundingClientRect();
    const vh = window.innerHeight || 800;
    const total = rect.height - vh;
    if (total <= 0) return 0;
    return clamp(-rect.top / total, 0, 1);
  }, []);

  const stopLoop = useCallback(() => {
    runningRef.current = false;
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
  }, []);

  const stepFrameRef = useRef<() => void>(() => {});

  const stepFrame = useCallback(() => {
    const reduced = reducedRef.current;
    const targetP = computeTargetProgress();
    targetPRef.current = targetP;

    const prevP = currentPRef.current;
    const nextP = reduced
      ? targetP
      : Math.abs(targetP - prevP) < 0.0004
        ? targetP
        : lerp(prevP, targetP, 0.12);
    currentPRef.current = nextP;

    const targetMesh = wireframeActiveRef.current ? 1 : chapterThreeMeshEnvelope(nextP);
    const prevMesh = currentMeshRef.current;
    const nextMesh = reduced
      ? targetMesh
      : Math.abs(targetMesh - prevMesh) < 0.0006
        ? targetMesh
        : lerp(prevMesh, targetMesh, 0.12);
    currentMeshRef.current = nextMesh;

    const prevPx = currentPxRef.current;
    const prevPy = currentPyRef.current;
    const nextPx = reduced
      ? 0
      : Math.abs(targetPxRef.current - prevPx) < 0.001
        ? targetPxRef.current
        : lerp(prevPx, targetPxRef.current, 0.14);
    const nextPy = reduced
      ? 0
      : Math.abs(targetPyRef.current - prevPy) < 0.001
        ? targetPyRef.current
        : lerp(prevPy, targetPyRef.current, 0.14);
    currentPxRef.current = nextPx;
    currentPyRef.current = nextPy;

    render(nextP, nextMesh, nextPx, nextPy);

    const settled =
      nextP === targetP &&
      nextMesh === targetMesh &&
      nextPx === targetPxRef.current &&
      nextPy === targetPyRef.current;

    if (settled || !inViewportRef.current) {
      runningRef.current = false;
      rafRef.current = 0;
      return;
    }

    rafRef.current = requestAnimationFrame(() => stepFrameRef.current());
  }, [computeTargetProgress, render]);

  useEffect(() => {
    stepFrameRef.current = stepFrame;
  }, [stepFrame]);

  const wakeLoop = useCallback(() => {
    if (reducedRef.current) {
      const p = computeTargetProgress();
      currentPRef.current = p;
      const m = wireframeActiveRef.current ? 1 : chapterThreeMeshEnvelope(p);
      currentMeshRef.current = m;
      render(p, m, 0, 0);
      return;
    }
    if (runningRef.current || !inViewportRef.current) return;
    runningRef.current = true;
    rafRef.current = requestAnimationFrame(stepFrame);
  }, [computeTargetProgress, render, stepFrame]);

  useEffect(() => {
    wireframeActiveRef.current = wireframeActive || portraitHover;
    wakeLoop();
  }, [wireframeActive, portraitHover, wakeLoop]);

  // Masked word-by-word headline reveal, started as the preloader curtain lifts.
  useEffect(() => {
    return onIntroComplete(() => {
      requestAnimationFrame(() =>
        requestAnimationFrame(() => headlineRef.current?.setAttribute("data-revealed", ""))
      );
    });
  }, []);

  /* --------------------------------- setup -------------------------------- */
  useEffect(() => {
    const mql =
      typeof window !== "undefined"
        ? window.matchMedia("(prefers-reduced-motion: reduce)")
        : null;
    reducedRef.current = Boolean(mql?.matches);

    const onMotionPrefChange = (e: MediaQueryListEvent) => {
      reducedRef.current = e.matches;
      if (e.matches) stopLoop();
      wakeLoop();
    };
    mql?.addEventListener("change", onMotionPrefChange);

    // Load portrait & bake 1:1 Sobel contour map once
    let cancelled = false;
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      if (cancelled) return;
      imgRef.current = img;
      sobelRef.current = buildSobelContourCanvas(img);
      render(currentPRef.current, currentMeshRef.current, currentPxRef.current, currentPyRef.current);
    };
    img.onerror = () => {
      if (!cancelled) setPortraitFailed(true);
    };
    img.src = "/img/hero/portrait-real.jpg";
    imgRef.current = img;

    resizeCanvas();

    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            resizeCanvas();
            render(
              currentPRef.current,
              currentMeshRef.current,
              currentPxRef.current,
              currentPyRef.current
            );
          })
        : null;
    if (ro && wrapperRef.current) ro.observe(wrapperRef.current);

    const onResize = () => {
      resizeCanvas();
      wakeLoop();
    };

    const onScroll = () => {
      wakeLoop();
    };

    const onPointerMove = (e: PointerEvent) => {
      if (reducedRef.current || e.pointerType !== "mouse") return;
      const el = wrapperRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const padBounds = 48;
      if (
        e.clientX < rect.left - padBounds ||
        e.clientX > rect.right + padBounds ||
        e.clientY < rect.top - padBounds ||
        e.clientY > rect.bottom + padBounds
      ) {
        if (targetPxRef.current !== 0 || targetPyRef.current !== 0) {
          targetPxRef.current = 0;
          targetPyRef.current = 0;
          wakeLoop();
        }
        return;
      }
      targetPxRef.current = clamp(((e.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1, -1, 1);
      targetPyRef.current = clamp(((e.clientY - rect.top) / Math.max(1, rect.height)) * 2 - 1, -1, 1);
      wakeLoop();
    };

    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointermove", onPointerMove, { passive: true });

    const io =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(
            (entries) => {
              const visible = Boolean(entries[0]?.isIntersecting);
              inViewportRef.current = visible;
              if (visible) {
                wakeLoop();
              } else {
                stopLoop();
              }
            },
            { threshold: 0 }
          )
        : null;
    if (io && runwayRef.current) io.observe(runwayRef.current);

    // Initial synchronous paint
    const initP = computeTargetProgress();
    const initMesh = wireframeActiveRef.current ? 1 : chapterThreeMeshEnvelope(initP);
    currentPRef.current = initP;
    targetPRef.current = initP;
    currentMeshRef.current = initMesh;
    render(initP, initMesh, 0, 0);

    return () => {
      cancelled = true;
      stopLoop();
      mql?.removeEventListener("change", onMotionPrefChange);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onPointerMove);
      ro?.disconnect();
      io?.disconnect();
    };
  }, [computeTargetProgress, render, resizeCanvas, stopLoop, wakeLoop]);

  const jumpToChapter = (chapterIndex: number) => {
    const runway = runwayRef.current;
    if (!runway || typeof window === "undefined") return;
    const rect = runway.getBoundingClientRect();
    const runwayTop = window.scrollY + rect.top;
    const total = Math.max(0, rect.height - window.innerHeight);
    const centers = [0.02, 0.36, 0.62, 0.92];
    const targetY = runwayTop + total * (centers[chapterIndex] ?? 0);
    window.scrollTo({
      top: targetY,
      behavior: reducedRef.current ? "auto" : "smooth",
    });
  };

  const chapters = content.hero.chapters;

  return (
    <section
      id="top"
      tabIndex={-1}
      ref={runwayRef}
      className="relative w-full focus:outline-none"
      style={{ height: "var(--hero-runway)" }}
    >
      {/* Single sticky viewport stage */}
      <div
        ref={stageRef}
        className="sticky top-0 flex h-screen w-full items-center overflow-hidden supports-[height:100dvh]:h-dvh"
      >
        <div className="mx-auto grid w-full max-w-[1440px] grid-cols-1 items-center gap-5 px-[var(--space-edge)] pt-[var(--nav-height)] lg:grid-cols-12 lg:gap-8">
          {/* Left column: Typographic anchor + 4-chapter scrollytelling */}
          <div className="order-2 lg:order-1 lg:col-span-7">
            <div data-hero-intro="text">
              <p className="font-mono-data mb-2.5 text-xs font-medium tracking-[var(--tracking-mono)] text-[var(--text-muted)] uppercase sm:mb-4">
                {content.hero.kicker}
              </p>
              <h1
                ref={headlineRef}
                data-rt="hero"
                aria-label={`${content.hero.firstName} ${content.hero.lastName}`}
                className="font-display font-bold tracking-[var(--tracking-display)] text-[var(--text)]"
                style={{
                  fontSize: "var(--text-mega)",
                  lineHeight: "var(--leading-mega)",
                  textWrap: "balance",
                }}
              >
                <span className="block" aria-hidden="true">
                  <span className="rt-w">
                    <span className="rt-i" style={{ ["--i" as string]: 0 } as React.CSSProperties}>
                      {content.hero.firstName}
                    </span>
                  </span>
                </span>
                <span className="block" aria-hidden="true">
                  <span className="rt-w">
                    <span
                      className="rt-i text-[var(--accent)]"
                      style={{ ["--i" as string]: 1 } as React.CSSProperties}
                    >
                      {content.hero.lastName}
                    </span>
                  </span>
                </span>
              </h1>
              <p
                className="mt-3 hidden max-w-xl text-[var(--text-muted)] sm:mt-5 sm:block"
                style={{ fontSize: "var(--text-lead)", lineHeight: "1.45" }}
              >
                {content.hero.tagline}
              </p>
            </div>

            {/* Chapter index rail (01 - 04) */}
            <div
              role="tablist"
              aria-label="Hero story chapters"
              className="mt-4 flex items-center gap-2 sm:mt-7"
            >
              {chapters.map((c, i) => {
                const isCurrent = activeChapter === i;
                return (
                  <button
                    key={c.index}
                    type="button"
                    role="tab"
                    aria-selected={isCurrent}
                    onClick={() => jumpToChapter(i)}
                    className={`font-mono-data inline-flex min-h-[28px] items-center gap-1.5 rounded-[var(--radius-sm)] border px-2.5 py-1 text-[11px] tracking-[var(--tracking-mono)] uppercase transition-colors duration-[var(--duration-fast)] [transition-timing-function:var(--ease-snappy)] ${
                      isCurrent
                        ? "border-[var(--border-strong)] bg-[var(--surface)] text-[var(--text)]"
                        : "border-transparent text-[var(--text-muted)] hover:text-[var(--text)]"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`h-1.5 w-1.5 rounded-full transition-colors ${
                        isCurrent ? "bg-[var(--accent)]" : "bg-[var(--border-strong)]"
                      }`}
                    />
                    <span>{c.index}</span>
                    <span className="hidden md:inline">{c.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Chapter cross-dissolve stage */}
            <div className="relative mt-3 min-h-[112px] sm:mt-4 sm:min-h-[144px]">
              {chapters.map((c, i) => (
                <div
                  key={c.index}
                  ref={(el) => {
                    chapterBlocksRef.current[i] = el;
                  }}
                  aria-hidden={i === 0 ? undefined : true}
                  className="absolute inset-0 flex flex-col justify-start"
                  style={{
                    opacity: i === 0 ? 1 : 0,
                    willChange: "transform, opacity, filter",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono-data inline-flex items-center gap-2 text-xs font-semibold tracking-[var(--tracking-mono)] text-[var(--text)]">
                      <span
                        aria-hidden="true"
                        className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--accent)]"
                      />
                      {c.index}
                    </span>
                    <span className="font-mono-data text-[11px] uppercase tracking-[var(--tracking-mono)] text-[var(--text-muted)]">
                      {c.label}
                    </span>
                    <span className="h-px flex-1 bg-[var(--border)]" />
                  </div>
                  <h2
                    className="mt-2 font-display font-semibold tracking-tight text-[var(--text)] sm:mt-2.5"
                    style={{
                      fontSize: "clamp(1.25rem, 2.4vw, 2.15rem)",
                      lineHeight: "var(--leading-tight)",
                      textWrap: "balance",
                    }}
                  >
                    {c.title}
                  </h2>
                  <p className="mt-1.5 max-w-lg text-xs text-[var(--text-muted)] sm:mt-2.5 sm:text-base">
                    {c.body}
                  </p>
                </div>
              ))}
            </div>

            {/* CTAs — always reachable within 5 seconds: split label + arrow, magnetic on fine pointers */}
            <div data-hero-intro="text" className="mt-4 flex flex-wrap items-center gap-3 sm:mt-7">
              <Magnetic>
                <a
                  href="#contact"
                  onClick={(e) => {
                    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                    e.preventDefault();
                    scrollToAnchor("#contact", { focusTarget: true, updateHistory: true });
                  }}
                  onKeyDown={activateAnchorOnSpace}
                  className="btn-split btn-primary"
                >
                  <span className="btn-label">{content.hero.primaryCta}</span>
                  <span className="btn-arrow" aria-hidden="true">
                    <ArrowUpRight className="h-4 w-4" />
                  </span>
                </a>
              </Magnetic>
              <a
                href={SITE_CONFIG.resumePath}
                download="Heet-Mehta-Resume.pdf"
                onKeyDown={activateAnchorOnSpace}
                className="btn-split btn-secondary"
              >
                <span className="btn-label">{content.hero.secondaryCta}</span>
                <span className="btn-arrow" aria-hidden="true">
                  <FileDown className="h-4 w-4" />
                </span>
              </a>
              <SocialLinks size="sm" className="ml-0 sm:ml-1" />
              <a
                href="#what-i-build"
                onClick={(e) => {
                  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                  e.preventDefault();
                  scrollToAnchor("#what-i-build", { focusTarget: true, updateHistory: true });
                }}
                onKeyDown={activateAnchorOnSpace}
                className="font-mono-data ml-auto hidden items-center gap-2 rounded-[var(--radius-sm)] px-1 py-0.5 text-xs text-[var(--text-muted)] transition-colors duration-[var(--duration-fast)] hover:text-[var(--text)] xl:inline-flex whitespace-nowrap"
              >
                <span>{content.hero.scrollCue}</span>
                <ArrowDown className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

          {/* Right column: Aspect-ratio-locked subject + 1:1 registered CV wireframe */}
          <div className="order-1 lg:order-2 lg:col-span-5">
            <div className="relative mx-auto w-full max-w-[208px] sm:max-w-[264px] lg:max-w-[412px]">
              <div
                ref={wrapperRef}
                data-hero-intro="portrait"
                data-cursor="portrait"
                onPointerEnter={(e) => {
                  if (e.pointerType === "mouse") setPortraitHover(true);
                }}
                onPointerLeave={(e) => {
                  if (e.pointerType === "mouse") setPortraitHover(false);
                }}
                className="relative aspect-[3/4] w-full overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-[var(--surface)] edge-hairline-strong"
              >
                {/* Shared rigid camera plane: canvas, video, and CV mesh never drift apart */}
                <div
                  ref={cameraPlaneRef}
                  className="absolute inset-0 h-full w-full will-change-transform"
                >
                  <canvas
                    ref={canvasRef}
                    className="absolute inset-0 h-full w-full"
                    aria-hidden="true"
                  />

                  {HERO_VIDEO_SRC ? (
                    <video
                      ref={videoRef}
                      src={HERO_VIDEO_SRC}
                      poster="/img/hero/portrait-real.jpg"
                      muted
                      playsInline
                      preload="auto"
                      onLoadedMetadata={() => wakeLoop()}
                      className="absolute inset-0 h-full w-full object-cover"
                      aria-hidden="true"
                    />
                  ) : null}

                  {portraitFailed ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-[var(--surface)]">
                      <span className="font-display text-5xl font-bold text-[var(--text)]">
                        {SITE_CONFIG.monogram}
                      </span>
                    </div>
                  ) : null}

                  {/* Subject-locked 300x400 CV topology mesh (0.75px vector paths) */}
                  <svg
                    viewBox="0 0 300 400"
                    preserveAspectRatio="xMidYMid slice"
                    className="pointer-events-none absolute inset-0 h-full w-full"
                    aria-hidden="true"
                  >
                    <defs>
                      <linearGradient id="cv-mesh-stroke" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--beige)" stopOpacity="0.95" />
                        <stop offset="68%" stopColor="var(--beige)" stopOpacity="0.72" />
                        <stop offset="100%" stopColor="var(--silver)" stopOpacity="0.4" />
                      </linearGradient>
                    </defs>

                    <g
                      ref={meshGroupRef}
                      fill="none"
                      stroke="url(#cv-mesh-stroke)"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ opacity: 0 }}
                    >
                      {CV_PATHS.map((spec, idx) => (
                        <path
                          key={idx}
                          ref={(el) => {
                            pathElsRef.current[idx] = el;
                          }}
                          d={spec.d}
                          pathLength={1}
                          strokeWidth={spec.weight ?? 0.75}
                          opacity={spec.opacity ?? 0.8}
                          strokeDasharray={1}
                          strokeDashoffset={1}
                        />
                      ))}

                      {/* Landmark reticles + monospace coordinate callouts */}
                      <g ref={nodeGroupRef} style={{ opacity: 0 }}>
                        {CV_NODES.map((node) => (
                          <g key={node.tag}>
                            <circle
                              cx={node.x}
                              cy={node.y}
                              r={3.2}
                              stroke="var(--beige)"
                              strokeWidth={0.75}
                            />
                            <circle cx={node.x} cy={node.y} r={0.9} fill="var(--accent)" stroke="none" />
                            <line
                              x1={node.x - 6}
                              y1={node.y}
                              x2={node.x + 6}
                              y2={node.y}
                              stroke="var(--beige)"
                              strokeWidth={0.5}
                              opacity={0.7}
                            />
                            <line
                              x1={node.x}
                              y1={node.y - 6}
                              x2={node.x}
                              y2={node.y + 6}
                              stroke="var(--beige)"
                              strokeWidth={0.5}
                              opacity={0.7}
                            />
                          </g>
                        ))}
                      </g>
                    </g>

                    {/* Active telemetry scanline */}
                    <line
                      ref={scanLineRef}
                      x1={18}
                      y1={120}
                      x2={282}
                      y2={120}
                      stroke="var(--beige)"
                      strokeWidth={0.6}
                      strokeDasharray="3 3"
                      style={{ opacity: 0 }}
                    />
                  </svg>
                </div>

                {/* Outer bezel glass HUD: corner registration crosshairs (+) & fine grid */}
                <svg
                  ref={bezelHudRef}
                  viewBox="0 0 300 400"
                  preserveAspectRatio="none"
                  className="pointer-events-none absolute inset-0 h-full w-full will-change-transform"
                  aria-hidden="true"
                >
                  {BEZEL_CORNERS.map((c, idx) => (
                    <g key={idx} stroke="var(--beige)" strokeWidth={0.75} opacity={0.65}>
                      <line x1={c.x - 5} y1={c.y} x2={c.x + 5} y2={c.y} />
                      <line x1={c.x} y1={c.y - 5} x2={c.x} y2={c.y + 5} />
                    </g>
                  ))}
                </svg>

                {/* Top-left live frame readout */}
                <div className="pointer-events-none absolute top-3 left-3 rounded-[3px] bg-black/45 px-2 py-0.5 font-mono-data text-[10px] tracking-[var(--tracking-mono)] text-[var(--beige)]/90 backdrop-blur-[2px]">
                  <span ref={frameReadoutRef}>FRAME 000 // STANDBY</span>
                </div>

                {/* Bottom telemetry bar */}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/80 via-black/35 to-transparent p-3.5 sm:p-4">
                  <p className="font-mono-data text-[10px] tracking-[var(--tracking-mono)] text-[var(--beige)]/90 sm:text-[11px]">
                    <span ref={chapterReadoutRef}>01 / 04 · ARRIVAL</span>
                  </p>
                  <span
                    className={`inline-flex h-2 w-2 rounded-full transition-colors duration-[var(--duration-fast)] ${
                      wireframeActive ? "bg-[var(--accent)]" : "bg-[var(--beige)]/70"
                    }`}
                    aria-hidden="true"
                  />
                </div>
              </div>

              {/* Portrait toolbar: GitHub handle + interactive Wireframe view toggle */}
              <div className="mt-2.5 flex items-center justify-between gap-2 sm:mt-3">
                <span className="font-mono-data truncate text-[11px] text-[var(--text-muted)] sm:text-xs">
                  github.com/{SITE_CONFIG.githubUsername}
                </span>
                <button
                  type="button"
                  data-testid="wireframe-toggle"
                  onClick={() => setWireframeActive((prev) => !prev)}
                  aria-pressed={wireframeActive}
                  className={`font-mono-data inline-flex min-h-[34px] items-center gap-1.5 rounded-[var(--radius-sm)] border px-3 py-1.5 text-xs transition-colors duration-[var(--duration-fast)] [transition-timing-function:var(--ease-snappy)] whitespace-nowrap edge-hairline ${
                    wireframeActive
                      ? "border-[var(--accent)] bg-[var(--surface-2)] text-[var(--text)]"
                      : "border-[var(--border-strong)] bg-[var(--surface)] text-[var(--text)] hover:border-[var(--accent)]"
                  }`}
                >
                  <ScanEye className="h-3.5 w-3.5 text-[var(--accent)]" />
                  <span>{wireframeActive ? content.hero.showPhotoLabel : content.hero.wireframeToggleLabel}</span>
                </button>
              </div>

              {/* Discoverability hint for the wireframe layer */}
              <p className="font-mono-data mt-2 hidden text-[11px] leading-snug text-[var(--text-muted)] sm:block">
                <span className="text-[var(--accent-text)]" aria-hidden="true">↳ </span>
                <span className="[@media(hover:none)]:hidden">{content.hero.wireframeHint}</span>
                <span className="hidden [@media(hover:none)]:inline">{content.hero.wireframeHintTouch}</span>
              </p>

              {/* Normalized scroll progress rail */}
              <div className="mt-2.5 flex items-center gap-3 sm:mt-3">
                <div className="relative h-[2px] flex-1 overflow-hidden rounded-full bg-[var(--border)]">
                  <div
                    ref={progressFillRef}
                    className="absolute inset-y-0 left-0 w-full origin-left scale-x-0 bg-[var(--accent)]"
                  />
                </div>
                <span className="font-mono-data text-[10px] tracking-[var(--tracking-mono)] text-[var(--text-muted)] uppercase">
                  SCRUB
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Live screen-reader announcement when chapter updates */}
      <span className="sr-only" aria-live="polite">
        {chapters[activeChapter]
          ? `Chapter ${chapters[activeChapter].index}: ${chapters[activeChapter].title}`
          : ""}
      </span>
    </section>
  );
}
