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
const siteRoot = path.join(repositoryRoot, "website/dist");

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
    await page.waitForFunction(
      () =>
        document
          .querySelector("[data-flashcards]")
          ?.getAttribute("data-flashcards") === "ready",
    );
    assert.deepEqual(
      await page.evaluate(() => {
        const deck = document.querySelector("[data-flashcards]");
        return {
          decks: document.querySelectorAll("[data-flashcards]").length,
          decksWithControls: document.querySelectorAll(
            "[data-flashcards] .rb-flashcards__deck",
          ).length,
          fallbackHidden: deck?.querySelector<HTMLElement>(
            "[data-flashcards-fallback]",
          )?.hidden,
        };
      }),
      { decks: 1, decksWithControls: 1, fallbackHidden: true },
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

test("the excalidraw figure renders to SVG in the browser", async () => {
  for (const pathname of ["/docs/plugins/excalidraw", "/assets/HW"]) {
    const { page, errors } = await open(pathname);
    try {
      const figure = await page.$(".rr-excalidraw");
      assert.ok(figure, `${pathname} should contain an Excalidraw figure`);
      await figure.scrollIntoView();
      await page
        .waitForFunction(
          () =>
            document
              .querySelector(".rr-excalidraw")
              ?.getAttribute("data-excalidraw") !== "pending",
          { timeout: 15_000 },
        )
        .catch(() => {});
      const state = await page.evaluate(() => {
        const block = document.querySelector(".rr-excalidraw");
        const svg = block?.querySelector(".rr-excalidraw__canvas svg");
        return {
          status: block?.getAttribute("data-excalidraw"),
          hasSvg: svg !== null && svg !== undefined,
          text: svg?.textContent ?? "",
          error:
            block?.querySelector(".rr-excalidraw__error")?.textContent ?? null,
        };
      });
      assert.equal(state.status, "ready", `${pathname} should be ready`);
      assert.equal(state.hasSvg, true, `${pathname} should contain an SVG`);
      assert.match(state.text, /Hello Riebeckite!/);
      assert.equal(state.error, null);
      assert.deepEqual(errors, []);
    } finally {
      await page.close();
    }
  }
});

test("the flashcards deck mounts through Hono JSX and responds to controls", async () => {
  const { page, errors } = await open(
    "/docs/plugins/showcase/knowledge-and-data",
  );
  try {
    await page.waitForFunction(
      () => document.querySelector("[data-flashcards-action='next']") !== null,
    );
    const initial = await page.evaluate(() => {
      const deck = document.querySelector("[data-flashcards]");
      const fallback = deck?.querySelector("[data-flashcards-fallback]");
      const question = deck?.querySelector(".rb-flashcards__question");
      const answer = deck?.querySelector(".rb-flashcards__answer");
      const reveal = deck?.querySelector("[data-flashcards-action='reveal']");
      return {
        count: document.querySelectorAll("[data-flashcards]").length,
        ready: deck?.getAttribute("data-flashcards"),
        fallbackHidden: fallback?.hidden,
        question: question?.textContent,
        answerHidden: answer?.hidden,
        pressed: reveal?.getAttribute("aria-pressed"),
        counter: deck?.querySelector(".rb-flashcards__counter")?.textContent,
      };
    });
    assert.equal(initial.count, 1);
    assert.equal(initial.ready, "ready");
    assert.equal(initial.fallbackHidden, true);
    assert.match(initial.question ?? "", /Riebeckite/);
    assert.equal(initial.answerHidden, true);
    assert.equal(initial.pressed, "false");
    assert.match(initial.counter ?? "", /^1 \/ \d+$/);

    await page.evaluate(() => {
      document
        .querySelector("[data-flashcards]")
        ?.querySelector("[data-flashcards-action='reveal']")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await page.waitForFunction(
      () =>
        document
          .querySelector("[data-flashcards] [data-flashcards-action='reveal']")
          ?.getAttribute("aria-pressed") === "true",
    );
    const revealed = await page.evaluate(() => {
      const deck = document.querySelector("[data-flashcards]");
      const answer = deck?.querySelector(".rb-flashcards__answer");
      const reveal = deck?.querySelector("[data-flashcards-action='reveal']");
      return {
        answerHidden: answer?.hidden,
        answerText: answer?.textContent,
        pressed: reveal?.getAttribute("aria-pressed"),
        label: reveal?.textContent,
      };
    });
    assert.equal(revealed.answerHidden, false);
    assert.match(revealed.answerText ?? "", /Markdown/);
    assert.equal(revealed.pressed, "true");
    assert.equal(revealed.label, "Hide answer");

    await page.evaluate(() => {
      document
        .querySelector("[data-flashcards]")
        ?.querySelector("[data-flashcards-action='next']")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await page.waitForFunction(
      () =>
        document
          .querySelector("[data-flashcards] .rb-flashcards__counter")
          ?.textContent?.startsWith("2 /") === true,
    );
    const moved = await page.evaluate(() => {
      const deck = document.querySelector("[data-flashcards]");
      const answer = deck?.querySelector(".rb-flashcards__answer");
      return {
        question: deck?.querySelector(".rb-flashcards__question")?.textContent,
        answerHidden: answer?.hidden,
        counter: deck?.querySelector(".rb-flashcards__counter")?.textContent,
      };
    });
    assert.doesNotMatch(moved.question ?? "", /Riebeckite/);
    assert.equal(moved.answerHidden, true);
    assert.match(moved.counter ?? "", /^2 \/ \d+$/);

    await page.evaluate(() => {
      document.querySelector(".rb-flashcards__deck")?.focus();
    });
    await page.keyboard.press("ArrowLeft");
    await page.waitForFunction(
      () =>
        document
          .querySelector("[data-flashcards] .rb-flashcards__counter")
          ?.textContent?.startsWith("1 /") === true,
    );
    const keyboard = await page.evaluate(() => ({
      question: document
        .querySelector("[data-flashcards]")
        ?.querySelector(".rb-flashcards__question")?.textContent,
      counter: document
        .querySelector("[data-flashcards]")
        ?.querySelector(".rb-flashcards__counter")?.textContent,
    }));
    assert.match(keyboard.question ?? "", /Riebeckite/);
    assert.match(keyboard.counter ?? "", /^1 \/ \d+$/);
    assert.deepEqual(errors, []);
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
