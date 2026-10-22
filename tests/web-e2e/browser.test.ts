import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import type { Browser, Page } from "puppeteer";
import {
  delay,
  launchBrowser,
  type RunningServer,
  startDevServer,
  startProductionServer,
} from "./support";

let browser: Browser;
let dev: RunningServer;
let production: RunningServer;

before(
  async () => {
    browser = await launchBrowser();
    dev = await startDevServer();
    production = await startProductionServer();
  },
  { timeout: 600_000 },
);

after(async () => {
  await browser?.close();
  await dev?.stop();
  await production?.stop();
});

test("playground renders and responds to editing, fixtures, options, theme, mode, and plugin switching", {
  timeout: 300_000,
}, async () => {
  const page = await browser.newPage();
  try {
    await openPlayground(page, dev.url);
    assert.equal(
      await page.$eval("[data-preview-frame]", (element) =>
        element.getAttribute("sandbox"),
      ),
      "",
    );
    await waitForFrameContains(page, (html) => html.includes("data-code-tabs"));

    const marker = `Playground E2E ${Date.now()}`;
    await setMarkdown(
      page,
      `# ${marker}\n\n\`\`\`ts tab="A"\nconst a = 1;\n\`\`\``,
    );
    await waitForFrameContains(page, (html) => html.includes(marker));

    const originalMarkdown = await readMarkdown(page);
    await page.select("[data-preview-fixture-select]", "separate-groups");
    await waitFor(
      page,
      async () => {
        const value = await page.$eval(
          "[data-preview-fixture-select]",
          (element) => (element as HTMLSelectElement).value,
        );
        return (
          value === "separate-groups" &&
          (await readMarkdown(page)) !== originalMarkdown
        );
      },
      "Fixture selection did not replace the Markdown.",
    );
    await waitForRendered(page);

    await page.click('[data-preview-option="syncTabs"]');
    await waitForFrameContains(page, (html) =>
      html.includes('data-code-tabs-sync="true"'),
    );

    await page.select("[data-preview-theme]", "gruvbox");
    await waitForFrameContains(page, (html) =>
      html.includes('data-theme-name="gruvbox"'),
    );

    await page.select("[data-preview-mode]", "dark");
    await waitForFrameContains(page, (html) =>
      html.includes('data-theme="dark"'),
    );

    await Promise.all([
      page.waitForNavigation({ waitUntil: "domcontentloaded" }),
      page.select('select[name="plugin"]', "code-annotations"),
    ]);
    await waitForRendered(page);
    await waitForFrameContains(
      page,
      (html) =>
        html.includes("rr-code__line--add") &&
        html.includes("rr-code__diff-marker"),
    );
    assert.equal(
      await page.$eval("[data-plugin-preview]", (element) =>
        element.getAttribute("data-preview-plugin"),
      ),
      "code-annotations",
    );
  } finally {
    await page.close();
  }
});

test("playground keeps its UI after an API failure and recovers on the next edit", {
  timeout: 300_000,
}, async () => {
  const page = await browser.newPage();
  try {
    await openPlayground(page, dev.url);
    await installFailingFetch(page);
    await setMarkdown(page, "# Failure check");
    await waitFor(
      page,
      async () => {
        const status = await readStatus(page);
        return status === "Check diagnostics";
      },
      "The client did not report the simulated API failure.",
    );
    assert.match(
      await page.$eval(
        "[data-preview-diagnostics]",
        (element) => element.textContent ?? "",
      ),
      /could not be rendered/i,
    );
    assert.equal(
      await page.$eval(
        "[data-preview-markdown]",
        (element) => (element as HTMLTextAreaElement).isConnected,
      ),
      true,
    );

    await page.evaluate(() => {
      const target = window as unknown as {
        __restorePreviewFetch?: () => void;
      };
      target.__restorePreviewFetch?.();
    });
    const marker = `Recovered ${Date.now()}`;
    await setMarkdown(page, `# ${marker}`);
    await waitForFrameContains(page, (html) => html.includes(marker));
    assert.equal(await readStatus(page), "Rendered");
  } finally {
    await page.close();
  }
});

test("document previews use the same registry, link to the playground, stay independent, and reinitialize after SPA navigation", {
  timeout: 300_000,
}, async () => {
  const page = await browser.newPage();
  try {
    await page.goto(`${dev.url}/docs/plugins/code-tabs`, {
      waitUntil: "domcontentloaded",
      timeout: 240_000,
    });
    await waitForRendered(page);
    assert.equal(
      await page.$eval(".plugin-preview__header a", (element) =>
        element.getAttribute("href"),
      ),
      "/playground?plugin=code-tabs&fixture=basic",
    );

    await page.evaluate(() => {
      const root = document.querySelector("[data-plugin-preview]");
      const host = document.querySelector("#main-content");
      if (!root || !host) throw new Error("Preview host is missing.");
      const clone = root.cloneNode(true) as HTMLElement;
      clone.id = "second-preview";
      const status = clone.querySelector("[data-preview-status]");
      if (status) status.textContent = "Waiting";
      const frame = clone.querySelector("[data-preview-frame]");
      if (frame instanceof HTMLIFrameElement) frame.srcdoc = "";
      host.append(clone);
    });
    await waitFor(
      page,
      async () =>
        (
          await page.$$eval("[data-preview-status]", (items) =>
            items.map((item) => item.textContent),
          )
        ).filter((status) => status === "Rendered").length === 2,
      "The injected second preview did not initialize.",
    );

    const marker = `Docs preview ${Date.now()}`;
    await page.evaluate((value) => {
      const root = document.querySelector("[data-plugin-preview]");
      const textarea = root?.querySelector("[data-preview-markdown]");
      if (!(textarea instanceof HTMLTextAreaElement)) {
        throw new Error("Preview textarea is missing.");
      }
      textarea.value = value;
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
    }, marker);
    await waitForFrameContains(page, (html) => html.includes(marker));
    const frames = await Promise.all(
      (await page.$$("[data-preview-frame]")).map((element) =>
        element.contentFrame(),
      ),
    );
    const second = frames[1];
    assert.ok(second);
    assert.equal(
      await second.evaluate(() =>
        document.body.textContent?.includes("Docs preview"),
      ),
      false,
    );

    await page.evaluate(() => {
      const anchor = document.createElement("a");
      anchor.id = "spa-test-link";
      anchor.href = "/themes";
      anchor.textContent = "themes";
      document.body.append(anchor);
    });
    await page.click("#spa-test-link");
    await page.waitForFunction(() => window.location.pathname === "/themes", {
      timeout: 120_000,
    });
    await page.evaluate(() => history.back());
    await page.waitForFunction(
      () => window.location.pathname === "/docs/plugins/code-tabs",
      { timeout: 120_000 },
    );
    await waitForRendered(page);
    assert.equal(
      await page.$$eval("[data-plugin-preview]", (items) => items.length),
      1,
    );
  } finally {
    await page.close();
  }
});

test("removing a preview aborts its listeners instead of updating detached nodes", {
  timeout: 300_000,
}, async () => {
  const page = await browser.newPage();
  try {
    await page.goto(`${dev.url}/docs/plugins/code-tabs`, {
      waitUntil: "domcontentloaded",
      timeout: 240_000,
    });
    await waitForRendered(page);
    await page.evaluate(() => {
      const target = window as unknown as {
        __previewRequests?: number;
        __restorePreviewFetch?: () => void;
      };
      const original = window.fetch.bind(window);
      target.__previewRequests = 0;
      target.__restorePreviewFetch = () => {
        window.fetch = original;
      };
      window.fetch = (...args) => {
        const input = args[0];
        const url =
          typeof input === "string"
            ? input
            : input instanceof Request
              ? input.url
              : String(input);
        if (url.includes("/api/playground")) {
          target.__previewRequests = (target.__previewRequests ?? 0) + 1;
        }
        return original(...args);
      };
    });
    await page.evaluate(() => {
      const root = document.querySelector("[data-plugin-preview]");
      if (!root) throw new Error("Preview root is missing.");
      const textarea = root.querySelector("[data-preview-markdown]");
      if (!(textarea instanceof HTMLTextAreaElement)) {
        throw new Error("Preview textarea is missing.");
      }
      (
        window as unknown as { __detachedPreviewTextarea: HTMLTextAreaElement }
      ).__detachedPreviewTextarea = textarea;
      root.remove();
    });
    await delay(500);
    await page.evaluate(() => {
      const textarea = (
        window as unknown as { __detachedPreviewTextarea?: HTMLTextAreaElement }
      ).__detachedPreviewTextarea;
      if (!(textarea instanceof HTMLTextAreaElement)) {
        throw new Error("Detached preview textarea is missing.");
      }
      textarea.value = "# detached update";
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await delay(1_000);
    assert.equal(
      await page.evaluate(
        () =>
          (window as unknown as { __previewRequests?: number })
            .__previewRequests ?? 0,
      ),
      0,
    );
  } finally {
    await page.close();
  }
});

test("preview HTML and the API enforce the sanitization and isolation boundary", {
  timeout: 300_000,
}, async () => {
  const page = await browser.newPage();
  try {
    await openPlayground(page, dev.url);
    await page.evaluate(() => {
      const target = window as unknown as { __xssMessages?: string[] };
      target.__xssMessages = [];
      window.addEventListener("message", (event) => {
        target.__xssMessages?.push(String(event.data));
      });
    });

    const payload = [
      "# Security",
      "<script>parent.postMessage('script executed', '*')</script>",
      "<img src=\"missing\" onerror=\"parent.postMessage('handler executed', '*')\">",
      "<svg><script>parent.postMessage('svg executed', '*')</script></svg>",
      "<a href=\"javascript:parent.postMessage('javascript url executed', '*')\">link</a>",
    ].join("\n");
    await setMarkdown(page, payload);
    await waitForRendered(page);
    const rendered = await frameHtml(page);
    assert.equal(/<script/i.test(rendered), false);
    assert.equal(/\son[a-z]+=/i.test(rendered), false);
    assert.equal(/javascript:/i.test(rendered), false);

    await page.evaluate(() => {
      const frame = document.querySelector("[data-preview-frame]");
      if (!(frame instanceof HTMLIFrameElement)) {
        throw new Error("Preview iframe is missing.");
      }
      frame.srcdoc = `<!doctype html><html><body>
          <script>parent.postMessage("direct script", "*")</script>
          <img src="missing" onerror="parent.postMessage('direct handler', '*')">
          <svg><script>parent.postMessage("direct svg", "*")</script></svg>
          <a id="js-link" href="javascript:parent.postMessage('direct javascript url', '*')">link</a>
        </body></html>`;
    });
    await delay(1_000);
    assert.deepEqual(
      await page.evaluate(
        () => (window as unknown as { __xssMessages?: string[] }).__xssMessages,
      ),
      [],
    );

    const frame = await previewFrame(page);
    assert.equal(
      await frame.evaluate(() => {
        try {
          return window.parent.document.title === undefined
            ? "blocked"
            : window.parent.document.title;
        } catch {
          return "blocked";
        }
      }),
      "blocked",
    );
    await frame.click("#js-link");
    await delay(300);
    assert.deepEqual(
      await page.evaluate(
        () => (window as unknown as { __xssMessages?: string[] }).__xssMessages,
      ),
      [],
    );

    assert.equal(
      (await postPreview(dev.url, { pluginId: "missing" })).status,
      400,
    );
    assert.equal(
      (
        await postPreview(dev.url, {
          pluginId: "code-tabs",
          options: { unknown: true },
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await postPreview(dev.url, {
          pluginId: "code-tabs",
          fixtureId: "missing",
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await postPreview(dev.url, {
          pluginId: "code-tabs",
          markdown: "x".repeat(200_000),
        })
      ).status,
      413,
    );
    const valid = await postPreview(dev.url, {
      pluginId: "code-tabs",
      fixtureId: "basic",
      markdown: '```ts tab="TypeScript"\nconst ok = true;\n```',
    });
    assert.equal(valid.status, 200);
    assert.match(await valid.text(), /data-code-tabs/);
  } finally {
    await page.close();
  }
});

test("the production build serves the playground and the real API", {
  timeout: 300_000,
}, async () => {
  const page = await browser.newPage();
  try {
    const trailingSlash = await fetch(`${production.url}/playground/`, {
      redirect: "follow",
    });
    assert.ok(trailingSlash.status < 400);
    assert.match(await trailingSlash.text(), /\/playground/);
    const html = await (
      await fetch(`${production.url}/playground`, { redirect: "follow" })
    ).text();
    assert.match(html, /\/static\/client-[^"]+\.js/);
    assert.equal(html.includes("@vite/client"), false);

    await openPlayground(page, production.url);
    await waitForFrameContains(page, (frame) =>
      frame.includes("data-code-tabs"),
    );
    const marker = `Production ${Date.now()}`;
    await setMarkdown(page, `# ${marker}`);
    await waitForFrameContains(page, (frame) => frame.includes(marker));

    const valid = await postPreview(production.url, {
      pluginId: "code-tabs",
      fixtureId: "basic",
      markdown: '```ts tab="TypeScript"\nconst production = true;\n```',
    });
    assert.equal(valid.status, 200);
    assert.match(await valid.text(), /data-code-tabs/);
    assert.equal(
      (await postPreview(production.url, { pluginId: "missing" })).status,
      400,
    );
  } finally {
    await page.close();
  }
});

async function openPlayground(page: Page, baseUrl: string): Promise<void> {
  await page.goto(`${baseUrl}/playground`, {
    waitUntil: "domcontentloaded",
    timeout: 240_000,
  });
  await waitForRendered(page);
}

async function waitForRendered(page: Page): Promise<void> {
  await waitFor(
    page,
    async () => {
      const status = await readStatus(page);
      if (status === "Check diagnostics") {
        const diagnostics = await page.$eval(
          "[data-preview-diagnostics]",
          (element) => element.textContent ?? "",
        );
        throw new FatalWaitError(`Preview failed: ${diagnostics}`);
      }
      return status === "Rendered";
    },
    "The preview did not finish rendering.",
  );
}

async function readStatus(page: Page): Promise<string> {
  return page.$eval(
    "[data-preview-status]",
    (element) => element.textContent ?? "",
  );
}

async function readMarkdown(page: Page): Promise<string> {
  return page.$eval(
    "[data-preview-markdown]",
    (element) => (element as HTMLTextAreaElement).value,
  );
}

async function setMarkdown(page: Page, markdown: string): Promise<void> {
  await page.$eval(
    "[data-preview-markdown]",
    (element, value) => {
      const textarea = element as HTMLTextAreaElement;
      textarea.value = value;
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
    },
    markdown,
  );
}

async function previewFrame(page: Page) {
  const element = await page.$("[data-preview-frame]");
  const frame = element ? await element.contentFrame() : null;
  if (!frame) throw new Error("The preview iframe is not available.");
  return frame;
}

async function frameHtml(page: Page): Promise<string> {
  const frame = await previewFrame(page);
  return frame.evaluate(() => document.documentElement.outerHTML);
}

async function waitForFrameContains(
  page: Page,
  predicate: (html: string) => boolean,
): Promise<void> {
  await waitFor(
    page,
    async () => {
      const frames = await page.$$("[data-preview-frame]");
      for (const element of frames) {
        const frame = await element.contentFrame();
        if (!frame) continue;
        try {
          const html = await frame.evaluate(
            () => document.documentElement.outerHTML,
          );
          if (predicate(html)) return true;
        } catch {}
      }
      return false;
    },
    "The preview iframe did not contain the expected content.",
  );
}

async function postPreview(
  baseUrl: string,
  body: Record<string, unknown>,
): Promise<Response> {
  return fetch(`${baseUrl}/api/playground`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(180_000),
  });
}

async function installFailingFetch(page: Page): Promise<void> {
  await page.evaluate(() => {
    const original = window.fetch.bind(window);
    const target = window as unknown as {
      __restorePreviewFetch?: () => void;
    };
    let failNext = true;
    target.__restorePreviewFetch = () => {
      window.fetch = original;
    };
    window.fetch = (...args) => {
      const input = args[0];
      const url =
        typeof input === "string"
          ? input
          : input instanceof Request
            ? input.url
            : String(input);
      if (failNext && url.includes("/api/playground")) {
        failNext = false;
        return Promise.reject(new TypeError("Simulated preview failure"));
      }
      return original(...args);
    };
  });
}

async function waitFor(
  _page: Page,
  check: () => Promise<boolean>,
  message: string,
  timeoutMs = 180_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      if (await check()) return;
    } catch (error) {
      if (error instanceof FatalWaitError) throw error;
      lastError = error;
    }
    await delay(100);
  }
  throw new Error(
    `${message}${lastError === undefined ? "" : `\n${String(lastError)}`}`,
  );
}

class FatalWaitError extends Error {}
