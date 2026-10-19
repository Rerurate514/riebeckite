import assert from "node:assert/strict";
import { homedir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  buildCacheKey,
  classifyBrowsers,
  ensureBrowsers,
  parseBrowsers,
  resolveCacheDirectory,
} from "./puppeteer_browsers.mjs";

const shell = (path) => ({ name: "chrome-headless-shell", path });
const chrome = (path) => ({ name: "chrome", path });

test("parseBrowsers trims, drops blanks, and de-duplicates", () => {
  assert.deepEqual(
    parseBrowsers(" chrome-headless-shell, chrome ,, chrome-headless-shell "),
    ["chrome-headless-shell", "chrome"],
  );
  assert.deepEqual(parseBrowsers(""), []);
  assert.deepEqual(parseBrowsers(undefined), []);
});

test("buildCacheKey includes platform, arch, puppeteer version, and browsers", () => {
  const key = buildCacheKey({
    platform: "linux",
    arch: "x64",
    puppeteerVersion: "25.11.0",
    browsers: ["chrome", "chrome-headless-shell"],
  });
  assert.equal(
    key,
    "puppeteer-v1-linux-x64-25.11.0-chrome-chrome-headless-shell",
  );
});

test("buildCacheKey is stable regardless of browser order", () => {
  const base = {
    platform: "linux",
    arch: "x64",
    puppeteerVersion: "25.11.0",
  };
  assert.equal(
    buildCacheKey({ ...base, browsers: ["chrome", "chrome-headless-shell"] }),
    buildCacheKey({ ...base, browsers: ["chrome-headless-shell", "chrome"] }),
  );
});

test("version mismatch produces a different cache key", () => {
  const base = {
    platform: "linux",
    arch: "x64",
    browsers: ["chrome-headless-shell"],
  };
  assert.notEqual(
    buildCacheKey({ ...base, puppeteerVersion: "25.11.0" }),
    buildCacheKey({ ...base, puppeteerVersion: "26.0.0" }),
  );
});

test("resolveCacheDirectory honours PUPPETEER_CACHE_DIR", () => {
  assert.equal(
    resolveCacheDirectory({ PUPPETEER_CACHE_DIR: "/custom/puppeteer" }),
    "/custom/puppeteer",
  );
  assert.equal(
    resolveCacheDirectory({ PUPPETEER_CACHE_DIR: "  " }),
    join(homedir(), ".cache", "puppeteer"),
  );
});

test("resolveCacheDirectory falls back to the Puppeteer default", () => {
  assert.equal(
    resolveCacheDirectory({}),
    join(homedir(), ".cache", "puppeteer"),
  );
});

test("cache restored: every resolved browser already exists", () => {
  const resolved = [shell("/cache/shell"), chrome("/cache/chrome")];
  const { present, missing } = classifyBrowsers(resolved, () => true);
  assert.deepEqual(
    present.map((entry) => entry.name),
    ["chrome-headless-shell", "chrome"],
  );
  assert.deepEqual(missing, []);
});

test("cache missing: no resolved browser exists", () => {
  const resolved = [shell("/cache/shell"), chrome("/cache/chrome")];
  const { present, missing } = classifyBrowsers(resolved, () => false);
  assert.deepEqual(present, []);
  assert.deepEqual(
    missing.map((entry) => entry.name),
    ["chrome-headless-shell", "chrome"],
  );
});

test("partially populated cache: only the absent browser is missing", () => {
  const resolved = [shell("/cache/shell"), chrome("/cache/chrome")];
  const onDisk = new Set(["/cache/chrome"]);
  const { present, missing } = classifyBrowsers(resolved, (path) =>
    onDisk.has(path),
  );
  assert.deepEqual(
    present.map((entry) => entry.name),
    ["chrome"],
  );
  assert.deepEqual(
    missing.map((entry) => entry.name),
    ["chrome-headless-shell"],
  );
});

test("version mismatch: a cached build of another version is not reused", () => {
  const resolved = [shell("/cache/chrome-headless-shell/linux-153/shell")];
  const onDisk = new Set(["/cache/chrome-headless-shell/linux-152/shell"]);
  const { present, missing } = classifyBrowsers(resolved, (path) =>
    onDisk.has(path),
  );
  assert.deepEqual(present, []);
  assert.deepEqual(
    missing.map((entry) => entry.name),
    ["chrome-headless-shell"],
  );
});

test("ensureBrowsers installs nothing when the cache is restored", async () => {
  const installs = [];
  const result = await ensureBrowsers({
    resolved: [shell("/cache/shell")],
    install: (name) => installs.push(name),
    exists: () => true,
  });
  assert.deepEqual(installs, []);
  assert.deepEqual(result.reused, ["chrome-headless-shell"]);
  assert.deepEqual(result.installed, []);
});

test("ensureBrowsers installs a missing browser and re-verifies it", async () => {
  const installs = [];
  const onDisk = new Set();
  const result = await ensureBrowsers({
    resolved: [shell("/cache/shell"), chrome("/cache/chrome")],
    install: (name) => {
      installs.push(name);
      onDisk.add(name === "chrome" ? "/cache/chrome" : "/cache/shell");
    },
    exists: (path) => onDisk.has(path),
  });
  assert.deepEqual(installs, ["chrome-headless-shell", "chrome"]);
  assert.deepEqual(result.installed, ["chrome-headless-shell", "chrome"]);
  assert.deepEqual(result.reused, []);
});

test("ensureBrowsers installs only the browser missing from a version-mismatched cache", async () => {
  const installs = [];
  const onDisk = new Set(["/cache/chrome/linux-153/chrome"]);
  await ensureBrowsers({
    resolved: [
      shell("/cache/shell/linux-153/shell"),
      chrome("/cache/chrome/linux-153/chrome"),
    ],
    install: (name) => {
      installs.push(name);
      onDisk.add("/cache/shell/linux-153/shell");
    },
    exists: (path) => onDisk.has(path),
  });
  assert.deepEqual(installs, ["chrome-headless-shell"]);
});

test("ensureBrowsers throws when installation does not produce the executable", async () => {
  await assert.rejects(
    ensureBrowsers({
      resolved: [shell("/cache/shell")],
      install: () => {},
      exists: () => false,
    }),
    /did not produce an executable for: chrome-headless-shell/,
  );
});
