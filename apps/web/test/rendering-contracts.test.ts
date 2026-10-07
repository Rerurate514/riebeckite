import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";

function read(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

const themeCss = read("../../../packages/themes/rerurate/styles/theme.css");
const searchCss = read("../../../packages/plugins/search/style.css");
const shellCss = read("../app/styles/shell.css");

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function declarationsFor(css: string, pattern: RegExp): string {
  const match = pattern.exec(css);
  assert.ok(match, `missing rule ${pattern}`);
  return match[1].replace(/\s+/g, " ").trim();
}

function zIndexAt(css: string, selector: RegExp): number {
  const match = selector.exec(css);
  assert.ok(match, `missing selector ${selector}`);
  const rule = match[0];
  const value = /z-index:\s*(-?\d+)/.exec(rule);
  assert.ok(value, `missing z-index in ${selector}`);
  return Number(value[1]);
}

test("A1: rendered blocks own their foreground, the theme keeps bare markdown pre", () => {
  assert.match(
    themeCss,
    /:where\([\s\S]*?\.rb-article-content[\s\S]*?pre:not\(:where\(\.rr-code \*\)\)[\s\S]*?\)/,
  );
  assert.doesNotMatch(
    themeCss,
    /:is\(:root, \.rb-theme-root\)\[data-theme-name="rerurate"\]\s+\.rb-article-content\s+pre:not\(:where\(\.rr-code \*\)\)\s*\{/,
  );
  assert.match(themeCss, /\.rr-code\s*\{[^}]*margin:\s*1\.75rem 0 0/);
});

test("A3: the theme resets the code root rhythm inside CodeTabs only", () => {
  assert.match(
    themeCss,
    /\.rr-code-tabs\s+\.rr-code\s*\{[^}]*margin-block:\s*0[^}]*border:\s*0/,
  );
  assert.match(themeCss, /\.rr-code-tabs\s*\{[^}]*border-radius:\s*0/);
});

test("A5: the nav dropdown sits above the search trigger and below the search modal", () => {
  const navDropdown = zIndexAt(shellCss, /\.rb-nav__children\s*\{[^}]*\}/);
  const searchTrigger = zIndexAt(searchCss, /\.search-bar\s*\{[^}]*\}/);
  const searchModal = zIndexAt(searchCss, /\.search-modal\s*\{[^}]*\}/);

  assert.ok(
    searchTrigger < navDropdown,
    `search trigger (${searchTrigger}) must sit below the nav dropdown (${navDropdown})`,
  );
  assert.ok(
    navDropdown < searchModal,
    `nav dropdown (${navDropdown}) must sit below the search modal (${searchModal})`,
  );
});

test("A7: rendered plugins treat explicit dark and system dark identically", () => {
  for (const { file, selector } of [
    {
      file: "../../../packages/plugins/mermaid/style.css",
      selector: ".rr-mermaid",
    },
    {
      file: "../../../packages/plugins/kanban/style.css",
      selector: ".rb-kanban",
    },
    {
      file: "../../../packages/plugins/wavedrom/style.css",
      selector: ".rb-wavedrom",
    },
  ]) {
    const css = read(file);
    const name = escapeRegExp(selector);
    const explicit = declarationsFor(
      css,
      new RegExp(`html\\[data-theme="dark"\\] ${name}[^{]*\\{([^}]*)\\}`),
    );
    const system = declarationsFor(
      css,
      new RegExp(
        `@media \\(prefers-color-scheme: dark\\) \\{[\\s\\S]*?:root:not\\(\\[data-theme\\]\\) ${name}[^{]*\\{([^}]*)\\}`,
      ),
    );

    assert.equal(
      system,
      explicit,
      `${selector} dark declarations must match in explicit and system dark`,
    );
    assert.match(explicit, /--/);
  }
});

test("A7: every plugin with explicit dark tokens also handles system dark", () => {
  const pluginsDir = new URL("../../../packages/plugins/", import.meta.url);
  const withDark: string[] = [];

  for (const entry of readdirSync(pluginsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const file = new URL(
      `../../../packages/plugins/${entry.name}/style.css`,
      import.meta.url,
    );
    if (!existsSync(file)) continue;

    const css = readFileSync(file, "utf8");
    if (!/\[data-theme="dark"\]|html\.dark/.test(css)) continue;

    withDark.push(entry.name);
    assert.match(
      css,
      /@media \(prefers-color-scheme: dark\)[\s\S]*?:root:not\(\[data-theme\]\)/,
      `${entry.name}/style.css declares explicit dark but has no system-dark twin`,
    );
  }

  assert.ok(
    withDark.length >= 19,
    `expected at least 19 rendered plugins with explicit dark tokens, saw ${withDark.length}`,
  );
});

test("A7: the theme resolves dark tokens in both explicit and system dark", () => {
  assert.match(themeCss, /--rb-color-paper:\s*#f6efe2/);
  assert.match(
    themeCss,
    /\[data-theme="dark"\][\s\S]*?--rb-color-paper:\s*#1c1a17/,
  );
  assert.match(
    themeCss,
    /@media \(prefers-color-scheme: dark\)[\s\S]*?:not\(\[data-theme\]\)[\s\S]*?--rb-color-paper:\s*#1c1a17/,
  );
});

test("A7: the code root paints an opaque surface, not a page-relative tint", () => {
  assert.match(themeCss, /--rb-color-code-surface:\s*#1c1a17/);
  assert.match(
    themeCss,
    /\[data-theme="dark"\][\s\S]*?--rb-color-code-surface:\s*color-mix\([\s\S]*?var\(--rb-color-paper\)/,
  );
  assert.match(
    themeCss,
    /@media \(prefers-color-scheme: dark\)[\s\S]*?:not\(\[data-theme\]\)[\s\S]*?--rb-color-code-surface:\s*color-mix\([\s\S]*?var\(--rb-color-paper\)/,
  );
  assert.match(
    themeCss,
    /\.rr-code:not\(\[data-terminal="true"\]\)\s*\{[^}]*--rr-code-paper:\s*var\(--rb-color-code-surface\)/,
  );
  assert.doesNotMatch(
    themeCss,
    /--rr-code-paper:\s*var\(--rb-color-code-background\)/,
  );
  assert.match(themeCss, /--rb-color-code-background:\s*color-mix\(/);
});

test("A5: the search modal is a sibling of the fixed search trigger", () => {
  const component = read(
    "../../../packages/plugins/search/components/search-bar.tsx",
  );

  assert.match(component, /class="search-bar rr-search" data-search-root/);
  assert.match(
    component,
    /<\/div>\s*<div class="search-modal rr-search" data-search-modal hidden>/,
  );
});
