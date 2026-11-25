import type { Metadata } from "next";
import Link from "next/link";
import content from "@/src/content/content.json";

export const metadata: Metadata = {
  title: "404 — Page not found · Heet Mehta",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <main
      id="main-content"
      className="relative flex min-h-[100dvh] flex-col justify-between overflow-hidden bg-[var(--bg)] px-[var(--space-edge)] py-8 text-[var(--text)]"
    >
      <div className="font-mono-data flex items-center justify-between text-[11px] tracking-[var(--tracking-mono)] text-[var(--text-muted)] uppercase">
        <Link href="/" className="inline-flex items-center gap-2 text-[var(--text)]">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--surface)] text-xs">
            HM
          </span>
          <span>Heet Mehta</span>
        </Link>
        <span>ERR 404 // NOT_FOUND</span>
      </div>

      <div className="mx-auto w-full max-w-[1440px]">
        <p
          className="font-display font-bold tracking-[-0.06em] text-[var(--text)]"
          style={{ fontSize: "clamp(7rem, 30vw, 26rem)", lineHeight: 0.82 }}
          aria-hidden="true"
        >
          4<span className="text-[var(--accent)]">0</span>4
        </p>
        <h1 className="font-display mt-6 max-w-2xl text-2xl font-semibold tracking-tight sm:text-4xl">
          {content.notFound.line}
        </h1>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link href="/" className="btn-split btn-primary">
            <span className="btn-label">{content.notFound.cta}</span>
            <span className="btn-arrow" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 17 17 7M7 7h10v10" />
              </svg>
            </span>
          </Link>
          <Link href="/#projects" className="btn-split btn-outline">
            <span className="btn-label">See projects</span>
            <span className="btn-arrow" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 17 17 7M7 7h10v10" />
              </svg>
            </span>
          </Link>
        </div>
      </div>

      <p className="font-mono-data text-xs text-[var(--text-muted)]">{content.footer.copyright}</p>
    </main>
  );
}
