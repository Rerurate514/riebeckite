import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";

function read(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractRule(css: string, pattern: RegExp): string {
  const match = pattern.exec(css);
  assert.ok(match, `missing rule ${pattern}`);
  return match[1];
}

function tokenPairs(body: string): string[] {
  return [...body.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)]
    .map((match) => `${match[1]}=${match[2].replace(/\s+/g, " ").trim()}`)
    .sort();
}

function themeStyleFiles(): Array<{ name: string; relative: string }> {
  const themesDir = new URL("../../../packages/themes/", import.meta.url);
  const themes: Array<{ name: string; relative: string }> = [];
  for (const entry of readdirSync(themesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const relative = `../../../packages/themes/${entry.name}/styles/theme.css`;
    if (!existsSync(new URL(relative, import.meta.url))) continue;
    const css = read(relative);
    const name = /data-rb-theme="([^"]+)"/.exec(css)?.[1];
    assert.ok(name, `${entry.name} must set a data-rb-theme`);
    themes.push({ name, relative });
  }
  return themes;
}

const PUBLIC_COLOR_TOKENS = [
  "--rb-color-paper",
  "--rb-color-surface",
  "--rb-color-surface-hover",
  "--rb-color-ink",
  "--rb-color-muted",
  "--rb-color-accent",
  "--rb-color-danger",
  "--rb-color-success",
  "--rb-color-code-background",
  "--rb-color-overlay",
];

test("A7: dark mode has a single mechanism, no .dark class", () => {
  const relativePaths = [
    ...themeStyleFiles().map((theme) => theme.relative),
    ...readdirSync(new URL("../../../packages/plugins/", import.meta.url), {
      withFileTypes: true,
    })
      .filter((entry) => entry.isDirectory())
      .map((entry) => `../../../packages/plugins/${entry.name}/style.css`)
      .filter((relative) => existsSync(new URL(relative, import.meta.url))),
  ];

  const darkClass = /html\.dark|(^|[\s,])\.dark([\s,{:]|$)/m;
  for (const relative of relativePaths) {
    assert.doesNotMatch(
      read(relative),
      darkClass,
      `${relative} must use data-rb-mode="dark" plus prefers-color-scheme, not a .dark class`,
    );
  }
});

test("A7: every theme exposes the public color tokens in all three states", () => {
  for (const { name, relative } of themeStyleFiles()) {
    const css = read(relative);
    const token = escapeRegExp(name);
    const blocks = {
      light: extractRule(
        css,
        new RegExp(
          `:is\\(\\s*:root,\\s*\\.rb-theme-root\\s*\\)\\[data-rb-theme="${token}"\\]\\s*\\{([^}]*)\\}`,
        ),
      ),
      "explicit dark": extractRule(
        css,
        new RegExp(
          `\\[data-rb-theme="${token}"\\]\\[data-rb-mode="dark"\\]\\s*\\{([^}]*)\\}`,
        ),
      ),
      "system dark": extractRule(
        css,
        new RegExp(
          `@media \\(prefers-color-scheme: dark\\)\\s*\\{[\\s\\S]*?\\[data-rb-theme="${token}"\\]:not\\(\\[data-rb-mode\\]\\)\\s*\\{([^}]*)\\}`,
        ),
      ),
    };
    for (const state of Object.keys(blocks)) {
      for (const tokenName of PUBLIC_COLOR_TOKENS) {
        assert.ok(
          blocks[state as keyof typeof blocks].includes(`${tokenName}:`),
          `${name} must define ${tokenName} in ${state}`,
        );
      }
    }
  }
});

test("A7: every theme resolves identical dark tokens in explicit and system dark", () => {
  for (const { name, relative } of themeStyleFiles()) {
    const css = read(relative);
    const token = escapeRegExp(name);
    const explicit = extractRule(
      css,
      new RegExp(
        `\\[data-rb-theme="${token}"\\]\\[data-rb-mode="dark"\\]\\s*\\{([^}]*)\\}`,
      ),
    );
    const system = extractRule(
      css,
      new RegExp(
        `@media \\(prefers-color-scheme: dark\\)\\s*\\{[\\s\\S]*?\\[data-rb-theme="${token}"\\]:not\\(\\[data-rb-mode\\]\\)\\s*\\{([^}]*)\\}`,
      ),
    );

    assert.ok(tokenPairs(explicit).length >= 10, `${name} dark tokens missing`);
    assert.deepEqual(
      tokenPairs(system),
      tokenPairs(explicit),
      `${name} must resolve the same dark tokens in explicit and system dark`,
    );
  }
});

const THEME_ROOT_SCOPE = ":is(:root, .rb-theme-root)";
const PORTALED_DARK_PLUGINS = new Set(["hover-preview"]);

test("P2-A2: plugin dark overrides are scoped to the theme root, not just the document root", () => {
  const pluginsDir = new URL("../../../packages/plugins/", import.meta.url);
  const documentRootOnly =
    /^\s*(?:html|:root)(?:\[data-rb-mode="dark"\]|:not\(\[data-rb-mode\]\))/;
  for (const entry of readdirSync(pluginsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const relative = `../../../packages/plugins/${entry.name}/style.css`;
    if (!existsSync(new URL(relative, import.meta.url))) continue;
    const css = read(relative);

    if (PORTALED_DARK_PLUGINS.has(entry.name)) continue;
    const offenders = css
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => documentRootOnly.test(line));
    assert.deepEqual(
      offenders,
      [],
      `${entry.name}/style.css must scope dark overrides to ${THEME_ROOT_SCOPE} so embedded theme roots resolve them`,
    );
  }
});
