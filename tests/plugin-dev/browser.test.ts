import assert from "node:assert/strict";
import { type ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import fs from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import puppeteer, { type Browser, type Page } from "puppeteer";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const codeTabsRoot = path.join(repoRoot, "packages/plugins/code-tabs");
const coreRoot = path.join(repoRoot, "packages/core");

type RunningCli = {
  readonly child: ChildProcessWithoutNullStreams;
  readonly output: () => string;
};

test("plugin dev previews a real local plugin", async () => {
  const pluginRoot = await copyPlugin();
  const fixtureRoots = new Set(await listFixtures());
  let browser: Browser | undefined;
  let running: RunningCli | undefined;
  let fixtureRoot: string | undefined;
  try {
    const port = await freePort();
    running = spawnCli(pluginRoot, port);
    const fixtureLine = await waitForOutput(running, /Plugin fixture: (.+)/);
    fixtureRoot = fixtureLine[1]?.trim();
    assert.ok(fixtureRoot);
    const url = (
      await waitForOutput(running, /Plugin preview: (http:\/\/\S+)/)
    )[1];
    assert.ok(url);

    browser = await launchBrowser();
    const page = await browser.newPage();
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(String(error)));
    await page.goto(url, { waitUntil: "networkidle0", timeout: 120_000 });
    await page.waitForSelector(".rr-code-tabs", { timeout: 60_000 });
    assert.match(
      await page.$eval("body", (body) => body.textContent ?? ""),
      /PLUGIN_DEV_FIXTURE_MARKER/,
    );
    assert.equal(
      await page.$eval(
        ".rr-code-tabs__tablist",
        (element) => getComputedStyle(element).display,
      ),
      "flex",
    );

    await page.click(".rr-code-tabs__tab:nth-child(2)");
    await page.waitForFunction(
      () =>
        document
          .querySelectorAll(".rr-code-tabs__tab")[1]
          ?.getAttribute("aria-selected") === "true",
      { timeout: 10_000 },
    );

    await fs.appendFile(
      path.join(pluginRoot, "style.css"),
      "\n.rr-code-tabs { outline: 3px solid rgb(1, 2, 3); }\n",
      "utf8",
    );
    await waitFor(
      page,
      () =>
        getComputedStyle(document.querySelector(".rr-code-tabs") as Element)
          .outlineColor === "rgb(1, 2, 3)",
      60_000,
    );

    const clientFile = path.join(pluginRoot, "src", "init.ts");
    const client = await fs.readFile(clientFile, "utf8");
    const updatedClient = client.replace(
      "export function initCodeTabs(options: CodeTabsClientOptions = {}) {",
      `export function initCodeTabs(options: CodeTabsClientOptions = {}) {
  document.documentElement.dataset.pluginDevClient = "updated";`,
    );
    assert.notEqual(updatedClient, client);
    await fs.writeFile(clientFile, updatedClient, "utf8");
    await waitFor(
      page,
      () => document.documentElement.dataset.pluginDevClient === "updated",
      60_000,
    );

    const contentFile = path.join(fixtureRoot, "content", "index.md");
    const content = await fs.readFile(contentFile, "utf8");
    await fs.writeFile(
      contentFile,
      content.replace(
        "PLUGIN_DEV_FIXTURE_MARKER",
        "PLUGIN_DEV_FIXTURE_MARKER_UPDATED",
      ),
      "utf8",
    );
    await waitFor(
      page,
      () =>
        document.body.textContent?.includes(
          "PLUGIN_DEV_FIXTURE_MARKER_UPDATED",
        ),
      60_000,
    );
    await waitForHttp(
      url,
      (body) => body.includes("PLUGIN_DEV_FIXTURE_MARKER_UPDATED"),
      60_000,
    );

    const entryFile = path.join(pluginRoot, "index.ts");
    const entry = await fs.readFile(entryFile, "utf8");
    const updatedEntry = entry.replace(
      "      pipeline.use(rehypeCodeTabs, options);",
      `      pipeline.use(rehypeCodeTabs, options);
      pipeline.use(() => (tree) => {
        tree.children.push({
          type: "element",
          tagName: "div",
          properties: { "data-plugin-dev-restart": "true" },
          children: [],
        });
      });`,
    );
    assert.notEqual(updatedEntry, entry);
    await fs.writeFile(entryFile, updatedEntry, "utf8");
    await waitForHttp(
      url,
      (body) => body.includes("data-plugin-dev-restart"),
      90_000,
    );
    await page.reload({ waitUntil: "networkidle0", timeout: 120_000 });
    await page.waitForSelector("[data-plugin-dev-restart]", {
      timeout: 60_000,
    });
    assert.deepEqual(pageErrors, []);
  } finally {
    if (running) await stopCli(running.child);
    if (browser) await browser.close();
    if (fixtureRoot) {
      await fs.rm(fixtureRoot, { recursive: true, force: true });
    }
    await fs.rm(pluginRoot, { recursive: true, force: true });
    for (const root of await listFixtures()) {
      if (!fixtureRoots.has(root)) {
        await fs.rm(root, { recursive: true, force: true });
      }
    }
  }
});

test("plugin dev reports initialization failures and removes its fixture", async () => {
  const pluginRoot = await copyPlugin();
  try {
    await fs.writeFile(
      path.join(pluginRoot, "index.ts"),
      'throw new Error("plugin init failure");\n',
      "utf8",
    );
    const port = await freePort();
    const running = spawnCli(pluginRoot, port);
    const fixtureLine = await waitForOutput(running, /Plugin fixture: (.+)/);
    const fixtureRoot = fixtureLine[1]?.trim();
    assert.ok(fixtureRoot);
    const exit = await waitForExit(running.child);
    assert.notEqual(exit.code, 0);
    assert.match(running.output(), /plugin init failure/);
    await waitForMissing(fixtureRoot, 30_000);
  } finally {
    await fs.rm(pluginRoot, { recursive: true, force: true });
  }
});

test("plugin dev rejects a missing plugin path", async () => {
  const running = spawnCli(
    path.join(os.tmpdir(), "riebeckite-missing-plugin"),
    await freePort(),
  );
  const exit = await waitForExit(running.child);
  assert.notEqual(exit.code, 0);
  assert.match(running.output(), /Could not find a plugin/);
});

if (process.platform !== "win32") {
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    test(`plugin dev removes its fixture on ${signal}`, async () => {
      const pluginRoot = await copyPlugin();
      let running: RunningCli | undefined;
      let fixtureRoot: string | undefined;
      try {
        running = spawnCli(pluginRoot, await freePort());
        fixtureRoot = (
          await waitForOutput(running, /Plugin fixture: (.+)/)
        )[1]?.trim();
        assert.ok(fixtureRoot);
        await waitForOutput(running, /Plugin preview: /);
        running.child.kill(signal);
        const exit = await waitForExit(running.child);
        assert.equal(exit.code, 0);
        await waitForMissing(fixtureRoot, 30_000);
      } finally {
        if (running && running.child.exitCode === null) {
          await stopCli(running.child);
        }
        if (fixtureRoot) {
          await fs.rm(fixtureRoot, { recursive: true, force: true });
        }
        await fs.rm(pluginRoot, { recursive: true, force: true });
      }
    });
  }
}

async function copyPlugin(): Promise<string> {
  const root = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-plugin-source-"),
  );
  await fs.cp(codeTabsRoot, root, {
    recursive: true,
    filter: (source) => !source.split(path.sep).includes("node_modules"),
  });
  const coreTarget = path.join(root, "node_modules", "@riebeckite", "core");
  await fs.mkdir(path.dirname(coreTarget), { recursive: true });
  await fs.symlink(coreRoot, coreTarget, "junction");
  return root;
}

function spawnCli(pluginPath: string, port: number): RunningCli {
  const child = spawn(
    process.execPath,
    [
      "--import",
      "tsx",
      "packages/cli/index.ts",
      "plugin",
      "dev",
      pluginPath,
      "--port",
      String(port),
      "--no-open",
    ],
    {
      cwd: repoRoot,
      env: { ...process.env, RIEBECKITE_REQUIRE_BROWSER: "1" },
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
  running: RunningCli,
  pattern: RegExp,
): Promise<RegExpMatchArray> {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    const match = running.output().match(pattern);
    if (match) return match;
    if (running.child.exitCode !== null) break;
    await delay(100);
  }
  throw new Error(
    `Timed out waiting for ${pattern}.\nOutput:\n${running.output()}`,
  );
}

async function waitForExit(
  child: ChildProcessWithoutNullStreams,
): Promise<{ code: number | null; signal: NodeJS.Signals | null }> {
  if (child.exitCode !== null) {
    return { code: child.exitCode, signal: child.signalCode };
  }
  return await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Timed out waiting for the CLI to exit."));
    }, 120_000);
    child.once("exit", (code, signal) => {
      clearTimeout(timeout);
      resolve({ code, signal });
    });
  });
}

async function stopCli(child: ChildProcessWithoutNullStreams): Promise<void> {
  if (child.exitCode !== null) return;
  if (process.platform === "win32") {
    await new Promise<void>((resolve) => {
      const killer = spawn(
        "taskkill",
        ["/PID", String(child.pid), "/T", "/F"],
        {
          stdio: "ignore",
        },
      );
      killer.once("exit", () => resolve());
    });
    return;
  }
  child.kill("SIGINT");
  await waitForExit(child);
}

async function waitFor(
  page: Page,
  predicate: () => boolean,
  timeout: number,
): Promise<void> {
  await page.waitForFunction(predicate, { timeout });
}

async function waitForHttp(
  url: string,
  predicate: (body: string) => boolean,
  timeout: number,
): Promise<void> {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${url}?preview-check=${Date.now()}`, {
        cache: "no-store",
      });
      const body = await response.text();
      if (response.ok && predicate(body)) return;
    } catch {}
    await delay(250);
  }
  throw new Error("Timed out waiting for the preview server to update.");
}

async function waitForMissing(target: string, timeout: number): Promise<void> {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try {
      await fs.access(target);
    } catch {
      return;
    }
    await delay(100);
  }
  throw new Error(`Fixture was not removed: ${target}`);
}

async function listFixtures(): Promise<string[]> {
  const entries = await fs.readdir(os.tmpdir(), { withFileTypes: true });
  return entries
    .filter(
      (entry) =>
        entry.isDirectory() && entry.name.startsWith("riebeckite-plugin-"),
    )
    .map((entry) => path.join(os.tmpdir(), entry.name));
}

function stripAnsi(value: string): string {
  return value.replace(
    new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, "g"),
    "",
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
