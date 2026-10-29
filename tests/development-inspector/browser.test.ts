import assert from "node:assert/strict";
import { type ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import fs from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import puppeteer, {
  type Browser,
  type ElementHandle,
  type Page,
} from "puppeteer";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const fixtureSource = path.join(
  repoRoot,
  "tests/development-inspector/fixture",
);

type RunningServer = {
  readonly child: ChildProcessWithoutNullStreams;
  readonly output: () => string;
};

test("development inspector works in a real Vite dev server", async () => {
  let browser: Browser | undefined;
  let running: RunningServer | undefined;
  const fixtureRoot = path.join(repoRoot, "apps/web", "inspector-e2e-fixture");
  try {
    await fs.rm(fixtureRoot, { recursive: true, force: true });
    await fs.cp(fixtureSource, fixtureRoot, {
      recursive: true,
      filter: (source) =>
        path.basename(source) !== "node_modules" &&
        path.basename(source) !== ".riebeckite",
    });
    const port = await freePort();
    running = spawnVite(fixtureRoot, port);
    const url = (await waitForOutput(running, /Local:\s+(http:\/\/\S+)/))[1];
    assert.ok(url);
    const baseUrl = url.replace(/\/$/, "");
    await waitForHttp(url.replace(/\/$/, ""), 180_000);

    browser = await launchBrowser();
    const page = await browser.newPage();
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(String(error)));
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto(url, { waitUntil: "networkidle0", timeout: 120_000 });

    await page.waitForSelector(
      'button[aria-label="Open Riebeckite Development Inspector"]',
      { timeout: 60_000 },
    );
    await page.click(
      'button[aria-label="Open Riebeckite Development Inspector"]',
    );
    await waitForShadow(page, "section[role='dialog']");
    await waitForShadowText(
      page,
      ".status",
      "Inspector report updated",
      120_000,
    );

    const layout = await shadowLayout(page);
    assert.ok(Math.abs(layout.right - layout.innerWidth) <= 2);
    assert.ok(Math.abs(layout.top) <= 1);
    assert.ok(Math.abs(layout.bottom - layout.innerHeight) <= 2);
    assert.ok(layout.width >= 360 && layout.width <= 620);
    assert.equal(layout.background, "rgb(23, 23, 23)");
    assert.ok(layout.scrollHeight >= layout.clientHeight);

    await page.keyboard.press("Escape");
    await waitForMissingPanel(page);
    assert.equal(
      await page.evaluate(
        () =>
          document.activeElement?.getAttribute("aria-label") ===
          "Open Riebeckite Development Inspector",
      ),
      true,
    );

    await page.keyboard.down("Control");
    await page.keyboard.down("Alt");
    await page.keyboard.press("r");
    await page.keyboard.up("Alt");
    await page.keyboard.up("Control");
    await waitForShadow(page, "section[role='dialog']");
    await waitForShadowText(
      page,
      ".status",
      "Inspector report updated",
      120_000,
    );

    const widthBefore = (await shadowLayout(page)).width;
    const handle = await shadowElement(page, "[data-resize]");
    const box = await handle.boundingBox();
    assert.ok(box);
    await page.mouse.move(box.x + box.width / 2, box.y + 40);
    await page.mouse.down();
    await page.mouse.move(box.x - 80, box.y + 40, { steps: 4 });
    await page.mouse.up();
    assert.ok((await shadowLayout(page)).width > widthBefore + 40);

    await page.evaluate(() => {
      document.documentElement.dataset.theme = "light";
      document.documentElement.classList.add("light");
      document.body.classList.add("light");
    });
    assert.equal((await shadowLayout(page)).background, "rgb(23, 23, 23)");
    await page.evaluate(() => {
      document.documentElement.dataset.theme = "dark";
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
      document.body.classList.remove("light");
      document.body.classList.add("dark");
    });
    await page.emulateMediaFeatures([
      { name: "prefers-color-scheme", value: "dark" },
    ]);
    assert.equal((await shadowLayout(page)).background, "rgb(23, 23, 23)");

    await clickShadow(page, "[data-tab='1']");
    await waitForShadow(page, "[data-diagnostic-query]");
    const search = await shadowElement(page, "[data-diagnostic-query]");
    await search.click();
    await page.keyboard.type("missing");
    await waitForShadowText(page, "ul", "MISSING_FRONTMATTER", 30_000);
    assert.equal(
      await page.evaluate(() => {
        const host = document.getElementById(
          "riebeckite-development-inspector",
        );
        const input = host?.shadowRoot?.querySelector(
          "[data-diagnostic-query]",
        );
        return document.activeElement === host &&
          input === host?.shadowRoot?.activeElement
          ? input.value
          : "";
      }),
      "missing",
    );
    await clickShadow(page, "details summary");
    assert.equal(
      await page.evaluate(() => {
        const host = document.getElementById(
          "riebeckite-development-inspector",
        );
        return Boolean(host?.shadowRoot?.querySelector("details[open]"));
      }),
      true,
    );

    await clickShadow(page, "[data-tab='4']");
    await waitForShadowText(
      page,
      "[role=tabpanel]",
      "Full regeneration reasons",
      30_000,
    );
    await waitForShadowText(
      page,
      "[role=tabpanel]",
      "Affected outputs",
      30_000,
    );
    const outputSearch = await shadowElement(page, "[data-output-query]");
    await outputSearch.click();
    await page.keyboard.type("about");
    await page.waitForFunction(
      () => {
        const host = document.getElementById(
          "riebeckite-development-inspector",
        );
        const text =
          host?.shadowRoot?.querySelector("#rb-panel-4")?.textContent ?? "";
        return text.includes("about.html") && !text.includes("index.html");
      },
      { timeout: 30_000 },
    );

    await clickShadow(page, "[data-tab='2']");
    await waitForShadow(page, "[data-dependency-kind]");
    const kindSelect = await shadowElement(page, "[data-dependency-kind]");
    await kindSelect.select("content");
    await waitForShadowText(page, "[role=tabpanel]", "Outputs", 30_000);

    await page.setViewport({ width: 390, height: 844 });
    await page.waitForFunction(
      () => {
        const host = document.getElementById(
          "riebeckite-development-inspector",
        );
        const section = host?.shadowRoot?.querySelector("section");
        return section ? section.getBoundingClientRect().width <= 391 : false;
      },
      { timeout: 10_000 },
    );
    assert.equal(
      await page.evaluate(() => {
        const host = document.getElementById(
          "riebeckite-development-inspector",
        );
        const handle = host?.shadowRoot?.querySelector("[data-resize]");
        return handle ? getComputedStyle(handle).display : "";
      }),
      "none",
    );
    await page.setViewport({ width: 820, height: 1180 });
    await page.waitForFunction(
      () => {
        const host = document.getElementById(
          "riebeckite-development-inspector",
        );
        const section = host?.shadowRoot?.querySelector("section");
        if (!section) return false;
        const rectangle = section.getBoundingClientRect();
        return (
          rectangle.width <= 821 &&
          Math.abs(rectangle.right - window.innerWidth) <= 2
        );
      },
      { timeout: 10_000 },
    );

    await page.evaluate(() => {
      const host = document.getElementById("riebeckite-development-inspector");
      host?.shadowRoot
        ?.querySelector("[role='tab'][aria-selected='true']")
        ?.focus();
    });
    await page.keyboard.press("End");
    assert.equal(
      await page.evaluate(() => {
        const host = document.getElementById(
          "riebeckite-development-inspector",
        );
        return host?.shadowRoot?.querySelector(
          "[role='tab'][aria-selected='true']",
        )?.textContent;
      }),
      "Output",
    );

    await fs.writeFile(
      path.join(fixtureRoot, "content", "about.md"),
      "---\ntitle: Home\npublish: true\n---\n# HMR page\n\nInspector HMR marker.\n",
      "utf8",
    );
    await waitForMissingPanel(page, 120_000);
    await loadSite(baseUrl);
    await page.waitForSelector(
      'button[aria-label="Open Riebeckite Development Inspector"]',
      { timeout: 60_000 },
    );
    await page.keyboard.down("Control");
    await page.keyboard.down("Alt");
    await page.keyboard.press("r");
    await page.keyboard.up("Alt");
    await page.keyboard.up("Control");
    await waitForShadowText(
      page,
      ".status",
      "Inspector report updated",
      120_000,
    );
    await clickShadow(page, "[data-tab='1']");
    await page.evaluate(() => {
      const host = document.getElementById("riebeckite-development-inspector");
      const input = host?.shadowRoot?.querySelector<HTMLInputElement>(
        "[data-diagnostic-query]",
      );
      input?.focus();
      input?.select();
    });
    await page.keyboard.type("about");
    await waitForShadowText(page, "ul", "DUPLICATE_TITLE", 30_000);

    await page.evaluate(async () => {
      const response = await fetch("/__riebeckite/inspector/output?limit=1");
      if (!response.ok) throw new Error("output endpoint failed");
      const body = await response.json();
      if (body.output.affected.length > 1) throw new Error("limit ignored");
      if (body.regeneration.status !== "available")
        throw new Error("regeneration missing");
    });

    const initial = await inspectorJson(
      baseUrl,
      "/__riebeckite/inspector/report",
    );
    await fs.writeFile(
      path.join(fixtureRoot, "content", "added.md"),
      "---\ntitle: Home\npublish: true\n---\n# Added page\n",
      "utf8",
    );
    const afterAdd = await waitForInspectorRevision(
      baseUrl,
      initial.revision + 1,
    );
    await waitForMissingPanel(page, 120_000);
    await loadSite(baseUrl);
    await openInspector(page);
    await clickShadow(page, "[data-tab='1']");
    await page.evaluate(() => {
      const host = document.getElementById("riebeckite-development-inspector");
      const input = host?.shadowRoot?.querySelector<HTMLInputElement>(
        "[data-diagnostic-query]",
      );
      input?.focus();
      input?.select();
    });
    await page.keyboard.type("added");
    await waitForShadowText(page, "ul", "DUPLICATE_TITLE", 30_000);
    assert.equal(
      (
        await inspectorJson(
          baseUrl,
          "/__riebeckite/inspector/output?output=added.html",
        )
      ).output?.lookups?.output.status,
      "found",
    );

    await fs.rename(
      path.join(fixtureRoot, "content", "added.md"),
      path.join(fixtureRoot, "content", "renamed.md"),
    );
    const afterRename = await waitForInspectorRevision(
      baseUrl,
      afterAdd.revision + 1,
    );
    await loadSite(baseUrl);
    assert.equal(
      afterRename.revision,
      afterAdd.revision + 1,
      "rename should invalidate the inspector once",
    );
    assert.equal(
      (
        await inspectorJson(
          baseUrl,
          "/__riebeckite/inspector/output?output=renamed.html",
        )
      ).output?.lookups?.output.status,
      "found",
    );
    assert.equal(
      (
        await inspectorJson(
          baseUrl,
          "/__riebeckite/inspector/output?output=added.html",
        )
      ).output?.lookups?.output.status,
      "not-found",
    );

    await fs.rm(path.join(fixtureRoot, "content", "renamed.md"));
    const afterRemove = await waitForInspectorRevision(
      baseUrl,
      afterRename.revision + 1,
    );
    await loadSite(baseUrl);
    assert.equal(
      afterRemove.revision,
      afterRename.revision + 1,
      "delete should invalidate the inspector once",
    );
    assert.equal(
      (
        await inspectorJson(
          baseUrl,
          "/__riebeckite/inspector/output?output=renamed.html",
        )
      ).output?.lookups?.output.status,
      "not-found",
    );

    await fs.mkdir(path.join(fixtureRoot, "content", "ignored"), {
      recursive: true,
    });
    await fs.writeFile(
      path.join(fixtureRoot, "content", "ignored", "secret.md"),
      "---\ntitle: Secret\n---\n# Ignored\n",
      "utf8",
    );
    await new Promise((resolve) => setTimeout(resolve, 1_000));
    assert.equal(
      (await inspectorJson(baseUrl, "/__riebeckite/inspector/report")).revision,
      afterRemove.revision,
      "ignored content should not invalidate the inspector",
    );

    await fs.appendFile(
      path.join(fixtureRoot, "app", "style.css"),
      "\n/* inspector unrelated change */\n",
    );
    await new Promise((resolve) => setTimeout(resolve, 1_000));
    assert.equal(
      (await inspectorJson(baseUrl, "/__riebeckite/inspector/report")).revision,
      afterRemove.revision,
      "application styles should not invalidate the inspector",
    );

    assert.deepEqual(pageErrors, []);
  } finally {
    if (running && running.child.exitCode === null) {
      await stopServer(running.child);
    }
    if (browser) await browser.close();
    await fs.rm(fixtureRoot, { recursive: true, force: true });
  }
});

async function openInspector(page: Page): Promise<void> {
  await page.waitForSelector(
    'button[aria-label="Open Riebeckite Development Inspector"]',
    { timeout: 60_000 },
  );
  await page.keyboard.down("Control");
  await page.keyboard.down("Alt");
  await page.keyboard.press("r");
  await page.keyboard.up("Alt");
  await page.keyboard.up("Control");
  await waitForShadow(page, "section[role='dialog']");
  await waitForShadowText(page, ".status", "Inspector report updated", 120_000);
}

async function inspectorJson(
  baseUrl: string,
  path: string,
): Promise<{
  revision: number;
  output?: { lookups?: { output: { status: string } } };
}> {
  const response = await fetch(`${baseUrl}${path}`, { cache: "no-store" });
  assert.ok(response.ok, `${path} returned ${response.status}`);
  return (await response.json()) as {
    revision: number;
    output?: { lookups?: { output: { status: string } } };
  };
}

async function loadSite(baseUrl: string): Promise<void> {
  const response = await fetch(`${baseUrl}/`, { cache: "no-store" });
  assert.ok(response.ok, `/ returned ${response.status}`);
}

async function waitForInspectorRevision(
  baseUrl: string,
  minimum: number,
  timeout = 60_000,
): Promise<{ revision: number }> {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const report = await inspectorJson(
      baseUrl,
      "/__riebeckite/inspector/report",
    );
    if (report.revision >= minimum) return report;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for inspector revision ${minimum}`);
}

async function waitForHttp(url: string, timeout: number): Promise<void> {
  const deadline = Date.now() + timeout;
  let lastError = "";
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (response.ok) return;
      lastError = `${response.status} ${await response.text()}`;
    } catch (error) {
      lastError = String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for ${url}: ${lastError}`);
}

function spawnVite(fixtureRoot: string, port: number): RunningServer {
  const child = spawn(
    process.execPath,
    [
      path.join(repoRoot, "apps/web/node_modules/vite/bin/vite.js"),
      "--host",
      "127.0.0.1",
      "--port",
      String(port),
      "--strictPort",
    ],
    {
      cwd: fixtureRoot,
      env: {
        ...process.env,
        NODE_PATH: path.join(repoRoot, "apps/web/node_modules"),
        RIEBECKITE_REQUIRE_BROWSER: "1",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let output = "";
  child.stdout.on("data", (chunk: Buffer) => {
    output += stripAnsi(chunk.toString());
  });
  child.stderr.on("data", (chunk: Buffer) => {
    output += stripAnsi(chunk.toString());
  });
  return { child, output: () => output };
}

async function launchBrowser(): Promise<Browser> {
  try {
    return await puppeteer.launch({
      headless: "shell",
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    });
  } catch (error) {
    if (process.env.RIEBECKITE_REQUIRE_BROWSER === "1") throw error;
    return await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    });
  }
}

async function shadowElement(
  page: Page,
  selector: string,
): Promise<ElementHandle<Element>> {
  const handle = await page.evaluateHandle((value) => {
    const host = document.getElementById("riebeckite-development-inspector");
    return host?.shadowRoot?.querySelector(value) ?? null;
  }, selector);
  const element = handle.asElement();
  assert.ok(element, `Missing shadow element: ${selector}`);
  return element as ElementHandle<Element>;
}

async function clickShadow(page: Page, selector: string): Promise<void> {
  await page.evaluate((value) => {
    const host = document.getElementById("riebeckite-development-inspector");
    host?.shadowRoot
      ?.querySelector(value)
      ?.dispatchEvent(
        new MouseEvent("click", { bubbles: true, composed: true }),
      );
  }, selector);
}

async function waitForShadow(
  page: Page,
  selector: string,
  timeout = 30_000,
): Promise<void> {
  await page.waitForFunction(
    (value) => {
      const host = document.getElementById("riebeckite-development-inspector");
      return Boolean(host?.shadowRoot?.querySelector(value));
    },
    { timeout },
    selector,
  );
}

async function waitForShadowText(
  page: Page,
  selector: string,
  text: string,
  timeout = 30_000,
): Promise<void> {
  try {
    await page.waitForFunction(
      (value, expected) => {
        const host = document.getElementById(
          "riebeckite-development-inspector",
        );
        return Boolean(
          host?.shadowRoot
            ?.querySelector(value)
            ?.textContent?.includes(expected),
        );
      },
      { timeout },
      selector,
      text,
    );
  } catch (error) {
    const panel = await page.evaluate(() => {
      const host = document.getElementById("riebeckite-development-inspector");
      return (
        host?.shadowRoot?.querySelector("[role=tabpanel]")?.textContent ??
        "missing"
      );
    });
    throw new Error(
      `${error instanceof Error ? error.message : String(error)}\nPanel: ${panel}`,
    );
  }
}

async function waitForMissingPanel(
  page: Page,
  timeout = 30_000,
): Promise<void> {
  await page.waitForFunction(
    () => !document.getElementById("riebeckite-development-inspector"),
    { timeout },
  );
}

async function shadowLayout(page: Page) {
  return await page.evaluate(() => {
    const host = document.getElementById("riebeckite-development-inspector");
    const section = host?.shadowRoot?.querySelector("section");
    if (!section) throw new Error("Inspector panel is missing.");
    const rectangle = section.getBoundingClientRect();
    return {
      right: rectangle.right,
      top: rectangle.top,
      bottom: rectangle.bottom,
      width: rectangle.width,
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      background: getComputedStyle(section).backgroundColor,
      scrollHeight: section.scrollHeight,
      clientHeight: section.clientHeight,
    };
  });
}

async function freePort(): Promise<number> {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address === null || typeof address === "string") {
        server.close();
        reject(new Error("Could not allocate a port."));
        return;
      }
      const { port } = address;
      server.close(() => resolve(port));
    });
  });
}

async function waitForOutput(
  running: RunningServer,
  pattern: RegExp,
  timeout = 120_000,
): Promise<RegExpMatchArray> {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const match = running.output().match(pattern);
    if (match) return match;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${pattern}: ${running.output()}`);
}

async function stopServer(
  child: ChildProcessWithoutNullStreams,
): Promise<void> {
  if (child.pid === undefined) return;
  if (process.platform === "win32") {
    await new Promise<void>((resolve) => {
      const killer = spawn(
        "taskkill",
        ["/pid", String(child.pid), "/t", "/f"],
        {
          stdio: "ignore",
        },
      );
      killer.once("exit", () => resolve());
    });
  } else {
    child.kill("SIGTERM");
  }
  await new Promise<void>((resolve) => {
    if (child.exitCode !== null) return resolve();
    child.once("exit", () => resolve());
  });
}

function stripAnsi(value: string): string {
  return value.replace(
    new RegExp(`${String.fromCharCode(27)}\\[[0-?]*[ -/]*[@-~]`, "g"),
    "",
  );
}
