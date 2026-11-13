import assert from "node:assert/strict";
import path from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { build, type Plugin } from "esbuild";
import puppeteer, { type Browser, type Page } from "puppeteer";
import { riebeckiteClientModule } from "../../packages/integrations/honox/src/client_module.js";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

const stubs: Record<string, string> = {
  "search-entry": `export function initSearch(context) {
  window.__search = {
    rootIsDocument: context.root === document,
    markerIsButton: context.marker === document.querySelector("[data-shell-search]"),
  };
}`,
  "page-entry": `export function initPage(context) {
  window.__page = window.__page ?? [];
  window.__page.push({ rootId: context.root.id });
  return () => {
    window.__pageCleanups = (window.__pageCleanups ?? 0) + 1;
  };
}`,
  "app-entry": `export function initApp() {
  window.__app = (window.__app ?? 0) + 1;
}`,
};

type FixtureWindow = Window & {
  __riebeckite: {
    initRiebeckiteClient(): void;
    remountRiebeckitePage(root: Element): Promise<void>;
  };
  __search?: { rootIsDocument: boolean; markerIsButton: boolean };
  __page?: Array<{ rootId: string }>;
  __pageCleanups?: number;
  __app?: number;
};

let browser: Browser;
let bundle: string;

before(async () => {
  const generated = await generatedClientModule();
  const result = await build({
    stdin: {
      contents:
        'import { initRiebeckiteClient, remountRiebeckitePage } from "virtual:riebeckite/client"; window.__riebeckite = { initRiebeckiteClient, remountRiebeckitePage };',
      resolveDir: repositoryRoot,
      sourcefile: "client-entry-fixture.js",
    },
    bundle: true,
    format: "iife",
    platform: "browser",
    target: "es2022",
    write: false,
    conditions: ["source", "import", "default"],
    plugins: [fixturePlugin(generated)],
  });
  bundle = result.outputFiles?.[0]?.text ?? "";
  assert.ok(bundle);
  browser = await puppeteer.launch({
    headless: "shell",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
});

after(async () => {
  await browser?.close();
});

test("page entries with a shell marker use the document root", async () => {
  const page = await open();
  try {
    await page.waitForFunction(
      () => (window as FixtureWindow).__search !== undefined,
    );
    const state = await page.evaluate(() => {
      const fixture = window as FixtureWindow;
      return {
        search: fixture.__search,
        pages: fixture.__page,
        app: fixture.__app ?? 0,
      };
    });

    assert.deepEqual(state, {
      search: { rootIsDocument: true, markerIsButton: true },
      pages: [{ rootId: "main-content" }],
      app: 0,
    });
  } finally {
    await page.close();
  }
});

test("app conditional entries initialize once after a navigation introduces their marker", async () => {
  const page = await open();
  try {
    await page.waitForFunction(
      () => (window as FixtureWindow).__search !== undefined,
    );
    await page.evaluate(async () => {
      const fixture = window as FixtureWindow;
      document.querySelector("#main-content")?.remove();
      const main = document.createElement("main");
      main.id = "main-content";
      main.textContent = "second";
      document.body.append(main);
      const late = document.createElement("div");
      late.setAttribute("data-app-late", "");
      document.body.append(late);
      await fixture.__riebeckite.remountRiebeckitePage(main);
    });
    await page.waitForFunction(
      () =>
        (window as FixtureWindow).__app === 1 &&
        (window as FixtureWindow).__page?.length === 2,
    );

    await page.evaluate(async () => {
      const fixture = window as FixtureWindow;
      const main = document.createElement("main");
      main.id = "main-content";
      main.textContent = "third";
      document.querySelector("#main-content")?.replaceWith(main);
      await fixture.__riebeckite.remountRiebeckitePage(main);
    });
    await page.waitForFunction(
      () => (window as FixtureWindow).__page?.length === 3,
    );

    const state = await page.evaluate(() => {
      const fixture = window as FixtureWindow;
      return {
        pages: fixture.__page,
        app: fixture.__app ?? 0,
        cleanups: fixture.__pageCleanups ?? 0,
      };
    });

    assert.deepEqual(state, {
      pages: [
        { rootId: "main-content" },
        { rootId: "main-content" },
        { rootId: "main-content" },
      ],
      app: 1,
      cleanups: 2,
    });
  } finally {
    await page.close();
  }
});

async function open(): Promise<Page> {
  const page = await browser.newPage();
  await page.setContent(
    '<!doctype html><html><body><header><button data-shell-search>Search</button></header><main id="main-content"><p>first</p></main></body></html>',
  );
  await page.addScriptTag({ content: bundle });
  await page.evaluate(() => {
    (window as FixtureWindow).__riebeckite.initRiebeckiteClient();
  });
  return page;
}

async function generatedClientModule(): Promise<string> {
  const plugin = riebeckiteClientModule(
    () =>
      ({
        plugins: [
          {
            name: "fixture",
            clientEntries: [
              {
                pluginName: "search",
                moduleSpecifier: "search-entry",
                exportName: "initSearch",
                scope: "page",
                initializerArguments: "context",
                presenceSelector: "[data-shell-search]",
                root: "document",
              },
              {
                pluginName: "page",
                moduleSpecifier: "page-entry",
                exportName: "initPage",
                scope: "page",
                initializerArguments: "context",
                presenceSelector: "#main-content",
              },
              {
                pluginName: "app",
                moduleSpecifier: "app-entry",
                exportName: "initApp",
                scope: "app",
                presenceSelector: "[data-app-late]",
              },
            ],
          },
        ],
      }) as never,
  );
  const load = hookHandler(plugin.load);
  return Reflect.apply(load, undefined, ["\0virtual:riebeckite/client"]);
}

function fixturePlugin(generated: string): Plugin {
  return {
    name: "client-entry-fixture",
    setup(build) {
      build.onResolve({ filter: /^virtual:riebeckite\/client$/ }, () => ({
        path: "client",
        namespace: "generated",
      }));
      build.onLoad({ filter: /.*/, namespace: "generated" }, () => ({
        contents: generated,
        loader: "js",
        resolveDir: repositoryRoot,
      }));
      build.onResolve(
        { filter: /^(search-entry|page-entry|app-entry)$/ },
        (arguments_) => ({ path: arguments_.path, namespace: "stub" }),
      );
      build.onLoad({ filter: /.*/, namespace: "stub" }, (arguments_) => ({
        contents: stubs[arguments_.path],
        loader: "js",
      }));
    },
  };
}

function hookHandler<Handler extends (...arguments_: never[]) => unknown>(
  hook: Handler | { readonly handler: Handler } | undefined,
): Handler {
  assert.ok(hook);
  return typeof hook === "function" ? hook : hook.handler;
}
