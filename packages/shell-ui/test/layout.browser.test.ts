import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { after, before, test } from "node:test";
import puppeteer, { type Browser, type Page } from "puppeteer";

let browser: Browser | null = null;
const shellStyle = await readFile(
  new URL("../style.css", import.meta.url),
  "utf8",
);

function pageHtml(): string {
  return `<!doctype html><html><head><style>:root { --rb-color-ink: #111; --rb-color-surface: #fff; --rb-color-border: #ddd; --rb-space-3: 1.5rem; --rb-space-5: 2.5rem; --rb-layout-page-max: 80rem; } body { margin: 0; } ${shellStyle}</style></head><body><div class="rb-shell"><header class="rb-shell__header" data-rb-shell-sticky="true">Header <details class="rb-shell__drawer"><summary class="rb-shell__drawer-trigger">Navigation</summary><div class="rb-shell__drawer-panel">Drawer</div></details></header><div class="rb-shell__body"><aside class="rb-shell__sidebar"><div style="height: 120rem">Sidebar</div></aside><main class="rb-shell__main"><div class="rb-content-container"><div style="height: 240rem">Main</div></div></main><aside class="rb-shell__aside"><div style="height: 120rem">Aside</div></aside></div></div></body></html>`;
}

async function openPage(width: number): Promise<Page> {
  if (!browser) throw new Error("Puppeteer browser is unavailable");
  const page = await browser.newPage();
  await page.setViewport({ width, height: 900 });
  await page.setContent(pageHtml());
  return page;
}

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

test("application composition uses full-width chrome and independently constrained content", async (t) => {
  if (!browser) return t.skip("Puppeteer browser is unavailable");
  const page = await openPage(1440);
  const layout = await page.evaluate(() => {
    const header = document
      .querySelector(".rb-shell__header")
      ?.getBoundingClientRect();
    const sidebarBox = document
      .querySelector(".rb-shell__sidebar")
      ?.getBoundingClientRect();
    const main = document
      .querySelector(".rb-shell__main")
      ?.getBoundingClientRect();
    const asideBox = document
      .querySelector(".rb-shell__aside")
      ?.getBoundingClientRect();
    const content = document
      .querySelector(".rb-content-container")
      ?.getBoundingClientRect();
    const sidebar = document.querySelector<HTMLElement>(".rb-shell__sidebar");
    const aside = document.querySelector<HTMLElement>(".rb-shell__aside");
    return {
      header: header ? { width: header.width } : undefined,
      sidebar: sidebarBox ? { left: sidebarBox.left } : undefined,
      main: main ? { width: main.width } : undefined,
      aside: asideBox ? { right: asideBox.right } : undefined,
      content: content ? { width: content.width } : undefined,
      sidebarOverflow: getComputedStyle(sidebar ?? document.body).overflowY,
      asideOverflow: getComputedStyle(aside ?? document.body).overflowY,
      body: document.querySelector(".rb-shell__body")?.getBoundingClientRect(),
      sidebarHeight: sidebarBox?.height,
      asideHeight: asideBox?.height,
      viewportWidth: document.documentElement.clientWidth,
    };
  });
  assert.equal(layout.header?.width, layout.viewportWidth);
  assert.equal(layout.sidebar?.left, 0);
  assert.ok((layout.main?.width ?? 0) > (layout.content?.width ?? 0));
  assert.ok((layout.content?.width ?? 0) <= 864);
  assert.equal(layout.aside?.right, layout.viewportWidth);
  assert.equal(layout.sidebarOverflow, "auto");
  assert.equal(layout.asideOverflow, "auto");
  assert.ok((layout.body?.height ?? 0) >= (layout.sidebarHeight ?? 0));
  assert.ok((layout.body?.height ?? 0) >= (layout.asideHeight ?? 0));

  await page.evaluate(() => window.scrollTo(0, 800));
  const sticky = await page.evaluate(() => ({
    header: document.querySelector(".rb-shell__header")?.getBoundingClientRect()
      .top,
    sidebar: document
      .querySelector(".rb-shell__sidebar")
      ?.getBoundingClientRect().top,
    aside: document.querySelector(".rb-shell__aside")?.getBoundingClientRect()
      .top,
  }));
  assert.equal(sticky.header, 0);
  assert.equal(sticky.sidebar, 64);
  assert.equal(sticky.aside, 64);
  await page.close();
});

test("tablet omits the aside and mobile uses the drawer without horizontal overflow", async (t) => {
  if (!browser) return t.skip("Puppeteer browser is unavailable");
  const tablet = await openPage(768);
  assert.equal(
    await tablet.$eval(
      ".rb-shell__aside",
      (element) => getComputedStyle(element).display,
    ),
    "none",
  );
  assert.notEqual(
    await tablet.$eval(
      ".rb-shell__sidebar",
      (element) => getComputedStyle(element).display,
    ),
    "none",
  );
  await tablet.close();

  const mobile = await openPage(375);
  assert.equal(
    await mobile.$eval(
      ".rb-shell__sidebar",
      (element) => getComputedStyle(element).display,
    ),
    "none",
  );
  await mobile.click(".rb-shell__drawer-trigger");
  const state = await mobile.evaluate(() => ({
    drawer: getComputedStyle(
      document.querySelector(".rb-shell__drawer-panel") ?? document.body,
    ).display,
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  assert.notEqual(state.drawer, "none");
  assert.ok(state.scrollWidth <= state.clientWidth);
  await mobile.close();
});
