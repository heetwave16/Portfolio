"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Menu, X, ArrowUpRight, FileDown, Mail, Sun, Moon } from "lucide-react";
import { SITE_CONFIG } from "@/src/config";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import {
  activateAnchorOnSpace,
  getFocusableElements,
  getNextRovingIndex,
} from "@/src/lib/keyboard";
import { useLenisScroll, useTheme } from "./ShellProviders";

const SECTION_LINKS = [
  { label: "Projects", href: "#projects" },
  { label: "What I Build", href: "#what-i-build" },
  { label: "GitHub Pulse", href: "#pulse" },
  { label: "Open Source", href: "#open-source" },
  { label: "About", href: "#about" },
  { label: "Contact", href: "#contact" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const pendingFocusTargetRef = useRef<"first" | "last" | null>(null);
  const reducedMotion = useReducedMotion();
  const { scrollToAnchor } = useLenisScroll();
  const { theme, toggleTheme } = useTheme();

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
    e.preventDefault();
    if (closeDropdown) {
      setOpen(false);
    }
    scrollToAnchor(href, { focusTarget: true, updateHistory: true });
  };

  return (
    <header className="fixed top-0 right-0 left-0 z-[var(--z-nav)] h-[var(--nav-height)] border-b border-[var(--border)] bg-[var(--bg)]/85 backdrop-blur-md">
      <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between gap-4 px-[var(--space-edge)]">
        {/* Top-Left: Monogram + Studio Wordmark */}
        <a
          href="#top"
          onClick={(e) => handleAnchorLinkClick(e, "#top")}
          onKeyDown={activateAnchorOnSpace}
          className="group inline-flex items-center gap-3 text-[var(--text)] transition-opacity hover:opacity-80 shrink-0"
          aria-label="Heet Mehta — Back to top"
        >
          <span className="font-mono-data inline-flex h-7 w-7 items-center justify-center border border-[var(--border-strong)] bg-[var(--surface)] text-[11px] font-semibold tracking-[var(--tracking-mono)] text-[var(--text)]">
            {SITE_CONFIG.monogram}
          </span>
          <span className="font-display text-sm font-semibold tracking-[-0.02em] text-[var(--text)] sm:text-[15px]">
            {SITE_CONFIG.fullName}
          </span>
        </a>

        {/* Top-Right: Minimalist Inline Links + Theme Toggle + Menu Drawer */}
        <div className="relative flex items-center gap-5 shrink-0">
          <nav
            aria-label="Primary studio links"
            className="hidden items-center gap-6 lg:flex"
          >
            {SECTION_LINKS.slice(0, 5).map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={(e) => handleAnchorLinkClick(e, item.href)}
                onKeyDown={activateAnchorOnSpace}
                className="text-[13px] font-medium tracking-[-0.01em] text-[var(--text-muted)] transition-colors duration-200 hover:text-[var(--text)]"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="theme-toggle"
              onClick={toggleTheme}
              aria-pressed={theme === "light"}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              className="font-mono-data inline-flex min-h-[36px] min-w-[36px] items-center justify-center gap-1.5 border border-[var(--border-strong)] bg-[var(--surface)] px-2.5 py-1.5 text-[11px] font-medium tracking-[var(--tracking-mono)] text-[var(--text)] transition-colors duration-200 hover:border-[var(--accent)] hover:bg-[var(--surface-2)] whitespace-nowrap shrink-0"
            >
              {theme === "dark" ? (
                <Sun className="h-3.5 w-3.5 text-[var(--text)]" aria-hidden="true" />
              ) : (
                <Moon className="h-3.5 w-3.5 text-[var(--text)]" aria-hidden="true" />
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
              className="font-mono-data inline-flex min-h-[36px] items-center gap-2 border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-1.5 text-[11px] font-medium tracking-[var(--tracking-mono)] text-[var(--text)] transition-colors duration-200 hover:border-[var(--accent)] hover:bg-[var(--surface-2)] whitespace-nowrap shrink-0"
            >
              <span>{open ? "CLOSE" : "MENU"}</span>
              {open ? <X className="h-3.5 w-3.5" /> : <Menu className="h-3.5 w-3.5" />}
            </button>
          </div>

          <AnimatePresence>
            {open && (
              <motion.div
                id="site-menu-dropdown"
                ref={menuRef}
                role="dialog"
                aria-label="Site navigation"
                onKeyDown={handleMenuKeyDown}
                onBlur={handleMenuBlur}
                initial={
                  reducedMotion
                    ? { opacity: 1, y: 0, scale: 1 }
                    : { opacity: 0, y: -10, scale: 0.98 }
                }
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.98 }}
                transition={{ duration: reducedMotion ? 0 : 0.32, ease: [0.16, 1, 0.3, 1] }}
                className="absolute top-[calc(100%+10px)] right-0 z-[var(--z-menu)] w-[min(90vw,340px)] border border-[var(--border-strong)] bg-[var(--surface)] p-5 shadow-2xl"
              >
                <nav aria-label="Section navigation" className="flex flex-col">
                  {SECTION_LINKS.map((item, idx) => (
                    <motion.a
                      key={item.href}
                      href={item.href}
                      onClick={(e) => handleAnchorLinkClick(e, item.href, true)}
                      onKeyDown={activateAnchorOnSpace}
                      initial={reducedMotion ? { opacity: 1, x: 0 } : { opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        duration: reducedMotion ? 0 : 0.24,
                        delay: reducedMotion ? 0 : idx * 0.03,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      className="group flex min-h-[44px] items-center justify-between border-b border-[var(--border)] px-1 py-2.5 text-base font-medium text-[var(--text)] transition-colors hover:text-[var(--text-muted)]"
                    >
                      <span>{item.label}</span>
                      <span className="font-mono-data text-xs text-[var(--text-muted)] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-[var(--text)]">
                        0{idx + 1}
                      </span>
                    </motion.a>
                  ))}
                </nav>

                {/* Quick reach actions at bottom of menu */}
                <div className="mt-5 flex flex-col gap-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    <a
                      href={`mailto:${SITE_CONFIG.email}`}
                      onClick={() => setOpen(false)}
                      onKeyDown={activateAnchorOnSpace}
                      className="inline-flex min-h-[40px] items-center justify-center gap-1.5 bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-[var(--on-accent)] transition-opacity hover:opacity-90 whitespace-nowrap"
                    >
                      <Mail className="h-3.5 w-3.5" />
                      <span>Email</span>
                    </a>
                    <a
                      href={SITE_CONFIG.resumePath}
                      download="Heet-Mehta-Resume.pdf"
                      onClick={() => setOpen(false)}
                      onKeyDown={activateAnchorOnSpace}
                      className="inline-flex min-h-[40px] items-center justify-center gap-1.5 border border-[var(--border-strong)] bg-[var(--surface-2)] px-3 py-2 text-xs font-semibold text-[var(--text)] transition-colors hover:border-[var(--accent)] whitespace-nowrap"
                    >
                      <FileDown className="h-3.5 w-3.5" />
                      <span>Resume</span>
                    </a>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-xs text-[var(--text-muted)]">
                    <a
                      href={SITE_CONFIG.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onKeyDown={activateAnchorOnSpace}
                      className="inline-flex items-center gap-1 px-1 py-0.5 hover:text-[var(--text)]"
                    >
                      <span>GitHub</span>
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </a>
                    <a
                      href={SITE_CONFIG.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onKeyDown={activateAnchorOnSpace}
                      className="inline-flex items-center gap-1 px-1 py-0.5 hover:text-[var(--text)]"
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
