import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { QrBuildResult, ResolvedQrCodeOptions } from "./types.js";

/**
 * The QR encoder is imported at build time only. The specifier is deliberately
 * non-literal so bundlers (Vite for the site/client build, esbuild for the
 * config module) cannot pull the encoder into their output. When the plugin is
 * bundled into a temporary config module, the bare specifier no longer resolves
 * relative to `import.meta.url`, so the loader also walks `node_modules` from
 * `process.cwd()` and the pnpm virtual store.
 */
const QR_LIBRARY = "qrcode";

type DynamicImport = (specifier: string) => Promise<unknown>;

const dynamicImport = new Function(
  "specifier",
  "return import(specifier)",
) as DynamicImport;

type QrEncoder = {
  toString(text: string, options?: Record<string, unknown>): unknown;
};

let encoderPromise: Promise<QrEncoder> | null = null;

export function resetQrCodeEncoderCache(): void {
  encoderPromise = null;
}

/**
 * Encodes `text` into an inline SVG string. Filesystem/library failures are
 * returned as `{ ok: false }` so the rehype transformer can keep a diagnostic
 * and a fallback instead of throwing during the build.
 */
export async function buildQrSvg(
  text: string,
  options: ResolvedQrCodeOptions,
): Promise<QrBuildResult> {
  const source = text.trim();
  if (source === "") {
    return { ok: false, message: "QR block is empty; nothing to encode." };
  }

  try {
    const encoder = await loadQrEncoder();
    const svg = await encoder.toString(source, {
      type: "svg",
      errorCorrectionLevel: options.level,
      margin: options.margin,
      width: options.width,
      color: { dark: options.dark, light: options.light },
    });

    if (typeof svg !== "string" || svg.trim() === "") {
      return {
        ok: false,
        message: "QR encoder returned an empty SVG.",
      };
    }
    return { ok: true, svg };
  } catch (error) {
    return { ok: false, message: formatError(error) };
  }
}

async function loadQrEncoder(): Promise<QrEncoder> {
  encoderPromise ??= resolveQrEncoder();
  return encoderPromise;
}

async function resolveQrEncoder(): Promise<QrEncoder> {
  const attempts = collectLoadCandidates();
  const failures: string[] = [];

  for (const specifier of attempts) {
    try {
      const module = await dynamicImport(specifier);
      return normalizeEncoder(module);
    } catch (error) {
      failures.push(`${specifier}: ${formatError(error)}`);
    }
  }

  throw new Error(
    `Could not load the "${QR_LIBRARY}" encoder. Tried: ${attempts.join(", ")}. ` +
      `Last errors: ${failures.slice(-2).join("; ")}`,
  );
}

function normalizeEncoder(module: unknown): QrEncoder {
  if (isRecord(module)) {
    const direct = module.toString;
    if (typeof direct === "function") return module as unknown as QrEncoder;
    const fallback = module.default;
    if (isRecord(fallback) && typeof fallback.toString === "function") {
      return fallback as unknown as QrEncoder;
    }
  }
  throw new Error(`The "${QR_LIBRARY}" module has no toString() export.`);
}

/**
 * Load candidates in priority order: the bare specifier first (fast path when
 * the module happens to be resolvable), then absolute file URLs discovered from
 * every plausible `node_modules` ancestor.
 */
function collectLoadCandidates(): string[] {
  const candidates: string[] = [QR_LIBRARY];

  for (const directory of collectModuleRoots()) {
    const entry = resolveFromRoot(directory);
    if (entry) candidates.push(pathToFileURL(entry).href);
  }

  for (const directory of collectPnpmStoreEntries()) {
    const entry = resolvePackageDirectory(directory);
    if (entry) candidates.push(pathToFileURL(entry).href);
  }

  return dedupe(candidates);
}

function collectModuleRoots(): string[] {
  const roots: string[] = [];
  const starts = [process.cwd(), safeImportMetaDir()].filter(
    (value): value is string => typeof value === "string",
  );

  for (const start of starts) {
    roots.push(start, ...ancestorDirectories(start));
  }
  return dedupe(roots);
}

function collectPnpmStoreEntries(): string[] {
  const packageDirectories: string[] = [];
  for (const directory of collectModuleRoots()) {
    const store = path.join(directory, "node_modules", ".pnpm");
    if (!isDirectory(store)) continue;
    for (const entry of safeReaddir(store)) {
      if (!entry.startsWith(`${QR_LIBRARY}@`)) continue;
      packageDirectories.push(
        path.join(store, entry, "node_modules", QR_LIBRARY),
      );
    }
  }
  return packageDirectories;
}

function resolveFromRoot(directory: string): string | null {
  const require = createRequire(path.join(directory, "package.json"));
  try {
    return require.resolve(QR_LIBRARY);
  } catch {
    return null;
  }
}

function resolvePackageDirectory(directory: string): string | null {
  if (!isDirectory(directory)) return null;
  try {
    const manifest = JSON.parse(
      fs.readFileSync(path.join(directory, "package.json"), "utf8"),
    ) as { main?: string; exports?: unknown };
    const entry =
      resolveExportsEntry(manifest.exports) ?? manifest.main ?? "index.js";
    return path.resolve(directory, entry);
  } catch {
    return null;
  }
}

function resolveExportsEntry(exportsField: unknown): string | undefined {
  if (typeof exportsField === "string") return exportsField;
  if (!isRecord(exportsField)) return undefined;

  const root = exportsField["."];
  const target = root ?? exportsField;
  if (typeof target === "string") return target;
  if (!isRecord(target)) return undefined;

  for (const condition of ["import", "require", "default", "node"]) {
    const value = target[condition];
    if (typeof value === "string") return value;
    if (isRecord(value)) {
      const nested = resolveExportsEntry(value);
      if (nested) return nested;
    }
  }
  return undefined;
}

function safeImportMetaDir(): string | undefined {
  const url = import.meta.url;
  if (typeof url !== "string" || !url.startsWith("file:")) return undefined;
  try {
    return path.dirname(fileURLToPath(url));
  } catch {
    return undefined;
  }
}

function* ancestorDirectories(start: string): Generator<string> {
  let directory = path.resolve(start);
  for (;;) {
    yield directory;
    const parent = path.dirname(directory);
    if (parent === directory) return;
    directory = parent;
  }
}

function dedupe(values: string[]): string[] {
  return [...new Set(values)];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isDirectory(directory: string): boolean {
  try {
    return fs.statSync(directory).isDirectory();
  } catch {
    return false;
  }
}

function safeReaddir(directory: string): string[] {
  try {
    return fs.readdirSync(directory);
  } catch {
    return [];
  }
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
