"use client";

import React, { useState } from "react";
import content from "@/src/content/content.json";
import type { ComputedLanguageSkill } from "@/src/lib/github-transform";
import type { BioLength } from "@/src/types/portfolio";
import { useTheme } from "./ShellProviders";

interface AboutSectionProps {
  skills: ComputedLanguageSkill[];
}

function formatBytes(bytes: number): string {
  if (bytes >= 1000000) return `${(bytes / 1000000).toFixed(1)} MB`;
  if (bytes >= 1000) return `${(bytes / 1000).toFixed(1)} KB`;
  return `${bytes} B`;
}

export default function AboutSection({ skills }: AboutSectionProps) {
  const [bioLength, setBioLength] = useState<BioLength>("medium");
  const { contrastTheme } = useTheme();
  const paragraphs = content.about.bios[bioLength];

  return (
    <div className="bg-[var(--bg)]">
      <section
        id="about"
        tabIndex={-1}
        data-theme={contrastTheme}
        data-theme-wipe
        className="relative overflow-hidden border-b border-[var(--border)] bg-[var(--bg)] py-[var(--space-section)] text-[var(--text)] focus:outline-none"
      >
      <div
        data-theme-wipe-curtain
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[var(--z-overlay)] origin-bottom bg-[var(--inverse-bg)]"
      />
      <div className="mx-auto max-w-[1440px] px-[var(--space-edge)]">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
          {/* Bio Column (7 cols) */}
          <div data-reveal className="lg:col-span-7">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="font-mono-data mb-2 text-xs tracking-[var(--tracking-mono)] text-[var(--text-muted)] uppercase">
                  {content.about.eyebrow}
                </p>
                <h2
                  className="font-display font-semibold tracking-tight text-[var(--text)]"
                  style={{
                    fontSize: "var(--text-h2)",
                    lineHeight: "var(--leading-tight)",
                    textWrap: "balance",
                  }}
                >
                  {content.about.heading}
                </h2>
              </div>

              {/* Bio Length Switcher */}
              <div
                role="group"
                aria-label="Select bio length"
                className="inline-flex rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--surface)] p-1"
              >
                {(["short", "medium", "detailed"] as const).map((len) => {
                  const active = bioLength === len;
                  return (
                    <button
                      key={len}
                      type="button"
                      onClick={() => setBioLength(len)}
                      aria-pressed={active}
                      className={`min-h-[34px] rounded-[3px] px-3 py-1 text-xs font-semibold capitalize transition-colors whitespace-nowrap ${
                        active
                          ? "bg-[var(--inverse-bg)] text-[var(--inverse-text)]"
                          : "text-[var(--text-muted)] hover:text-[var(--text)]"
                      }`}
                    >
                      {len}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-7 space-y-4 text-base leading-relaxed text-[var(--text)] sm:text-lg">
              {paragraphs.map((p, idx) => (
                <p key={idx}>{p}</p>
              ))}
            </div>

            {/* Factual Highlights */}
            <dl className="mt-8 grid grid-cols-1 gap-4 border-t border-[var(--border)] pt-6 sm:grid-cols-2">
              {content.about.highlights.map((item) => (
                <div key={item.label}>
                  <dt className="font-mono-data text-xs uppercase tracking-[var(--tracking-mono)] text-[var(--text-muted)]">
                    {item.label}
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-[var(--text)] sm:text-base">
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Computed Skills Column (5 cols) */}
          <div data-reveal className="lg:col-span-5">
            <div className="rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-[var(--surface)] p-6">
              <h3 className="font-display text-xl font-semibold text-[var(--text)]">
                {content.about.skillsHeading}
              </h3>
              <p className="mt-1.5 text-sm text-[var(--text-muted)]">
                {content.about.skillsCaption}
              </p>

              <div className="mt-6 space-y-4" data-testid="computed-skills">
                {skills.length === 0 ? (
                  <p className="text-sm text-[var(--text-muted)]">
                    No repository language telemetry available yet.
                  </p>
                ) : (
                  skills.map((skill) => (
                    <div key={skill.name}>
                      <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                        <span className="font-semibold text-[var(--text)]">{skill.name}</span>
                        <span className="font-mono-data text-xs text-[var(--text-muted)] tabular-nums">
                          {skill.percentage}% · {formatBytes(skill.bytes)} · {skill.repoCount}{" "}
                          {skill.repoCount === 1 ? "repo" : "repos"}
                        </span>
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-[2px] bg-[var(--surface-2)]">
                        <div
                          className="h-full rounded-[2px]"
                          style={{
                            width: `${Math.max(3, skill.percentage)}%`,
                            backgroundColor: "var(--inverse-bg)",
                          }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      </section>
    </div>
  );
}
