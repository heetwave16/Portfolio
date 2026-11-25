import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
  getContrastBandTheme,
  getNextTheme,
  getThemeInitScript,
  parseThemeMode,
  resolveInitialTheme,
} from "./theme";

test("parseThemeMode accepts only dark or light", () => {
  assert.equal(parseThemeMode("dark"), "dark");
  assert.equal(parseThemeMode("light"), "light");
  assert.equal(parseThemeMode("system"), null);
  assert.equal(parseThemeMode(""), null);
  assert.equal(parseThemeMode(null), null);
  assert.equal(parseThemeMode(undefined), null);
});

test("resolveInitialTheme prioritizes stored preference and defaults cleanly", () => {
  assert.equal(resolveInitialTheme({ storedTheme: "light", systemPrefersLight: false }), "light");
  assert.equal(resolveInitialTheme({ storedTheme: "dark", systemPrefersLight: true }), "dark");
  assert.equal(resolveInitialTheme({ storedTheme: "invalid", systemPrefersLight: false }), DEFAULT_THEME);
  assert.equal(resolveInitialTheme({ storedTheme: null, systemPrefersLight: true }), "light");
});

test("getNextTheme and getContrastBandTheme invert polarity cleanly", () => {
  assert.equal(getNextTheme("dark"), "light");
  assert.equal(getNextTheme("light"), "dark");
  assert.equal(getContrastBandTheme("dark"), "light");
  assert.equal(getContrastBandTheme("light"), "dark");
});

test("getThemeInitScript references storage key and sets data-theme + dark class", () => {
  const script = getThemeInitScript();
  assert.ok(script.includes(THEME_STORAGE_KEY));
  assert.ok(script.includes('setAttribute("data-theme"'));
  assert.ok(script.includes('classList.toggle("dark"'));
});
