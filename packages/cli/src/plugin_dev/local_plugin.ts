import fs from "node:fs/promises";
import path from "node:path";

export type LocalPluginPackage = {
  readonly root: string;
  readonly name: string;
  readonly entry: string;
  readonly aliases: readonly LocalPluginAlias[];
};

export type LocalPluginAlias = {
  readonly find: string;
  readonly replacement: string;
};

const packageNamePattern = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/;
const entryExtensionPattern = /\.(?:[cm]?[jt]sx?)$/;
const exportConditions = ["source", "import", "module", "default"] as const;
const entryCandidates = [
  "index.ts",
  "index.tsx",
  "index.mts",
  "index.cts",
  "index.js",
  "index.jsx",
  "index.mjs",
  "index.cjs",
] as const;

export async function loadLocalPlugin(
  input: string,
): Promise<LocalPluginPackage> {
  const target = path.resolve(process.cwd(), input);
  const root = await resolvePluginRoot(target);
  const packageJson = await readPackageJson(root);
  const name = readPackageName(packageJson, root);
  const entry = await resolveEntry(root, packageJson);
  const aliases = await resolveAliases(root, name, packageJson);

  return { root, name, entry, aliases };
}

async function resolvePluginRoot(target: string): Promise<string> {
  const stats = await fs.stat(target).catch(() => undefined);
  if (!stats) {
    throw new Error(`Could not find a plugin at ${target}.`);
  }
  if (stats.isDirectory()) return fs.realpath(target);
  if (stats.isFile() && path.basename(target) === "package.json") {
    return fs.realpath(path.dirname(target));
  }
  throw new Error(
    `Plugin path must be a directory or a package.json file: ${target}.`,
  );
}

async function readPackageJson(root: string): Promise<Record<string, unknown>> {
  let source: string;
  try {
    source = await fs.readFile(path.join(root, "package.json"), "utf8");
  } catch {
    throw new Error(`Could not find package.json in ${root}.`);
  }
  let value: unknown;
  try {
    value = JSON.parse(source);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not parse package.json in ${root}: ${message}`);
  }
  if (!isRecord(value)) {
    throw new Error(`package.json in ${root} must contain an object.`);
  }
  return value;
}

function readPackageName(
  packageJson: Record<string, unknown>,
  root: string,
): string {
  const name = packageJson.name;
  if (typeof name !== "string" || !packageNamePattern.test(name)) {
    throw new Error(`package.json in ${root} must declare a valid npm name.`);
  }
  return name;
}

async function resolveEntry(
  root: string,
  packageJson: Record<string, unknown>,
): Promise<string> {
  const target =
    rootExportTarget(packageJson.exports) ??
    (typeof packageJson.main === "string" ? packageJson.main : undefined);
  if (target !== undefined) {
    return assertEntry(root, target);
  }
  for (const candidate of entryCandidates) {
    const entry = path.join(root, candidate);
    if (await isFile(entry)) return entry;
  }
  throw new Error(
    `Could not find the plugin entry point. Expected exports["."], main, or index.ts in ${root}.`,
  );
}

async function resolveAliases(
  root: string,
  name: string,
  packageJson: Record<string, unknown>,
): Promise<readonly LocalPluginAlias[]> {
  const aliases: LocalPluginAlias[] = [];
  const exportsValue = packageJson.exports;
  if (isRecord(exportsValue)) {
    for (const [key, value] of Object.entries(exportsValue)) {
      if (!key.startsWith(".") || key === ".") continue;
      const target = exportTarget(value);
      if (target === undefined) continue;
      const replacement = path.resolve(root, target);
      if (!isWithin(root, replacement) || !(await isFile(replacement)))
        continue;
      const resolvedReplacement = await fs.realpath(replacement);
      if (!isWithin(root, resolvedReplacement)) continue;
      aliases.push({
        find: `${name}${key.slice(1)}`,
        replacement: resolvedReplacement,
      });
    }
  } else {
    for (const [subpath, candidate] of [
      ["/client", "client.ts"],
      ["/client", "client.js"],
      ["/style.css", "style.css"],
    ] as const) {
      const replacement = path.join(root, candidate);
      if (await isFile(replacement)) {
        aliases.push({ find: `${name}${subpath}`, replacement });
      }
    }
  }
  return aliases;
}

async function assertEntry(root: string, target: string): Promise<string> {
  const entry = path.resolve(root, target);
  if (!isWithin(root, entry)) {
    throw new Error("Plugin entry point must be inside the plugin directory.");
  }
  if (!entryExtensionPattern.test(entry)) {
    throw new Error(
      "Plugin entry point must be a JavaScript or TypeScript file.",
    );
  }
  if (!(await isFile(entry))) {
    throw new Error(`Could not find the plugin entry point at ${entry}.`);
  }
  const resolvedEntry = await fs.realpath(entry);
  if (!isWithin(root, resolvedEntry)) {
    throw new Error(
      "Plugin entry point must resolve inside the plugin directory.",
    );
  }
  return resolvedEntry;
}

function rootExportTarget(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (!isRecord(value)) return undefined;
  const rootExport = value["."];
  if (rootExport !== undefined) return exportTarget(rootExport);
  return exportTarget(value);
}

function exportTarget(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (!isRecord(value)) return undefined;
  for (const condition of exportConditions) {
    const target = value[condition];
    if (typeof target === "string") return target;
  }
  return undefined;
}

function isWithin(parent: string, target: string): boolean {
  const relative = path.relative(parent, target);
  return (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  );
}

async function isFile(target: string): Promise<boolean> {
  try {
    return (await fs.stat(target)).isFile();
  } catch {
    return false;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
