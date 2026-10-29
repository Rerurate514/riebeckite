/** @jsxRuntime automatic @jsxImportSource hono/jsx */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { renderToString } from "hono/jsx/dom/server";
import puppeteer, { type Browser, type Page } from "puppeteer";
import { Drawer, DrawerTrigger } from "../index.tsx";

const style = await readFile(new URL("../style.css", import.meta.url), "utf8");
const clientSource = await build({
  entryPoints: [fileURLToPath(new URL("../client.ts", import.meta.url))],
  bundle: true,
  format: "iife",
  platform: "browser",
  target: "esnext",
  write: false,
});
const clientJs = clientSource.outputFiles[0]?.text ?? "";
const pageMarkup = `<!doctype html><style>:root { --rb-color-ink:#111; --rb-color-surface:#fff; --rb-color-border:#ddd; --rb-color-accent:#06c; --rb-space-3:1.5rem } body { margin:0 } header { display:flex; justify-content:space-between; padding:1rem } main { padding:1rem } ${style}</style><header><a href="/">Site</a><a href="#navigation" class="rb-drawer-trigger rb-drawer-trigger--icon" data-rb-drawer-trigger data-rb-drawer-target="navigation" aria-controls="navigation" aria-expanded="false" aria-label="Menu">Menu</a></header><main id="main-content"><h1>Standard HTML</h1></main><div class="rb-drawer" data-rb-drawer data-rb-drawer-open="false"><div class="rb-drawer__backdrop" data-rb-drawer-backdrop hidden></div><section id="navigation" class="rb-drawer__panel" data-rb-drawer-panel aria-label="Navigation" tabindex="-1"><a href="/docs">Docs</a></section></div>`;
let browser: Browser | null = null;

async function openPage(width: number): Promise<Page> {
  if (!browser) throw new Error("Puppeteer browser is unavailable");
  const page = await browser.newPage();
  await page.setViewport({ width, height: 900 });
  await page.setContent(pageMarkup);
  await page.addScriptTag({ content: clientJs });
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

test("Drawer composes with standard HTML at supported viewports", async (t) => {
  if (!browser) return t.skip("Puppeteer browser is unavailable");
  for (const width of [375, 768, 1440]) {
    const page = await openPage(width);
    const layout = await page.evaluate(() => ({
      header: document.querySelector("header")?.tagName,
      main: document.querySelector("main")?.id,
      overflow:
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    }));
    assert.equal(layout.header, "HEADER");
    assert.equal(layout.main, "main-content");
    assert.equal(layout.overflow, false);
    await page.close();
  }
});

test("Drawer opens, traps focus, closes on Escape and SPA navigation", async (t) => {
  if (!browser) return t.skip("Puppeteer browser is unavailable");
  const page = await openPage(375);
  const trigger = "[data-rb-drawer-trigger]";
  await page.click(trigger);
  const opened = await page.evaluate(() => {
    const panel = document.querySelector<HTMLElement>("#navigation");
    return {
      expanded: document
        .querySelector("[data-rb-drawer-trigger]")
        ?.getAttribute("aria-expanded"),
      role: panel?.getAttribute("role"),
      focusInside: panel?.contains(document.activeElement) ?? false,
      locked: document.documentElement.classList.contains("rb-drawer-open"),
    };
  });
  assert.deepEqual(opened, {
    expanded: "true",
    role: "dialog",
    focusInside: true,
    locked: true,
  });
  await page.keyboard.press("Escape");
  assert.equal(
    await page.$eval(trigger, (element) =>
      element.getAttribute("aria-expanded"),
    ),
    "false",
  );
  await page.click(trigger);
  await page.evaluate(() =>
    document.dispatchEvent(new Event("spa:navigation")),
  );
  assert.equal(
    await page.$eval(trigger, (element) =>
      element.getAttribute("aria-expanded"),
    ),
    "false",
  );
  await page.close();
});

test("SSR markup exposes only Drawer hooks", () => {
  const html = renderToString(
    <>
      <header>
        <DrawerTrigger controls="navigation" label="Menu" icon="menu" />
      </header>
      <main id="main-content">Content</main>
      <Drawer id="navigation" label="Navigation">
        <a href="/docs">Docs</a>
      </Drawer>
    </>,
  );
  assert.match(html, /data-rb-drawer-trigger/);
  assert.match(html, /data-rb-drawer-panel/);
  assert.doesNotMatch(html, /data-rb-layout/);
});
