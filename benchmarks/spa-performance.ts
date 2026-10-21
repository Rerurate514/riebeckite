import { spawnSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { brotliCompressSync, gzipSync } from "node:zlib";

import {
  createLogger,
  packPackages,
  stageIsolatedSite,
  writeFileDependencies,
} from "@riebeckite/test/e2e";
import puppeteer from "puppeteer";

import { PACKAGES } from "../tests/external-site/fixture-spec.js";

const samples = 5;
const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const fixtureRoot = path.join(repoRoot, "tests", "external-site", "fixture");

type Mode = "off" | "on" | "hover";

interface Sample {
  readonly initialMs: number;
  readonly navigationMs: number;
  readonly prefetch: {
    readonly beforeClick: { readonly requests: number; readonly bytes: number };
    readonly afterClick: { readonly requests: number; readonly bytes: number };
  };
}

interface Summary {
  readonly median: number;
  readonly minimum: number;
  readonly maximum: number;
  readonly spread: number;
}

interface Result {
  readonly environment: Record<string, string | number>;
  readonly fixture: string;
  readonly samples: number;
  readonly modes: Record<
    Mode,
    {
      readonly buildMs: readonly number[];
      readonly initial: Summary;
      readonly navigation: Summary;
      readonly prefetch: {
        readonly beforeClick: {
          readonly requests: number;
          readonly bytes: number;
        };
        readonly afterClick: {
          readonly requests: number;
          readonly bytes: number;
        };
      };
      readonly memoryBytes: Record<string, number>;
      readonly bundles: {
        readonly raw: number;
        readonly gzip: number;
        readonly brotli: number;
      };
    }
  >;
}

function run(command: string, args: readonly string[], cwd: string): number {
  const started = performance.now();
  const result =
    process.platform === "win32" && command === "npm"
      ? spawnSync("cmd.exe", ["/d", "/s", "/c", [command, ...args].join(" ")], {
          cwd,
          encoding: "utf8",
        })
      : spawnSync(command, args, { cwd, encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed\n${result.stdout ?? ""}\n${result.stderr ?? result.error?.message ?? ""}`,
    );
  }
  return performance.now() - started;
}

function configure(siteDir: string, mode: Mode): void {
  const configPath = path.join(siteDir, "riebeckite.config.ts");
  const config = fs.readFileSync(configPath, "utf8");
  const spa =
    mode === "off"
      ? ""
      : `  spa: { prefetch: ${mode === "hover" ? '"hover"' : "false"} },\n`;
  fs.writeFileSync(configPath, config.replace("  spa: {},\n", spa));
}

function coldBuild(siteDir: string): number {
  fs.rmSync(path.join(siteDir, "dist"), { recursive: true, force: true });
  fs.rmSync(path.join(siteDir, ".riebeckite"), {
    recursive: true,
    force: true,
  });
  return run(
    process.execPath,
    [
      path.join(
        siteDir,
        "node_modules",
        "@riebeckite",
        "cli",
        "bin",
        "riebeckite.mjs",
      ),
      "build",
    ],
    path.join(siteDir, "app"),
  );
}

function summary(values: readonly number[]): Summary {
  const ordered = [...values].sort((left, right) => left - right);
  const middle = Math.floor(ordered.length / 2);
  const median =
    ordered.length % 2 === 0
      ? (ordered[middle - 1] + ordered[middle]) / 2
      : ordered[middle];
  return {
    median,
    minimum: ordered[0],
    maximum: ordered.at(-1) ?? 0,
    spread: (ordered.at(-1) ?? 0) - ordered[0],
  };
}

function contentType(file: string): string {
  if (file.endsWith(".css")) return "text/css";
  if (file.endsWith(".js")) return "text/javascript";
  if (file.endsWith(".json")) return "application/json";
  if (file.endsWith(".svg")) return "image/svg+xml";
  if (file.endsWith(".png")) return "image/png";
  return "text/html";
}

function requestedPage(requests: readonly { path: string; bytes: number }[]): {
  requests: number;
  bytes: number;
} {
  const target = requests.filter(
    (request) => request.path === "/notes/example",
  );
  return {
    requests: target.length,
    bytes: target.reduce((total, request) => total + request.bytes, 0),
  };
}

async function serve(directory: string): Promise<{
  url: string;
  requests: readonly { path: string; bytes: number }[];
  close(): Promise<void>;
}> {
  const requests: { path: string; bytes: number }[] = [];
  const root = path.resolve(directory);
  const server = http.createServer((request, response) => {
    const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
    const fallback =
      pathname === "/" ? "index.html" : `${pathname.slice(1)}.html`;
    const candidate = path.resolve(root, fallback);
    const file = fs.existsSync(candidate)
      ? candidate
      : path.resolve(root, pathname.slice(1));
    if (!file.startsWith(`${root}${path.sep}`) || !fs.existsSync(file)) {
      response.writeHead(404).end();
      return;
    }
    const bytes = fs.statSync(file).size;
    requests.push({ path: pathname, bytes });
    response.writeHead(200, {
      "content-type": contentType(file),
      "content-length": bytes,
      "cache-control": "no-store",
    });
    fs.createReadStream(file).pipe(response);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("benchmark server has no TCP address");
  return {
    url: `http://127.0.0.1:${address.port}`,
    requests,
    close: () =>
      new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  };
}

async function measureBrowser(
  url: string,
  mode: Mode,
): Promise<{ samples: Sample[]; memoryBytes: Record<string, number> }> {
  const server = await serve(url);
  const browser = await puppeteer.launch({
    headless: "shell",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    const result: Sample[] = [];
    const memoryBytes: Record<string, number> = {};
    for (let sample = 0; sample < samples; sample += 1) {
      const page = await browser.newPage();
      await page.evaluateOnNewDocument(() => {
        window.addEventListener("DOMContentLoaded", () => {
          if (document.querySelector("main#main-content")) {
            performance.mark("benchmark-main-ready");
          }
        });
        document.addEventListener("riebeckite:navigation", () =>
          performance.mark("benchmark-spa-complete"),
        );
      });
      await page.goto(server.url, { waitUntil: "domcontentloaded" });
      const initialMs = await page.evaluate(
        () =>
          performance.getEntriesByName("benchmark-main-ready").at(-1)
            ?.startTime ?? 0,
      );
      const before = server.requests.length;
      const link = 'a[href="/notes/example"]';
      let beforeClick = { requests: 0, bytes: 0 };
      if (mode === "hover") {
        await page.hover(link);
        await page.waitForFunction(() =>
          performance
            .getEntriesByType("resource")
            .some((entry) => entry.name.endsWith("/notes/example")),
        );
        beforeClick = requestedPage(server.requests.slice(before));
      }
      const navigationStart = await page.evaluate(() => performance.now());
      if (mode === "off") {
        await Promise.all([
          page.waitForNavigation({ waitUntil: "domcontentloaded" }),
          page.click(link),
        ]);
      } else {
        const completed = await page.evaluate(
          () => performance.getEntriesByName("benchmark-spa-complete").length,
        );
        await page.click(link);
        await page.waitForFunction(
          (previous) =>
            performance.getEntriesByName("benchmark-spa-complete").length >
            previous,
          {},
          completed,
        );
      }
      const navigationMs =
        mode === "off"
          ? await page.evaluate(
              () =>
                performance.getEntriesByName("benchmark-main-ready").at(-1)
                  ?.startTime ?? 0,
            )
          : await page.evaluate(
              (start) => performance.now() - start,
              navigationStart,
            );
      result.push({
        initialMs,
        navigationMs,
        prefetch: {
          beforeClick,
          afterClick: requestedPage(server.requests.slice(before)),
        },
      });
      await page.close();
    }
    for (const count of [0, 10, 25, 50]) {
      const page = await browser.newPage();
      await page.evaluateOnNewDocument(() => {
        document.addEventListener("riebeckite:navigation", () =>
          performance.mark("benchmark-spa-complete"),
        );
      });
      await page.goto(server.url, { waitUntil: "domcontentloaded" });
      for (let index = 0; index < count; index += 1) {
        if (mode === "off") {
          await Promise.all([
            page.waitForNavigation({ waitUntil: "domcontentloaded" }),
            page.click('a[href="/notes/example"]'),
          ]);
          await page.goBack({ waitUntil: "domcontentloaded" });
        } else {
          const completed = await page.evaluate(
            () => performance.getEntriesByName("benchmark-spa-complete").length,
          );
          await page.click('a[href="/notes/example"]');
          await page.waitForFunction(
            (previous) =>
              performance.getEntriesByName("benchmark-spa-complete").length >
              previous,
            {},
            completed,
          );
          const afterForward = await page.evaluate(
            () => performance.getEntriesByName("benchmark-spa-complete").length,
          );
          await page.goBack({ waitUntil: "domcontentloaded" });
          await page.waitForFunction(
            (previous) =>
              performance.getEntriesByName("benchmark-spa-complete").length >
              previous,
            {},
            afterForward,
          );
        }
      }
      memoryBytes[String(count)] = (await page.metrics()).JSHeapUsedSize;
      await page.close();
    }
    return { samples: result, memoryBytes };
  } finally {
    await browser.close();
    await server.close();
  }
}

function bundles(dist: string): { raw: number; gzip: number; brotli: number } {
  const files = fs
    .readdirSync(path.join(dist, "static"), { recursive: true })
    .filter((entry) => typeof entry === "string" && entry.endsWith(".js"));
  return files.reduce(
    (total, entry) => {
      const contents = fs.readFileSync(path.join(dist, "static", entry));
      return {
        raw: total.raw + contents.length,
        gzip: total.gzip + gzipSync(contents).length,
        brotli: total.brotli + brotliCompressSync(contents).length,
      };
    },
    { raw: 0, gzip: 0, brotli: 0 },
  );
}

async function main(): Promise<void> {
  const tempRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "riebeckite-spa-benchmark-"),
  );
  const logger = createLogger("spa-benchmark");
  try {
    const tarballDir = path.join(tempRoot, "tarballs");
    fs.mkdirSync(tarballDir);
    const packed = await packPackages(tarballDir, {
      repoRoot,
      packages: PACKAGES,
      logger,
    });
    const modes = {} as Result["modes"];
    for (const mode of ["off", "on", "hover"] as const) {
      const root = path.join(tempRoot, mode);
      const siteDir = path.join(root, "site");
      stageIsolatedSite({
        fixtureSite: path.join(fixtureRoot, "site"),
        fixtureVault: path.join(fixtureRoot, "vault"),
        siteDir,
        vaultDir: path.join(root, "vault"),
      });
      writeFileDependencies(siteDir, packed);
      run(
        "npm",
        ["install", "--no-audit", "--no-fund", "--loglevel=error"],
        siteDir,
      );
      configure(siteDir, mode);
      const buildMs = Array.from({ length: samples }, () => coldBuild(siteDir));
      const browser = await measureBrowser(path.join(siteDir, "dist"), mode);
      const trials = browser.samples;
      modes[mode] = {
        buildMs,
        initial: summary(trials.map((trial) => trial.initialMs)),
        navigation: summary(trials.map((trial) => trial.navigationMs)),
        prefetch: {
          beforeClick: {
            requests: trials.reduce(
              (total, trial) => total + trial.prefetch.beforeClick.requests,
              0,
            ),
            bytes: trials.reduce(
              (total, trial) => total + trial.prefetch.beforeClick.bytes,
              0,
            ),
          },
          afterClick: {
            requests: trials.reduce(
              (total, trial) => total + trial.prefetch.afterClick.requests,
              0,
            ),
            bytes: trials.reduce(
              (total, trial) => total + trial.prefetch.afterClick.bytes,
              0,
            ),
          },
        },
        memoryBytes: browser.memoryBytes,
        bundles: bundles(path.join(siteDir, "dist")),
      };
    }
    const browser = await puppeteer.launch({ headless: "shell" });
    const browserVersion = await browser.version();
    await browser.close();
    const result: Result = {
      environment: {
        node: process.version,
        platform: process.platform,
        arch: process.arch,
        cpu: os.cpus()[0]?.model ?? "unknown",
        memoryBytes: os.totalmem(),
        browser: browserVersion,
      },
      fixture: "tests/external-site/fixture (packed public tarballs)",
      samples,
      modes,
    };
    const output = path.join(
      repoRoot,
      "benchmarks",
      "results",
      `${new Date().toISOString().replaceAll(":", "-")}-spa.json`,
    );
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
    console.log(output);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
