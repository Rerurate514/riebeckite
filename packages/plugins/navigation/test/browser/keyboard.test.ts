import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { after, before, test } from "node:test";
import { createElement, Fragment } from "hono/jsx";
import { renderToString } from "hono/jsx/dom/server";
import puppeteer, { type Browser } from "puppeteer";
import { MobileSiteNav, SiteNav } from "../../components/site-nav.tsx";

(globalThis as { React?: unknown }).React = { createElement, Fragment };

let browser: Browser | null = null;
const navigationStyle = await readFile(
  new URL("../../style.css", import.meta.url),
  "utf8",
);

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

test("mobile navigation opens and exposes links with the keyboard", async (t) => {
  if (!browser) return t.skip("Puppeteer browser is unavailable");
  const page = await browser.newPage();
  await page.setViewport({ width: 375, height: 800 });
  const html = renderToString(
    MobileSiteNav({
      items: [{ label: "Guide", href: "/guide" }],
      path: "/guide",
    }),
  );
  await page.setContent(
    `<!doctype html><style>:root { --rb-color-ink: #111; --rb-color-accent: #c40; --rb-color-surface: #fff; --rb-color-border: #ddd; --rb-space-2: 1rem; --rb-space-3: 1.5rem; } ${navigationStyle}</style>${html}`,
  );

  await page.keyboard.press("Tab");
  assert.equal(
    await page.evaluate(() => document.activeElement?.tagName),
    "SUMMARY",
  );
  await page.keyboard.press("Enter");
  assert.equal(await page.$eval("details", (menu) => menu.open), true);
  await page.keyboard.press("Tab");
  assert.equal(
    await page.evaluate(() => document.activeElement?.textContent),
    "Guide",
  );
  assert.equal(
    await page.$eval(".rb-nav", (nav) => getComputedStyle(nav).position),
    "absolute",
  );
  await page.close();
});

test("desktop navigation keeps active links keyboard-focusable", async (t) => {
  if (!browser) return t.skip("Puppeteer browser is unavailable");
  const page = await browser.newPage();
  await page.setViewport({ width: 1024, height: 800 });
  const html = renderToString(
    SiteNav({
      items: [{ label: "Guide", href: "/guide" }],
      path: "/guide",
    }),
  );
  await page.setContent(
    `<!doctype html><style>:root { --rb-color-ink: #111; --rb-color-accent: #c40; --rb-color-surface: #fff; --rb-color-border: #ddd; --rb-space-2: 1rem; --rb-space-3: 1.5rem; } ${navigationStyle}</style>${html}`,
  );

  await page.keyboard.press("Tab");
  assert.equal(
    await page.evaluate(() => document.activeElement?.textContent),
    "Guide",
  );
  assert.equal(
    await page.$eval(".rb-nav__link", (link) =>
      link.getAttribute("aria-current"),
    ),
    "page",
  );
  await page.close();
});
