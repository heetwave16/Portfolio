import React from "react";
import { Github, Linkedin, Mail } from "lucide-react";
import { SITE_CONFIG } from "@/src/config";

const LINKS = [
  { label: "GitHub", href: SITE_CONFIG.githubUrl, Icon: Github, external: true },
  { label: "LinkedIn", href: SITE_CONFIG.linkedinUrl, Icon: Linkedin, external: true },
  { label: "Email", href: `mailto:${SITE_CONFIG.email}`, Icon: Mail, external: false },
] as const;

/** One consistent line-icon set (lucide), 44px touch targets, visible labels for screen readers. */
export default function SocialLinks({
  className = "",
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md";
}) {
  const box = size === "sm" ? "h-10 w-10" : "h-11 w-11";
  return (
    <ul className={`flex items-center gap-2 ${className}`} aria-label="Social links">
      {LINKS.map(({ label, href, Icon, external }) => (
        <li key={label}>
          <a
            href={href}
            {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            aria-label={external ? `${label} (opens in a new tab)` : `${label} ${SITE_CONFIG.email}`}
            title={label}
            className={`ui-btn ui-btn--ghost inline-flex ${box} items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border-strong)] text-[var(--text)]`}
          >
            <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden="true" />
          </a>
        </li>
      ))}
    </ul>
  );
}
