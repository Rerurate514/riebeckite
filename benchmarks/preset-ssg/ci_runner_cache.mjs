import fs from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { cacheOutput } from "./ci_runner_config.mjs";

export async function saveCache(siteRoot, cacheStore) {
  const zip = path.join(cacheStore, "cache");
  const stateFile = path.join(
    siteRoot,
    ".riebeckite",
    "build",
    "content-state.json",
  );
  const started = performance.now();
  await fs.cp(path.join(siteRoot, ".riebeckite", "cache"), zip, {
    recursive: true,
  });
  const contentCacheBytes = await directorySize(zip);
  await fs.mkdir(path.dirname(cacheStore), { recursive: true });
  const contentStateBytes = (await fs.stat(stateFile)).size;
  await fs.copyFile(stateFile, path.join(cacheStore, "content-state.json"));
  const outputCacheBytes = cacheOutput
    ? await saveOutputCache(siteRoot, cacheStore)
    : 0;
  return {
    saveMs: Math.round(performance.now() - started),
    bytes: contentCacheBytes + contentStateBytes + outputCacheBytes,
    contentCacheBytes,
    contentStateBytes,
    outputCacheBytes,
  };
}

export async function saveOutputCache(siteRoot, cacheStore) {
  const stateRoot = path.join(siteRoot, ".riebeckite");
  const target = path.join(cacheStore, "output-cache");
  await fs.mkdir(target, { recursive: true });
  let bytes = 0;
  for (const name of [
    "ssg-output-cache.json",
    "ssg-output-cache.fast-path.json",
  ]) {
    const source = path.join(stateRoot, name);
    try {
      await fs.copyFile(source, path.join(target, name));
      bytes += (await fs.stat(source)).size;
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
  const entries = path.join(stateRoot, "ssg-output-cache.entries");
  try {
    await fs.cp(entries, path.join(target, "ssg-output-cache.entries"), {
      recursive: true,
    });
    bytes += await directorySize(path.join(target, "ssg-output-cache.entries"));
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  return bytes;
}

export async function restoreCache(cacheStore, siteRoot) {
  const started = performance.now();
  await fs.mkdir(path.join(siteRoot, ".riebeckite", "build"), {
    recursive: true,
  });
  await fs.cp(
    path.join(cacheStore, "cache"),
    path.join(siteRoot, ".riebeckite", "cache"),
    {
      recursive: true,
    },
  );
  await fs.copyFile(
    path.join(cacheStore, "content-state.json"),
    path.join(siteRoot, ".riebeckite", "build", "content-state.json"),
  );
  if (cacheOutput) {
    const source = path.join(cacheStore, "output-cache");
    const stateRoot = path.join(siteRoot, ".riebeckite");
    for (const name of [
      "ssg-output-cache.json",
      "ssg-output-cache.fast-path.json",
    ]) {
      try {
        await fs.copyFile(path.join(source, name), path.join(stateRoot, name));
      } catch (error) {
        if (error?.code !== "ENOENT") throw error;
      }
    }
    try {
      await fs.cp(
        path.join(source, "ssg-output-cache.entries"),
        path.join(stateRoot, "ssg-output-cache.entries"),
        { recursive: true },
      );
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
  return Math.round(performance.now() - started);
}

export async function directorySize(directory) {
  let total = 0;
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const child = path.join(directory, entry.name);
    if (entry.isDirectory()) total += await directorySize(child);
    else if (entry.isFile()) total += (await fs.stat(child)).size;
  }
  return total;
}
