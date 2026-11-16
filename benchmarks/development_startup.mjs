import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const resultsDirectory = path.join(root, "benchmarks", "results");
const browser = await puppeteer.launch({
  headless: "shell",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  const first = await measureStartup(page);
  const second = await measureStartup(page);
  const result = {
    generatedAt: new Date().toISOString(),
    command: "pnpm dev --host 127.0.0.1 --port <free-port> --strictPort",
    environment: {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      cpu: os.cpus()[0]?.model ?? "unknown",
      cpuCount: os.cpus().length,
      memoryMb: Math.round(os.totalmem() / 1024 / 1024),
    },
    runs: [
      { name: "first", ...first },
      { name: "second", ...second },
    ],
  };
  await fs.mkdir(resultsDirectory, { recursive: true });
  const file = path.join(
    resultsDirectory,
    `${new Date().toISOString().replace(/[:.]/g, "-")}-development-startup.json`,
  );
  await fs.writeFile(file, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  console.table(result.runs);
  console.log(`Wrote ${file}`);
} finally {
  await browser.close();
}

async function measureStartup(page) {
  const port = await freePort();
  const url = `http://127.0.0.1:${port}/`;
  const started = performance.now();
  const server = startServer(port);
  try {
    await waitForOutput(server, /Local:\s+http:\/\/\S+/);
    await waitForPort(port, server.output);
    const viteReadyMs = elapsed(started);
    const response = await page
      .goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 180_000,
      })
      .catch((error) => {
        throw new Error(`${error}\n${server.output()}`);
      });
    assert.ok(response?.ok(), `Expected ${url} to return 2xx.`);
    const httpResponseMs = elapsed(started);
    await page.waitForSelector("main#main-content", {
      visible: true,
      timeout: 180_000,
    });
    return {
      port,
      viteReadyMs,
      httpResponseMs,
      pageVisibleMs: elapsed(started),
    };
  } finally {
    await stopServer(server.child);
  }
}

function startServer(port) {
  const args = [
    "dev",
    "--host",
    "127.0.0.1",
    "--port",
    String(port),
    "--strictPort",
  ];
  const child =
    process.platform === "win32"
      ? spawn(
          process.env.ComSpec ?? "cmd.exe",
          ["/d", "/s", "/c", ["pnpm.cmd", ...args].join(" ")],
          {
            cwd: root,
            env: process.env,
            stdio: ["ignore", "pipe", "pipe"],
          },
        )
      : spawn("pnpm", args, {
          cwd: root,
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

async function waitForOutput(server, pattern) {
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    if (pattern.test(server.output())) return;
    await delay(100);
  }
  throw new Error(`Timed out waiting for Vite:\n${server.output()}`);
}

async function waitForPort(port, output) {
  const deadline = Date.now() + 30_000;
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
  if (child.exitCode === null)
    await new Promise((resolve) => child.once("exit", resolve));
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
