import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, before, test } from "node:test";
import type { Browser, Page } from "puppeteer";
import { launchBrowser } from "./support.js";

const themeStyles = [
  "default",
  "gruvbox",
  "minimal",
  "rerurate",
  "sakura",
  "tokyonight",
]
  .map((theme) =>
    readFileSync(
      new URL(`../../../../themes/${theme}/styles/theme.css`, import.meta.url),
      "utf8",
    ),
  )
  .join("\n");
const searchStyle = readFileSync(
  new URL("../../style.css", import.meta.url),
  "utf8",
);

let browser: Browser | null = null;

before(async () => {
  browser = await launchBrowser();
});

after(async () => {
  await browser?.close();
});

async function pageWithThemes(): Promise<Page> {
  if (!browser) throw new Error("Browser is unavailable");
  const page = await browser.newPage();
  await page.setContent(`<!doctype html>
<style>${themeStyles}\n${searchStyle}</style>
<div id="riebeckite-light" class="rb-theme-root" data-theme-name="riebeckite" data-theme="light"><div class="rr-search"><button class="rr-search-bar__trigger">Search</button></div></div>
<div id="gruvbox-dark" class="rb-theme-root" data-theme-name="gruvbox" data-theme="dark"><div class="rr-search"><button class="rr-search-bar__trigger">Search</button></div></div>
<div id="system" class="rb-theme-root" data-theme-name="riebeckite"><div class="rr-search"><button class="rr-search-bar__trigger">Search</button></div></div>
<button id="outside" class="rr-search-bar__trigger">Outside</button>`);
  return page;
}

async function colors(
  page: Page,
  selector: string,
): Promise<{ paper: string; color: string; background: string }> {
  return await page.$eval(selector, (element) => {
    const root = getComputedStyle(element);
    const trigger = element.querySelector("button") ?? element;
    const triggerStyle = getComputedStyle(trigger);
    return {
      paper: root.getPropertyValue("--rb-color-paper").trim(),
      color: triggerStyle.color,
      background: triggerStyle.backgroundColor,
    };
  });
}

test("embedded theme roots isolate explicit light and dark plugin surfaces", async (t) => {
  if (!browser) return t.skip("Puppeteer browser is unavailable");
  const page = await pageWithThemes();
  try {
    const light = await colors(page, "#riebeckite-light");
    const dark = await colors(page, "#gruvbox-dark");
    assert.equal(light.paper, "#fafafa");
    assert.equal(dark.paper, "#282828");
    assert.equal(light.color, "rgb(32, 32, 32)");
    assert.equal(dark.color, "rgb(235, 219, 178)");
    assert.notEqual(light.background, dark.background);
    assert.equal(
      await page.$eval(
        "#outside",
        (element) => getComputedStyle(element).backgroundColor,
      ),
      "rgba(0, 0, 0, 0)",
    );
  } finally {
    await page.close();
  }
});

test("system dark applies only to a root without an explicit theme mode", async (t) => {
  if (!browser) return t.skip("Puppeteer browser is unavailable");
  const page = await pageWithThemes();
  try {
    await page.emulateMediaFeatures([
      { name: "prefers-color-scheme", value: "dark" },
    ]);
    const explicitLight = await colors(page, "#riebeckite-light");
    const system = await colors(page, "#system");
    assert.equal(explicitLight.paper, "#fafafa");
    assert.equal(system.paper, "#17171a");
    assert.equal(system.color, "rgb(235, 235, 238)");
  } finally {
    await page.close();
  }
});
