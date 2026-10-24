import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";
import puppeteer from "puppeteer";

const DEMO_MARKER = "RIEBECKITE_META_BIND_DEMO";
const OTHER_MARKER = "RIEBECKITE_META_BIND_OTHER";
const RUNTIME_MARKER = "select is only supported in meta-bind code blocks";

function contentType(file: string): string {
  if (file.endsWith(".css")) return "text/css";
  if (file.endsWith(".js")) return "text/javascript";
  if (file.endsWith(".json")) return "application/json";
  if (file.endsWith(".svg")) return "image/svg+xml";
  if (file.endsWith(".png")) return "image/png";
  return "text/html";
}

async function serve(
  directory: string,
): Promise<{ url: string; close(): Promise<void> }> {
  const root = path.resolve(directory);
  const server = http.createServer((request, response) => {
    const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
    const relative =
      pathname === "/" ? "index.html" : `${pathname.slice(1)}.html`;
    const requested = path.resolve(root, relative);
    const file = fs.existsSync(requested)
      ? requested
      : path.resolve(root, pathname.slice(1));
    if (
      !file.startsWith(`${root}${path.sep}`) ||
      !fs.existsSync(file) ||
      fs.statSync(file).isDirectory()
    ) {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, { "content-type": contentType(file) });
    fs.createReadStream(file).pipe(response);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  };
}

async function loadedScriptsContain(
  page: import("puppeteer").Page,
  marker: string,
): Promise<boolean> {
  const contents = await page.evaluate(async () => {
    const urls = performance
      .getEntriesByType("resource")
      .map((entry) => entry.name)
      .filter((name) => name.endsWith(".js"));
    return Promise.all(
      urls.map(async (url) => {
        try {
          return await (await fetch(url)).text();
        } catch {
          return "";
        }
      }),
    );
  });
  return contents.some((content) => content.includes(marker));
}

export async function assertMetaBindBrowserBehavior(
  siteDir: string,
): Promise<void> {
  const server = await serve(path.join(siteDir, "dist"));
  const browser = await puppeteer.launch({
    headless: "shell",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    const page = await browser.newPage();
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));

    await page.goto(server.url, { waitUntil: "networkidle0" });
    assert.equal(await page.$("[data-meta-bind]"), null);
    assert.equal(await loadedScriptsContain(page, RUNTIME_MARKER), false);
    await page.evaluate(() => {
      (window as Window & { metaBindSpaMarker?: string }).metaBindSpaMarker =
        "preserved";
    });

    await page.click('a[href="/demo"]');
    await page.waitForFunction(
      (marker) => document.body.textContent?.includes(marker),
      {},
      DEMO_MARKER,
    );
    await page.waitForSelector('[data-meta-bind="input"]');
    assert.equal(
      await page.evaluate(
        () =>
          (window as Window & { metaBindSpaMarker?: string }).metaBindSpaMarker,
      ),
      "preserved",
    );
    await page.waitForFunction(() => {
      const slider = document.querySelector<HTMLInputElement>(
        '[data-meta-bind-target="progress"] input[type="range"]',
      );
      const mirror = document.querySelector<HTMLInputElement>(
        '[data-meta-bind-target="progress"] input[type="number"]',
      );
      return slider?.value === "2" && mirror?.value === "2";
    });
    assert.equal(await loadedScriptsContain(page, RUNTIME_MARKER), true);

    const styles = await page.evaluate(() => {
      const container = document.querySelector<HTMLElement>(
        '[data-meta-bind-target="progress"]',
      );
      const control = document.querySelector<HTMLElement>(
        '[data-meta-bind-target="progress"] .rb-meta-bind__control',
      );
      if (!container || !control) throw new Error("missing meta bind controls");
      return {
        display: getComputedStyle(container).display,
        minInlineSize: getComputedStyle(control).minInlineSize,
      };
    });
    assert.equal(styles.display, "inline-flex");
    assert.ok(
      Number.parseFloat(styles.minInlineSize) >= 190,
      `expected the Meta Bind stylesheet to size the control, got ${styles.minInlineSize}`,
    );

    await page.$eval(
      '[data-meta-bind-target="progress"] input[type="range"]',
      (element) => {
        const input = element as HTMLInputElement;
        input.value = "7";
        input.dispatchEvent(new Event("input", { bubbles: true }));
      },
    );
    await page.waitForFunction(() => {
      const view = [...document.querySelectorAll("output")].find((element) =>
        element.textContent?.includes("14"),
      );
      const mirror = document.querySelector<HTMLInputElement>(
        '[data-meta-bind-target="progress"] input[type="number"]',
      );
      return view !== undefined && mirror?.value === "7";
    });

    await page.click('[data-meta-bind-target="done"] input[type="checkbox"]');
    await page.waitForFunction(() =>
      [...document.querySelectorAll("output")].some(
        (element) => element.textContent === "true",
      ),
    );

    await page.evaluate(() => {
      (
        window as Window & { metaBindOldControl?: Element | null }
      ).metaBindOldControl = document.querySelector('[data-meta-bind="input"]');
    });
    await page.click('a[href="/other"]');
    await page.waitForFunction(
      (marker) => document.body.textContent?.includes(marker),
      {},
      OTHER_MARKER,
    );
    assert.equal(
      await page.evaluate(
        () =>
          (window as Window & { metaBindOldControl?: Element | null })
            .metaBindOldControl?.isConnected,
      ),
      false,
    );

    await page.click('a[href="/demo"]');
    await page.waitForFunction(
      (marker) => document.body.textContent?.includes(marker),
      {},
      DEMO_MARKER,
    );
    await page.waitForFunction(
      () =>
        document.querySelector<HTMLInputElement>(
          '[data-meta-bind-target="progress"] input[type="range"]',
        )?.value === "2",
    );
    await page.$eval(
      '[data-meta-bind-target="progress"] input[type="range"]',
      (element) => {
        const input = element as HTMLInputElement;
        input.value = "9";
        input.dispatchEvent(new Event("input", { bubbles: true }));
      },
    );
    await page.waitForFunction(() =>
      [...document.querySelectorAll("output")].some(
        (element) => element.textContent === "18",
      ),
    );

    const content = await page.evaluate(() => document.body.textContent ?? "");
    assert.equal(content.includes("RIEBECKITE_META_BIND_SECRET"), false);
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
    await server.close();
  }
}
