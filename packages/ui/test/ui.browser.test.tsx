/** @jsxRuntime automatic */
/** @jsxImportSource hono/jsx */
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
  var RbCopy: typeof import("../copy.ts");
  var RbLoading: typeof import("../loading.ts");

  interface Window {
    loadingAbort: AbortController;
    drawerAbort: AbortController;
    drawerFixture: HTMLElement;
    loadingController: import("../loading.ts").LoadingController;
  }
}

const style = await readFile(
  new URL("../styles/drawer.css", import.meta.url),
  "utf8",
);
const loadingStyle = await readFile(
  new URL("../styles/loading.css", import.meta.url),
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
const copyJs = await bundle("../copy.ts", "RbCopy");
const loadingJs = await bundle("../loading.ts", "RbLoading");

const pageMarkup = `<!doctype html>
<style>
  :root { --rb-color-ink:#111; --rb-color-surface:#fff; --rb-color-border:#ddd; --rb-color-accent:#06c; --rb-space-3:1.5rem }
  body { margin:0 }
  header { display:flex; justify-content:space-between; padding:1rem }
  main { padding:1rem }
  ${style}
  ${loadingStyle}
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
  <section id="loading-root" data-loading-state="ready">
    <p id="loading-indicator" data-loading hidden>Loading</p>
    <p id="loading-error" data-loading-error role="alert" hidden></p>
    <div id="loading-content" data-loading-content>Content</div>
  </section>
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
  const [drawer, dialog, copy, loading, behaviors] = await Promise.all([
    import("../drawer-client.ts"),
    import("../dialog.ts"),
    import("../copy.ts"),
    import("../loading.ts"),
    import("../behaviors.ts"),
  ]);
  assert.equal(typeof drawer.initDrawers, "function");
  assert.equal(typeof dialog.createDialogController, "function");
  assert.equal(typeof copy.copyText, "function");
  assert.equal(typeof loading.createLoadingController, "function");
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

test("Drawer keeps focus, scroll lock, dismissal, and cleanup", async (t) => {
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
  await page.evaluate(() => {
    const drawer = document.querySelector("[data-rb-drawer]");
    if (!drawer) throw new Error("Missing drawer");
    window.drawerFixture = drawer as HTMLElement;
    drawer.remove();
  });
  await page.waitForFunction(
    () => document.documentElement.style.overflow === "",
  );
  assert.deepEqual(
    await page.evaluate(() => ({
      expanded: document
        .querySelector("[data-rb-drawer-trigger]")
        ?.getAttribute("aria-expanded"),
      lockMarker: document.documentElement.dataset.rbScrollLock ?? null,
    })),
    { expanded: "false", lockMarker: null },
  );

  await page.evaluate(() => {
    window.drawerFixture = window.drawerFixture.cloneNode(true) as HTMLElement;
    document.body.append(window.drawerFixture);
  });
  await page.click(trigger);
  assert.deepEqual(
    await page.evaluate(() => ({
      expanded: document
        .querySelector("[data-rb-drawer-trigger]")
        ?.getAttribute("aria-expanded"),
      lockMarker: document.documentElement.dataset.rbScrollLock ?? null,
    })),
    { expanded: "true", lockMarker: "true" },
  );
  await page.close();
});

test("Drawer keeps navigation scroll position across SPA navigation", async (t) => {
  if (!browser) return t.skip("Puppeteer browser is unavailable");
  const page = await openPage(375, [{ name: "drawer", source: drawerJs }]);
  await page.evaluate(() => RbDrawer.initDrawers());
  const trigger = "#drawer-trigger";
  await page.click(trigger);
  assert.equal(
    await page.evaluate(() => {
      const panel = document.querySelector<HTMLElement>("#navigation");
      if (!panel) throw new Error("Missing drawer panel");
      panel.style.height = "100px";
      const spacer = document.createElement("div");
      spacer.style.height = "1000px";
      panel.append(spacer);
      panel.scrollTop = 180;
      return panel.scrollTop;
    }),
    180,
  );
  await page.evaluate(() => {
    const main = document.querySelector("main#main-content");
    const next = main?.cloneNode(true);
    if (!main || !next) throw new Error("Missing page root");
    main.replaceWith(next);
  });
  await page.waitForFunction(
    () =>
      document
        .querySelector("[data-rb-drawer-trigger]")
        ?.getAttribute("aria-expanded") === "false",
  );
  await page.click(trigger);
  assert.equal(
    await page.evaluate(
      () => document.querySelector<HTMLElement>("#navigation")?.scrollTop,
    ),
    180,
  );
  assert.equal(
    await page.$eval(trigger, (element) =>
      element.getAttribute("aria-expanded"),
    ),
    "true",
  );
  await page.close();
});

test("Drawer destroys when its lifecycle signal aborts", async (t) => {
  if (!browser) return t.skip("Puppeteer browser is unavailable");
  const page = await openPage(375, [{ name: "drawer", source: drawerJs }]);
  await page.evaluate(() => {
    window.drawerAbort = new AbortController();
    RbDrawer.initDrawers({ signal: window.drawerAbort.signal });
  });

  await page.click("#drawer-trigger");
  assert.deepEqual(
    await page.evaluate(() => ({
      expanded: document
        .querySelector("[data-rb-drawer-trigger]")
        ?.getAttribute("aria-expanded"),
      locked: document.documentElement.style.overflow,
      role: document.querySelector("#navigation")?.getAttribute("role"),
    })),
    { expanded: "true", locked: "hidden", role: "dialog" },
  );

  await page.evaluate(() => window.drawerAbort.abort());
  await page.waitForFunction(
    () => document.documentElement.style.overflow === "",
  );
  assert.deepEqual(
    await page.evaluate(() => ({
      expanded: document
        .querySelector("[data-rb-drawer-trigger]")
        ?.getAttribute("aria-expanded"),
      lockMarker: document.documentElement.dataset.rbScrollLock ?? null,
      role: document.querySelector("#navigation")?.getAttribute("role"),
    })),
    { expanded: "false", lockMarker: null, role: null },
  );

  await page.click("#drawer-trigger");
  assert.equal(
    await page.$eval("#drawer-trigger", (element) =>
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

test("Dialog destroys when its lifecycle signal aborts", async (t) => {
  if (!browser) return t.skip("Puppeteer browser is unavailable");
  const page = await openPage(768, [{ name: "dialog", source: dialogJs }]);
  await page.evaluate(`
    (() => {
      const dialog = document.querySelector("#test-dialog");
      const trigger = document.querySelector("#dialog-trigger");
      window.dialogAbort = new AbortController();
      RbDialog.createDialogController(dialog, {
        triggers: [trigger],
        signal: window.dialogAbort.signal,
      });
    })();
  `);

  await page.click("#dialog-trigger");
  assert.equal(
    await page.evaluate(
      () => document.querySelector<HTMLDialogElement>("#test-dialog")?.open,
    ),
    true,
  );

  await page.evaluate("window.dialogAbort.abort()");
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
  assert.equal(
    await page.evaluate(
      () => document.querySelector<HTMLDialogElement>("#test-dialog")?.open,
    ),
    false,
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

test("Loading controller exposes state and accessibility", async (t) => {
  if (!browser) return t.skip("Puppeteer browser is unavailable");
  const page = await openPage(768, [{ name: "loading", source: loadingJs }]);

  const started = await page.evaluate(() => {
    const root = document.querySelector("#loading-root");
    if (!root) throw new Error("Missing loading root");
    window.loadingController = RbLoading.createLoadingController(root);
    window.loadingController.start();
    return {
      state: root.getAttribute("data-loading-state"),
      indicatorHidden:
        document.querySelector<HTMLElement>("#loading-indicator")?.hidden,
      errorHidden:
        document.querySelector<HTMLElement>("#loading-error")?.hidden,
      busy: document
        .querySelector("#loading-content")
        ?.getAttribute("aria-busy"),
    };
  });
  assert.deepEqual(started, {
    state: "loading",
    indicatorHidden: false,
    errorHidden: true,
    busy: "true",
  });

  await page.evaluate(() => window.loadingController.fail("Network failed"));
  assert.deepEqual(
    await page.evaluate(() => ({
      state: document
        .querySelector("#loading-root")
        ?.getAttribute("data-loading-state"),
      indicatorHidden:
        document.querySelector<HTMLElement>("#loading-indicator")?.hidden,
      errorHidden:
        document.querySelector<HTMLElement>("#loading-error")?.hidden,
      message: document.querySelector("#loading-error")?.textContent,
      busy: document
        .querySelector("#loading-content")
        ?.getAttribute("aria-busy"),
    })),
    {
      state: "error",
      indicatorHidden: true,
      errorHidden: false,
      message: "Network failed",
      busy: null,
    },
  );

  await page.evaluate(() => window.loadingController.start());
  assert.deepEqual(
    await page.evaluate(() => ({
      message: document.querySelector("#loading-error")?.textContent,
      errorHidden:
        document.querySelector<HTMLElement>("#loading-error")?.hidden,
    })),
    { message: "", errorHidden: true },
  );

  await page.evaluate(() => {
    window.loadingAbort = new AbortController();
    window.loadingController.destroy();
    const root = document.querySelector("#loading-root");
    if (!root) throw new Error("Missing loading root");
    window.loadingController = RbLoading.createLoadingController(root, {
      signal: window.loadingAbort.signal,
    });
    window.loadingController.start();
    window.loadingAbort.abort();
  });
  assert.deepEqual(
    await page.evaluate(() => ({
      state: document
        .querySelector("#loading-root")
        ?.getAttribute("data-loading-state"),
      indicatorHidden:
        document.querySelector<HTMLElement>("#loading-indicator")?.hidden,
      busy: document
        .querySelector("#loading-content")
        ?.getAttribute("aria-busy"),
    })),
    { state: null, indicatorHidden: true, busy: null },
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
