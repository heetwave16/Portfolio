import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import Footer from "@/src/components/Footer";
import Navbar from "@/src/components/Navbar";
import ShellProviders from "@/src/components/ShellProviders";
import {
  HACKSTACK_PLACEHOLDERS,
  HACKSTACK_PROJECT,
  HACKSTACK_SCREEN,
  HACKSTACK_STEPS,
  SLATE_VISION_PROJECT,
} from "@/src/lib/hackstack-case-study";

export const metadata: Metadata = {
  title: `${HACKSTACK_PROJECT.title} · Heet Mehta`,
  description: HACKSTACK_PROJECT.oneLiner,
  alternates: { canonical: "/projects/hackstack" },
};

export default function HackStackPage() {
  return (
    <ShellProviders>
      <Navbar />
      <main id="main-content" className="bg-[var(--bg)] text-[var(--text)]">
        <section
          id="top"
          aria-labelledby="hackstack-title"
          className="border-b border-[var(--border)] pt-[var(--nav-height)]"
        >
          <div className="mx-auto max-w-[1440px] px-[var(--space-edge)] py-[var(--space-section)]">
            <nav aria-label="Breadcrumb" className="font-mono-data flex flex-wrap items-center gap-2 text-xs tracking-[var(--tracking-mono)] text-[var(--text-muted)] uppercase">
              <Link href="/#projects" className="ui-link inline-flex min-h-[36px] items-center gap-1 px-1 text-[var(--text)]">
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                Home Projects
              </Link>
              <span aria-hidden="true">/</span>
              <span aria-current="page">{HACKSTACK_PROJECT.title}</span>
            </nav>

            <div className="mt-7 max-w-4xl">
              <p className="font-mono-data text-xs tracking-[var(--tracking-mono)] text-[var(--text-muted)] uppercase">
                Case study · {HACKSTACK_PROJECT.year} · {HACKSTACK_PROJECT.role}
              </p>
              <h1
                id="hackstack-title"
                className="font-display mt-3 font-bold tracking-tight text-[var(--text)]"
                style={{ fontSize: "var(--text-h1)", lineHeight: "var(--leading-tight)", textWrap: "balance" }}
              >
                {HACKSTACK_PROJECT.title}
              </h1>
              <p className="mt-5 max-w-3xl text-lg leading-relaxed text-[var(--text-muted)] sm:text-xl">
                {HACKSTACK_PROJECT.oneLiner}
              </p>
            </div>

            <div className="mt-8">
              <p className="font-mono-data text-[11px] tracking-[var(--tracking-mono)] text-[var(--text-muted)] uppercase">
                Stack
              </p>
              <ul className="mt-3 flex flex-wrap gap-2" aria-label="HackStack stack">
                {HACKSTACK_PROJECT.stack.map((item) => (
                  <li
                    key={item}
                    className="font-mono-data rounded-[6px] bg-[var(--surface-2)] px-2.5 py-1.5 text-xs text-[var(--text-muted)]"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <a
                href={HACKSTACK_PROJECT.liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-split btn-primary"
                aria-label="HackStack live site (opens in a new tab)"
              >
                <span className="btn-label">Live</span>
                <span className="btn-arrow" aria-hidden="true">
                  <ArrowUpRight className="h-4 w-4" />
                </span>
              </a>
              <a
                href={HACKSTACK_PROJECT.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-split btn-outline"
                aria-label="HackStack repository (opens in a new tab)"
              >
                <span className="btn-label">Repo</span>
                <span className="btn-arrow" aria-hidden="true">
                  <ArrowUpRight className="h-4 w-4" />
                </span>
              </a>
            </div>
          </div>
        </section>

        <section aria-label="HackStack screenshot" className="border-b border-[var(--border)] py-[var(--space-section)]">
          <div className="mx-auto max-w-[1440px] px-[var(--space-edge)]">
            <figure className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-[var(--surface)]">
              <div className="relative aspect-[16/10] w-full bg-[var(--surface-2)]">
                <Image
                  src={HACKSTACK_PROJECT.screenshotPath}
                  alt="HackStack Studio with its brief form and a sample CampusSplit AI preview"
                  fill
                  priority
                  sizes="(max-width: 1440px) 100vw, 1440px"
                  className="object-contain"
                />
              </div>
              <figcaption className="font-mono-data flex flex-col gap-2 border-t border-[var(--border)] px-4 py-3 text-[11px] tracking-[var(--tracking-mono)] text-[var(--text-muted)] uppercase sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <span>HackStack / Studio</span>
                <span>{HACKSTACK_SCREEN.buildStatus}</span>
              </figcaption>
            </figure>
          </div>
        </section>

        <section aria-labelledby="brief-heading" className="border-b border-[var(--border)] py-[var(--space-section)]">
          <div className="mx-auto max-w-[1440px] px-[var(--space-edge)]">
            <p className="font-mono-data text-xs tracking-[var(--tracking-mono)] text-[var(--text-muted)] uppercase">
              01 / The brief
            </p>
            <h2
              id="brief-heading"
              className="font-display mt-3 font-semibold tracking-tight text-[var(--text)]"
              style={{ fontSize: "var(--text-h2)", lineHeight: "var(--leading-tight)" }}
            >
              The brief
            </h2>
            <div className="mt-8 grid gap-6 lg:grid-cols-12 lg:gap-10">
              <blockquote className="rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--surface)] p-6 text-lg leading-relaxed text-[var(--text)] lg:col-span-5">
                “{HACKSTACK_SCREEN.briefPrompt}”
              </blockquote>
              <div className="lg:col-span-7">
                <p className="max-w-3xl leading-relaxed text-[var(--text-muted)]">
                  The visible form follows that prompt with a stack selector and a must-have-features input. The screenshot shows the selector set to “{HACKSTACK_SCREEN.stackSelection}” and the feature field reading “{HACKSTACK_SCREEN.featurePrompt}”.
                </p>
                <p className="mt-4 max-w-3xl leading-relaxed text-[var(--text-muted)]">
                  That dropdown value is the screenshot’s visible selection; the stack chips above use the Stack recorded in the HackStack data-layer entry.
                </p>
                <p className="mt-4 max-w-3xl leading-relaxed text-[var(--text-muted)]">
                  The screen also includes a Generate control and a session-notes area: “{HACKSTACK_SCREEN.sessionNote}”
                </p>
              </div>
            </div>
          </div>
        </section>

        <section aria-labelledby="flow-heading" className="border-b border-[var(--border)] py-[var(--space-section)]">
          <div className="mx-auto max-w-[1440px] px-[var(--space-edge)]">
            <p className="font-mono-data text-xs tracking-[var(--tracking-mono)] text-[var(--text-muted)] uppercase">
              02 / The flow
            </p>
            <h2
              id="flow-heading"
              className="font-display mt-3 font-semibold tracking-tight text-[var(--text)]"
              style={{ fontSize: "var(--text-h2)", lineHeight: "var(--leading-tight)" }}
            >
              How it works
            </h2>
            <ol className="mt-8 grid gap-4 md:grid-cols-3">
              {HACKSTACK_STEPS.map((step) => (
                <li key={step.number} className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
                  <p className="font-mono-data text-xs tracking-[var(--tracking-mono)] text-[var(--accent-text)]">
                    {step.number}
                  </p>
                  <h3 className="font-display mt-4 text-lg font-semibold text-[var(--text)]">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">{step.body}</p>
                </li>
              ))}
            </ol>

            <div className="mt-8 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
              <p className="font-mono-data text-[11px] tracking-[var(--tracking-mono)] text-[var(--text-muted)] uppercase">
                Visible stages
              </p>
              <ol className="mt-4 flex flex-wrap items-center gap-2" aria-label="Visible generation stages">
                {HACKSTACK_SCREEN.generationStages.map((stage, index) => (
                  <li key={stage} className="inline-flex items-center gap-2">
                    <span className="font-mono-data rounded-[4px] border border-[var(--border-strong)] px-2 py-1 text-xs text-[var(--text)]">
                      {stage}
                    </span>
                    {index < HACKSTACK_SCREEN.generationStages.length - 1 ? (
                      <span aria-hidden="true" className="text-[var(--text-muted)]">→</span>
                    ) : null}
                  </li>
                ))}
              </ol>

              <div className="mt-6 border-t border-[var(--border)] pt-5">
                <p className="font-mono-data text-[11px] tracking-[var(--tracking-mono)] text-[var(--text-muted)] uppercase">
                  Preview · {HACKSTACK_SCREEN.previewLabel}
                </p>
                <h3 className="font-display mt-2 text-xl font-semibold text-[var(--text)]">
                  {HACKSTACK_SCREEN.previewTitle}
                </h3>
                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--text-muted)]">
                  {HACKSTACK_SCREEN.previewDescription}
                </p>
                <p className="font-mono-data mt-4 text-xs text-[var(--text-muted)]">
                  The visible preview is marked “{HACKSTACK_SCREEN.previewLabel}”; these screen values are not presented as verified product results.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section aria-labelledby="needs-heading" className="border-b border-[var(--border)] py-[var(--space-section)]">
          <div className="mx-auto max-w-[1440px] px-[var(--space-edge)]">
            <p className="font-mono-data text-xs tracking-[var(--tracking-mono)] text-[var(--text-muted)] uppercase">
              03 / Details to add
            </p>
            <h2
              id="needs-heading"
              className="font-display mt-3 font-semibold tracking-tight text-[var(--text)]"
              style={{ fontSize: "var(--text-h2)", lineHeight: "var(--leading-tight)" }}
            >
              Details to add
            </h2>
            <ul className="mt-7 grid gap-3 md:grid-cols-2">
              {HACKSTACK_PLACEHOLDERS.map((placeholder) => (
                <li key={placeholder} className="font-mono-data rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-4 text-sm leading-relaxed text-[var(--text)]">
                  {placeholder}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section aria-label="Next project" className="py-[var(--space-section)]">
          <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-[var(--space-edge)] sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-mono-data text-xs tracking-[var(--tracking-mono)] text-[var(--text-muted)] uppercase">
                Next project
              </p>
              <h2 className="font-display mt-2 text-2xl font-semibold tracking-tight text-[var(--text)]">
                {SLATE_VISION_PROJECT.title}
              </h2>
            </div>
            <Link href={`/#project-${SLATE_VISION_PROJECT.id}`} className="btn-split btn-outline">
              <span className="btn-label">{SLATE_VISION_PROJECT.title}</span>
              <span className="btn-arrow" aria-hidden="true">
                <ArrowUpRight className="h-4 w-4" />
              </span>
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </ShellProviders>
  );
}
