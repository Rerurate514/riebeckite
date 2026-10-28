import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import puppeteer, { type Browser, type Page } from "puppeteer";

const read = (relativePath: string) =>
  readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");

const styles = [
  read("../../../packages/shell-ui/style.css"),
  read("../app/styles/shell.css"),
  read("../../../packages/plugins/docs/style.css"),
  read("../../../packages/plugins/navigation/style.css"),
  read("../../../packages/plugins/toc/style.css"),
].join("\n");

let browser: Browser | null = null;

before(async () => {
  try {
    browser = await puppeteer.launch({
      headless: "shell",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  } catch {
    browser = null;
  }
});

after(async () => {
  await browser?.close();
});

function navigationItems(count: number, className: string) {
  return Array.from(
    { length: count },
    (_, index) =>
      `<li class="${className}"><a href="#section-${index}">Section ${index}</a></li>`,
  ).join("");
}

async function loadDocsPage(page: Page, width: number): Promise<void> {
  await page.setViewport({ width, height: 900 });
  await page.setContent(`<!doctype html>
    <html><head><style>:root {
      --rb-space-3: 1.5rem;
      --rb-layout-page-max: 80rem;
      --rb-color-border: #d7e0ea;
      --rb-color-ink: #182230;
      --rb-color-muted: #58677a;
      --rb-color-surface: #fff;
    } body { margin: 0; } ${styles}</style></head>
    <body class="riebeckite-page"><div class="rb-shell">
      <header class="rb-shell__header" data-rb-shell-sticky="true"><div class="rb-shell__container"><div class="rb-site-header"><a class="rb-site-header__home">Riebeckite</a></div><details class="rb-shell__drawer"><summary class="rb-shell__drawer-trigger">Documentation</summary><div class="rb-shell__drawer-panel">Navigation</div></details></div></header>
      <div class="rb-shell__body">
        <aside class="rb-shell__sidebar"><nav class="rb-sidebar-navigation"><label class="rb-sidebar-navigation__search"><input type="search" /></label><ul>${navigationItems(120, "rb-docs-sidebar__item")}</ul></nav></aside>
        <main class="rb-shell__main"><div class="rb-content-container" style="height: 300rem">Article</div></main>
        <aside class="rb-shell__aside"><nav class="rr-table-of-contents rr-table-of-contents--desktop"><ol>${navigationItems(120, "rr-table-of-contents__item")}</ol></nav></aside>
      </div>
    </div><footer class="rb-site-footer">Footer</footer></body></html>`);
}

test("official docs composition aligns and scrolls both desktop rails", async (t) => {
  if (!browser) return t.skip("puppeteer browser is unavailable");
  const page = await browser.newPage();
  try {
    await loadDocsPage(page, 1600);
    const initial = await page.evaluate(() => {
      const header = document.querySelector<HTMLElement>(".rb-shell__header");
      const sidebar = document.querySelector<HTMLElement>(".rb-shell__sidebar");
      const aside = document.querySelector<HTMLElement>(".rb-shell__aside");
      const footer = document.querySelector<HTMLElement>(".rb-site-footer");
      if (!header || !sidebar || !aside || !footer)
        throw new Error("docs fixture is incomplete");
      return {
        header: header.getBoundingClientRect().bottom,
        sidebar: sidebar.getBoundingClientRect().top,
        aside: aside.getBoundingClientRect().top,
        sidebarScrollable: sidebar.scrollHeight > sidebar.clientHeight,
        asideScrollable: aside.scrollHeight > aside.clientHeight,
        footerLeft: footer.getBoundingClientRect().left,
        footerRight: footer.getBoundingClientRect().right,
      };
    });
    assert.equal(initial.sidebar, initial.header);
    assert.equal(initial.aside, initial.header);
    assert.ok(initial.sidebarScrollable);
    assert.ok(initial.asideScrollable);
    assert.ok(Math.abs(initial.footerLeft - (1600 - initial.footerRight)) <= 1);

    await page.evaluate(() => window.scrollTo(0, 1200));
    const sticky = await page.evaluate(() => ({
      header: document
        .querySelector(".rb-shell__header")
        ?.getBoundingClientRect().top,
      sidebar: document
        .querySelector(".rb-shell__sidebar")
        ?.getBoundingClientRect().top,
      aside: document.querySelector(".rb-shell__aside")?.getBoundingClientRect()
        .top,
      headerHeight: document
        .querySelector(".rb-shell__header")
        ?.getBoundingClientRect().height,
    }));
    assert.equal(sticky.header, 0);
    assert.ok(
      Math.abs((sticky.sidebar ?? 0) - (sticky.headerHeight ?? 0)) <= 1,
    );
    assert.ok(Math.abs((sticky.aside ?? 0) - (sticky.headerHeight ?? 0)) <= 1);
  } finally {
    await page.close();
  }
});

test("official docs composition hides desktop rails below their breakpoints", async (t) => {
  if (!browser) return t.skip("puppeteer browser is unavailable");
  const page = await browser.newPage();
  try {
    await loadDocsPage(page, 768);
    assert.equal(
      await page.$eval(
        ".rb-shell__aside",
        (element) => getComputedStyle(element).display,
      ),
      "none",
    );
    await page.setViewport({ width: 375, height: 900 });
    assert.equal(
      await page.$eval(
        ".rb-shell__sidebar",
        (element) => getComputedStyle(element).display,
      ),
      "none",
    );
    assert.equal(
      await page.evaluate(() => document.body.scrollWidth > window.innerWidth),
      false,
    );
  } finally {
    await page.close();
  }
});
