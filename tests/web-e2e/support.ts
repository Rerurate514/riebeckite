import { type ChildProcess, spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer, { type Browser } from "puppeteer";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const webRoot = path.join(repositoryRoot, "apps", "web");

export type RunningServer = {
  readonly url: string;
  readonly output: () => string;
  stop(): Promise<void>;
};

export async function launchBrowser(): Promise<Browser> {
  const attempts: Array<Parameters<typeof puppeteer.launch>[0]> = [
    {
      headless: "shell",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    },
    {
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    },
  ];
  for (const options of attempts) {
    try {
      return await puppeteer.launch(options);
    } catch {}
  }
  throw new Error(
    "Puppeteer could not launch a browser. Web E2E tests require an installed Chrome-for-Testing binary.",
  );
}

export async function startDevServer(): Promise<RunningServer> {
  const port = await freePort();
  return startServer({
    name: "Vite dev server",
    command: "pnpm",
    args: [
      "--filter",
      "@riebeckite/web",
      "dev",
      "--port",
      String(port),
      "--strictPort",
    ],
    cwd: repositoryRoot,
    url: `http://127.0.0.1:${port}`,
    readyPath: "/",
    timeoutMs: 300_000,
  });
}

export async function startProductionServer(): Promise<RunningServer> {
  for (const file of ["dist/preview-worker.js", "dist/playground.html"]) {
    if (!existsSync(path.join(webRoot, file))) {
      throw new Error(
        `The production build is missing apps/web/${file}. Run "pnpm --filter @riebeckite/web build" before the web E2E tests.`,
      );
    }
  }
  const port = await freePort();
  return startServer({
    name: "Wrangler production server",
    command: "pnpm",
    args: [
      "exec",
      "wrangler",
      "dev",
      "--ip",
      "127.0.0.1",
      "--port",
      String(port),
      "--local",
    ],
    cwd: webRoot,
    url: `http://127.0.0.1:${port}`,
    readyPath: "/api/playground",
    readyInit: {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        pluginId: "code-tabs",
        fixtureId: "basic",
        markdown: "```ts\nconst ready = true;\n```",
        options: { syncTabs: false },
      }),
    },
    timeoutMs: 240_000,
  });
}

type StartServerOptions = {
  readonly name: string;
  readonly command: string;
  readonly args: readonly string[];
  readonly cwd: string;
  readonly url: string;
  readonly readyPath: string;
  readonly readyInit?: RequestInit;
  readonly timeoutMs: number;
};

async function startServer(
  options: StartServerOptions,
): Promise<RunningServer> {
  const child = spawn(options.command, options.args, {
    cwd: options.cwd,
    env: {
      ...process.env,
      CI: "1",
      FORCE_COLOR: "0",
      NO_COLOR: "1",
      WRANGLER_SEND_METRICS: "false",
    },
    stdio: ["ignore", "pipe", "pipe"],
    shell: process.platform === "win32",
    detached: process.platform !== "win32",
  });
  let output = "";
  const collect = (chunk: Buffer) => {
    output = `${output}${chunk.toString()}`.slice(-20_000);
  };
  child.stdout?.on("data", collect);
  child.stderr?.on("data", collect);

  const failIfExited = () => {
    if (child.exitCode !== null) {
      throw new Error(
        `${options.name} exited with code ${child.exitCode}.\n${output}`,
      );
    }
  };

  const deadline = Date.now() + options.timeoutMs;
  let lastError: unknown;
  while (Date.now() < deadline) {
    failIfExited();
    try {
      const response = await fetch(`${options.url}${options.readyPath}`, {
        ...options.readyInit,
        signal: AbortSignal.timeout(120_000),
      });
      const body = await response.text();
      if (response.ok && !body.includes('"error"')) {
        return {
          url: options.url,
          output: () => output,
          stop: () => stopChild(child),
        };
      }
      lastError = new Error(
        `${options.name} returned ${response.status}: ${body.slice(0, 300)}`,
      );
    } catch (error) {
      lastError = error;
    }
    await delay(1_000);
  }

  await stopChild(child);
  throw new Error(
    `${options.name} did not become ready within ${options.timeoutMs}ms.\n${output}\n${String(lastError)}`,
  );
}

async function stopChild(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null) return;
  if (process.platform === "win32" && child.pid !== undefined) {
    spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
    });
  } else if (child.pid !== undefined) {
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch {
      child.kill("SIGTERM");
    }
  }
  await Promise.race([onceExit(child), delay(10_000)]);
  if (child.exitCode === null) child.kill("SIGKILL");
}

function onceExit(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null) return Promise.resolve();
  return new Promise((resolve) => child.once("exit", () => resolve()));
}

async function freePort(): Promise<number> {
  const server = net.createServer();
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  await new Promise<void>((resolve) => server.close(() => resolve()));
  if (port === 0) throw new Error("Could not allocate a free port.");
  return port;
}

export function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
