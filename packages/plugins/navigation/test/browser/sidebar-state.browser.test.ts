import assert from "node:assert/strict";
import path from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { createElement, Fragment } from "hono/jsx";
import { renderToString } from "hono/jsx/dom/server";
import puppeteer, { type Browser } from "puppeteer";
import { SidebarNavigation } from "../../components/sidebar-navigation.tsx";

(globalThis as { React?: unknown }).React = { createElement, Fragment };

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

test("keeps details state when a SPA page replaces the navigation", async (t) => {
  if (!browser) return t.skip("Puppeteer browser is unavailable");
  const packageRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../..",
  );
  const bundle = await build({
    entryPoints: [path.join(packageRoot, "client.ts")],
    bundle: true,
    format: "iife",
    globalName: "SidebarNavigationClient",
    platform: "browser",
    target: "es2022",
    write: false,
    logLevel: "silent",
  });
  const html = renderToString(
    SidebarNavigation({
      items: [
        {
          label: "Guide",
          href: "/guide",
          children: [{ label: "Install", href: "/guide/install" }],
        },
      ],
      nativeDetails: true,
      stateKey: "docs:guide:en",
    }),
  );
  const page = await browser.newPage();
  try {
    await page.setContent(`<main id="main-content">${html}</main>`);
    await page.addScriptTag({ content: bundle.outputFiles?.[0]?.text });
    const open = await page.evaluate((nextPage) => {
      const client = (
        window as unknown as {
          SidebarNavigationClient: {
            initSidebarNavigation(context: { root: ParentNode }): () => void;
          };
        }
      ).SidebarNavigationClient;
      const cleanup = client.initSidebarNavigation({ root: document });
      const details = document.querySelector<HTMLDetailsElement>(
        ".rb-sidebar-navigation__details",
      );
      if (!details) throw new Error("missing details");
      details.open = false;
      details.dispatchEvent(new Event("toggle"));
      const main = document.querySelector("#main-content");
      if (!main) throw new Error("missing main content");
      main.outerHTML = `<main id="main-content">${nextPage}</main>`;
      document.dispatchEvent(new Event("spa:navigation"));
      const open = document.querySelector<HTMLDetailsElement>(
        ".rb-sidebar-navigation__details",
      )?.open;
      cleanup();
      return open;
    }, html);
    assert.equal(open, false);
  } finally {
    await page.close();
  }
});
