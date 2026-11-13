import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import puppeteer, { type Browser } from "puppeteer";

const revisions = [
  {
    hash: "1".repeat(40),
    shortHash: "1111111",
    date: "2024-01-01T00:00:00Z",
    message: "first",
    author: "Alice",
    markdown: "a\nb",
  },
  {
    hash: "2".repeat(40),
    shortHash: "2222222",
    date: "2024-01-02T00:00:00Z",
    message: "second",
    author: "Bob",
    markdown: "a\nB",
  },
];

let server: Server;
let browser: Browser | null = null;
let baseUrl = "";

before(async () => {
  const packageRoot = fileURLToPath(new URL("../../", import.meta.url));
  const bundle = await build({
    stdin: {
      contents:
        'import { initDiffHistory } from "./client/diff-viewer.ts";\nexport const cleanup = initDiffHistory();\nwindow.__diffReady = true;\n',
      resolveDir: packageRoot,
      sourcefile: "diff-history-entry.ts",
      loader: "ts",
    },
    bundle: true,
    format: "iife",
    globalName: "RiebeckiteDiff",
    platform: "browser",
    target: "esnext",
    jsx: "automatic",
    jsxImportSource: "hono/jsx",
    write: false,
    logLevel: "silent",
  });
  const clientJs = `${bundle.outputFiles[0].text}\nwindow.__diffCleanup = RiebeckiteDiff.cleanup;`;
  const selected = revisions[0];
  const payload = JSON.stringify({ path: "/revisions.json", revisions });
  const html = `<!doctype html>
<html lang="en">
<body>
<section class="rr-diff-history" data-rr-diff-history>
<script type="application/json" data-rr-diff-history-data>${payload}</script>
<button type="button" data-rr-diff-select="${selected.hash}" aria-pressed="true">first</button>
<button type="button" data-rr-diff-select="${revisions[1].hash}" aria-pressed="false">second</button>
<select data-rr-diff-from><option value="">Beginning</option><option value="${selected.hash}" selected>first</option></select>
<select data-rr-diff-to><option value="${selected.hash}" selected>first</option></select>
<p data-loading aria-live="polite" hidden>Loading revision…</p>
<p data-loading-error role="alert" hidden></p>
<div data-rr-diff-panel data-loading-content><div data-rr-diff-rendered>a<br>b</div></div>
</section>
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
    if (url === "/revisions.json") {
      response.setHeader("content-type", "application/json; charset=utf-8");
      response.end(JSON.stringify({ revisions }));
      return;
    }
    response.statusCode = 404;
    response.end("not found");
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  baseUrl = `http://127.0.0.1:${port}`;

  for (const options of [
    { headless: "shell" as const, args: ["--no-sandbox"] },
    { headless: true as const, args: ["--no-sandbox"] },
  ]) {
    try {
      browser = await puppeteer.launch(options);
      break;
    } catch {}
  }
  if (!browser && process.env.RIEBECKITE_REQUIRE_BROWSER === "1") {
    throw new Error("Puppeteer could not launch a browser.");
  }
});

after(async () => {
  await browser?.close();
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
});

test("diff history renders revisions through Hono JSX and cleans up", async () => {
  if (!browser) return;
  const page = await browser.newPage();
  try {
    await page.goto(baseUrl, { waitUntil: "networkidle0" });
    await page.waitForFunction(() => window.__diffReady === true);

    await page.click(`[data-rr-diff-select="${revisions[1].hash}"]`);
    await page.waitForFunction(
      () =>
        document
          .querySelector("[data-rr-diff-panel]")
          ?.textContent?.includes("+ B") === true,
    );
    const updated = await page.evaluate(() => {
      const panel = document.querySelector("[data-rr-diff-panel]");
      return {
        rendered: panel?.querySelectorAll("[data-rr-diff-rendered]").length,
        text: panel?.textContent,
        pressed: Array.from(
          document.querySelectorAll<HTMLElement>("[data-rr-diff-select]"),
        ).map((button) => [
          button.dataset.rrDiffSelect,
          button.getAttribute("aria-pressed"),
        ]),
        error: document.querySelector("[data-loading-error]")?.textContent,
      };
    });
    assert.equal(updated.rendered, 1);
    assert.match(updated.text ?? "", /- b/);
    assert.match(updated.text ?? "", /\+ B/);
    assert.deepEqual(updated.pressed, [
      [revisions[0].hash, "false"],
      [revisions[1].hash, "true"],
    ]);
    assert.equal(updated.error, "");

    await page.evaluate((hash) => {
      window.__diffCleanup();
      document
        .querySelector<HTMLButtonElement>(`[data-rr-diff-select="${hash}"]`)
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    }, revisions[0].hash);
    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.equal(
      await page.evaluate(() =>
        document
          .querySelector("[data-rr-diff-panel]")
          ?.textContent?.includes("+ B"),
      ),
      false,
    );
  } finally {
    await page.close();
  }
});

declare global {
  interface Window {
    __diffReady?: boolean;
    __diffCleanup: () => void;
  }
}
