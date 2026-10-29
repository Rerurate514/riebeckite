import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { after, before, test } from "node:test";
import puppeteer, { type Browser, type Page } from "puppeteer";

const style = await readFile(new URL("../style.css", import.meta.url), "utf8");
let browser: Browser | null = null;

async function openPage(width: number): Promise<Page> {
  if (!browser) throw new Error("Puppeteer browser is unavailable");
  const page = await browser.newPage();
  await page.setViewport({ width, height: 900 });
  await page.setContent(
    `<!doctype html><style>:root { --rb-color-ink:#111; --rb-color-surface:#fff; --rb-color-border:#ddd; --rb-color-accent:#06c; --rb-space-3:1.5rem; --rb-space-5:2.5rem } body { margin:0 } ${style}</style><div class="rb-layout"><header class="rb-layout__header" data-rb-layout-sticky="true"><div class="rb-layout__header-brand">Brand</div><div class="rb-layout__header-actions">Actions</div></header><div class="rb-layout__body"><aside class="rb-layout__sidebar">Sidebar</aside><main class="rb-layout__main"><div class="rb-content-container" style="height:200rem">Content</div></main><aside class="rb-layout__aside">TOC</aside></div></div>`,
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

after(async () => browser?.close());

test("responsive rails keep header full-width without overflow", async (t) => {
  if (!browser) return t.skip("Puppeteer browser is unavailable");
  for (const width of [375, 390, 768, 1024, 1440, 1920]) {
    const page = await openPage(width);
    const layout = await page.evaluate(() => {
      const header = document.querySelector<HTMLElement>(".rb-layout__header");
      const sidebar = document.querySelector<HTMLElement>(
        ".rb-layout__sidebar",
      );
      const aside = document.querySelector<HTMLElement>(".rb-layout__aside");
      return {
        headerWidth: header?.getBoundingClientRect().width ?? 0,
        sidebar: getComputedStyle(sidebar ?? document.body).display,
        aside: getComputedStyle(aside ?? document.body).display,
        overflow:
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth,
      };
    });
    assert.ok(layout.headerWidth >= width);
    assert.equal(layout.overflow, false);
    assert.equal(layout.sidebar === "none", width < 768);
    assert.equal(layout.aside === "none", width < 1024);
    await page.close();
  }
});
