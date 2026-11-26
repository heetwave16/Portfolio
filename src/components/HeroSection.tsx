"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowDown, FileText } from "lucide-react";
import content from "@/src/content/content.json";
import { SITE_CONFIG } from "@/src/config";
import { buildHeroStats } from "@/src/lib/hero-stats";
import type { GitHubPayload } from "@/src/types/portfolio";

const hero = content.hero;

interface HeroSectionProps {
  data: GitHubPayload | null;
  featuredProjectCount: number;
}

export default function HeroSection({ data, featuredProjectCount }: HeroSectionProps) {
  const [linesOn, setLinesOn] = useState(false);
  const stats = buildHeroStats(data, featuredProjectCount);

  return (
    <section id="top" aria-labelledby="hero-heading" className="hero-frame">
      <div className="hero-frame__inner">
        <div className="hero-layout">
          <p className="hero-status hero-enter" data-testid="hero-availability">
            <span aria-hidden="true" className="hero-status__dot" />
            {hero.availability}
          </p>

          <h1
            id="hero-heading"
            className="hero-name font-display"
            aria-label={`${hero.firstName} ${hero.lastName}`}
            data-testid="hero-heading"
          >
            <span className="hero-name__line hero-enter">{hero.firstName}</span>
            {" "}
            <span className="hero-name__line hero-name__line--last hero-enter hero-enter--last">
              {hero.lastName}
            </span>
          </h1>

          <div className="hero-portrait-stage hero-enter hero-enter--portrait">
            <button
              type="button"
              aria-pressed={linesOn}
              onClick={() => setLinesOn((visible) => !visible)}
              className="hero-portrait"
              data-lines={linesOn ? "on" : "off"}
              aria-label={linesOn ? "Show the portrait photo" : "Show the line-work portrait"}
            >
              <Image
                src="/img/hero/portrait-cutout.webp"
                alt={hero.realPortraitAlt}
                fill
                priority
                fetchPriority="high"
                sizes="(max-width: 767px) 46vw, 50vw"
                className="hero-portrait__image"
              />
              <Image
                src="/img/hero/portrait-lines-cutout.webp"
                alt=""
                aria-hidden="true"
                fill
                sizes="(max-width: 767px) 46vw, 50vw"
                className="hero-portrait__image hero-portrait__linework"
              />
            </button>
          </div>

          <div className="hero-copy hero-enter hero-enter--copy">
            <p className="hero-positioning">{hero.positioning}</p>
            <div className="hero-actions" role="group" aria-label="Primary actions">
              <a href="#projects" className="hero-cta hero-cta--primary">
                <span>{hero.primaryCta}</span>
                <ArrowDown aria-hidden="true" className="h-4 w-4" />
              </a>
              <a
                href={SITE_CONFIG.resumePath}
                target="_blank"
                rel="noopener noreferrer"
                className="hero-cta hero-cta--secondary"
                aria-label="Resume (PDF, opens in a new tab)"
              >
                <span>{hero.secondaryCta}</span>
                <FileText aria-hidden="true" className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>

        {stats.length > 0 ? (
          <div className="hero-stats hero-enter hero-enter--stats" data-testid="hero-stats">
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
