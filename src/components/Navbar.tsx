"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Menu, X, ArrowUpRight, FileDown, Mail, Sun, Moon } from "lucide-react";
import { SITE_CONFIG } from "@/src/config";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useActiveSection } from "@/hooks/use-active-section";
import {
  activateAnchorOnSpace,
  getFocusableElements,
  getNextRovingIndex,
} from "@/src/lib/keyboard";
import { useLenisScroll, useTheme } from "./ShellProviders";

const SECTION_LINKS = [
  { label: "Projects", id: "projects" },
  { label: "Open Source", id: "open-source" },
  { label: "About", id: "about" },
  { label: "Contact", id: "contact" },
];

const SECTION_IDS = SECTION_LINKS.map((link) => link.id);

export default function Navbar() {
  const pathname = usePathname();
  const homeAnchorHref = (hash: string) => (pathname === "/" ? hash : `/${hash}`);
  const topHref = homeAnchorHref("#top");
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const pendingFocusTargetRef = useRef<"first" | "last" | null>(null);
  const reducedMotion = useReducedMotion();
  const { scrollToAnchor } = useLenisScroll();
  const { theme, toggleTheme } = useTheme();
  const activeSection = useActiveSection(SECTION_IDS);
  const activeIndex = SECTION_IDS.indexOf(activeSection ?? "");
  const activeLink = activeIndex >= 0 ? SECTION_LINKS[activeIndex] : null;

  const closeMenu = useCallback((restoreFocus = false) => {
    setOpen(false);
    if (restoreFocus) {
      requestAnimationFrame(() => {
        triggerRef.current?.focus();
      });
    }
  }, []);

  useEffect(() => {
    if (!open) return;

    const targetEdge = pendingFocusTargetRef.current;
    pendingFocusTargetRef.current = null;
    const rafId = requestAnimationFrame(() => {
      const items = getFocusableElements(menuRef.current);
      if (items.length === 0) return;
      if (targetEdge === "last") {
        items[items.length - 1].focus();
      } else {
        items[0].focus();
      }
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeMenu(true);
      }
    };

    const handlePointerDown = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        !triggerRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [open, closeMenu]);

  const handleTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) {
        pendingFocusTargetRef.current = "first";
        setOpen(true);
      } else {
        const items = getFocusableElements(menuRef.current);
        items[0]?.focus();
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) {
        pendingFocusTargetRef.current = "last";
        setOpen(true);
      } else {
        const items = getFocusableElements(menuRef.current);
        items[items.length - 1]?.focus();
      }
    }
  };

  const handleMenuKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const items = getFocusableElements(menuRef.current);
    if (items.length === 0) return;
    const currentIndex = items.indexOf(document.activeElement as HTMLElement);
    const nextIndex = getNextRovingIndex(currentIndex, items.length, e.key, "vertical");
    if (nextIndex !== null) {
      e.preventDefault();
      items[nextIndex]?.focus();
    }
  };

  const handleMenuBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    const nextTarget = e.relatedTarget as Node | null;
    if (
      nextTarget &&
      (menuRef.current?.contains(nextTarget) || triggerRef.current?.contains(nextTarget))
    ) {
      return;
    }
    if (nextTarget) {
      setOpen(false);
    }
  };

  const handleAnchorLinkClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    href: string,
    closeDropdown = false
  ) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    const target = new URL(href, window.location.href);
    if (target.origin !== window.location.origin || target.pathname !== window.location.pathname || !target.hash) {
      return;
    }
    e.preventDefault();
    if (closeDropdown) {
      setOpen(false);
    }
    scrollToAnchor(target.hash, { focusTarget: true, updateHistory: true });
  };

  return (
    <header className="fixed top-0 right-0 left-0 z-[var(--z-nav)] h-[var(--nav-height)] border-b border-[var(--border)] bg-[var(--bg)]">
      <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between gap-4 px-[var(--space-edge)]">
        {/* Left: Monogram */}
        <a
          href={topHref}
          onClick={(e) => handleAnchorLinkClick(e, topHref)}
          onKeyDown={activateAnchorOnSpace}
          className="ui-btn ui-btn--surface font-mono-data inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--surface)] text-xs font-semibold tracking-[var(--tracking-mono)] whitespace-nowrap text-[var(--text)]"
          aria-label="Back to top"
        >
          {SITE_CONFIG.monogram}
        </a>

        {/* Center: Name + live section indicator (nav active state) */}
        <div className="flex min-w-0 items-center gap-3">
          <a
            href={topHref}
            onClick={(e) => handleAnchorLinkClick(e, topHref)}
            onKeyDown={activateAnchorOnSpace}
            className="ui-link font-display px-1.5 py-1 text-base font-semibold tracking-tight text-[var(--text)] whitespace-nowrap shrink-0 sm:text-lg"
          >
            {SITE_CONFIG.fullName}
          </a>
          <span
            aria-hidden="true"
            className={`font-mono-data hidden items-center gap-2 text-[11px] tracking-[var(--tracking-mono)] text-[var(--text-muted)] uppercase transition-opacity duration-300 md:inline-flex ${
              activeLink ? "opacity-100" : "opacity-0"
            }`}
          >
            <span className="h-3 w-px bg-[var(--border-strong)]" />
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
            <span key={activeLink?.id ?? "none"} className="whitespace-nowrap">
              {activeLink ? `0${activeIndex + 1} ${activeLink.label}` : ""}
            </span>
          </span>
        </div>

        {/* Right: Theme toggle + MENU button */}
        <div className="relative flex items-center gap-2 shrink-0">
          <button
            type="button"
            data-testid="theme-toggle"
            onClick={toggleTheme}
            aria-pressed={theme === "light"}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="ui-btn ui-btn--surface font-mono-data inline-flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--surface)] text-xs font-medium tracking-[var(--tracking-mono)] whitespace-nowrap text-[var(--text)] sm:w-auto sm:min-w-[92px] sm:px-3"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4 shrink-0 text-[var(--text)]" aria-hidden="true" />
            ) : (
              <Moon className="h-4 w-4 shrink-0 text-[var(--text)]" aria-hidden="true" />
            )}
            <span className="hidden sm:inline">{theme === "dark" ? "LIGHT" : "DARK"}</span>
          </button>

          <button
            ref={triggerRef}
            type="button"
            onClick={() => {
              if (!open) {
                pendingFocusTargetRef.current = "first";
              }
              setOpen((prev) => !prev);
            }}
            onKeyDown={handleTriggerKeyDown}
            aria-expanded={open}
            aria-haspopup="true"
            aria-controls="site-menu-dropdown"
            aria-label={open ? "Close navigation menu" : "Open navigation menu"}
            className="ui-btn ui-btn--surface font-mono-data inline-flex h-10 shrink-0 items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--surface)] px-3.5 text-xs font-medium tracking-[var(--tracking-mono)] whitespace-nowrap text-[var(--text)] sm:px-4"
          >
            <span>{open ? "CLOSE" : "MENU"}</span>
            {open ? <X className="h-4 w-4 shrink-0" aria-hidden="true" /> : <Menu className="h-4 w-4 shrink-0" aria-hidden="true" />}
          </button>

          <AnimatePresence>
            {open && (
              <motion.div
                id="site-menu-dropdown"
                ref={menuRef}
                role="dialog"
                aria-label="Site navigation"
                onKeyDown={handleMenuKeyDown}
                onBlur={handleMenuBlur}
                initial={reducedMotion ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: -10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.98 }}
                transition={{ duration: reducedMotion ? 0 : 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="absolute top-[calc(100%+12px)] right-0 z-[var(--z-menu)] w-[min(90vw,340px)] rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--surface)] p-5 shadow-2xl"
              >
                <nav aria-label="Section navigation" className="flex flex-col">
                  {SECTION_LINKS.map((item, idx) => {
                    const isActive = activeIndex === idx;
                    const href = homeAnchorHref(`#${item.id}`);
                    return (
                    <motion.div
                      key={item.id}
                      initial={reducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: reducedMotion ? 0 : 0.4,
                        delay: reducedMotion ? 0 : 0.06 + idx * 0.05,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      className="border-b border-[var(--border)] py-0.5"
                    >
                    <a
                      href={href}
                      aria-current={isActive ? "location" : undefined}
                      onClick={(e) => handleAnchorLinkClick(e, href, true)}
                      onKeyDown={activateAnchorOnSpace}
                      className="ui-row group flex min-h-[44px] items-center justify-between rounded-[var(--radius-sm)] px-2 py-2.5 text-base font-medium text-[var(--text)]"
                    >
                      <span className="inline-flex items-center gap-2">
                        <span
                          aria-hidden="true"
                          className={`inline-block h-1.5 w-1.5 rounded-full transition-colors ${
                            isActive ? "bg-[var(--accent)]" : "bg-transparent"
                          }`}
                        />
                        <span className="u-draw pb-0.5">{item.label}</span>
                      </span>
                      <span className="font-mono-data text-xs text-[var(--text-muted)] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-[var(--text)]">
                        0{idx + 1}
                      </span>
                    </a>
                    </motion.div>
                    );
                  })}
                </nav>

                {/* Quick 5-second reach actions at bottom of menu */}
                <div className="mt-5 flex flex-col gap-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    <a
                      href={`mailto:${SITE_CONFIG.email}`}
                      onClick={() => setOpen(false)}
                      onKeyDown={activateAnchorOnSpace}
                      className="ui-btn ui-btn--accent inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-[var(--radius-sm)] bg-[var(--accent)] px-3 py-2 text-xs font-semibold whitespace-nowrap text-[var(--on-accent)]"
                    >
                      <Mail className="h-3.5 w-3.5" />
                      <span>Email</span>
                    </a>
                    <a
                      href={SITE_CONFIG.resumePath}
                      download="Heet-Mehta-Resume.pdf"
                      onClick={() => setOpen(false)}
                      onKeyDown={activateAnchorOnSpace}
                      className="ui-btn ui-btn--ghost inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--surface-2)] px-3 py-2 text-xs font-semibold whitespace-nowrap text-[var(--text)]"
                    >
                      <FileDown className="h-3.5 w-3.5" />
                      <span>Resume</span>
                    </a>
                  </div>

                  <div className="-mx-2 flex items-center justify-between pt-1 text-xs text-[var(--text-muted)]">
                    <a
                      href={SITE_CONFIG.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onKeyDown={activateAnchorOnSpace}
                      className="ui-link inline-flex min-h-[36px] items-center gap-1 px-2 hover:text-[var(--text)]"
                    >
                      <span>GitHub</span>
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </a>
                    <a
                      href={SITE_CONFIG.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onKeyDown={activateAnchorOnSpace}
                      className="ui-link inline-flex min-h-[36px] items-center gap-1 px-2 hover:text-[var(--text)]"
                    >
                      <span>LinkedIn</span>
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
