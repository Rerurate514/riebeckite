import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const read = (relativePath: string) =>
  readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");

const renderer = read("../app/routes/_renderer.tsx");
const article = read("../app/components/article/article.tsx");
const appStyle = read("../app/style.css");
const articleCss = read("../app/components/article/style.css");

test("docs routes compose the shared shell around article content", () => {
  assert.match(renderer, /<SiteShell>/);
  assert.match(renderer, /<ShellHeader sticky>/);
  assert.match(renderer, /<ShellDrawer label="Documentation">/);
  assert.match(renderer, /<ShellSidebar>/);
  assert.match(renderer, /<ShellMain id="main-content" tabindex=\{-1\}>/);
  assert.match(renderer, /<ContentContainer>\{children\}<\/ContentContainer>/);
  assert.match(renderer, /<ShellAside>/);
  assert.match(renderer, /<DocsSidebar \/>/);
  assert.match(
    renderer,
    /<TableOfContents className="rr-table-of-contents--desktop" \/>/,
  );
});

test("the official site uses Shell UI instead of an article-specific rail", () => {
  assert.match(appStyle, /@import "@riebeckite\/shell-ui\/style\.css"/);
  assert.doesNotMatch(articleCss, /rb-docs-sidebar-rail/);
  assert.doesNotMatch(articleCss, /desktop-rail/);
  assert.doesNotMatch(article, /asideContent/);
  assert.doesNotMatch(article, /articleAside/);
});
