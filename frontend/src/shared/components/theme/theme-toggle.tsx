"use client";

import { Moon, Sun } from "lucide-react";
import * as React from "react";

import { cn } from "@/shared/lib/cn";
import {
  DEFAULT_THEME,
  THEME_ATTRIBUTE,
  THEME_STORAGE_KEY,
  type Theme,
  toTheme,
} from "@/shared/lib/theme";

/**
 * Switches the portal between the light and dark palettes.
 *
 * <p>The whole mechanism is one attribute on `<html>`: the stylesheet declares
 * both palettes under the same token names, so flipping the attribute re-themes
 * every screen at once. Nothing re-renders and no data is refetched — which is
 * why the change is instant even on the shop's older counter machine.
 *
 * <p><b>State starts at the default and is corrected on mount</b>, rather than
 * reading the real value during render. A Client Component's first render also
 * happens on the server, where `localStorage` does not exist; guessing there
 * and correcting in the browser is what produces a hydration mismatch. Starting
 * both renders from the same known value and reconciling in an effect costs one
 * frame of a possibly-wrong icon and buys a clean hydration.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = React.useState<Theme>(DEFAULT_THEME);

  // The pre-paint script has already put the real value on <html>, so read it
  // back from there rather than from storage — one source of truth, and it also
  // covers the case where storage was unreadable and the script fell back.
  React.useEffect(() => {
    setTheme(
      toTheme(document.documentElement.getAttribute(THEME_ATTRIBUTE)),
    );
  }, []);

  // Keep other tabs in step. An administrator with the dashboard open beside a
  // report and half the screen in each theme looks like a rendering fault.
  // `storage` only fires in the *other* tabs, so this cannot loop.
  React.useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY) return;

      const next = toTheme(event.newValue);
      document.documentElement.setAttribute(THEME_ATTRIBUTE, next);
      setTheme(next);
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";

    // The attribute first, so the repaint happens immediately; persistence is
    // the secondary concern and is allowed to fail. A browser with site data
    // blocked still gets a working toggle for the length of the session.
    document.documentElement.setAttribute(THEME_ATTRIBUTE, next);
    setTheme(next);

    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Nothing to do and nothing worth telling the user: the theme changed,
      // it simply will not be remembered next time.
    }
  };

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      // Names the action rather than the state. "Dark mode" alone leaves a
      // screen-reader user guessing whether it reports the current setting or
      // offers the other one.
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Light theme" : "Dark theme"}
      className={cn(
        "inline-flex size-10 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-canvas-subtle hover:text-ink",
        className,
      )}
    >
      {/* Shows the destination, not the present state: the sun means "go to
          light", which is the convention every OS settings panel uses. */}
      {isDark ? (
        <Sun aria-hidden className="size-5" />
      ) : (
        <Moon aria-hidden className="size-5" />
      )}
    </button>
  );
}
