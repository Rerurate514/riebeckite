import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { DocsSidebar } from "@riebeckite/plugin-docs";
import { build } from "esbuild";
import { createElement, Fragment } from "hono/jsx";
import { renderToString } from "hono/jsx/dom/server";
import puppeteer, { type Browser, type Page } from "puppeteer";

declare global {
  var RbDrawer: typeof import("../../packages/ui/drawer-client.ts");
  var RbSidebarNavigation: typeof import("../../packages/plugins/navigation/client.ts");
}

(globalThis as { React?: unknown }).React = { createElement, Fragment };

const read = (relativePath: string) =>
  readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");

async function bundle(entry: string, globalName: string): Promise<string> {
  const result = await build({
    entryPoints: [fileURLToPath(new URL(entry, import.meta.url))],
    bundle: true,
    format: "iife",
    globalName,
    platform: "browser",
    target: "esnext",
    write: false,
  });
  return result.outputFiles[0]?.text ?? "";
}

const styles = [
  read("../../packages/ui/styles/drawer.css"),
  read("../../packages/plugins/navigation/style.css"),
].join("\n");
const drawerClient = await bundle(
  "../../packages/ui/drawer-client.ts",
  "RbDrawer",
);
const sidebarClient = await bundle(
  "../../packages/plugins/navigation/client.ts",
  "RbSidebarNavigation",
);
const navigation = renderToString(
  await DocsSidebar({
    currentPermalink: "/",
    label: "Documentation",
    items: [
      { title: "Documentation", href: "/docs/", children: [] },
      {
        title: "Design Philosophy",
        href: "/docs/design-philosophy/",
        children: [],
      },
      { title: "Release Notes", href: "/docs/release-notes/", children: [] },
      {
        title: "Getting Started",
        href: "/docs/getting-started/",
        children: [],
      },
      {
        title: "Guides",
        collapsed: true,
        children: [
          { title: "Plugins", href: "/docs/plugins/", children: [] },
          { title: "Reference", href: "/docs/reference/", children: [] },
        ],
      },
      { title: "Themes", href: "/docs/themes/", children: [] },
      { title: "Framework", href: "/docs/framework/", children: [] },
      { title: "Accessibility", href: "/docs/accessibility/", children: [] },
      { title: "Glossary", href: "/docs/glossary/", children: [] },
      { title: "Security", href: "/docs/security/", children: [] },
    ],
  }),
);

let browser: Browser | null = null;

before(async () => {
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  } catch {
    browser = null;
  }
});

after(async () => browser?.close());

async function openDrawer(theme: "light" | "dark"): Promise<Page> {
  if (!browser) throw new Error("Puppeteer browser is unavailable");
  const page = await browser.newPage();
  await page.setViewport({ width: 375, height: 300 });
  await page.setContent(`<!doctype html>
    <html data-rb-mode="${theme}"><style>
      :root { --rb-color-ink: #111; --rb-color-surface: #fff; --rb-color-border: #ddd; --rb-color-accent: #06c; --rb-space-3: 1rem; }
      body { margin: 0; } ${styles}
    </style><body>
      <a id="drawer-trigger" href="#docs-navigation" data-rb-drawer-trigger data-rb-drawer-target="docs-navigation">Menu</a>
      <div class="rb-drawer" data-rb-drawer data-rb-drawer-open="false">
        <div class="rb-drawer__backdrop" data-rb-drawer-backdrop hidden></div>
        <section id="docs-navigation" class="rb-drawer__panel" data-rb-drawer-panel tabindex="-1">${navigation}</section>
      </div>
    </body></html>`);
  await page.addScriptTag({ content: drawerClient });
  await page.addScriptTag({ content: sidebarClient });
  await page.evaluate(() => {
    RbDrawer.initDrawers();
    RbSidebarNavigation.initSidebarNavigation();
    document.addEventListener("click", (event) => {
      if ((event.target as Element | null)?.closest("a[href]")) {
        event.preventDefault();
      }
    });
  });
  await page.click("#drawer-trigger");
  return page;
}

for (const theme of ["light", "dark"] as const) {
  test(`mobile documentation drawer works in ${theme} mode`, async (t) => {
    if (!browser) return t.skip("puppeteer browser is unavailable");
    const page = await openDrawer(theme);
    try {
      const initial = await page.evaluate(() => {
        const panel = document.querySelector<HTMLElement>("#docs-navigation");
        const links = Array.from(
          panel?.querySelectorAll<HTMLAnchorElement>("a[href]") ?? [],
        );
        const security = links.find((link) => link.textContent === "Security");
        return {
          visible: getComputedStyle(panel ?? document.body).display,
          links: links.map((link) => [
            link.textContent,
            link.getAttribute("href"),
          ]),
          scrollHeight: panel?.scrollHeight ?? 0,
          clientHeight: panel?.clientHeight ?? 0,
          securityTop: security?.getBoundingClientRect().top ?? 0,
        };
      });
      assert.equal(initial.visible, "block");
      assert.deepEqual(initial.links, [
        ["Documentation", "/docs/"],
        ["Design Philosophy", "/docs/design-philosophy/"],
        ["Release Notes", "/docs/release-notes/"],
        ["Getting Started", "/docs/getting-started/"],
        ["Plugins", "/docs/plugins/"],
        ["Reference", "/docs/reference/"],
        ["Themes", "/docs/themes/"],
        ["Framework", "/docs/framework/"],
        ["Accessibility", "/docs/accessibility/"],
        ["Glossary", "/docs/glossary/"],
        ["Security", "/docs/security/"],
      ]);
      assert.ok(initial.scrollHeight > initial.clientHeight);

      await page.click(".rb-sidebar-navigation__details > summary");
      assert.equal(
        await page.$eval(
          ".rb-sidebar-navigation__details",
          (details) => (details as HTMLDetailsElement).open,
        ),
        true,
      );

      await page.$eval("#docs-navigation", (panel) => {
        panel.scrollTop = panel.scrollHeight;
      });
      const securityVisible = await page.$eval("#docs-navigation", (panel) => {
        const security = Array.from(panel.querySelectorAll("a")).find(
          (link) => link.textContent === "Security",
        );
        return Boolean(
          security &&
            security.getBoundingClientRect().bottom <=
              panel.getBoundingClientRect().bottom,
        );
      });
      assert.equal(securityVisible, true);

      await page.click('a[href="/docs/security/"]');
      assert.equal(
        await page.$eval(
          "#docs-navigation",
          (panel) => getComputedStyle(panel).display,
        ),
        "none",
      );
      await page.click("#drawer-trigger");
      await page.evaluate(() =>
        document.dispatchEvent(new Event("spa:navigation")),
      );
      await page.click("#drawer-trigger");
      assert.equal(
        await page.$eval(
          "#docs-navigation",
          (panel) => getComputedStyle(panel).display,
        ),
        "block",
      );
    } finally {
      await page.close();
    }
  });
}
