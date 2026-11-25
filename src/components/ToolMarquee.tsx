import React from "react";
import content from "@/src/content/content.json";

/**
 * The site's single marquee (ORECA pattern): the real stack, slow, pauses on hover/focus,
 * becomes a static wrapped list under prefers-reduced-motion.
 */
export default function ToolMarquee() {
  const items = content.tools.items;
  const Row = ({ dup = false }: { dup?: boolean }) => (
    <ul
      className={`flex shrink-0 items-center ${dup ? "marquee-dup" : ""}`}
      aria-hidden={dup ? true : undefined}
    >
      {items.map((t) => (
        <li
          key={`${dup ? "d" : "o"}-${t}`}
          className="font-display flex items-center gap-6 pr-6 text-[clamp(1.25rem,2.6vw,2rem)] font-semibold tracking-tight whitespace-nowrap text-[var(--text)]"
        >
          <span>{t}</span>
          <span aria-hidden="true" className="inline-block h-1.5 w-1.5 rotate-45 bg-[var(--accent)]" />
        </li>
      ))}
    </ul>
  );

  return (
    <section
      aria-label={content.tools.label}
      className="marquee relative overflow-hidden border-y border-[var(--border)] bg-[var(--bg)] py-5 sm:py-6"
    >
      <p className="sr-only">{content.tools.label}</p>
      <div className="marquee-track">
        <Row />
        <Row dup />
      </div>
    </section>
  );
}
