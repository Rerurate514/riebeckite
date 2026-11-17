import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";
import { generateVault } from "./lib/vault.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const websiteRoot = path.join(root, "website");
const sitesRoot = path.join(root, ".riebeckite", "startup-scaling");
const resultsDirectory = path.join(root, "benchmarks", "results");
const viteCli = path.resolve(
  path.dirname(
    createRequire(path.join(websiteRoot, "package.json")).resolve("vite"),
  ),
  "../..",
  "bin/vite.js",
);
const sizes = parseSizes(process.argv.slice(2));
const browser = await puppeteer.launch({
  headless: "shell",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
  protocolTimeout: 900_000,
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  const rows = [];
  for (const size of sizes) {
    const siteRoot = await createSite(size);
    try {
      rows.push({
        size,
        first: await measureStartup(page, siteRoot),
        second: await measureStartup(page, siteRoot),
      });
    } finally {
      await fs.rm(siteRoot, { recursive: true, force: true });
    }
  }
  const result = {
    generatedAt: new Date().toISOString(),
    command:
      "predev (tsx scripts/build_images.ts), then Vite CLI on a temporary site",
    profile: "realistic",
    environment: {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      cpu: os.cpus()[0]?.model ?? "unknown",
      cpuCount: os.cpus().length,
      memoryMb: Math.round(os.totalmem() / 1024 / 1024),
    },
    rows,
  };
  await fs.mkdir(resultsDirectory, { recursive: true });
  const file = path.join(
    resultsDirectory,
    `${new Date().toISOString().replace(/[:.]/g, "-")}-development-startup-scaling.json`,
  );
  await fs.writeFile(file, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  console.table(
    rows.flatMap(({ size, first, second }) => [
      { size, start: "first", ...first },
      { size, start: "second", ...second },
    ]),
  );
  console.log(`Wrote ${file}`);
} finally {
  await browser.close();
  await fs.rm(sitesRoot, { recursive: true, force: true });
}

async function createSite(size) {
  const siteRoot = path.join(sitesRoot, String(size));
  const contentRoot = path.join(siteRoot, "benchmark-content");
  await fs.rm(siteRoot, { recursive: true, force: true });
  await fs.mkdir(sitesRoot, { recursive: true });
  try {
    await fs.access(path.join(sitesRoot, "node_modules"));
  } catch {
    await fs.symlink(
      path.join(root, "node_modules"),
      path.join(sitesRoot, "node_modules"),
      "junction",
    );
  }
  try {
    await fs.access(path.join(sitesRoot, "packages"));
  } catch {
    await fs.symlink(
      path.join(root, "packages"),
      path.join(sitesRoot, "packages"),
      "junction",
    );
  }
  await fs.cp(websiteRoot, siteRoot, {
    recursive: true,
    filter: (source) =>
      !["node_modules", ".riebeckite", "dist"].includes(path.basename(source)),
  });
  await fs.symlink(
    path.join(websiteRoot, "node_modules"),
    path.join(siteRoot, "node_modules"),
    "junction",
  );
  await generateVault(contentRoot, {
    size: size - 1,
    profile: "realistic",
    seed: 1234,
  });
  await fs.writeFile(
    path.join(contentRoot, "index.md"),
    "---\ntitle: Startup benchmark\nvisibility: public\nhomepage: true\n---\n\n# Startup benchmark\n",
    "utf8",
  );
  await replaceFile(
    path.join(siteRoot, "riebeckite.config.ts"),
    'directory: "../docs"',
    `directory: ${JSON.stringify(contentRoot)}`,
  );
  await replaceFile(
    path.join(siteRoot, "vite.config.ts"),
    'const appRoot = fileURLToPath(new URL(".", import.meta.url));\nconst workspaceRoot = path.resolve(appRoot, "..");',
    `const appRoot = ${JSON.stringify(siteRoot)};\nconst workspaceRoot = ${JSON.stringify(root)};`,
  );
  return siteRoot;
}

async function replaceFile(file, expected, replacement) {
  const source = await fs.readFile(file, "utf8");
  assert.ok(source.includes(expected), `Could not prepare ${file}.`);
  await fs.writeFile(file, source.replace(expected, replacement), "utf8");
}

async function measureStartup(page, siteRoot) {
  const port = await freePort();
  const url = `http://127.0.0.1:${port}/`;
  const started = performance.now();
  await runPredev(siteRoot);
  const server = startServer(siteRoot, port);
  try {
    await waitForPort(port, server.output);
    const viteReadyMs = elapsed(started);
    const response = await navigate(page, url, server.output);
    assert.ok(
      response?.ok(),
      `Expected ${url} to return 2xx, got ${response?.status()}:\n${await response?.text()}\n${server.output()}`,
    );
    const httpResponseMs = elapsed(started);
    await page.waitForSelector("main#main-content", {
      visible: true,
      timeout: 900_000,
    });
    return {
      viteReadyMs,
      httpResponseMs,
      pageVisibleMs: elapsed(started),
    };
  } finally {
    await stopServer(server.child);
  }
}

async function navigate(page, url, output) {
  const deadline = Date.now() + 900_000;
  while (Date.now() < deadline) {
    try {
      return await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 900_000,
      });
    } catch (error) {
      if (!String(error).includes("ERR_CONNECTION_REFUSED")) {
        throw new Error(`${error}\n${output()}`);
      }
      await delay(100);
    }
  }
  throw new Error(`Timed out requesting ${url}:\n${output()}`);
}

function startServer(siteRoot, port) {
  const args = [
    viteCli,
    "--host",
    "127.0.0.1",
    "--port",
    String(port),
    "--strictPort",
  ];
  const child = spawn(process.execPath, args, {
    cwd: siteRoot,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.on("data", (chunk) => {
    output += stripAnsi(String(chunk));
  });
  child.stderr.on("data", (chunk) => {
    output += stripAnsi(String(chunk));
  });
  return { child, output: () => output };
}

async function runPredev(siteRoot) {
  const child = spawn(
    process.execPath,
    ["--import", "tsx", "--conditions=source", "scripts/build_images.ts"],
    {
      cwd: siteRoot,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let output = "";
  child.stdout.on("data", (chunk) => {
    output += stripAnsi(String(chunk));
  });
  child.stderr.on("data", (chunk) => {
    output += stripAnsi(String(chunk));
  });
  const exitCode = await new Promise((resolve) => child.once("exit", resolve));
  assert.equal(exitCode, 0, `predev failed:\n${output}`);
}

async function freePort() {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("Could not allocate a port."));
        return;
      }
      server.close(() => resolve(address.port));
    });
  });
}

async function waitForPort(port, output) {
  const deadline = Date.now() + 900_000;
  while (Date.now() < deadline) {
    const connected = await new Promise((resolve) => {
      const socket = net.connect(port, "127.0.0.1");
      socket.once("connect", () => {
        socket.destroy();
        resolve(true);
      });
      socket.once("error", () => resolve(false));
    });
    if (connected) return;
    await delay(50);
  }
  throw new Error(`Timed out waiting for port ${port}:\n${output()}`);
}

async function stopServer(child) {
  if (child.pid === undefined) return;
  const exited =
    child.exitCode === null
      ? new Promise((resolve) => child.once("exit", resolve))
      : null;
  if (process.platform === "win32") {
    await new Promise((resolve) => {
      const killer = spawn(
        "taskkill",
        ["/pid", String(child.pid), "/t", "/f"],
        {
          stdio: "ignore",
        },
      );
      killer.once("exit", resolve);
    });
  } else {
    child.kill("SIGTERM");
  }
  await exited;
}

function parseSizes(args) {
  const index = args.indexOf("--sizes");
  const value = index === -1 ? undefined : args[index + 1];
  const sizes = (value ?? "10,100,1000,2000,4000,5000,10000")
    .split(",")
    .map(Number);
  assert.ok(
    sizes.every((size) => Number.isInteger(size) && size > 1),
    "--sizes must contain positive integers greater than one.",
  );
  return sizes;
}

function elapsed(started) {
  return Math.round((performance.now() - started) * 10) / 10;
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function stripAnsi(value) {
  return value.replace(
    new RegExp(`${String.fromCharCode(27)}\\[[0-?]*[ -/]*[@-~]`, "g"),
    "",
  );
}
