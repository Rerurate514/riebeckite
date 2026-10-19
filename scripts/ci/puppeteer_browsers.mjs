import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const MERMAID_MANIFEST = fileURLToPath(
  new URL("../../packages/plugins/mermaid/package.json", import.meta.url),
);

const BROWSER_LAUNCH_OPTIONS = {
  chrome: { browser: "chrome", headless: true },
  "chrome-headless-shell": { browser: "chrome", headless: "shell" },
};

export function parseBrowsers(value) {
  const seen = new Set();
  const browsers = [];
  for (const part of String(value ?? "").split(",")) {
    const name = part.trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    browsers.push(name);
  }
  return browsers;
}

export function buildCacheKey({ platform, arch, puppeteerVersion, browsers }) {
  const list = [...browsers].sort().join("-");
  return `puppeteer-v1-${platform}-${arch}-${puppeteerVersion}-${list}`;
}

export function resolveCacheDirectory(env = process.env) {
  const override = env.PUPPETEER_CACHE_DIR?.trim();
  if (override) return override;
  return join(homedir(), ".cache", "puppeteer");
}

export function classifyBrowsers(resolved, exists = existsSync) {
  const present = [];
  const missing = [];
  for (const entry of resolved) {
    if (exists(entry.path)) present.push(entry);
    else missing.push(entry);
  }
  return { present, missing };
}

export async function ensureBrowsers({
  resolved,
  install,
  exists = existsSync,
  log = () => {},
}) {
  const { present, missing } = classifyBrowsers(resolved, exists);
  for (const entry of present) {
    log(`using cached ${entry.name}: ${entry.path}`);
  }
  for (const entry of missing) {
    log(`installing ${entry.name}`);
    await install(entry.name);
  }
  const unresolved = missing.filter((entry) => !exists(entry.path));
  if (unresolved.length > 0) {
    throw new Error(
      `Puppeteer browser install did not produce an executable for: ${unresolved
        .map((entry) => entry.name)
        .join(", ")}`,
    );
  }
  return {
    installed: missing.map((entry) => entry.name),
    reused: present.map((entry) => entry.name),
  };
}

function createMermaidRequire() {
  return createRequire(MERMAID_MANIFEST);
}

function readPuppeteerManifest(require) {
  const manifestPath = require.resolve("puppeteer/package.json");
  return {
    manifestPath,
    manifest: JSON.parse(readFileSync(manifestPath, "utf8")),
  };
}

async function loadPuppeteer(require) {
  const entry = pathToFileURL(require.resolve("puppeteer")).href;
  return (await import(entry)).default;
}

async function resolveBrowserPaths(browsers, puppeteer) {
  const resolved = [];
  for (const name of browsers) {
    const options = BROWSER_LAUNCH_OPTIONS[name];
    if (!options) {
      throw new Error(
        `Unsupported Puppeteer browser "${name}". Supported browsers: ${Object.keys(
          BROWSER_LAUNCH_OPTIONS,
        ).join(", ")}`,
      );
    }
    resolved.push({ name, path: await puppeteer.executablePath(options) });
  }
  return resolved;
}

function createInstaller(require) {
  const { manifestPath, manifest } = readPuppeteerManifest(require);
  const bin =
    typeof manifest.bin === "string" ? manifest.bin : manifest.bin?.puppeteer;
  if (!bin) {
    throw new Error(
      "The installed puppeteer package does not expose a CLI binary.",
    );
  }
  const cliPath = join(dirname(manifestPath), bin);
  return (name) => {
    const result = spawnSync(
      process.execPath,
      [cliPath, "browsers", "install", name],
      { stdio: "inherit" },
    );
    if (result.error) throw result.error;
    if (result.status !== 0) {
      throw new Error(
        `puppeteer browsers install ${name} exited with code ${result.status ?? "null"}.`,
      );
    }
  };
}

async function main(argv) {
  const command = argv[2];
  if (command === "cache-dir") {
    process.stdout.write(`${resolveCacheDirectory()}\n`);
    return;
  }

  const browsers = parseBrowsers(process.env.RIEBECKITE_PUPPETEER_BROWSERS);
  if (browsers.length === 0) {
    throw new Error(
      "RIEBECKITE_PUPPETEER_BROWSERS must list at least one browser.",
    );
  }

  process.env.PUPPETEER_CACHE_DIR = resolveCacheDirectory();
  const require = createMermaidRequire();
  const { manifest } = readPuppeteerManifest(require);

  if (command === "cache-key") {
    process.stdout.write(
      `${buildCacheKey({
        platform: process.platform,
        arch: process.arch,
        puppeteerVersion: manifest.version,
        browsers,
      })}\n`,
    );
    return;
  }

  const puppeteer = await loadPuppeteer(require);
  const resolved = await resolveBrowserPaths(browsers, puppeteer);

  if (command === "verify") {
    const { missing } = classifyBrowsers(resolved);
    if (missing.length > 0) {
      throw new Error(
        `Missing Puppeteer browsers: ${missing
          .map((entry) => entry.name)
          .join(", ")}`,
      );
    }
    return;
  }

  if (command === "ensure") {
    const result = await ensureBrowsers({
      resolved,
      install: createInstaller(require),
      log: (message) => console.log(message),
    });
    if (result.installed.length === 0) {
      console.log(`Puppeteer cache hit for ${result.reused.join(", ")}.`);
    }
    return;
  }

  throw new Error(
    `Unknown command "${command}". Use cache-dir, cache-key, ensure, or verify.`,
  );
}

const invokedUrl = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
if (invokedUrl === import.meta.url) {
  main(process.argv).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
