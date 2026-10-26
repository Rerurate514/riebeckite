import { createHash, randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import {
  copyFile,
  lstat,
  mkdir,
  readdir,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { dirname, join } from "node:path";
import { performance } from "node:perf_hooks";
import {
  isAbsolutePath,
  isNotFoundError,
  resolveWithinDirectory,
} from "./file_system.js";
import {
  computeAppFingerprint,
  fingerprintDirectory,
  fingerprintOutputDirectory,
  inventoriesEqual,
} from "./inventory.js";
import { measure, measureSync } from "./runtime_metrics.js";
import type {
  NoChangeFastPathOutputMetrics,
  NoChangeFastPathResult,
  OutputCacheDecision,
  OutputCacheRejectionReason,
} from "./types.js";

export type OutputCacheEntry = {
  cachePath: string;
  checksum: string;
};

export type OutputCacheState = {
  version: 4;
  appFingerprint?: string;
  clientManifestFingerprint?: string;
  outputs: Record<string, OutputCacheEntry>;
  finalOutputInventory?: Record<string, string>;
  publicDirectory?: string;
  publicFingerprint?: string;
  configFile?: string;
};

type FastPathCacheState = {
  version: 1;
  outputCacheChecksum: string;
  appFingerprint?: string;
  finalOutputInventory: Record<string, string>;
  publicDirectory?: string;
  publicFingerprint?: string;
  configFile: string;
  outputPaths: readonly string[];
};

const faultInjectionCounts = new Map<string, number>();
const outputCacheValidationConcurrency = 12;

export function decideOutputCacheRejection(
  decision: OutputCacheDecision,
): OutputCacheRejectionReason | undefined {
  if (!decision.changeSetPresent) return "change-set-unavailable";
  if (decision.changeSetRequiresFullRegeneration)
    return "full-regeneration-required";
  if (!decision.outputCacheLoaded) return "output-cache-missing-or-invalid";
  if (!decision.appFingerprintMatch) return "app-fingerprint-changed";
  if (!decision.clientManifestFingerprintMatch)
    return "client-manifest-fingerprint-changed";
  if (decision.uncoveredUnchangedCount > 0)
    return "unchanged-output-not-cached";
  return undefined;
}

export function createNoChangeFastPathOutputMetrics(): NoChangeFastPathOutputMetrics {
  return {
    outputInventoryValidationDurationMs: 0,
    outputHashValidationDurationMs: 0,
    outputFilesHashed: 0,
    outputBytesHashed: 0,
  };
}

export async function verifyNoChangeFastPath(input: {
  readonly root: string;
  readonly outputDirectory: string;
  readonly expectedOutputPaths: readonly string[];
  readonly metrics?: NoChangeFastPathOutputMetrics;
}): Promise<NoChangeFastPathResult> {
  const outputCachePath = join(
    input.root,
    ".riebeckite",
    "ssg-output-cache.json",
  );
  const cache = await loadFastPathCache(fastPathCachePath(outputCachePath));
  if (!cache)
    return { used: false, blockReason: "output-cache-missing-or-invalid" };
  if (cache.outputCacheChecksum !== (await checksumFile(outputCachePath))) {
    return { used: false, blockReason: "output-cache-missing-or-invalid" };
  }
  if (
    cache.appFingerprint !==
    (await computeAppFingerprint(input.root, cache.configFile))
  ) {
    return { used: false, blockReason: "app-fingerprint-changed" };
  }
  if (
    cache.publicDirectory &&
    cache.publicFingerprint !==
      (await fingerprintDirectory(cache.publicDirectory))
  ) {
    return { used: false, blockReason: "static-assets-changed" };
  }
  if (
    input.expectedOutputPaths.some(
      (output) =>
        !cache.outputPaths.includes(output) ||
        !cache.finalOutputInventory[output],
    )
  ) {
    return { used: false, blockReason: "output-cache-incomplete" };
  }
  const inventoryStartedAt = performance.now();
  const currentInventory = await fingerprintOutputDirectory(
    input.outputDirectory,
    "",
    input.metrics,
  );
  if (input.metrics)
    input.metrics.outputInventoryValidationDurationMs +=
      performance.now() - inventoryStartedAt;
  if (!inventoriesEqual(cache.finalOutputInventory, currentInventory)) {
    return { used: false, blockReason: "output-inventory-mismatch" };
  }
  return { used: true };
}

export async function loadOutputCache(
  path: string,
  timingsMs?: Record<string, number>,
  log: (message: string) => void = () => {},
): Promise<(OutputCacheState & { fileSizeBytes?: number }) | undefined> {
  if (!(await isSafeOutputCacheDirectory(dirname(path)))) {
    log("SSG output cache directory is unsafe and will be ignored.");
    return undefined;
  }
  if (!(await isRegularFile(path))) {
    return undefined;
  }
  let raw: string;
  try {
    raw = await measure(timingsMs, "outputCacheRead", () =>
      readFile(path, "utf8"),
    );
  } catch (error) {
    if (isNotFoundError(error)) return undefined;
    log(
      `SSG output cache could not be read; the build regenerates every output. ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return undefined;
  }

  let parsed: unknown;
  try {
    parsed = measureSync(timingsMs, "outputCacheParse", () => JSON.parse(raw));
  } catch (error) {
    log(
      `SSG output cache is corrupted and will be rebuilt. ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return undefined;
  }

  if (!isOutputCacheState(parsed)) {
    log("SSG output cache uses an unsupported format and will be rebuilt.");
    return undefined;
  }
  const entriesAreValid = await measure(
    timingsMs,
    "outputCacheEntriesValidate",
    () => validateOutputCacheEntries(path, parsed.outputs, timingsMs),
  );
  if (!entriesAreValid) {
    log("SSG output cache entries are corrupted and will be rebuilt.");
    return undefined;
  }
  return timingsMs
    ? { ...parsed, fileSizeBytes: Buffer.byteLength(raw) }
    : parsed;
}

export async function saveOutputCache(
  path: string,
  state: OutputCacheState,
  outputDirectory: string,
  timingsMs?: Record<string, number>,
): Promise<string> {
  const directory = dirname(path);
  await mkdir(directory, { recursive: true });
  if (!(await isSafeOutputCacheDirectory(directory))) {
    throw new Error(`Unsafe SSG output cache directory: ${directory}`);
  }
  if (!(await isSafeCacheFileTarget(path))) {
    throw new Error(`Unsafe SSG output cache file: ${path}`);
  }
  const entriesPath = outputCacheEntriesPath(path);
  const temporaryPath = `${path}.${randomUUID()}.tmp`;

  try {
    await waitForFaultInjection("metadata-save-start");
    const outputs = await measure(timingsMs, "outputCacheEntriesWrite", () =>
      saveOutputCacheEntries(
        entriesPath,
        outputDirectory,
        state.outputs,
        state.finalOutputInventory,
        timingsMs,
      ),
    );
    const serialized = measureSync(
      timingsMs,
      "outputCacheSerialize",
      () => `${JSON.stringify({ ...state, outputs })}\n`,
    );
    await measure(timingsMs, "outputCacheWrite", () =>
      writeFile(temporaryPath, serialized, "utf8"),
    );
    await measure(timingsMs, "outputCacheRename", () =>
      replaceFile(temporaryPath, path),
    );
    await waitForFaultInjection("metadata-committed");
    const checksum = createHash("sha256").update(serialized).digest("hex");
    if (state.finalOutputInventory && state.configFile) {
      await saveFastPathCache(
        fastPathCachePath(path),
        createFastPathCacheState(state, checksum),
        timingsMs,
      );
    }
    await collectUnreferencedOutputCacheEntries(
      outputCacheEntriesPath(path),
      outputs,
      timingsMs,
    );
    return checksum;
  } catch (error) {
    await rm(temporaryPath, { force: true }).catch(() => undefined);
    throw error;
  }
}

function isOutputCacheState(value: unknown): value is OutputCacheState {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as {
    version?: unknown;
    appFingerprint?: unknown;
    clientManifestFingerprint?: unknown;
    outputs?: unknown;
    finalOutputInventory?: unknown;
    publicDirectory?: unknown;
    publicFingerprint?: unknown;
    configFile?: unknown;
  };
  return (
    candidate.version === 4 &&
    (candidate.appFingerprint === undefined ||
      typeof candidate.appFingerprint === "string") &&
    (candidate.clientManifestFingerprint === undefined ||
      typeof candidate.clientManifestFingerprint === "string") &&
    isOutputCacheEntries(candidate.outputs) &&
    (candidate.finalOutputInventory === undefined ||
      isOutputInventory(candidate.finalOutputInventory)) &&
    (candidate.publicDirectory === undefined ||
      typeof candidate.publicDirectory === "string") &&
    (candidate.publicFingerprint === undefined ||
      typeof candidate.publicFingerprint === "string") &&
    (candidate.configFile === undefined ||
      typeof candidate.configFile === "string")
  );
}

function isOutputInventory(value: unknown): value is Record<string, string> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.entries(value).every(
      ([outputPath, checksum]) =>
        isSafeLogicalOutputPath(outputPath) && isChecksum(checksum),
    )
  );
}

function isOutputCacheEntries(
  value: unknown,
): value is OutputCacheState["outputs"] {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  return Object.entries(value).every(
    ([outputPath, entry]) =>
      isSafeLogicalOutputPath(outputPath) &&
      typeof entry === "object" &&
      entry !== null &&
      typeof (entry as OutputCacheEntry).cachePath === "string" &&
      (entry as OutputCacheEntry).cachePath ===
        outputCacheEntryName(outputPath) &&
      isChecksum((entry as OutputCacheEntry).checksum),
  );
}

function outputCacheEntriesPath(outputCachePath: string): string {
  return outputCachePath.replace(/\.json$/, ".entries");
}

async function saveOutputCacheEntries(
  directory: string,
  outputDirectory: string,
  outputs: Readonly<Record<string, OutputCacheEntry>>,
  finalOutputInventory: Readonly<Record<string, string>> | undefined,
  timingsMs: Record<string, number> | undefined,
): Promise<Record<string, OutputCacheEntry>> {
  await ensureOutputCacheEntriesDirectory(directory);
  const entries: Record<string, OutputCacheEntry> = {};
  for (const outputPath of Object.keys(outputs).sort()) {
    assertSafeLogicalOutputPath(outputPath);
    const existing = outputs[outputPath];
    if (existing.cachePath && existing.checksum) {
      if (
        existing.cachePath !== outputCacheEntryName(outputPath) ||
        !isChecksum(existing.checksum)
      ) {
        throw new Error(`Invalid SSG output cache entry: ${outputPath}`);
      }
      entries[outputPath] = existing;
      continue;
    }
    const source = resolveOutputCacheFile(outputDirectory, outputPath);
    const cachePath = outputCacheEntryName(outputPath);
    const destination = join(directory, cachePath);
    await waitForFaultInjection("entry-create-start");
    await replaceOutputCacheEntry(source, destination, timingsMs);
    const checksum = finalOutputInventory?.[outputPath];
    if (!checksum) {
      const cachedChecksum = await checksumFile(destination);
      if (!cachedChecksum) {
        throw new Error(`Could not checksum cached output: ${outputPath}`);
      }
      entries[outputPath] = { cachePath, checksum: cachedChecksum };
      continue;
    }
    entries[outputPath] = { cachePath, checksum };
  }
  return entries;
}

async function validateOutputCacheEntries(
  outputCachePath: string,
  entries: Readonly<Record<string, OutputCacheEntry>>,
  timingsMs?: Record<string, number>,
): Promise<boolean> {
  try {
    const directory = outputCacheEntriesPath(outputCachePath);
    if (!(await isSafeOutputCacheEntriesDirectory(directory))) return false;
    const entriesToValidate = Object.entries(entries);
    let nextEntryIndex = 0;
    let valid = true;
    const validateEntry = async (): Promise<void> => {
      while (valid) {
        const next = entriesToValidate[nextEntryIndex++];
        if (!next) return;
        const [outputPath, entry] = next;
        if (
          !isSafeLogicalOutputPath(outputPath) ||
          entry.cachePath !== outputCacheEntryName(outputPath) ||
          !isChecksum(entry.checksum)
        ) {
          valid = false;
          return;
        }
        const path = resolveOutputCacheFile(directory, entry.cachePath);
        if (!(await isRegularFile(path))) {
          valid = false;
          return;
        }
        if (
          (await measure(timingsMs, "outputCacheEntryChecksum", () =>
            checksumFile(path),
          )) !== entry.checksum
        )
          valid = false;
      }
    };
    await Promise.all(
      Array.from(
        {
          length: Math.min(
            outputCacheValidationConcurrency,
            entriesToValidate.length,
          ),
        },
        validateEntry,
      ),
    );
    return valid;
  } catch {
    return false;
  }
}

function fastPathCachePath(outputCachePath: string): string {
  return outputCachePath.replace(/\.json$/, ".fast-path.json");
}

function createFastPathCacheState(
  state: OutputCacheState,
  outputCacheChecksum: string,
): FastPathCacheState {
  if (!state.finalOutputInventory || !state.configFile) {
    throw new Error("SSG output cache is missing fast-path validation data.");
  }
  return {
    version: 1,
    outputCacheChecksum,
    appFingerprint: state.appFingerprint,
    finalOutputInventory: state.finalOutputInventory,
    publicDirectory: state.publicDirectory,
    publicFingerprint: state.publicFingerprint,
    configFile: state.configFile,
    outputPaths: Object.keys(state.outputs).sort(),
  };
}

async function saveFastPathCache(
  path: string,
  state: FastPathCacheState,
  timingsMs?: Record<string, number>,
): Promise<void> {
  const directory = dirname(path);
  await mkdir(directory, { recursive: true });
  if (!(await isSafeOutputCacheDirectory(directory))) {
    throw new Error(`Unsafe SSG fast-path cache directory: ${directory}`);
  }
  if (!(await isSafeCacheFileTarget(path))) {
    throw new Error(`Unsafe SSG fast-path cache file: ${path}`);
  }
  const temporaryPath = `${path}.${randomUUID()}.tmp`;
  try {
    await waitForFaultInjection("sidecar-save-start");
    await measure(timingsMs, "sidecarWrite", () =>
      writeFile(temporaryPath, `${JSON.stringify(state)}\n`, "utf8"),
    );
    await measure(timingsMs, "sidecarRename", () =>
      replaceFile(temporaryPath, path),
    );
    await waitForFaultInjection("sidecar-committed");
  } catch (error) {
    await rm(temporaryPath, { force: true }).catch(() => undefined);
    throw error;
  }
}

async function loadFastPathCache(
  path: string,
): Promise<FastPathCacheState | undefined> {
  try {
    if (!(await isSafeOutputCacheDirectory(dirname(path)))) return undefined;
    if (!(await isRegularFile(path))) return undefined;
    const candidate: unknown = JSON.parse(await readFile(path, "utf8"));
    return isFastPathCacheState(candidate) ? candidate : undefined;
  } catch {
    return undefined;
  }
}

function isFastPathCacheState(value: unknown): value is FastPathCacheState {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<FastPathCacheState>;
  return (
    candidate.version === 1 &&
    typeof candidate.outputCacheChecksum === "string" &&
    (candidate.appFingerprint === undefined ||
      typeof candidate.appFingerprint === "string") &&
    isOutputInventory(candidate.finalOutputInventory) &&
    (candidate.publicDirectory === undefined ||
      typeof candidate.publicDirectory === "string") &&
    (candidate.publicFingerprint === undefined ||
      typeof candidate.publicFingerprint === "string") &&
    typeof candidate.configFile === "string" &&
    Array.isArray(candidate.outputPaths) &&
    candidate.outputPaths.every(isSafeLogicalOutputPath) &&
    candidate.outputPaths.every(
      (path, index, paths) => index === 0 || paths[index - 1] < path,
    )
  );
}

async function checksumFile(path: string): Promise<string | undefined> {
  const hash = createHash("sha256");
  try {
    for await (const chunk of createReadStream(path)) hash.update(chunk);
    return hash.digest("hex");
  } catch {
    return undefined;
  }
}

async function replaceFile(
  temporaryPath: string,
  targetPath: string,
): Promise<void> {
  try {
    await rename(temporaryPath, targetPath);
  } catch (error) {
    if (!isReplacementFailure(error)) throw error;
    await rm(targetPath, { force: true });
    await rename(temporaryPath, targetPath);
  }
}

function isReplacementFailure(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return false;
  }
  const code = String(error.code);
  return code === "EPERM" || code === "EEXIST" || code === "EACCES";
}

export async function decodeOutput(
  outputCachePath: string,
  entry: OutputCacheEntry,
): Promise<Uint8Array> {
  const file = resolveOutputCacheFile(
    outputCacheEntriesPath(outputCachePath),
    entry.cachePath,
  );
  const content = await readFile(file);
  const checksum = createHash("sha256").update(content).digest("hex");
  if (checksum !== entry.checksum) {
    throw new Error("SSG output cache entry checksum mismatch.");
  }
  return content;
}

function resolveOutputCacheFile(
  directory: string,
  relativePath: string,
): string {
  return resolveWithinDirectory(
    directory,
    relativePath,
    "SSG output cache path",
  );
}

function isSafeLogicalOutputPath(path: unknown): path is string {
  if (
    typeof path !== "string" ||
    !path ||
    path.includes("\\") ||
    path.includes("\0") ||
    isAbsolutePath(path)
  ) {
    return false;
  }
  try {
    resolveOutputCacheFile("/riebeckite-output-root", path);
    return true;
  } catch {
    return false;
  }
}

function assertSafeLogicalOutputPath(path: string): void {
  if (!isSafeLogicalOutputPath(path)) {
    throw new Error(`Invalid SSG output path: ${path}`);
  }
}

function outputCacheEntryName(outputPath: string): string {
  return createHash("sha256").update(outputPath).digest("hex");
}

function isChecksum(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/u.test(value);
}

async function ensureOutputCacheEntriesDirectory(
  directory: string,
): Promise<void> {
  await mkdir(directory, { recursive: true });
  if (!(await isSafeOutputCacheEntriesDirectory(directory))) {
    throw new Error(`Unsafe SSG output cache entries directory: ${directory}`);
  }
}

async function isSafeOutputCacheDirectory(directory: string): Promise<boolean> {
  try {
    const info = await lstat(directory);
    return info.isDirectory() && !info.isSymbolicLink();
  } catch {
    return false;
  }
}

async function isSafeCacheFileTarget(path: string): Promise<boolean> {
  try {
    return !(await lstat(path)).isSymbolicLink();
  } catch (error) {
    return isNotFoundError(error);
  }
}

async function isSafeOutputCacheEntriesDirectory(
  directory: string,
): Promise<boolean> {
  return isSafeOutputCacheDirectory(directory);
}

async function isRegularFile(path: string): Promise<boolean> {
  try {
    const info = await lstat(path);
    return info.isFile() && !info.isSymbolicLink();
  } catch {
    return false;
  }
}

async function replaceOutputCacheEntry(
  source: string,
  destination: string,
  timingsMs?: Record<string, number>,
): Promise<void> {
  if ((await lstat(destination).catch(() => undefined))?.isSymbolicLink()) {
    throw new Error(`Unsafe SSG output cache entry: ${destination}`);
  }
  const temporaryPath = `${destination}.${randomUUID()}.tmp`;
  try {
    await measure(timingsMs, "outputCacheEntryWrite", () =>
      writeFile(temporaryPath, new Uint8Array()),
    );
    await waitForFaultInjection("entry-body-write");
    await measure(timingsMs, "outputCacheEntryCopy", () =>
      copyFile(source, temporaryPath),
    );
    await waitForFaultInjection("entry-rename-before");
    await measure(timingsMs, "outputCacheEntryRename", () =>
      replaceFile(temporaryPath, destination),
    );
    await waitForFaultInjection("entry-committed");
  } catch (error) {
    await rm(temporaryPath, { force: true }).catch(() => undefined);
    throw error;
  }
}

async function collectUnreferencedOutputCacheEntries(
  directory: string,
  outputs: Readonly<Record<string, OutputCacheEntry>>,
  timingsMs?: Record<string, number>,
): Promise<void> {
  try {
    if (!(await isSafeOutputCacheEntriesDirectory(directory))) return;
    await waitForFaultInjection("gc-start");
    const referenced = new Set(
      Object.values(outputs).map((entry) => entry.cachePath),
    );
    const entries = await measure(timingsMs, "outputCacheGcScan", () =>
      readdir(directory, { withFileTypes: true }),
    );
    for (const entry of entries) {
      if (!/^[a-f0-9]{64}$/u.test(entry.name) || referenced.has(entry.name)) {
        continue;
      }
      const path = join(directory, entry.name);
      if (await isRegularFile(path)) {
        await waitForFaultInjection("gc-entry-delete");
        await measure(timingsMs, "outputCacheGcDelete", () =>
          rm(path, { force: true }),
        );
      }
    }
  } catch {
    return;
  }
}

export async function waitForFaultInjection(point: string): Promise<void> {
  if (
    process.env.NODE_ENV !== "test" ||
    process.env.RIEBECKITE_SSG_FAULT_INJECTION !== "1" ||
    process.env.RIEBECKITE_SSG_FAULT_POINT !== point
  ) {
    return;
  }
  const occurrence = Number.parseInt(
    process.env.RIEBECKITE_SSG_FAULT_OCCURRENCE ?? "1",
    10,
  );
  const count = (faultInjectionCounts.get(point) ?? 0) + 1;
  faultInjectionCounts.set(point, count);
  if (
    !Number.isSafeInteger(occurrence) ||
    occurrence < 1 ||
    count !== occurrence
  )
    return;
  const signalFile = process.env.RIEBECKITE_SSG_FAULT_SIGNAL_FILE;
  if (!signalFile) return;
  await writeFile(signalFile, `${point}\n`, "utf8");
  await new Promise<void>(() => {});
}
