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

test("A5: the nav dropdown sits above the search trigger and below the modal top layer", () => {
  const navDropdown = zIndexAt(shellCss, /\.rb-nav__children\s*\{[^}]*\}/);
  const searchTrigger = zIndexAt(searchCss, /\.rr-search-bar\s*\{[^}]*\}/);
  const component = read(
    "../../../packages/plugins/search/components/search-bar.tsx",
  );
  const client = read(
    "../../../packages/plugins/search/src/search-bar.client.ts",
  );

  assert.ok(
    searchTrigger < navDropdown,
    `search trigger (${searchTrigger}) must sit below the nav dropdown (${navDropdown})`,
  );
  assert.match(component, /<dialog/);
  assert.match(client, /\.showModal\(\)/);
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
    {
      file: "../../../packages/plugins/canvas/style.css",
      selector: ".rb-canvas",
    },
  ]) {
    const css = read(file);
    const name = escapeRegExp(selector);
    const scope = escapeRegExp(":is(:root, .rb-theme-root)");
    const explicit = declarationsFor(
      css,
      new RegExp(`${scope}\\[data-theme="dark"\\] ${name}[^{]*\\{([^}]*)\\}`),
    );
    const system = declarationsFor(
      css,
      new RegExp(
        `@media \\(prefers-color-scheme: dark\\) \\{[\\s\\S]*?${scope}:not\\(\\[data-theme\\]\\) ${name}[^{]*\\{([^}]*)\\}`,
      ),
    );

    assert.match(
      css,
      new RegExp(`${scope}\\[data-theme="dark"\\] ${name}`),
      `${selector} explicit dark must be scoped to the theme root`,
    );
    assert.match(
      css,
      new RegExp(`${scope}:not\\(\\[data-theme\\]\\) ${name}`),
      `${selector} system dark must be scoped to the theme root`,
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
    if (!/\[data-theme="dark"\]/.test(css)) continue;

    withDark.push(entry.name);
    assert.match(
      css,
      /@media \(prefers-color-scheme: dark\)[\s\S]*?(?::is\(:root, \.rb-theme-root\)|:root):not\(\[data-theme\]\)/,
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

  assert.match(component, /class="rr-search-bar rr-search" data-search-root/);
  assert.match(
    component,
    /<\/div>\s*<dialog[\s\S]*?class="rr-search-modal rr-search"[\s\S]*?data-search-modal/,
  );
});

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
    const name = /data-theme-name="([^"]+)"/.exec(css)?.[1];
    assert.ok(name, `${entry.name} must set a data-theme-name`);
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
      `${relative} must use data-theme="dark" plus prefers-color-scheme, not a .dark class`,
    );
  }
  assert.ok(
    relativePaths.length >= 20,
    `expected to scan themes and plugins, saw ${relativePaths.length}`,
  );
});

test("A7: every theme exposes the public color tokens in all three states", () => {
  for (const { name, relative } of themeStyleFiles()) {
    const css = read(relative);
    const token = escapeRegExp(name);
    const blocks = {
      light: extractRule(
        css,
        new RegExp(
          `:is\\(\\s*:root,\\s*\\.rb-theme-root\\s*\\)\\[data-theme-name="${token}"\\]\\s*\\{([^}]*)\\}`,
        ),
      ),
      "explicit dark": extractRule(
        css,
        new RegExp(
          `\\[data-theme-name="${token}"\\]\\[data-theme="dark"\\]\\s*\\{([^}]*)\\}`,
        ),
      ),
      "system dark": extractRule(
        css,
        new RegExp(
          `@media \\(prefers-color-scheme: dark\\)\\s*\\{[\\s\\S]*?\\[data-theme-name="${token}"\\]:not\\(\\[data-theme\\]\\)\\s*\\{([^}]*)\\}`,
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
        `\\[data-theme-name="${token}"\\]\\[data-theme="dark"\\]\\s*\\{([^}]*)\\}`,
      ),
    );
    const system = extractRule(
      css,
      new RegExp(
        `@media \\(prefers-color-scheme: dark\\)\\s*\\{[\\s\\S]*?\\[data-theme-name="${token}"\\]:not\\(\\[data-theme\\]\\)\\s*\\{([^}]*)\\}`,
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
    /^\s*(?:html|:root)(?:\[data-theme="dark"\]|:not\(\[data-theme\]\))/;
  let scoped = 0;

  for (const entry of readdirSync(pluginsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const relative = `../../../packages/plugins/${entry.name}/style.css`;
    if (!existsSync(new URL(relative, import.meta.url))) continue;
    const css = read(relative);

    if (css.includes(`${THEME_ROOT_SCOPE}[data-theme="dark"]`)) scoped += 1;

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

  assert.ok(
    scoped >= 19,
    `expected at least 19 plugins with theme-root-scoped dark overrides, saw ${scoped}`,
  );
});

test("P2-A2: the portaled hover preview keeps document-global dark behavior", () => {
  const css = read("../../../packages/plugins/hover-preview/style.css");
  assert.match(
    css,
    /html\[data-theme="dark"\] \.rb-hover-preview/,
    "the hover preview popover is portaled to document.body, so its dark override stays document-global",
  );
});

test("P2-A2: the theme gallery renders previews inside an embedded theme root", () => {
  const gallery = read("../app/routes/themes.tsx");
  assert.match(gallery, /class="rb-theme-root theme-gallery__preview"/);
  assert.match(gallery, /data-theme-name=\{preview\.theme\}/);
  assert.match(gallery, /data-theme=\{preview\.mode\}/);
});
