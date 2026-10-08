import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import puppeteer, { type Browser, type Page } from "puppeteer";

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

const SEARCH_ITEMS = [
  {
    slug: "alpha",
    permalink: "/notes/alpha",
    title: "Alpha Note",
    aliases: [],
    headings: ["Introduction"],
    body: "Alpha body content about obsidian.",
    excerpt: "Alpha excerpt about obsidian.",
    tags: ["obsidian", "notes"],
    language: "en",
    date: "2024-01-02",
  },
  {
    slug: "beta",
    permalink: "/notes/beta",
    title: "Beta Note",
    aliases: [],
    headings: ["Body"],
    body: "Beta body content about zettelkasten.",
    excerpt: "Beta excerpt about zettelkasten.",
    tags: ["zettel"],
    language: "ja",
    date: null,
  },
];

type AxNode = {
  role?: string;
  name?: string;
  children?: AxNode[];
};

function findByRole(node: AxNode | null, role: string): AxNode | undefined {
  if (!node) return undefined;
  if (node.role === role) return node;
  for (const child of node.children ?? []) {
    const found = findByRole(child, role);
    if (found) return found;
  }
  return undefined;
}

async function launchBrowser(): Promise<Browser | null> {
  const attempts: Array<Parameters<typeof puppeteer.launch>[0]> = [
    {
      headless: "shell",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    },
    {
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    },
  ];
  for (const options of attempts) {
    try {
      return await puppeteer.launch(options);
    } catch {}
  }
  return null;
}

let server: Server;
let browser: Browser | null = null;
let baseUrl = "";

before(async () => {
  const searchStyle = readFileSync(
    new URL("../../style.css", import.meta.url),
    "utf8",
  );
  const shellStyle = readFileSync(
    new URL("../../../../integrations/honox/style.css", import.meta.url),
    "utf8",
  );
  const packageRoot = fileURLToPath(new URL("../../", import.meta.url));
  const rendered = await build({
    stdin: {
      contents:
        'import { renderToString } from "hono/jsx/dom/server";\n' +
        'import SearchBar from "./components/search-bar.tsx";\n' +
        "export const html = renderToString(SearchBar());\n",
      resolveDir: packageRoot,
      sourcefile: "search-bar-render.ts",
      loader: "ts",
    },
    bundle: true,
    format: "esm",
    platform: "node",
    target: "esnext",
    jsx: "automatic",
    jsxImportSource: "hono/jsx",
    write: false,
    logLevel: "silent",
  });
  const renderModule = (await import(
    `data:text/javascript;base64,${Buffer.from(
      rendered.outputFiles[0].text,
    ).toString("base64")}`
  )) as { html: string };
  const componentHtml = renderModule.html;

  const bundle = await build({
    entryPoints: [
      fileURLToPath(new URL("../../src/search-bar.client.ts", import.meta.url)),
    ],
    bundle: true,
    format: "iife",
    globalName: "RiebeckiteSearch",
    platform: "browser",
    target: "esnext",
    write: false,
    logLevel: "silent",
  });
  const clientJs = `${bundle.outputFiles[0].text}\nRiebeckiteSearch.initSearch();\nwindow.__searchReady = true;`;

  const html = `<!doctype html>
<html lang="en" data-theme-name="default">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>:root { --rb-color-overlay: rgb(0 0 0 / 0.4); }</style>
<style>${searchStyle}</style>
<style>${shellStyle}</style>
</head>
<body class="riebeckite-page rb-site">
<a id="skip-link" href="#main-content" class="rb-skip-link">Skip to main content</a>
<header><nav><button id="nav-action" type="button">Menu</button></nav></header>
${componentHtml}
<main id="main-content" tabindex="-1"><button id="main-action" type="button">Main action</button></main>
<script src="/client.js"></script>
</body>
</html>`;

  server = createServer((request, response) => {
    const url = request.url ?? "/";
    if (url === "/") {
      response.setHeader("content-type", "text/html; charset=utf-8");
      response.end(html);
      return;
    }
    if (url === "/client.js") {
      response.setHeader("content-type", "text/javascript; charset=utf-8");
      response.end(clientJs);
      return;
    }
    if (url === "/search-data.json") {
      response.setHeader("content-type", "application/json; charset=utf-8");
      response.end(JSON.stringify(SEARCH_ITEMS));
      return;
    }
    if (url.startsWith("/notes/")) {
      response.setHeader("content-type", "text/html; charset=utf-8");
      response.end(
        '<!doctype html><html lang="en"><body><p>note</p></body></html>',
      );
      return;
    }
    response.statusCode = 404;
    response.end("not found");
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  baseUrl = `http://127.0.0.1:${port}`;

  browser = await launchBrowser();
});

after(async () => {
  await browser?.close();
  if (server) {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  }
});

function requireBrowser(): Browser {
  if (!browser) throw new Error("puppeteer browser unavailable");
  return browser;
}

async function openPage(): Promise<Page> {
  const page = await requireBrowser().newPage();
  await page.setViewport({ width: 1200, height: 800 });
  await page.goto(baseUrl, { waitUntil: "load" });
  await page.waitForFunction("window.__searchReady === true");
  return page;
}

async function waitOpen(page: Page): Promise<void> {
  await page.waitForFunction(
    () =>
      (document.querySelector("dialog[data-search-modal]") as HTMLDialogElement)
        .open === true,
  );
}

async function waitClosed(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const dialog = document.querySelector(
      "dialog[data-search-modal]",
    ) as HTMLDialogElement;
    const trigger = document.querySelector("[data-search-open]");
    return (
      dialog.open === false &&
      trigger?.getAttribute("aria-expanded") === "false"
    );
  });
}

async function typeQuery(page: Page, value: string): Promise<void> {
  await page.evaluate((text) => {
    const input = document.querySelector(
      "[data-search-input]",
    ) as HTMLInputElement;
    input.value = text;
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }, value);
}

async function openWithQuery(page: Page, query: string): Promise<void> {
  await page.click("[data-search-open]");
  await waitOpen(page);
  await typeQuery(page, query);
  await page.waitForFunction(
    (expected) =>
      document.querySelectorAll("[data-search-result]").length === expected,
    {},
    2,
  );
}

function activeInsideDialog(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const dialog = document.querySelector("dialog[data-search-modal]");
    return !!dialog && dialog.contains(document.activeElement);
  });
}

test("initial state: closed dialog with an operable background", async (t) => {
  if (!browser) return t.skip("puppeteer browser unavailable");
  const page = await openPage();

  const state = await page.evaluate(() => {
    const dialog = document.querySelector(
      "dialog[data-search-modal]",
    ) as HTMLDialogElement;
    const trigger = document.querySelector("[data-search-open]");
    const main = document.getElementById("main-action") as HTMLButtonElement;
    main.focus();
    return {
      open: dialog.open,
      display: getComputedStyle(dialog).display,
      expanded: trigger?.getAttribute("aria-expanded"),
      mainFocused: document.activeElement === main,
    };
  });

  assert.equal(state.open, false);
  assert.equal(state.display, "none");
  assert.equal(state.expanded, "false");
  assert.equal(state.mainFocused, true);

  await page.close();
});

test("opening moves focus to the search input and names the dialog", async (t) => {
  if (!browser) return t.skip("puppeteer browser unavailable");
  const page = await openPage();

  await page.click("[data-search-open]");
  await waitOpen(page);

  const state = await page.evaluate(() => {
    const dialog = document.querySelector(
      "dialog[data-search-modal]",
    ) as HTMLDialogElement;
    const trigger = document.querySelector("[data-search-open]");
    return {
      inputFocused:
        document.activeElement ===
        document.querySelector("[data-search-input]"),
      expanded: trigger?.getAttribute("aria-expanded"),
      labelledby: dialog.getAttribute("aria-labelledby"),
      title: document.getElementById("search-title")?.textContent?.trim(),
    };
  });

  assert.equal(state.inputFocused, true);
  assert.equal(state.expanded, "true");
  assert.equal(state.labelledby, "search-title");
  assert.equal(state.title, "Search notes");

  const snapshot = (await page.accessibility.snapshot()) as AxNode | null;
  assert.equal(findByRole(snapshot, "dialog")?.name, "Search notes");

  await page.close();
});

test("Tab from the last control stays inside the dialog", async (t) => {
  if (!browser) return t.skip("puppeteer browser unavailable");
  const page = await openPage();
  await openWithQuery(page, "note");

  const focused = await page.evaluate((selector) => {
    const dialog = document.querySelector(
      "dialog[data-search-modal]",
    ) as HTMLElement;
    const focusable = Array.from(
      dialog.querySelectorAll<HTMLElement>(selector),
    ).filter((element) => element.getClientRects().length > 0);
    const last = focusable[focusable.length - 1];
    last.focus();
    return document.activeElement === last;
  }, FOCUSABLE);
  assert.equal(focused, true);

  await page.keyboard.press("Tab");
  assert.equal(await activeInsideDialog(page), true);
  const isFirst = await page.evaluate(
    () => document.activeElement?.hasAttribute("data-search-close") === true,
  );
  assert.equal(isFirst, true);

  await page.close();
});

test("Shift+Tab from the first control stays inside the dialog", async (t) => {
  if (!browser) return t.skip("puppeteer browser unavailable");
  const page = await openPage();
  await openWithQuery(page, "note");

  const focused = await page.evaluate((selector) => {
    const dialog = document.querySelector(
      "dialog[data-search-modal]",
    ) as HTMLElement;
    const focusable = Array.from(
      dialog.querySelectorAll<HTMLElement>(selector),
    );
    const first = focusable[0];
    first.focus();
    return document.activeElement === first;
  }, FOCUSABLE);
  assert.equal(focused, true);

  await page.keyboard.down("Shift");
  await page.keyboard.press("Tab");
  await page.keyboard.up("Shift");
  assert.equal(await activeInsideDialog(page), true);
  const isLastResult = await page.evaluate(
    () => document.activeElement?.hasAttribute("data-search-result") === true,
  );
  assert.equal(isLastResult, true);

  await page.close();
});

test("background controls cannot be reached while the dialog is open", async (t) => {
  if (!browser) return t.skip("puppeteer browser unavailable");
  const page = await openPage();
  await openWithQuery(page, "note");

  const backgroundIds = new Set(["skip-link", "nav-action", "main-action"]);
  for (let step = 0; step < 8; step += 1) {
    await page.keyboard.press("Tab");
    assert.equal(await activeInsideDialog(page), true);
    const id = await page.evaluate(
      () => (document.activeElement as HTMLElement | null)?.id ?? "",
    );
    assert.equal(backgroundIds.has(id), false);
  }

  const programmatic = await page.evaluate(() => {
    const main = document.getElementById("main-action") as HTMLButtonElement;
    main.focus();
    return document.activeElement === main;
  });
  assert.equal(programmatic, false);

  await page.close();
});

test("Escape closes the dialog even with text in the search input", async (t) => {
  if (!browser) return t.skip("puppeteer browser unavailable");
  const page = await openPage();
  await openWithQuery(page, "note");

  await page.keyboard.press("Escape");
  await waitClosed(page);

  const open = await page.evaluate(
    () =>
      (document.querySelector("dialog[data-search-modal]") as HTMLDialogElement)
        .open,
  );
  assert.equal(open, false);

  await page.close();
});

test("closing restores focus to the trigger", async (t) => {
  if (!browser) return t.skip("puppeteer browser unavailable");
  const page = await openPage();

  await page.click("[data-search-open]");
  await waitOpen(page);
  await page.keyboard.press("Escape");
  await waitClosed(page);

  const restored = await page.evaluate(
    () =>
      document.activeElement === document.querySelector("[data-search-open]"),
  );
  assert.equal(restored, true);

  await page.close();
});

test("the explicit close control works with the keyboard", async (t) => {
  if (!browser) return t.skip("puppeteer browser unavailable");
  const page = await openPage();

  await page.click("[data-search-open]");
  await waitOpen(page);
  await page.evaluate(() =>
    (
      document.querySelector("[data-search-close]") as HTMLElement | null
    )?.focus(),
  );
  await page.keyboard.press("Enter");
  await waitClosed(page);

  const restored = await page.evaluate(
    () =>
      document.activeElement === document.querySelector("[data-search-open]"),
  );
  assert.equal(restored, true);

  await page.close();
});

test("keyboard result selection navigates to the result", async (t) => {
  if (!browser) return t.skip("puppeteer browser unavailable");
  const page = await openPage();
  await openWithQuery(page, "note");

  const links = await page.evaluate(() =>
    Array.from(document.querySelectorAll("[data-search-result]")).map(
      (link) => ({
        href: link.getAttribute("href"),
        text: link.textContent?.trim() ?? "",
      }),
    ),
  );
  assert.equal(links.length, 2);
  for (const link of links) {
    assert.ok(link.href?.startsWith("/notes/"));
    assert.ok(link.text.length > 0);
  }

  await page.keyboard.press("ArrowDown");
  await Promise.all([page.waitForNavigation(), page.keyboard.press("Enter")]);

  assert.equal(new URL(page.url()).pathname, "/notes/beta");
  const staleDialog = await page.evaluate(
    () => document.querySelector("dialog[data-search-modal]") !== null,
  );
  assert.equal(staleDialog, false);

  await page.close();
});

test("dynamic result updates keep focus in the search input", async (t) => {
  if (!browser) return t.skip("puppeteer browser unavailable");
  const page = await openPage();
  await openWithQuery(page, "note");

  await typeQuery(page, "alpha");
  await page.waitForFunction(
    () => document.querySelectorAll("[data-search-result]").length === 1,
  );
  assert.equal(await inputFocused(page), true);

  await typeQuery(page, "zzzz");
  await page.waitForFunction(
    () =>
      document.querySelectorAll("[data-search-result]").length === 0 &&
      document
        .querySelector("[data-search-status]")
        ?.textContent?.startsWith("No results"),
  );
  assert.equal(await inputFocused(page), true);

  await typeQuery(page, "note");
  await page.waitForFunction(
    () => document.querySelectorAll("[data-search-result]").length === 2,
  );
  assert.equal(await inputFocused(page), true);

  await page.close();
});

async function inputFocused(page: Page): Promise<boolean> {
  return page.evaluate(
    () =>
      document.activeElement === document.querySelector("[data-search-input]"),
  );
}

test("closing and reopening leaves no stale modal state", async (t) => {
  if (!browser) return t.skip("puppeteer browser unavailable");
  const page = await openPage();

  await page.click("[data-search-open]");
  await waitOpen(page);
  await page.keyboard.press("Escape");
  await waitClosed(page);

  await page.click("[data-search-open]");
  await waitOpen(page);
  const refocused = await inputFocused(page);
  await page.keyboard.press("Escape");
  await waitClosed(page);

  const state = await page.evaluate(() => {
    const dialog = document.querySelector(
      "dialog[data-search-modal]",
    ) as HTMLDialogElement;
    const trigger = document.querySelector("[data-search-open]");
    const main = document.getElementById("main-action") as HTMLButtonElement;
    const mainContent = document.getElementById("main-content");
    main.focus();
    return {
      open: dialog.open,
      expanded: trigger?.getAttribute("aria-expanded"),
      bodyInert: document.body.hasAttribute("inert"),
      mainInert: mainContent?.hasAttribute("inert"),
      mainFocused: document.activeElement === main,
    };
  });

  assert.equal(refocused, true);
  assert.equal(state.open, false);
  assert.equal(state.expanded, "false");
  assert.equal(state.bodyInert, false);
  assert.equal(state.mainInert, false);
  assert.equal(state.mainFocused, true);

  await page.close();
});

test("dialog semantics expose a native modal with a labelled name", async (t) => {
  if (!browser) return t.skip("puppeteer browser unavailable");
  const page = await openPage();

  await page.click("[data-search-open]");
  await waitOpen(page);

  const state = await page.evaluate(() => {
    const dialog = document.querySelector(
      "dialog[data-search-modal]",
    ) as HTMLDialogElement;
    const results = document.querySelector("[data-search-results]");
    const trigger = document.querySelector("[data-search-open]");
    return {
      modal: dialog.matches(":modal"),
      explicitRole: dialog.getAttribute("role"),
      explicitAriaModal: dialog.getAttribute("aria-modal"),
      resultsRole: results?.getAttribute("role"),
      expanded: trigger?.getAttribute("aria-expanded"),
    };
  });

  assert.equal(state.modal, true);
  assert.equal(state.explicitRole, null);
  assert.equal(state.explicitAriaModal, null);
  assert.equal(state.resultsRole, "listbox");
  assert.equal(state.expanded, "true");

  const snapshot = (await page.accessibility.snapshot()) as AxNode | null;
  const dialog = findByRole(snapshot, "dialog");
  assert.equal(dialog?.name, "Search notes");
  const searchbox = findByRole(snapshot, "searchbox");
  assert.equal(searchbox?.name, "Search query");

  await page.close();
});

test("A11Y-001 skip link: first Tab reaches it and Enter jumps to main", async (t) => {
  if (!browser) return t.skip("puppeteer browser unavailable");
  const page = await openPage();

  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
  await page.keyboard.press("Tab");

  const first = await page.evaluate(() => ({
    className: document.activeElement?.className ?? "",
    href: document.activeElement?.getAttribute("href"),
    id: document.activeElement?.id ?? "",
  }));
  assert.equal(first.id, "skip-link");
  assert.match(first.className, /rb-skip-link/);
  assert.equal(first.href, "#main-content");

  await page.keyboard.press("Enter");
  const afterEnter = await page.evaluate(
    () => document.activeElement?.id ?? "",
  );
  assert.equal(afterEnter, "main-content");

  await page.keyboard.press("Tab");
  const afterTab = await page.evaluate(() => document.activeElement?.id ?? "");
  assert.equal(afterTab, "main-action");

  await page.close();
});
