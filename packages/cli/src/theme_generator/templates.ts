import type { ThemeFeatureId, ThemeTemplateId } from "./registry.js";

const root = (name: string) =>
  `:is(:root, .rb-theme-root)[data-theme-name="${name}"]`;

export function renderThemeFiles(
  name: string,
  template: ThemeTemplateId,
  features: readonly ThemeFeatureId[],
  darkMode: boolean,
  tests: boolean,
  documentation: boolean,
): ReadonlyMap<string, string> {
  const files = new Map<string, string>([
    ["index.ts", renderThemeIndex(name)],
    ["styles/theme.css", renderThemeCss(name, template, features, darkMode)],
  ]);
  if (tests) files.set("test/theme.test.ts", renderThemeTest(name));
  if (documentation) files.set("README.md", renderThemeReadme(name, template));
  return files;
}

export function renderThemeIndex(name: string): string {
  const identifier = toIdentifier(name);
  return `import { defineTheme, type ThemeConfig } from "@riebeckite/core";

export type ${identifier}ThemeOptions = Omit<ThemeConfig, "name" | "userCss"> & {
  userCss?: string[];
};

export function ${identifier}Theme(options: ${identifier}ThemeOptions = {}) {
  return defineTheme({
    name: "${name}",
    options,
    styles: [{ moduleSpecifier: "/themes/${name}/styles/theme.css" }],
    config: options,
  });
}
`;
}

function renderThemeCss(
  name: string,
  template: ThemeTemplateId,
  features: readonly ThemeFeatureId[],
  darkMode: boolean,
): string {
  const selector = root(name);
  const allFeatures = new Set(features);
  const base = `@layer base {
  ${selector} {
    color-scheme: light;
    --rb-color-paper: #fdfcf9;
    --rb-color-surface: #f4f1ea;
    --rb-color-surface-hover: #ebe5da;
    --rb-color-ink: #24221e;
    --rb-color-muted: #6d675d;
    --rb-color-accent: #176b5a;
    --rb-color-border: #d9d1c2;
    --rb-color-border-strong: #aaa08f;
    --rb-color-danger: #b42318;
    --rb-color-success: #087443;
    --rb-color-code-background: #f1ede5;
    --rb-color-overlay: rgb(0 0 0 / 0.45);
    --rb-font-body: ui-sans-serif, system-ui, sans-serif;
    --rb-font-heading: var(--rb-font-body);
    --rb-font-mono: ui-monospace, "Cascadia Code", monospace;
    --rb-space-1: 0.5rem;
    --rb-space-2: 1rem;
    --rb-space-3: 1.5rem;
    --rb-space-4: 2rem;
    --rb-space-6: 3rem;
    --rb-space-8: 4rem;
    --rb-layout-page-max: 76rem;
    --rb-layout-article-max: 44rem;
    --rb-layout-sidebar: 16rem;
    --rb-layout-gap: 2rem;
    background: var(--rb-color-paper);
    color: var(--rb-color-ink);
    font-family: var(--rb-font-body);
  }

  ${selector}[data-typography="serif"] {
    --rb-font-body: Georgia, Cambria, "Times New Roman", serif;
    --rb-font-heading: ui-sans-serif, system-ui, sans-serif;
  }
}
`;
  const dark = darkMode
    ? `
${selector}[data-theme="dark"] {
  color-scheme: dark;
  --rb-color-paper: #1d201d;
  --rb-color-surface: #282c28;
  --rb-color-surface-hover: #353a35;
  --rb-color-ink: #e8e5dd;
  --rb-color-muted: #b7b0a3;
  --rb-color-accent: #78d2b3;
  --rb-color-border: #4c514a;
  --rb-color-border-strong: #74786f;
  --rb-color-code-background: #252925;
}

@media (prefers-color-scheme: dark) {
  ${selector}:not([data-theme]) {
    color-scheme: dark;
    --rb-color-paper: #1d201d;
    --rb-color-surface: #282c28;
    --rb-color-surface-hover: #353a35;
    --rb-color-ink: #e8e5dd;
    --rb-color-muted: #b7b0a3;
    --rb-color-accent: #78d2b3;
    --rb-color-border: #4c514a;
    --rb-color-border-strong: #74786f;
    --rb-color-code-background: #252925;
  }
}
`
    : "";
  const standard =
    template === "blank"
      ? ""
      : `
${selector} ::selection { background: var(--rb-color-accent); color: var(--rb-color-paper); }
${selector} :focus-visible { outline: 2px solid var(--rb-color-accent); outline-offset: 3px; }
${selector} :is(a, .rb-article-content a) { color: var(--rb-color-accent); text-decoration-thickness: 0.12em; text-underline-offset: 0.16em; }
${selector} :is(img, video) { max-inline-size: 100%; block-size: auto; }
`;
  const featureCss = [...allFeatures]
    .map((feature) => renderFeatureCss(selector, feature))
    .join("\n");
  const templateCss = renderTemplateCss(selector, template);
  return `${base}${dark}${standard}${templateCss}${featureCss}`;
}

function renderTemplateCss(
  selector: string,
  template: ThemeTemplateId,
): string {
  if (template === "blank") return "";
  if (template === "portfolio") {
    return `
${selector} .rb-site { max-inline-size: var(--rb-layout-page-max); margin-inline: auto; padding: var(--rb-space-4); }
${selector} .rb-article-header h1 { font-size: clamp(2.4rem, 7vw, 5.5rem); line-height: 0.95; letter-spacing: -0.05em; text-wrap: balance; }
`;
  }
  if (template === "documentation") {
    return `
${selector} .rb-sidebar { border-inline-end: 1px solid var(--rb-color-border); color: var(--rb-color-muted); }
${selector} .rb-article-content { max-inline-size: var(--rb-layout-article-max); }
`;
  }
  return `
${selector} .rb-article-content { max-inline-size: var(--rb-layout-article-max); font-size: 1.0625rem; line-height: 1.75; }
${selector} .rb-article-header h1 { font-family: var(--rb-font-heading); font-size: clamp(2rem, 4vw, 3.25rem); line-height: 1.1; text-wrap: balance; }
${selector} .rb-article-meta { color: var(--rb-color-muted); font-size: 0.9rem; }
`;
}

function renderFeatureCss(selector: string, feature: ThemeFeatureId): string {
  const rules: Record<ThemeFeatureId, string> = {
    typography: `${selector} .rb-article-content :is(h2, h3, h4) { font-family: var(--rb-font-heading); line-height: 1.2; text-wrap: balance; }
${selector} .rb-article-content h2 { margin-block: 3rem 1rem; }
${selector} .rb-article-content blockquote { margin: 2rem 0; padding-inline-start: 1rem; border-inline-start: 3px solid var(--rb-color-accent); color: var(--rb-color-muted); }`,
    "code-blocks": `${selector} :is(.rr-code, .rr-code-tabs) { border: 1px solid var(--rb-color-border); border-radius: 0.5rem; background: var(--rr-code-paper, var(--rb-color-code-background)); color: var(--rr-code-ink, var(--rb-color-ink)); overflow-x: auto; }
${selector} .rb-article-content :not(pre) > code { padding: 0.12em 0.35em; border-radius: 0.25rem; background: var(--rb-color-code-background); font-family: var(--rb-font-mono); }`,
    callouts: `${selector} .rr-callout { margin-block: 1.5rem; border: 1px solid var(--rb-color-border); border-inline-start: 4px solid var(--rr-callout-tone, var(--rb-color-accent)); border-radius: 0.5rem; background: var(--rb-color-surface); }`,
    cards: `${selector} :is(.rr-backlinks, .rr-recent-posts, .rr-query, .rr-diff-history) { padding: var(--rb-space-3); border: 1px solid var(--rb-color-border); border-radius: 0.5rem; background: var(--rb-color-surface); }`,
    toc: `${selector} .rr-table-of-contents { max-block-size: min(60vh, 32rem); overflow: auto; padding: var(--rb-space-2); border-inline-start: 2px solid var(--rb-color-border-strong); color: var(--rb-color-muted); }`,
    responsive: `@media (max-width: 48rem) {
  ${selector} .rb-site { padding-inline: var(--rb-space-2); }
  ${selector} .rb-sidebar { border: 0; }
  ${selector} :is(pre, table, .rr-code, .rr-code-tabs) { max-inline-size: 100%; overflow-x: auto; }
}`,
    animations: `${selector} :is(a, button, input, select, textarea) { transition: color 150ms ease, background-color 150ms ease, border-color 150ms ease; }
@media (prefers-reduced-motion: reduce) {
  ${selector} *, ${selector} *::before, ${selector} *::after { scroll-behavior: auto; transition-duration: 0.01ms; animation-duration: 0.01ms; animation-iteration-count: 1; }
}`,
    "print-styles": `@media print {
  ${selector} { --rb-color-paper: #fff; --rb-color-ink: #000; --rb-color-muted: #333; background: #fff; color: #000; }
  ${selector} :is(.rb-sidebar, .rr-table-of-contents) { display: none; }
  ${selector} a { color: inherit; }
}`,
  };
  return `${rules[feature]}\n`;
}

function renderThemeTest(name: string): string {
  const identifier = toIdentifier(name);
  return `import assert from "node:assert/strict";
import { test } from "node:test";
import { ${identifier}Theme } from "../index.js";

test("creates the theme", () => {
  const theme = ${identifier}Theme({ colorMode: "dark" });
  assert.equal(theme.name, "${name}");
  assert.deepEqual(theme.styles, [{ moduleSpecifier: "/themes/${name}/styles/theme.css" }]);
});
`;
}

function renderThemeReadme(name: string, template: ThemeTemplateId): string {
  const identifier = toIdentifier(name);
  return `# ${name}

Generated from the ${template} template.

## Apply the theme

\`\`\`ts
import { ${identifier}Theme } from "./themes/${name}/index";

export default defineConfig({
  theme: ${identifier}Theme(),
});
\`\`\`

This local Theme uses the public \`defineTheme\` API, semantic \`--rb-*\` tokens, and stable \`rb-*\` / \`rr-*\` CSS hooks. Keep functionality in Plugins and site-specific structure in the application.
`;
}

function toIdentifier(value: string): string {
  const identifier = value.replace(/-([a-z0-9])/g, (_, letter: string) =>
    letter.toUpperCase(),
  );
  return identifier.length === 0 ? "theme" : identifier;
}
