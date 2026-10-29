/** @jsxRuntime automatic @jsxImportSource hono/jsx */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { renderToString } from "hono/jsx/dom/server";
import puppeteer, { type Browser, type Page } from "puppeteer";
import {
  ContentContainer,
  Drawer,
  DrawerTrigger,
  HeaderActions,
  HeaderBrand,
  ResponsiveGrid,
  ShellAside,
  ShellBody,
  ShellMain,
  ShellSidebar,
  ShowAt,
  SiteHeader,
  SiteShell,
  Stack,
} from "../index.tsx";

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
let browser: Browser | null = null;

const pageMarkup = `<!doctype html><style>:root { --rb-color-ink:#111; --rb-color-surface:#fff; --rb-color-border:#ddd; --rb-color-accent:#06c; --rb-space-1:.5rem; --rb-space-2:1rem; --rb-space-3:1.5rem; --rb-space-4:2rem; --rb-space-5:2.5rem; --rb-space-6:3rem } body { margin:0 } ${style}</style>
<div class="rb-layout">
  <header class="rb-layout__header" data-rb-layout-sticky="true">
    <div class="rb-layout__header-brand" id="brand">Brand</div>
    <div class="rb-layout__header-actions" id="actions">
      <a href="#docs-navigation" class="rb-layout__drawer-trigger" data-rb-layout-drawer-trigger data-rb-layout-drawer-target="docs-navigation" data-rb-layout-trigger-at="md" aria-controls="docs-navigation" aria-expanded="false" aria-label="Menu" role="button"><svg viewBox="0 0 24 24"><path d="M3 6h18M3 12h18M3 18h18"/></svg></a>
    </div>
  </header>
  <div class="rb-layout__body">
    <aside class="rb-layout__sidebar" data-rb-layout-at="md">
      <div class="rb-layout__drawer" data-rb-layout-drawer data-rb-layout-drawer-desktop="inline" data-rb-layout-drawer-at="md" data-rb-layout-drawer-open="false">
        <div class="rb-layout__drawer-backdrop" data-rb-layout-drawer-backdrop hidden></div>
        <div id="docs-navigation" class="rb-layout__drawer-panel" data-rb-layout-drawer-panel role="region" aria-label="Documentation" tabindex="-1">
          <a href="/docs/one">Docs</a>
        </div>
      </div>
    </aside>
    <main class="rb-layout__main"><div class="rb-content-container" id="content">Content</div></main>
    <aside class="rb-layout__aside" data-rb-layout-at="lg">TOC</aside>
  </div>
  <div class="rb-show-at" id="desktop-only" data-rb-show-min="md">Desktop</div>
  <div class="rb-show-at" id="mobile-only" data-rb-show-max="sm">Mobile</div>
</div>`;

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

test("responsive rails and header layout follow viewport breakpoints", async (t) => {
  if (!browser) return t.skip("Puppeteer browser is unavailable");
  for (const width of [320, 375, 390, 768, 1024, 1440, 1920]) {
    const page = await openPage(width);
    const layout = await page.evaluate(() => {
      const header = document.querySelector<HTMLElement>(".rb-layout__header");
      const brand = document.querySelector<HTMLElement>("#brand");
      const actions = document.querySelector<HTMLElement>("#actions");
      const sidebar = document.querySelector<HTMLElement>(
        ".rb-layout__sidebar",
      );
      const aside = document.querySelector<HTMLElement>(".rb-layout__aside");
      const desktopOnly = document.querySelector<HTMLElement>("#desktop-only");
      const mobileOnly = document.querySelector<HTMLElement>("#mobile-only");
      const drawer = document.querySelector<HTMLElement>(
        ".rb-layout__drawer-panel",
      );
      const ids = [...document.querySelectorAll<HTMLElement>("[id]")].map(
        (element) => element.id,
      );
      const brandBox = brand?.getBoundingClientRect();
      const actionsBox = actions?.getBoundingClientRect();
      return {
        headerWidth: header?.getBoundingClientRect().width ?? 0,
        brandLeft: brandBox?.left ?? 0,
        actionsRight: actionsBox?.right ?? 0,
        sidebar: getComputedStyle(sidebar ?? document.body).display,
        sidebarWidth: sidebar?.getBoundingClientRect().width ?? 0,
        aside: getComputedStyle(aside ?? document.body).display,
        desktopOnly:
          getComputedStyle(desktopOnly ?? document.body).display !== "none",
        mobileOnly:
          getComputedStyle(mobileOnly ?? document.body).display !== "none",
        drawerPosition: getComputedStyle(drawer ?? document.body).position,
        duplicateIds: ids.length !== new Set(ids).size,
        overflow:
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth,
      };
    });
    assert.ok(layout.headerWidth >= width);
    assert.ok(layout.brandLeft <= 24);
    assert.ok(layout.actionsRight >= width - 24);
    assert.equal(layout.overflow, false);
    assert.equal(
      layout.sidebar === "none" || layout.sidebarWidth === 0,
      width < 768,
    );
    assert.equal(layout.sidebarWidth > 0, width >= 768);
    assert.equal(layout.aside === "none", width < 1024);
    assert.equal(layout.desktopOnly, width >= 768);
    assert.equal(layout.mobileOnly, width < 480);
    assert.equal(layout.drawerPosition, width < 768 ? "fixed" : "static");
    assert.equal(layout.duplicateIds, false);
    await page.close();
  }
});

test("drawer opens, traps focus, closes on Escape and SPA navigation", async (t) => {
  if (!browser) return t.skip("Puppeteer browser is unavailable");
  const page = await openPage(390);
  const trigger = "[data-rb-layout-drawer-trigger]";
  await page.click(trigger);
  const opened = await page.evaluate(() => {
    const panel = document.querySelector<HTMLElement>("#docs-navigation");
    return {
      expanded: document
        .querySelector("[data-rb-layout-drawer-trigger]")
        ?.getAttribute("aria-expanded"),
      display: panel ? getComputedStyle(panel).display : "none",
      role: panel?.getAttribute("role"),
      focusInside: panel?.contains(document.activeElement) ?? false,
      bodyLocked: document.documentElement.classList.contains(
        "rb-layout-drawer-open",
      ),
    };
  });
  assert.equal(opened.expanded, "true");
  assert.notEqual(opened.display, "none");
  assert.equal(opened.role, "dialog");
  assert.equal(opened.focusInside, true);
  assert.equal(opened.bodyLocked, true);

  await page.keyboard.press("Escape");
  const closed = await page.evaluate(() => ({
    expanded: document
      .querySelector("[data-rb-layout-drawer-trigger]")
      ?.getAttribute("aria-expanded"),
    display: getComputedStyle(
      document.querySelector<HTMLElement>("#docs-navigation") ?? document.body,
    ).display,
    focusedTrigger: document.activeElement?.matches(
      "[data-rb-layout-drawer-trigger]",
    ),
  }));
  assert.equal(closed.expanded, "false");
  assert.equal(closed.display, "none");
  assert.equal(closed.focusedTrigger, true);

  await page.click(trigger);
  await page.evaluate(() =>
    document.dispatchEvent(new Event("spa:navigation")),
  );
  const afterSpa = await page.evaluate(
    () =>
      document
        .querySelector("[data-rb-layout-drawer-trigger]")
        ?.getAttribute("aria-expanded") ?? "",
  );
  assert.equal(afterSpa, "false");
  await page.close();
});

test("SSR markup exposes responsive hooks without duplicate ids", () => {
  const html = renderToString(
    <SiteShell>
      <SiteHeader sticky>
        <HeaderBrand>Brand</HeaderBrand>
        <HeaderActions wrap>
          <ShowAt min="md">Navigation</ShowAt>
          <DrawerTrigger controls="site-navigation" label="Menu" icon="menu" />
        </HeaderActions>
      </SiteHeader>
      <ShellBody>
        <ShellSidebar at="md">
          <Drawer id="site-navigation" label="Navigation" desktop="inline">
            <Stack gap={2}>
              <a href="/docs">Docs</a>
            </Stack>
          </Drawer>
        </ShellSidebar>
        <ShellMain id="main-content" tabindex={-1}>
          <ContentContainer>
            <ResponsiveGrid min="14rem">
              <p>One</p>
              <p>Two</p>
            </ResponsiveGrid>
          </ContentContainer>
        </ShellMain>
        <ShellAside at="lg">TOC</ShellAside>
      </ShellBody>
    </SiteShell>,
  );
  assert.match(html, /data-rb-layout-at="md"/);
  assert.match(html, /data-rb-layout-at="lg"/);
  assert.match(html, /data-rb-layout-drawer-trigger/);
  assert.match(html, /data-rb-layout-drawer-desktop="inline"/);
  assert.match(html, /data-rb-show-min="md"/);
  assert.match(html, /aria-expanded="false"/);
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(ids.length, new Set(ids).size);
});
