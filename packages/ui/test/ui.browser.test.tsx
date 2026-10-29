/** @jsxRuntime automatic @jsxImportSource hono/jsx */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { renderToString } from "hono/jsx/dom/server";
import puppeteer, { type Browser, type Page } from "puppeteer";
import { Drawer, DrawerTrigger } from "../drawer.tsx";

declare global {
  var RbDrawer: typeof import("../drawer-client.ts");
  var RbDialog: typeof import("../dialog.ts");
  var RbTabs: typeof import("../tabs.ts");
  var RbCopy: typeof import("../copy.ts");
}

const style = await readFile(
  new URL("../styles/drawer.css", import.meta.url),
  "utf8",
);

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

const drawerJs = await bundle("../drawer-client.ts", "RbDrawer");
const dialogJs = await bundle("../dialog.ts", "RbDialog");
const tabsJs = await bundle("../tabs.ts", "RbTabs");
const copyJs = await bundle("../copy.ts", "RbCopy");

const pageMarkup = `<!doctype html>
<style>
  :root { --rb-color-ink:#111; --rb-color-surface:#fff; --rb-color-border:#ddd; --rb-color-accent:#06c; --rb-space-3:1.5rem }
  body { margin:0 }
  header { display:flex; justify-content:space-between; padding:1rem }
  main { padding:1rem }
  ${style}
</style>
<header>
  <a href="/">Site</a>
  <a id="drawer-trigger" href="#navigation" class="rb-drawer-trigger rb-drawer-trigger--icon" data-rb-drawer-trigger data-rb-drawer-target="navigation" aria-controls="navigation" aria-expanded="false" aria-label="Menu">Menu</a>
</header>
<main id="main-content">
  <h1>Standard HTML</h1>
  <button id="outside">Outside</button>
  <button id="dialog-trigger">Open dialog</button>
  <dialog id="test-dialog" aria-label="Test dialog">
    <button id="dialog-close">Close</button>
    <input id="dialog-input">
  </dialog>
  <div id="tabs" role="tablist" aria-label="Tabs">
    <button id="tab-1" role="tab" aria-controls="panel-1" aria-selected="true">One</button>
    <button id="tab-2" role="tab" aria-controls="panel-2" aria-selected="false" tabindex="-1">Two</button>
    <button id="tab-3" role="tab" aria-controls="panel-3" aria-selected="false" tabindex="-1">Three</button>
  </div>
  <div id="panel-1" role="tabpanel">Panel one</div>
  <div id="panel-2" role="tabpanel" hidden>Panel two</div>
  <div id="panel-3" role="tabpanel" hidden>Panel three</div>
  <div id="vertical-tabs" role="tablist" aria-label="Vertical tabs" aria-orientation="vertical">
    <button id="vertical-1" role="tab" aria-controls="vertical-panel-1" aria-selected="true">A</button>
    <button id="vertical-2" role="tab" aria-controls="vertical-panel-2" aria-selected="false" tabindex="-1">B</button>
  </div>
  <div id="vertical-panel-1" role="tabpanel">Vertical A</div>
  <div id="vertical-panel-2" role="tabpanel" hidden>Vertical B</div>
</main>
<div class="rb-drawer" data-rb-drawer data-rb-drawer-open="false">
  <div class="rb-drawer__backdrop" data-rb-drawer-backdrop hidden></div>
  <section id="navigation" class="rb-drawer__panel" data-rb-drawer-panel aria-label="Navigation" tabindex="-1">
    <a id="panel-first" href="/docs">Docs</a>
    <a id="panel-last" href="/about">About</a>
  </section>
</div>`;

let browser: Browser | null = null;

async function openPage(
  width: number,
  scripts: Array<{ name: string; source: string }> = [],
): Promise<Page> {
  if (!browser) throw new Error("Puppeteer browser is unavailable");
  const page = await browser.newPage();
  await page.setViewport({ width, height: 900 });
  await page.setContent(pageMarkup);
  for (const script of scripts) {
    await page.addScriptTag({ content: script.source });
  }
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

test("UI modules import without a document", async () => {
  const [dialog, tabs, copy, behaviors] = await Promise.all([
    import("../dialog.ts"),
    import("../tabs.ts"),
    import("../copy.ts"),
    import("../behaviors.ts"),
  ]);
  assert.equal(typeof dialog.createDialogController, "function");
  assert.equal(typeof tabs.createTabs, "function");
  assert.equal(typeof copy.copyText, "function");
  assert.equal(typeof behaviors.lockScroll, "function");
});

test("Drawer composes with standard HTML at supported viewports", async (t) => {
  if (!browser) return t.skip("Puppeteer browser is unavailable");
  for (const width of [375, 768, 1440]) {
    const page = await openPage(width, [{ name: "drawer", source: drawerJs }]);
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

test("Drawer keeps focus, scroll lock, dismissal, and reinitialization", async (t) => {
  if (!browser) return t.skip("Puppeteer browser is unavailable");
  const page = await openPage(375, [{ name: "drawer", source: drawerJs }]);
  await page.evaluate(() => {
    RbDrawer.initDrawers();
    RbDrawer.initDrawers();
  });

  const trigger = "#drawer-trigger";
  await page.click(trigger);
  const opened = await page.evaluate(() => {
    const panel = document.querySelector<HTMLElement>("#navigation");
    return {
      expanded: document
        .querySelector("[data-rb-drawer-trigger]")
        ?.getAttribute("aria-expanded"),
      role: panel?.getAttribute("role"),
      modal: panel?.getAttribute("aria-modal"),
      focusInside: panel?.contains(document.activeElement) ?? false,
      focus: document.activeElement?.id,
      locked: document.documentElement.style.overflow,
      lockMarker: document.documentElement.dataset.rbScrollLock,
      backdrop:
        document.querySelector<HTMLElement>("[data-rb-drawer-backdrop]")
          ?.hidden === false,
    };
  });
  assert.deepEqual(opened, {
    expanded: "true",
    role: "dialog",
    modal: "true",
    focusInside: true,
    focus: "panel-first",
    locked: "hidden",
    lockMarker: "true",
    backdrop: true,
  });

  await page.focus("#panel-last");
  await page.keyboard.press("Tab");
  assert.equal(
    await page.evaluate(() => document.activeElement?.id),
    "panel-first",
  );
  await page.keyboard.down("Shift");
  await page.keyboard.press("Tab");
  await page.keyboard.up("Shift");
  assert.equal(
    await page.evaluate(() => document.activeElement?.id),
    "panel-last",
  );

  await page.keyboard.press("Escape");
  assert.deepEqual(
    await page.evaluate(() => ({
      expanded: document
        .querySelector("[data-rb-drawer-trigger]")
        ?.getAttribute("aria-expanded"),
      focus: document.activeElement?.id,
      locked: document.documentElement.style.overflow,
      lockMarker: document.documentElement.dataset.rbScrollLock ?? null,
      role: document.querySelector("#navigation")?.getAttribute("role"),
    })),
    {
      expanded: "false",
      focus: "drawer-trigger",
      locked: "",
      lockMarker: null,
      role: null,
    },
  );

  await page.click(trigger);
  await page.evaluate(() =>
    document.body.dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true }),
    ),
  );
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

test("Drawer without JavaScript falls back to :target", async (t) => {
  if (!browser) return t.skip("Puppeteer browser is unavailable");
  const page = await openPage(375);
  await page.click("#drawer-trigger");
  assert.deepEqual(
    await page.evaluate(() => {
      const navigation = document.querySelector<HTMLElement>("#navigation");
      if (!navigation) throw new Error("Missing drawer panel");
      return {
        display: getComputedStyle(navigation).display,
        expanded: document
          .querySelector("[data-rb-drawer-trigger]")
          ?.getAttribute("aria-expanded"),
        role: document.querySelector("#navigation")?.getAttribute("role"),
        locked: document.documentElement.style.overflow,
      };
    }),
    {
      display: "block",
      expanded: "false",
      role: null,
      locked: "",
    },
  );
  await page.close();
});

test("Dialog builds on native showModal and restores focus", async (t) => {
  if (!browser) return t.skip("Puppeteer browser is unavailable");
  const page = await openPage(768, [{ name: "dialog", source: dialogJs }]);
  await page.evaluate(`
    (() => {
      const dialog = document.querySelector("#test-dialog");
      const trigger = document.querySelector("#dialog-trigger");
      const close = document.querySelector("#dialog-close");
      const input = document.querySelector("#dialog-input");
      RbDialog.createDialogController(dialog, {
        triggers: [trigger],
        closeButtons: [close],
        initialFocus: function () { return input; },
      });
    })();
  `);

  await page.click("#dialog-trigger");
  assert.deepEqual(
    await page.evaluate(() => {
      const dialog = document.querySelector<HTMLDialogElement>("#test-dialog");
      if (!dialog) throw new Error("Missing dialog");
      return {
        open: dialog.open,
        modal: dialog.matches(":modal"),
        expanded: document
          .querySelector("#dialog-trigger")
          ?.getAttribute("aria-expanded"),
        focus: document.activeElement?.id,
        locked: document.documentElement.style.overflow,
      };
    }),
    {
      open: true,
      modal: true,
      expanded: "true",
      focus: "dialog-input",
      locked: "hidden",
    },
  );

  await page.keyboard.press("Tab");
  assert.equal(
    await page.evaluate(() => document.activeElement?.id),
    "dialog-close",
  );
  await page.keyboard.down("Shift");
  await page.keyboard.press("Tab");
  await page.keyboard.up("Shift");
  assert.equal(
    await page.evaluate(() => document.activeElement?.id),
    "dialog-input",
  );

  await page.keyboard.press("Escape");
  await page.waitForFunction(() => {
    const dialog = document.querySelector<HTMLDialogElement>("#test-dialog");
    return dialog?.open === false;
  });
  assert.deepEqual(
    await page.evaluate(() => ({
      expanded: document
        .querySelector("#dialog-trigger")
        ?.getAttribute("aria-expanded"),
      focus: document.activeElement?.id,
      locked: document.documentElement.style.overflow,
      lockMarker: document.documentElement.dataset.rbScrollLock ?? null,
    })),
    {
      expanded: "false",
      focus: "dialog-trigger",
      locked: "",
      lockMarker: null,
    },
  );

  await page.click("#dialog-trigger");
  await page.evaluate(() =>
    document
      .querySelector("#test-dialog")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true })),
  );
  assert.equal(
    await page.evaluate(
      () => document.querySelector<HTMLDialogElement>("#test-dialog")?.open,
    ),
    false,
  );
  await page.close();
});

test("Tabs expose ARIA state and keyboard navigation", async (t) => {
  if (!browser) return t.skip("Puppeteer browser is unavailable");
  const page = await openPage(1440, [{ name: "tabs", source: tabsJs }]);
  await page.evaluate(() => {
    const horizontal = document.querySelector<HTMLElement>("#tabs");
    const vertical = document.querySelector<HTMLElement>("#vertical-tabs");
    if (!horizontal || !vertical) throw new Error("Missing tablist");
    RbTabs.createTabs(horizontal);
    RbTabs.createTabs(vertical);
  });

  assert.deepEqual(
    await page.evaluate(() => ({
      selected: document.querySelector("#tab-1")?.getAttribute("aria-selected"),
      tabIndex: document.querySelector<HTMLElement>("#tab-1")?.tabIndex,
      panelHidden: document.querySelector<HTMLElement>("#panel-2")?.hidden,
      active: document.querySelector("#panel-1")?.getAttribute("data-active"),
    })),
    {
      selected: "true",
      tabIndex: 0,
      panelHidden: true,
      active: "true",
    },
  );

  await page.click("#tab-2");
  assert.deepEqual(
    await page.evaluate(() => ({
      selected: document.querySelector("#tab-2")?.getAttribute("aria-selected"),
      tabIndex: document.querySelector<HTMLElement>("#tab-2")?.tabIndex,
      focus: document.activeElement?.id,
      panelHidden: document.querySelector<HTMLElement>("#panel-2")?.hidden,
      active: document.querySelector("#panel-2")?.getAttribute("data-active"),
      previousHidden: document.querySelector<HTMLElement>("#panel-1")?.hidden,
    })),
    {
      selected: "true",
      tabIndex: 0,
      focus: "tab-2",
      panelHidden: false,
      active: "true",
      previousHidden: true,
    },
  );

  await page.keyboard.press("ArrowRight");
  assert.equal(await page.evaluate(() => document.activeElement?.id), "tab-3");
  await page.keyboard.press("Home");
  assert.equal(await page.evaluate(() => document.activeElement?.id), "tab-1");
  await page.keyboard.press("End");
  assert.equal(await page.evaluate(() => document.activeElement?.id), "tab-3");
  await page.keyboard.press("ArrowLeft");
  assert.deepEqual(
    await page.evaluate(() => ({
      focus: document.activeElement?.id,
      selected: document.activeElement?.getAttribute("aria-selected"),
    })),
    { focus: "tab-2", selected: "true" },
  );

  await page.focus("#vertical-1");
  await page.keyboard.press("ArrowDown");
  assert.equal(
    await page.evaluate(() => document.activeElement?.id),
    "vertical-2",
  );
  await page.close();
});

test("Copy text uses the fallback and preserves selection", async (t) => {
  if (!browser) return t.skip("Puppeteer browser is unavailable");
  const page = await openPage(375, [{ name: "copy", source: copyJs }]);
  const result = await page.evaluate(`
    (async () => {
      Object.defineProperty(navigator, "clipboard", {
        value: undefined,
        configurable: true,
      });
      let copiedValue = "";
      Object.defineProperty(document, "execCommand", {
        configurable: true,
        value: function (command) {
          copiedValue =
            document.querySelector("textarea")?.value ?? "";
          return command === "copy";
        },
      });

      const target = document.createElement("p");
      target.textContent = "selected text";
      document.body.appendChild(target);
      const range = document.createRange();
      range.selectNodeContents(target);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);

      const ok = await RbCopy.copyText("hello");
      return {
        ok,
        copiedValue,
        selectedText: selection?.toString(),
        textareas: document.querySelectorAll("textarea").length,
      };
    })();
  `);

  assert.deepEqual(result, {
    ok: true,
    copiedValue: "hello",
    selectedText: "selected text",
    textareas: 0,
  });
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
