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
const shellCss = read("../app/styles/shell.css");

test("docs routes compose the shared shell around article content", () => {
  assert.match(renderer, /<div class="site-shell site-shell--docs">/);
  assert.match(renderer, /<SiteNavigationHeader>/);
  assert.match(renderer, /<SearchBar class="rr-search-bar--header" \/>/);
  assert.match(renderer, /<DrawerTrigger\s+controls="docs-navigation"/);
  assert.match(
    renderer,
    /<Drawer\s+id="docs-navigation"[^>]*label="Documentation"/s,
  );
  assert.match(renderer, /<SiteDrawerNavigation \/>/);
  assert.match(
    renderer,
    /<aside class="site-sidebar" aria-label="Documentation">/,
  );
  assert.match(
    renderer,
    /<main id="main-content" tabindex=\{-1\} class="site-main">/,
  );
  assert.match(
    renderer,
    /<aside class="site-aside" aria-label="Table of contents">/,
  );
  assert.match(renderer, /data-spa-region="site-header"/);
  assert.match(renderer, /data-spa-region="docs-navigation"/);
  assert.match(renderer, /data-spa-region="toc"/);
  assert.match(renderer, /data-spa-region="site-footer"/);
  assert.match(renderer, /<DocsSidebar \/>/);
  assert.match(renderer, /items=\{tocItems\}/);
  assert.match(
    renderer,
    /borders=\{\{ blockStart: false, blockEnd: false \}\}/,
  );
  assert.match(renderer, /const tocItems = c\.get\("tocItems"\)/);
  assert.match(read("../app/routes/[slug{.+}].tsx"), /c\.set\("tocItems"/);
});

test("the docs rails reserve their scrollbar gutter", () => {
  assert.match(shellCss, /\.site-sidebar \{[\s\S]*?scrollbar-gutter: stable/);
  assert.match(shellCss, /\.site-aside \{[\s\S]*?scrollbar-gutter: stable/);
});

test("the official site owns its standard layout and imports the optional Drawer", () => {
  assert.match(appStyle, /@import "@riebeckite\/ui\/styles\/drawer\.css"/);
  assert.doesNotMatch(articleCss, /rb-docs-sidebar-rail/);
  assert.doesNotMatch(articleCss, /desktop-rail/);
  assert.doesNotMatch(article, /asideContent/);
  assert.doesNotMatch(article, /articleAside/);
});
