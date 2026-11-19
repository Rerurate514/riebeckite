import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import type { ResolvedRiebeckiteConfig } from "@riebeckite/core";
import { siteRiebeckiteExternals } from "./site_externals.js";
import {
  workspacePackageJsonPaths,
  workspacePackageResolver,
} from "./workspace_packages.js";

export const riebeckiteConfigTemporaryDirectory = ".riebeckite-config-";

const cacheFormatVersion = 2;
const cacheDirectoryName = path.join(".riebeckite", "config-bundle");

export type RiebeckiteConfigLoaderOptions = {
  configRoot: string;
  configFile?: string;
  workspaceRoot?: string;
};

type ConfigBundleInput = {
  path: string;
  digest: string | null;
};

type ConfigBundleManifest = {
  version: number;
  esbuildVersion: string;
  mode: "workspace" | "site";
  workspaceRoot: string | null;
  configFile: string;
  packageJsonListDigest: string;
  output: string;
  inputs: ConfigBundleInput[];
};

const outputNamePattern = /^config-[0-9a-f]{16}\.mjs$/;
const failedCacheImports = new Set<string>();

export async function loadRiebeckiteConfig(
  options: RiebeckiteConfigLoaderOptions,
): Promise<ResolvedRiebeckiteConfig> {
  const mode = options.workspaceRoot ? "workspace" : "site";
  const cacheDirectory = path.join(options.configRoot, cacheDirectoryName);
  const configFilePath = path.resolve(
    options.configRoot,
    options.configFile ?? "riebeckite.config.ts",
  );
  const packageJsonListDigest = digestPackageJsonList(
    options.workspaceRoot
      ? workspacePackageJsonPaths(options.workspaceRoot)
      : [path.join(options.configRoot, "package.json")],
  );

  const cached = await loadCachedConfig({
    cacheDirectory,
    mode,
    workspaceRoot: options.workspaceRoot ?? null,
    configFile: configFilePath,
    packageJsonListDigest,
  });
  if (cached) return cached;

  const esbuild = await import("esbuild");
  const resolverPackageJsonPaths = options.workspaceRoot
    ? workspacePackageJsonPaths(options.workspaceRoot)
    : [path.join(options.configRoot, "package.json")];

  const result = await esbuild.build({
    stdin: {
      contents: `
        import rawConfig from ${JSON.stringify(
          path.resolve(
            options.configRoot,
            options.configFile ?? "riebeckite.config.ts",
          ),
        )};
        import { resolveConfigModule } from "@riebeckite/core";
        export default resolveConfigModule(rawConfig);
      `,
      resolveDir: options.configRoot,
      loader: "ts",
    },
    bundle: true,
    write: false,
    metafile: true,
    platform: "node",
    format: "esm",
    external: options.workspaceRoot
      ? ["@riebeckite/og-image"]
      : ["@riebeckite/core", ...siteRiebeckiteExternals(options.configRoot)],
    banner: {
      js: 'import { createRequire as __riebeckiteCreateRequire } from "node:module"; const require = __riebeckiteCreateRequire(import.meta.url);',
    },
    plugins: options.workspaceRoot
      ? [await workspacePackageResolver(options.workspaceRoot)]
      : [],
  });

  const metafile = result.metafile;
  if (!metafile) throw new Error("esbuild returned no config bundle metadata.");

  const inputMap = new Map<string, string | null>();
  for (const input of Object.keys(metafile.inputs)) {
    if (input === "<stdin>") continue;
    const inputPath = path.isAbsolute(input)
      ? input
      : path.resolve(process.cwd(), input);
    if (!inputMap.has(inputPath)) {
      inputMap.set(inputPath, await digestFile(inputPath));
    }
  }
  for (const packageJsonPath of resolverPackageJsonPaths) {
    if (!inputMap.has(packageJsonPath)) {
      inputMap.set(packageJsonPath, await digestFile(packageJsonPath));
    }
  }

  const inputs = [...inputMap.entries()]
    .map(([inputPath, digest]) => ({ path: inputPath, digest }))
    .sort((left, right) =>
      left.path < right.path ? -1 : left.path > right.path ? 1 : 0,
    );
  const fingerprint = createHash("sha256")
    .update(
      JSON.stringify({
        version: cacheFormatVersion,
        esbuildVersion: esbuild.version,
        mode,
        configFile: configFilePath,
        packageJsonListDigest,
        inputs,
      }),
    )
    .digest("hex")
    .slice(0, 16);

  const bundle = result.outputFiles?.[0]?.contents;
  if (!bundle) throw new Error("esbuild returned no config bundle output.");

  const output = `config-${fingerprint}.mjs`;
  const outputPath = path.join(cacheDirectory, output);
  let outputUrl = pathToFileUrl(outputPath);
  if (failedCacheImports.has(outputUrl)) outputUrl += `?retry=${Date.now()}`;
  let wroteToCache = true;
  try {
    await fs.mkdir(cacheDirectory, { recursive: true });
    await fs.writeFile(outputPath, bundle);
  } catch {
    wroteToCache = false;
    outputUrl = await writeFallbackBundle(bundle, output);
  }

  const module = await import(outputUrl);
  if (wroteToCache) {
    await fs
      .writeFile(
        path.join(cacheDirectory, "manifest.json"),
        `${JSON.stringify({
          version: cacheFormatVersion,
          esbuildVersion: esbuild.version,
          mode,
          workspaceRoot: options.workspaceRoot ?? null,
          configFile: configFilePath,
          packageJsonListDigest,
          output,
          inputs,
        })}\n`,
        "utf8",
      )
      .catch(() => {});
  }
  failedCacheImports.delete(pathToFileUrl(outputPath));
  return module.default;
}

async function writeFallbackBundle(
  bundle: Uint8Array,
  name: string,
): Promise<string> {
  const fallbackDirectory = await fs.mkdtemp(
    path.join(tmpdir(), "riebeckite-config-"),
  );
  const fallbackPath = path.join(fallbackDirectory, name);
  await fs.writeFile(fallbackPath, bundle);
  return pathToFileUrl(fallbackPath);
}

async function loadCachedConfig(cache: {
  cacheDirectory: string;
  mode: "workspace" | "site";
  workspaceRoot: string | null;
  configFile: string;
  packageJsonListDigest: string;
}): Promise<ResolvedRiebeckiteConfig | null> {
  let manifest: ConfigBundleManifest;
  try {
    manifest = JSON.parse(
      await fs.readFile(
        path.join(cache.cacheDirectory, "manifest.json"),
        "utf8",
      ),
    ) as ConfigBundleManifest;
  } catch {
    return null;
  }
  if (
    typeof manifest !== "object" ||
    manifest === null ||
    typeof manifest.output !== "string" ||
    !outputNamePattern.test(manifest.output) ||
    !Array.isArray(manifest.inputs) ||
    !manifest.inputs.every(
      (input) =>
        typeof input?.path === "string" && typeof input?.digest !== "undefined",
    )
  ) {
    return null;
  }
  if (
    manifest.version !== cacheFormatVersion ||
    manifest.mode !== cache.mode ||
    manifest.workspaceRoot !== cache.workspaceRoot ||
    manifest.configFile !== cache.configFile ||
    manifest.packageJsonListDigest !== cache.packageJsonListDigest ||
    manifest.esbuildVersion !== (await readEsbuildVersion())
  ) {
    return null;
  }
  const currentDigests = await Promise.all(
    manifest.inputs.map((input) => digestFile(input.path)),
  );
  if (
    manifest.inputs.some(
      (input, index) => input.digest !== currentDigests[index],
    )
  ) {
    return null;
  }
  const outputUrl = pathToFileUrl(
    path.join(cache.cacheDirectory, manifest.output),
  );
  try {
    const module = await import(outputUrl);
    return module.default as ResolvedRiebeckiteConfig;
  } catch {
    failedCacheImports.add(outputUrl);
    return null;
  }
}

async function readEsbuildVersion(): Promise<string | null> {
  try {
    const require = createRequire(import.meta.url);
    const packageJsonPath = require.resolve("esbuild/package.json");
    const packageJson = JSON.parse(
      await fs.readFile(packageJsonPath, "utf8"),
    ) as { version?: string };
    return packageJson.version ?? null;
  } catch {
    return null;
  }
}

async function digestFile(filePath: string): Promise<string | null> {
  try {
    return createHash("sha256")
      .update(await fs.readFile(filePath))
      .digest("hex");
  } catch {
    return null;
  }
}

function digestPackageJsonList(paths: string[]): string {
  const sorted = [...paths].sort();
  return createHash("sha256").update(JSON.stringify(sorted)).digest("hex");
}

export { resolveHonoxConfig } from "./resolved_config.js";

function pathToFileUrl(filePath: string): string {
  return `file:///${filePath.replace(/\\/g, "/").replace(/^([A-Za-z]):/, "$1:")}`;
}
