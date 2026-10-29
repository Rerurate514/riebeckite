import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { after, before, test } from "node:test";
import { transform } from "esbuild";
import puppeteer, { type Browser, type Page } from "puppeteer";

let browser: Browser | null = null;
const shellStyle = await readFile(
  new URL("../style.css", import.meta.url),
  "utf8",
);
const shellClient = (
  await transform(
    await readFile(new URL("../client.ts", import.meta.url), "utf8"),
    {
      loader: "ts",
      format: "iife",
    },
  )
).code;

function pageHtml(): string {
  return `<!doctype html><html><head><style>:root { --rb-color-ink: #111; --rb-color-surface: #fff; --rb-color-border: #ddd; --rb-color-accent: #06c; --rb-space-3: 1.5rem; --rb-space-5: 2.5rem; --rb-layout-page-max: 80rem; } body { margin: 0; } ${shellStyle}</style></head><body><div class="rb-shell"><header class="rb-shell__header" data-rb-shell-sticky="true"><div class="rb-shell__container">Header <div class="rb-shell__drawer" data-rb-shell-drawer><button type="button" class="rb-shell__drawer-trigger" data-rb-shell-drawer-trigger data-rb-shell-drawer-icon="menu" aria-label="Navigation" aria-expanded="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18" /></svg></button><div class="rb-shell__drawer-panel" data-rb-shell-drawer-panel hidden><a href="#drawer-link">Drawer</a></div></div></div></header><div class="rb-shell__body"><aside class="rb-shell__sidebar"><div style="height: 120rem">Sidebar</div></aside><main class="rb-shell__main"><div class="rb-content-container"><button type="button">Outside</button><div style="height: 240rem">Main</div></div></main><aside class="rb-shell__aside"><div style="height: 120rem">Aside</div></aside></div></div><script>${shellClient}</script></body></html>`;
}

async function openPage(width: number): Promise<Page> {
  if (!browser) throw new Error("Puppeteer browser is unavailable");
  const page = await browser.newPage();
  await page.setViewport({ width, height: 900 });
  await page.setContent(pageHtml());
  await page.waitForFunction(
    () =>
      document.querySelector<HTMLElement>("[data-rb-shell-drawer]")?.dataset
        .rbShellDrawerReady === "true",
  );
  return page;
}

before(async () => {
  try {
    browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
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
      headerContainer: document
        .querySelector(".rb-shell__header > .rb-shell__container")
        ?.getBoundingClientRect().width,
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
  assert.ok((layout.header?.width ?? 0) >= layout.viewportWidth);
  assert.ok((layout.headerContainer ?? 0) >= layout.viewportWidth - 48);
  assert.ok((layout.sidebar?.left ?? Infinity) <= 1);
  assert.ok((layout.main?.width ?? 0) > (layout.content?.width ?? 0));
  assert.ok((layout.content?.width ?? 0) <= 864);
  assert.ok((layout.aside?.right ?? 0) >= layout.viewportWidth - 1);
  assert.equal(layout.sidebarOverflow, "auto");
  assert.equal(layout.asideOverflow, "auto");
  assert.equal(layout.sidebarHeight, layout.asideHeight);

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
    triggerText: document.querySelector(".rb-shell__drawer-trigger")
      ?.textContent,
    triggerLabel: document
      .querySelector(".rb-shell__drawer-trigger")
      ?.getAttribute("aria-label"),
  }));
  assert.notEqual(state.drawer, "none");
  assert.ok(state.scrollWidth <= state.clientWidth);
  assert.equal(state.triggerText, "");
  assert.equal(state.triggerLabel, "Navigation");
  await mobile.keyboard.press("Escape");
  assert.equal(
    await mobile.$eval(".rb-shell__drawer-panel", (element) =>
      element.hasAttribute("hidden"),
    ),
    true,
  );
  await mobile.close();
});
