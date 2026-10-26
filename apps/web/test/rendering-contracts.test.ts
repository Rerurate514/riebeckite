import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";

function read(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

const themeCss = read("../../../packages/themes/rerurate/styles/theme.css");
const navigationCss = read("../../../packages/plugins/navigation/style.css");
const searchCss = read("../../../packages/plugins/search/style.css");
const shellCss = read("../app/styles/shell.css");
const articleCss = read("../app/components/article/style.css");

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

function ruleSelectors(css: string): string {
  return [...css.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/([^{}]+)\{/g)]
    .map((match) => match[1])
    .filter((selector) => !selector.trimStart().startsWith("@"))
    .join("\n");
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
  const navDropdown = zIndexAt(
    navigationCss,
    /\.rb-nav__children\s*\{[^}]*z-index:\s*\d+[^}]*\}/,
  );
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

  for (const entry of readdirSync(pluginsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const file = new URL(
      `../../../packages/plugins/${entry.name}/style.css`,
      import.meta.url,
    );
    if (!existsSync(file)) continue;

    const css = readFileSync(file, "utf8");
    if (!/\[data-theme="dark"\]/.test(css)) continue;

    assert.match(
      css,
      /@media \(prefers-color-scheme: dark\)[\s\S]*?(?::is\(:root, \.rb-theme-root\)|:root):not\(\[data-theme\]\)/,
      `${entry.name}/style.css declares explicit dark but has no system-dark twin`,
    );
  }
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

test("A7: the theme leaves the code surface to the plugin in every mode", () => {
  assert.doesNotMatch(themeCss, /--rb-color-code-surface/);
  assert.doesNotMatch(themeCss, /data-terminal/);
  assert.doesNotMatch(
    themeCss,
    /--rr-code-syntax/,
    "the theme must leave syntax colour to the plugin so it follows the mode",
  );
  assert.doesNotMatch(
    themeCss,
    /--rr-code-paper:\s*var\(--rb-color-code-background\)/,
  );
  assert.match(themeCss, /--rb-color-code-background:\s*color-mix\(/);
  assert.match(
    themeCss,
    /pre:not\(:where\(\.rr-code \*\)\)\s*\)\s*\{[^}]*background:\s*var\(--rb-color-ink\)/,
    "the bare markdown pre keeps the dark ink surface in light mode",
  );
});

test("A7: fallback code surfaces own their foreground", () => {
  const sharedFallbackCss = read(
    "../../../packages/integrations/honox/style.css",
  );
  const sharedRule = declarationsFor(
    sharedFallbackCss,
    /\.rb-source-fallback > pre\s*\{([^}]*)\}/,
  );
  assert.match(sharedRule, /background\s*:/);
  assert.match(sharedRule, /(?:^|[;{\s])color\s*:/);

  const pluginsDir = new URL("../../../packages/plugins/", import.meta.url);
  const rule = /([^{}]+)\{([^{}]*)\}/g;

  for (const entry of readdirSync(pluginsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const relative = `../../../packages/plugins/${entry.name}/style.css`;
    if (!existsSync(new URL(relative, import.meta.url))) continue;
    const css = read(relative);

    for (const match of css.matchAll(rule)) {
      const selector = match[1].trim();
      const body = match[2];
      if (!/__fallback[^{}]*(?:pre|code)\b/i.test(selector)) continue;
      if (!/background\s*:/.test(body)) continue;
      assert.match(
        body,
        /(?:^|[;{\s])color\s*:/,
        `${relative} "${selector}" paints its own background but relies on the theme's bare-pre foreground`,
      );
    }
  }
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

test("P2-A2: the portaled hover preview keeps document-global dark behavior", () => {
  const css = read("../../../packages/plugins/hover-preview/style.css");
  assert.match(
    css,
    /html\[data-theme="dark"\] \.rb-hover-preview/,
    "the hover preview popover is portaled to document.body, so its dark override stays document-global",
  );
});

test("P2-A2: the theme gallery uses the isolated interactive preview", () => {
  const showcase = read("../app/components/theme-showcase.tsx");
  const client = read("../app/theme-showcase-client.ts");
  assert.match(showcase, /data-plugin-preview/);
  assert.match(showcase, /data-preview-frame/);
  assert.match(showcase, /sandbox=""/);
  assert.match(client, /createPreviewSessionTransport/);
  assert.match(client, /mountPreview/);
});

test("article route composes the contextual language switcher", () => {
  const route = read("../app/routes/[slug{.+}].tsx");

  assert.match(
    route,
    /import \{ LanguageSwitcher \} from "@riebeckite\/plugin-l10n"/,
  );
  assert.match(route, /<LanguageSwitcher \/>/);
});

test("CSS hooks keep Site and Theme styling outside plugin elements", () => {
  const pluginElement = /\.(?:rb-nav|rr-color-mode|rr-table-of-contents)__/;

  for (const [name, css] of [
    ["shell", shellCss],
    ["article", articleCss],
  ]) {
    assert.doesNotMatch(
      ruleSelectors(css),
      pluginElement,
      `${name} CSS must use Site wrappers or public plugin roots`,
    );
  }

  for (const { relative } of themeStyleFiles()) {
    const selectors = ruleSelectors(read(relative)).replaceAll(
      ".rr-code__action",
      "",
    );
    assert.doesNotMatch(
      selectors,
      /\.rr-[\w-]+__/,
      `${relative} must use public plugin roots and custom properties`,
    );
  }
});

test("CSS hooks namespace search and localization defaults", () => {
  const l10nCss = read("../../../packages/plugins/l10n/style.css");
  const searchClient = read(
    "../../../packages/plugins/search/src/search-bar.client.ts",
  );
  const l10nComponent = read(
    "../../../packages/plugins/l10n/components/language-switcher.tsx",
  );

  assert.match(searchCss, /\.rr-search \.sr-only/);
  assert.match(searchCss, /\.rr-search-result\s*\{/);
  assert.match(searchClient, /className = "rr-search-result"/);
  assert.match(l10nCss, /\.rr-l10n-switcher\s*\{/);
  assert.match(l10nComponent, /class="rr-l10n-switcher"/);
});
