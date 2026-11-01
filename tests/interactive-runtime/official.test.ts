import assert from "node:assert/strict";
import fs from "node:fs/promises";
import http from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import puppeteer, { type Browser, type Page } from "puppeteer";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const siteRoot = path.join(repositoryRoot, "apps/web/dist");

const contentTypes: Readonly<Record<string, string>> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".wasm": "application/wasm",
  ".woff2": "font/woff2",
  ".xml": "application/xml; charset=utf-8",
};

let browser: Browser;
let server: http.Server;
let siteUrl: string;

before(async () => {
  server = http.createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(
        new URL(request.url ?? "/", "http://localhost").pathname,
      );
      const relative = pathname.replace(/^\/+/, "");
      const direct = path.resolve(siteRoot, relative);
      if (direct !== siteRoot && !direct.startsWith(`${siteRoot}${path.sep}`)) {
        response.writeHead(403).end();
        return;
      }
      const candidates = pathname.endsWith("/")
        ? [path.join(direct, "index.html")]
        : [direct, `${direct}.html`, path.join(direct, "index.html")];
      for (const file of candidates) {
        try {
          const body = await fs.readFile(file);
          response
            .writeHead(200, {
              "content-type":
                contentTypes[path.extname(file)] ?? "application/octet-stream",
            })
            .end(body);
          return;
        } catch {}
      }
      response.writeHead(404, { "content-type": "text/plain" }).end();
    } catch {
      response.writeHead(400).end();
    }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  siteUrl = `http://127.0.0.1:${port}`;
  browser = await puppeteer.launch({
    headless: "shell",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
});

after(async () => {
  await browser?.close();
  await new Promise<void>((resolve, reject) =>
    server?.close((error) => (error ? reject(error) : resolve())),
  );
});

async function open(pathname: string): Promise<{
  page: Page;
  errors: string[];
}> {
  const page = await browser.newPage();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  await page.goto(`${siteUrl}${pathname}`, { waitUntil: "networkidle0" });
  return { page, errors };
}

async function waitForCalculator(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const block = document.querySelector("[data-calculator]");
    const live = block?.querySelector<HTMLElement>("[data-runtime-live]");
    const output = block?.querySelector<HTMLElement>(
      "[data-calculator-output]",
    );
    return live?.hidden === false && output?.textContent === "14";
  });
}

test("the calculator page hydrates through the official runtime", async () => {
  const { page, errors } = await open("/docs/plugins/calculator");
  try {
    await waitForCalculator(page);
    const state = await page.evaluate(() => {
      const block = document.querySelector("[data-calculator]");
      const fallback = block?.querySelector<HTMLElement>(
        "[data-runtime-fallback]",
      );
      const loading = block?.querySelector<HTMLElement>(
        "[data-runtime-loading]",
      );
      const live = block?.querySelector<HTMLElement>("[data-runtime-live]");
      const error = block?.querySelector<HTMLElement>("[data-runtime-error]");
      const output = block?.querySelector<HTMLElement>(
        "[data-calculator-output]",
      );
      return {
        count: document.querySelectorAll("[data-calculator]").length,
        fallbackHidden: fallback?.hidden,
        loadingHidden: loading?.hidden,
        liveHidden: live?.hidden,
        errorHidden: error?.hidden,
        output: output?.textContent,
        ariaLive: output?.getAttribute("aria-live"),
        busy: block?.getAttribute("aria-busy"),
      };
    });
    assert.equal(state.count, 1);
    assert.equal(state.fallbackHidden, true);
    assert.equal(state.loadingHidden, true);
    assert.equal(state.liveHidden, false);
    assert.equal(state.errorHidden, true);
    assert.equal(state.output, "14");
    assert.equal(state.ariaLive, "polite");
    assert.equal(state.busy, null);
    assert.deepEqual(errors, []);
  } finally {
    await page.close();
  }
});

test("SPA navigation unmounts and remounts the official runtime", async () => {
  const { page, errors } = await open("/docs/plugins/calculator");
  try {
    await waitForCalculator(page);
    const navigationStarted = Date.now();
    await page.evaluate(() => {
      const link = document.querySelector<HTMLAnchorElement>(
        'a[href="/docs/plugins/flashcards"]',
      );
      link?.click();
    });
    await page.waitForFunction(
      () =>
        window.location.pathname === "/docs/plugins/flashcards" &&
        document.querySelector("h1")?.textContent?.includes("Flashcards") ===
          true,
    );
    const navigationMs = Date.now() - navigationStarted;
    console.log(`[runtime-navigation] spaNavigationMs=${navigationMs}`);
    assert.ok(navigationMs < 5_000);
    assert.equal(
      await page.evaluate(
        () => document.querySelectorAll("[data-calculator]").length,
      ),
      0,
    );

    await page.goBack();
    await page.waitForFunction(
      () => window.location.pathname === "/docs/plugins/calculator",
    );
    await waitForCalculator(page);
    assert.equal(
      await page.evaluate(
        () => document.querySelectorAll("[data-calculator]").length,
      ),
      1,
    );
    assert.deepEqual(errors, []);
  } finally {
    await page.close();
  }
});

test("the runtime chunk is not requested on pages without calculators", async () => {
  const page = await browser.newPage();
  const requests: string[] = [];
  page.on("request", (request) => {
    const url = request.url();
    if (url.includes("/static/")) requests.push(url);
  });
  try {
    await page.goto(`${siteUrl}/docs/plugins/flashcards`, {
      waitUntil: "networkidle0",
    });
    assert.equal(
      requests.some((url) => url.includes("client-runtime-")),
      false,
    );

    await page.evaluate(() => {
      const link = document.querySelector<HTMLAnchorElement>(
        'a[href="/docs/plugins/calculator"]',
      );
      link?.click();
    });
    await waitForCalculator(page);
    assert.equal(
      requests.some((url) => url.includes("client-runtime-")),
      true,
    );
  } finally {
    await page.close();
  }
});

test("the official page keeps its static result without JavaScript", async () => {
  const page = await browser.newPage();
  try {
    await page.setJavaScriptEnabled(false);
    await page.goto(`${siteUrl}/docs/plugins/calculator`, {
      waitUntil: "domcontentloaded",
    });
    const fallback = await page.evaluate(() => {
      const block = document.querySelector("[data-calculator]");
      const staticResult = block?.querySelector<HTMLElement>(
        "[data-runtime-fallback]",
      );
      const loading = block?.querySelector<HTMLElement>(
        "[data-runtime-loading]",
      );
      const live = block?.querySelector<HTMLElement>("[data-runtime-live]");
      const error = block?.querySelector<HTMLElement>("[data-runtime-error]");
      return {
        text: staticResult?.textContent,
        fallbackHidden: staticResult?.hidden,
        loadingHidden: loading?.hidden,
        liveHidden: live?.hidden,
        errorHidden: error?.hidden,
      };
    });
    assert.match(fallback.text ?? "", /Result: 14/);
    assert.equal(fallback.fallbackHidden, false);
    assert.equal(fallback.loadingHidden, true);
    assert.equal(fallback.liveHidden, true);
    assert.equal(fallback.errorHidden, true);
  } finally {
    await page.close();
  }
});
