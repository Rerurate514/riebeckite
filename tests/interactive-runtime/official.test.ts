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

test("the lightbox dialog mounts through Hono JSX and opens images", async () => {
  const { page, errors } = await open("/docs/plugins/lightbox");
  try {
    await page.waitForFunction(
      () => document.querySelector(".rr-lightbox-trigger") !== null,
    );
    const trigger = await page.evaluate(() => {
      const anchor = document.querySelector<HTMLAnchorElement>(
        ".rr-lightbox-trigger",
      );
      return {
        href: anchor?.getAttribute("href"),
        label: anchor?.getAttribute("aria-label"),
        imageSrc: anchor?.querySelector("img")?.getAttribute("src"),
      };
    });
    assert.equal(trigger.href, "/assets/riebeckite-logo.png");
    assert.equal(trigger.label, "Expand image: riebeckite-logo.png");
    assert.equal(trigger.imageSrc, "/assets/riebeckite-logo.png");

    await page.evaluate(() => {
      document
        .querySelector<HTMLAnchorElement>(".rr-lightbox-trigger")
        ?.dispatchEvent(
          new MouseEvent("click", { bubbles: true, cancelable: true }),
        );
    });
    await page.waitForFunction(() =>
      document.querySelector("dialog.rr-lightbox")?.hasAttribute("open"),
    );
    const opened = await page.evaluate(() => {
      const dialog = document.querySelector("dialog.rr-lightbox");
      const image = dialog?.querySelector<HTMLImageElement>(
        ".rr-lightbox__image",
      );
      const caption = dialog?.querySelector<HTMLElement>(
        ".rr-lightbox__caption",
      );
      const close = dialog?.querySelector<HTMLButtonElement>(
        ".rr-lightbox__close",
      );
      return {
        count: document.querySelectorAll("dialog.rr-lightbox").length,
        label: dialog?.getAttribute("aria-label"),
        src: image?.getAttribute("src"),
        alt: image?.alt,
        caption: caption?.textContent,
        captionHidden: caption?.hidden,
        closeLabel: close?.getAttribute("aria-label"),
        focused: document.activeElement === close,
      };
    });
    assert.equal(opened.count, 1);
    assert.equal(opened.label, "Expand image");
    assert.equal(opened.src, "/assets/riebeckite-logo.png");
    assert.equal(opened.alt, "riebeckite-logo.png");
    assert.equal(opened.caption, "riebeckite-logo.png");
    assert.equal(opened.captionHidden, false);
    assert.equal(opened.closeLabel, "Close");
    assert.equal(opened.focused, true);

    await page.keyboard.press("Escape");
    await page.waitForFunction(
      () => !document.querySelector("dialog.rr-lightbox")?.hasAttribute("open"),
    );
    assert.deepEqual(errors, []);
  } finally {
    await page.close();
  }
});

test("the text fragment popover mounts through Hono JSX for a selection", async () => {
  const { page, errors } = await open("/docs/plugins/text-fragment");
  try {
    await page.waitForFunction(
      () => document.querySelector(".rb-article-body p") !== null,
    );
    await page.evaluate(() => {
      const paragraph = document.querySelector(".rb-article-body p");
      const text = paragraph?.firstChild;
      if (!text) throw new Error("No article text to select.");
      const range = document.createRange();
      range.setStart(text, 0);
      range.setEnd(text, Math.min(24, text.textContent?.length ?? 0));
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      document.dispatchEvent(new Event("selectionchange"));
    });
    await page.waitForFunction(
      () =>
        document.querySelector<HTMLElement>(".rr-text-fragment")?.hidden ===
        false,
    );
    const shown = await page.evaluate(() => {
      const popover = document.querySelector<HTMLElement>(".rr-text-fragment");
      const buttons = Array.from(
        popover?.querySelectorAll<HTMLButtonElement>(
          ".rr-text-fragment__button",
        ) ?? [],
      );
      return {
        count: document.querySelectorAll(".rr-text-fragment").length,
        role: popover?.getAttribute("role"),
        label: popover?.getAttribute("aria-label"),
        buttons: buttons.map((button) => button.textContent),
        buttonTypes: buttons.map((button) => button.type),
        status: popover?.querySelector(".rr-text-fragment__status")
          ?.textContent,
        statusRole: popover
          ?.querySelector(".rr-text-fragment__status")
          ?.getAttribute("role"),
      };
    });
    assert.equal(shown.count, 1);
    assert.equal(shown.role, "group");
    assert.equal(shown.label, "Share selected text");
    assert.deepEqual(shown.buttons, ["Copy link", "Copy quote"]);
    assert.deepEqual(shown.buttonTypes, ["button", "button"]);
    assert.equal(shown.status, "");
    assert.equal(shown.statusRole, "status");

    await page.evaluate(() => {
      document
        .querySelector<HTMLButtonElement>(
          ".rr-text-fragment__button:first-child",
        )
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await page.waitForFunction(
      () =>
        (document.querySelector(".rr-text-fragment__status")?.textContent
          ?.length ?? 0) > 0,
    );
    const status = await page.evaluate(
      () => document.querySelector(".rr-text-fragment__status")?.textContent,
    );
    assert.match(status ?? "", /^(Link copied|Could not copy)/);

    await page.evaluate(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      );
    });
    await page.waitForFunction(
      () =>
        document.querySelector<HTMLElement>(".rr-text-fragment")?.hidden ===
        true,
    );
    assert.deepEqual(errors, []);
  } finally {
    await page.close();
  }
});

test("code tabs render through the HAST component and switch panels", async () => {
  const { page, errors } = await open("/docs/plugins/code-tabs");
  try {
    await page.waitForFunction(
      () =>
        document.querySelectorAll("[data-code-tabs='true'] [role='tab']")
          .length === 2,
    );
    const initial = await page.evaluate(() => {
      const group = document.querySelector<HTMLElement>(
        "[data-code-tabs='true']",
      );
      const tabs = Array.from(
        group?.querySelectorAll<HTMLButtonElement>("[role='tab']") ?? [],
      );
      const panels = Array.from(
        group?.querySelectorAll<HTMLElement>("[role='tabpanel']") ?? [],
      );
      return {
        groups: document.querySelectorAll("[data-code-tabs='true']").length,
        labels: tabs.map((tab) => tab.textContent),
        selected: tabs.map((tab) => tab.getAttribute("aria-selected")),
        visible: panels.map((panel) => !panel.hidden),
        content: panels.map((panel) => panel.textContent),
      };
    });
    assert.equal(initial.groups, 1);
    assert.deepEqual(initial.labels, ["TypeScript", "JavaScript"]);
    assert.deepEqual(initial.selected, ["true", "false"]);
    assert.deepEqual(initial.visible, [true, false]);
    assert.match(initial.content[0] ?? "", /const greeting: string/);

    await page.evaluate(() => {
      const second = document.querySelectorAll<HTMLButtonElement>(
        "[data-code-tabs='true'] [role='tab']",
      )[1];
      second?.click();
    });
    await page.waitForFunction(
      () =>
        document
          .querySelectorAll("[data-code-tabs='true'] [role='tab']")[1]
          ?.getAttribute("aria-selected") === "true",
    );
    const switched = await page.evaluate(() => {
      const panels = Array.from(
        document.querySelectorAll<HTMLElement>(
          "[data-code-tabs='true'] [role='tabpanel']",
        ),
      );
      return {
        selected: Array.from(
          document.querySelectorAll("[data-code-tabs='true'] [role='tab']"),
        ).map((tab) => tab.getAttribute("aria-selected")),
        visible: panels.map((panel) => !panel.hidden),
        content: panels[1]?.textContent,
      };
    });
    assert.deepEqual(switched.selected, ["false", "true"]);
    assert.deepEqual(switched.visible, [false, true]);
    assert.match(switched.content ?? "", /const greeting = "Hello"/);
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
  const pathname = "/docs/plugins/excalidraw";
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

async function loadedScriptUrls(page: Page): Promise<string[]> {
  return await page.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .map((entry) => entry.name)
      .filter((name) => name.endsWith(".js")),
  );
}

async function loadedScriptText(page: Page): Promise<string> {
  return await page.evaluate(async () => {
    const urls = performance
      .getEntriesByType("resource")
      .map((entry) => entry.name)
      .filter((name) => name.endsWith(".js"));
    const texts = await Promise.all(
      urls.map((url) => fetch(url).then((response) => response.text())),
    );
    return texts.join("\n");
  });
}

test("plugin client chunks load only on pages that use the UI", async () => {
  const plain = await open("/docs/plugins/calculator");
  try {
    const scripts = await loadedScriptText(plain.page);
    assert.doesNotMatch(scripts, /cdn\.jsdelivr\.net\/npm\/mermaid/);
    assert.doesNotMatch(scripts, /cdn\.jsdelivr\.net\/npm\/@viz-js\/viz/);
    assert.doesNotMatch(scripts, /Comparison position/);
    assert.ok(
      !(await loadedScriptUrls(plain.page)).some((url) =>
        /\/auto-[\w-]+\.js$/.test(url),
      ),
    );
    assert.deepEqual(plain.errors, []);
  } finally {
    await plain.page.close();
  }

  const charts = await open("/docs/plugins/chartjs");
  try {
    assert.ok(
      (await loadedScriptUrls(charts.page)).some((url) =>
        /\/auto-[\w-]+\.js$/.test(url),
      ),
    );
    assert.deepEqual(charts.errors, []);
  } finally {
    await charts.page.close();
  }

  const compare = await open("/docs/plugins/image-compare");
  try {
    assert.match(await loadedScriptText(compare.page), /Comparison position/);
    assert.deepEqual(compare.errors, []);
  } finally {
    await compare.page.close();
  }
});

test("the image comparison hydrates and keeps its position in sync", async () => {
  const { page, errors } = await open("/docs/plugins/image-compare");
  try {
    await page.waitForFunction(
      () =>
        document.querySelectorAll("[data-rr-image-compare]").length > 0 &&
        document
          .querySelector("[data-rr-image-compare]")
          ?.getAttribute("data-orientation") !== null,
    );
    const initial = await page.evaluate(() => {
      const figures = [...document.querySelectorAll("[data-rr-image-compare]")];
      const vertical = figures.find(
        (figure) => figure.getAttribute("data-orientation") === "vertical",
      );
      return {
        count: figures.length,
        vertical: vertical !== undefined,
        value: figures[0]
          ?.querySelector<HTMLInputElement>("[data-image-compare-range]")
          ?.getAttribute("value"),
        label: figures[0]
          ?.querySelector<HTMLInputElement>("[data-image-compare-range]")
          ?.getAttribute("aria-label"),
        staticImages: figures[0]?.querySelectorAll(
          ".rr-image-compare__static img",
        ).length,
      };
    });
    assert.ok(initial.count > 0);
    assert.equal(initial.vertical, true);
    assert.equal(initial.value, "50");
    assert.equal(initial.label, "Comparison position");
    assert.equal(initial.staticImages, 2);

    await page.evaluate(() => {
      const range = document.querySelector<HTMLInputElement>(
        "[data-image-compare-range]",
      );
      if (!range) throw new Error("Missing range input.");
      range.value = "80";
      range.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await page.waitForFunction(() => {
      const figure = document.querySelector<HTMLElement>(
        "[data-rr-image-compare]",
      );
      const range = figure?.querySelector<HTMLInputElement>(
        "[data-image-compare-range]",
      );
      return (
        figure?.style.getPropertyValue("--rr-image-compare-position") ===
          "80%" && range?.getAttribute("aria-valuetext") === "80%"
      );
    });

    await page.evaluate(() => {
      const link = document.querySelector<HTMLAnchorElement>(
        'a[href="/docs/plugins/code-tabs"]',
      );
      link?.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
      );
    });
    await page.waitForFunction(
      () => location.pathname === "/docs/plugins/code-tabs",
    );
    await page.goBack();
    await page.waitForFunction(
      () =>
        location.pathname === "/docs/plugins/image-compare" &&
        document.querySelectorAll("[data-rr-image-compare]").length > 0,
    );
    assert.equal(
      await page.evaluate(
        () => document.querySelectorAll("[data-rr-image-compare]").length,
      ),
      initial.count,
    );
    assert.deepEqual(errors, []);
  } finally {
    await page.close();
  }
});
