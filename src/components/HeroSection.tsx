"use client";

import { useEffect, useRef } from "react";
import type { PointerEvent } from "react";
import { ArrowDown, FileText } from "lucide-react";
import content from "@/src/content/content.json";
import { SITE_CONFIG } from "@/src/config";
import { buildHeroStats } from "@/src/lib/hero-stats";
import type { GitHubPayload } from "@/src/types/portfolio";

const hero = content.hero;
const MAX_MAGNET_OFFSET = 4;

interface HeroSectionProps {
  data: GitHubPayload | null;
  featuredProjectCount: number;
}

export default function HeroSection({ data, featuredProjectCount }: HeroSectionProps) {
  const frameRef = useRef<HTMLElement>(null);
  const primaryCtaRef = useRef<HTMLAnchorElement>(null);
  const pointerEffectsEnabled = useRef(false);
  const stats = buildHeroStats(data, featuredProjectCount);

  useEffect(() => {
    const hoverPointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const syncPointerEffects = () => {
      const enabled = hoverPointer.matches && !reducedMotion.matches;
      pointerEffectsEnabled.current = enabled;
      if (!enabled) {
        frameRef.current?.style.removeProperty("--hero-pointer-x");
        frameRef.current?.style.removeProperty("--hero-pointer-y");
        primaryCtaRef.current?.style.setProperty("--hero-magnet-x", "0px");
        primaryCtaRef.current?.style.setProperty("--hero-magnet-y", "0px");
      }
    };

    syncPointerEffects();
    hoverPointer.addEventListener("change", syncPointerEffects);
    reducedMotion.addEventListener("change", syncPointerEffects);
    return () => {
      hoverPointer.removeEventListener("change", syncPointerEffects);
      reducedMotion.removeEventListener("change", syncPointerEffects);
    };
  }, []);

  const handleFramePointerMove = (event: PointerEvent<HTMLElement>) => {
    if (!pointerEffectsEnabled.current || event.pointerType === "touch") return;

    const bounds = event.currentTarget.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const x = Math.max(0, Math.min(100, ((event.clientX - bounds.left) / bounds.width) * 100));
    const y = Math.max(0, Math.min(100, ((event.clientY - bounds.top) / bounds.height) * 100));
    event.currentTarget.style.setProperty("--hero-pointer-x", `${x}%`);
    event.currentTarget.style.setProperty("--hero-pointer-y", `${y}%`);
  };

  const handlePrimaryPointerMove = (event: PointerEvent<HTMLAnchorElement>) => {
    if (!pointerEffectsEnabled.current || event.pointerType === "touch") return;

    const bounds = event.currentTarget.getBoundingClientRect();
    const offsetX = (event.clientX - (bounds.left + bounds.width / 2)) * 0.08;
    const offsetY = (event.clientY - (bounds.top + bounds.height / 2)) * 0.08;
    const x = Math.max(-MAX_MAGNET_OFFSET, Math.min(MAX_MAGNET_OFFSET, offsetX));
    const y = Math.max(-MAX_MAGNET_OFFSET, Math.min(MAX_MAGNET_OFFSET, offsetY));
    event.currentTarget.style.setProperty("--hero-magnet-x", `${x}px`);
    event.currentTarget.style.setProperty("--hero-magnet-y", `${y}px`);
  };

  const resetPrimaryMagnet = (event: PointerEvent<HTMLAnchorElement>) => {
    event.currentTarget.style.setProperty("--hero-magnet-x", "0px");
    event.currentTarget.style.setProperty("--hero-magnet-y", "0px");
  };

  return (
    <section
      ref={frameRef}
      id="top"
      aria-labelledby="hero-heading"
      className="hero-frame"
      onPointerMove={handleFramePointerMove}
    >
      <div className="hero-frame__inner">
        <div className="hero-layout">
          <p className="hero-status hero-support-enter" data-testid="hero-availability">
            <span aria-hidden="true" className="hero-status__dot" />
            {hero.availability}
          </p>

          <h1
            id="hero-heading"
            className="hero-name font-display"
            aria-label={`${hero.firstName} ${hero.lastName}`}
            data-testid="hero-heading"
          >
            <span className="hero-name__mask">
              <span className="hero-name__line">{hero.firstName}</span>
            </span>
            {" "}
            <span className="hero-name__mask hero-name__mask--last">
              <span className="hero-name__line hero-name__line--last">{hero.lastName}</span>
            </span>
          </h1>

          <div className="hero-copy hero-support-enter">
            <p className="hero-positioning">{hero.positioning}</p>
            <div className="hero-actions" role="group" aria-label="Primary actions">
              <a
                ref={primaryCtaRef}
                href="#projects"
                className="hero-cta hero-cta--primary"
                onPointerMove={handlePrimaryPointerMove}
                onPointerLeave={resetPrimaryMagnet}
              >
                <span className="hero-cta__content">
                  <span>{hero.primaryCta}</span>
                  <ArrowDown aria-hidden="true" className="h-4 w-4" />
                </span>
              </a>
              <a
                href={SITE_CONFIG.resumePath}
                target="_blank"
                rel="noopener noreferrer"
                className="hero-cta hero-cta--secondary"
                aria-label="Resume (PDF, opens in a new tab)"
              >
                <span className="hero-cta__content">
                  <span>{hero.secondaryCta}</span>
                  <FileText aria-hidden="true" className="h-4 w-4" />
                </span>
              </a>
            </div>
          </div>
        </div>

        {stats.length > 0 ? (
          <div className="hero-stats hero-support-enter" data-testid="hero-stats">
            <ul className="hero-stats__list" aria-label="Portfolio stats">
              {stats.map((stat) => (
                <li className="hero-stat" key={stat.id} data-testid={`hero-stat-${stat.id}`}>
                  <strong className="hero-stat__value font-mono-data tabular-nums">
                    {stat.value.toLocaleString("en-US")}
                  </strong>
                  <span className="hero-stat__meta font-mono-data">
                    <span>{stat.label}</span>
                    {stat.detail ? (
                      <time dateTime={stat.dateTime} className="hero-stat__detail">
                        {stat.detail}
                      </time>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}
