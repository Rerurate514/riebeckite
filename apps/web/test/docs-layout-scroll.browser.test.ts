import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import puppeteer, { type Browser } from "puppeteer";

const read = (relativePath: string) =>
  readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");
const styles = [
  read("../../../packages/ui/styles/drawer.css"),
  read("../app/styles/shell.css"),
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

after(async () => browser?.close());

test("official docs use standard rails without horizontal overflow", async (t) => {
  if (!browser) return t.skip("puppeteer browser is unavailable");
  const page = await browser.newPage();
  try {
    for (const width of [375, 768, 1440]) {
      await page.setViewport({ width, height: 900 });
      await page.setContent(
        `<!doctype html><style>:root { --rb-space-2: 1rem; --rb-space-3: 1.5rem; --rb-space-4: 2rem; --rb-layout-page-max: 80rem; --rb-layout-article-max: 48rem; --rb-color-border: #d7e0ea; --rb-color-ink: #182230; --rb-color-surface: #fff; } body { margin: 0; } ${styles}</style><body class="riebeckite-page"><div class="site-shell"><header class="site-header rb-site-header"><a class="rb-site-header__home">Riebeckite</a></header><div class="site-layout"><aside class="site-sidebar">Navigation</aside><main id="main-content" class="site-main"><div class="site-content" style="height: 300rem">Article</div></main><aside class="site-aside">TOC</aside></div></div><footer class="rb-site-footer"><div class="site-footer__main">Footer</div></footer></body>`,
      );
      const layout = await page.evaluate(() => ({
        sidebar: getComputedStyle(
          document.querySelector(".site-sidebar") ?? document.body,
        ).display,
        aside: getComputedStyle(
          document.querySelector(".site-aside") ?? document.body,
        ).display,
        footerMarginTop: getComputedStyle(
          document.querySelector(".rb-site-footer") ?? document.body,
        ).marginTop,
        footerPaddingTop: getComputedStyle(
          document.querySelector(".site-footer__main") ?? document.body,
        ).paddingTop,
        footerWidth: (
          document.querySelector(".rb-site-footer") ?? document.body
        ).getBoundingClientRect().width,
        viewportWidth: window.innerWidth,
        mains: document.querySelectorAll("main#main-content").length,
      }));
      assert.equal(layout.mains, 1);
      assert.equal(layout.sidebar === "block", width >= 768);
      assert.equal(layout.aside === "block", width >= 1024);
      assert.equal(layout.footerMarginTop, "0px");
      assert.ok(Number.parseFloat(layout.footerPaddingTop) > 0);
      assert.equal(layout.footerWidth, layout.viewportWidth);
    }
  } finally {
    await page.close();
  }
});
