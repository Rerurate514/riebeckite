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
  assert.match(renderer, /<SiteNavigationHeader sticky>/);
  assert.match(renderer, /<SearchBar class="rr-search-bar--header" \/>/);
  assert.match(renderer, /<DrawerTrigger\s+controls="docs-navigation"/);
  assert.match(
    renderer,
    /<Drawer\s+id="docs-navigation"[^>]*desktop="inline"/s,
  );
  assert.match(renderer, /<SiteDrawerNavigation \/>/);
  assert.match(renderer, /<ShellSidebar at="md">/);
  assert.match(renderer, /<ShowAt max="sm">/);
  assert.match(renderer, /<ShellMain id="main-content" tabindex=\{-1\}>/);
  assert.match(renderer, /<ContentContainer>\{children\}<\/ContentContainer>/);
  assert.match(renderer, /<ShellAside at="lg">/);
  assert.match(renderer, /data-spa-region="site-header"/);
  assert.match(renderer, /data-spa-region="docs-navigation"/);
  assert.match(renderer, /data-spa-region="toc"/);
  assert.match(renderer, /data-spa-region="site-footer"/);
  assert.match(renderer, /<DocsSidebar \/>/);
  assert.match(renderer, /items=\{tocItems\}/);
  assert.match(renderer, /const tocItems = c\.get\("tocItems"\)/);
  assert.match(read("../app/routes/[slug{.+}].tsx"), /c\.set\("tocItems"/);
});

test("the official site uses layouts instead of an article-specific rail", () => {
  assert.match(appStyle, /@import "@riebeckite\/layouts\/style\.css"/);
  assert.doesNotMatch(articleCss, /rb-docs-sidebar-rail/);
  assert.doesNotMatch(articleCss, /desktop-rail/);
  assert.doesNotMatch(article, /asideContent/);
  assert.doesNotMatch(article, /articleAside/);
});
