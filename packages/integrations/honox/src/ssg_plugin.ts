import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { defaultExtensionMap, toSSG } from "hono/ssg";
import {
  type ConfigEnv,
  createServer,
  type Plugin,
  type ResolvedConfig,
} from "vite";

type ToSsgOptions = NonNullable<Parameters<typeof toSSG>[2]>;

type GeneratedOutputAsset = {
  type: "asset";
  fileName: string;
  source: string | Uint8Array;
};

type SsgGeneratedHtmlDiagnostic = {
  severity: "info" | "warning" | "error";
  message: string;
  code?: string;
  filePath?: string;
};

type SsgHtmlInspectorPlugin = {
  name?: string;
  inspectGeneratedHtml?: (page: {
    path: string;
    html: string;
  }) => readonly SsgGeneratedHtmlDiagnostic[];
};

type SsgModule = {
  content?: {
    getManifest(): Promise<{
      generatedOutputs?: readonly {
        path: string;
        content: string | Uint8Array;
      }[];
    }>;
    getOutputChangeSet(): Promise<{
      affected: readonly { kind: string; path: string }[];
      removed: readonly { kind: string; path: string }[];
      unchanged: readonly { kind: string; path: string }[];
      fullRegenerationRequired: boolean;
      candidateOutputCount: number;
      affectedOutputCount: number;
      removedOutputCount: number;
      unchangedOutputCount: number;
    }>;
  };
  config?: {
    plugins?: readonly SsgHtmlInspectorPlugin[];
  };
};

type SsgOutputMetrics = {
  candidateOutputCount: number;
  affectedOutputCount: number;
  removedOutputCount: number;
  unchangedOutputCount: number;
  renderedOutputCount: number;
  emittedOutputCount: number;
  reusedOutputCount: number;
  deletedOutputCount: number;
  fullRegenerationRequired: boolean;
  htmlOutputCount: number;
  assetOutputCount: number;
};

type OutputCacheEntry = {
  source: string;
  encoding: "utf8" | "base64";
};

type OutputCacheState = {
  version: 1;
  outputs: Record<string, OutputCacheEntry>;
};

export type RiebeckiteSsgOptions = {
  entry?: string;
  plugins?: ToSsgOptions["plugins"];
  extensionMap?: Record<string, string>;
};

const defaultEntry = "./src/index.tsx";

export function riebeckiteSsg(options: RiebeckiteSsgOptions = {}): Plugin {
  const virtualId = "virtual:riebeckite-ssg-void-entry";
  const resolvedVirtualId = `\0${virtualId}`;
  const entry = options.entry ?? defaultEntry;
  let resolvedConfig: ResolvedConfig | undefined;

  return {
    name: "riebeckite-ssg",
    apply: shouldApplyRiebeckiteSsg,
    enforce: "post",
    config() {
      return {
        build: {
          rollupOptions: {
            input: [virtualId],
          },
        },
      };
    },
    configResolved(config) {
      resolvedConfig = config;
    },
    resolveId(id) {
      return id === virtualId ? resolvedVirtualId : undefined;
    },
    load(id) {
      return id === resolvedVirtualId
        ? 'console.log("suppress empty chunk message")'
        : undefined;
    },
    async generateBundle(_outputOptions, bundle) {
      const config = resolvedConfig;
      if (!config) {
        throw new Error(
          "Riebeckite SSG could not resolve the Vite configuration.",
        );
      }

      removeVirtualEntryChunk(bundle, resolvedVirtualId);
      const server = await createServer({
        root: config.root,
        define: config.define,
        resolve: {
          ...config.resolve,
          builtins: [...config.resolve.builtins, /^node:/],
        },
        plugins: [],
        build: { ssr: true },
        mode: config.mode,
      });

      try {
        const module = await server.ssrLoadModule(entry);
        const app = module.default;
        if (!app) {
          throw new Error(`Failed to find a default export from ${entry}.`);
        }

        const outputChangeSet = await module.content?.getOutputChangeSet();
        const outputCachePath = join(
          config.root,
          ".riebeckite",
          "ssg-output-cache.json",
        );
        const previousOutputCache = await loadOutputCache(outputCachePath);
        const canUseIncremental =
          outputChangeSet &&
          !outputChangeSet.fullRegenerationRequired &&
          previousOutputCache &&
          outputChangeSet.unchanged.every(
            (output) => previousOutputCache.outputs[output.path],
          );
        const affectedPaths = new Set<string>(
          canUseIncremental
            ? outputChangeSet.affected
                .filter((output) => output.kind !== "generated")
                .map((output) => output.path)
            : [],
        );
        const generatedHtml: { path: string; html: string }[] = [];
        const nextOutputCache: OutputCacheState = { version: 1, outputs: {} };
        const metrics: SsgOutputMetrics = {
          candidateOutputCount: outputChangeSet?.candidateOutputCount ?? 0,
          affectedOutputCount: outputChangeSet?.affectedOutputCount ?? 0,
          removedOutputCount: outputChangeSet?.removedOutputCount ?? 0,
          unchangedOutputCount: outputChangeSet?.unchangedOutputCount ?? 0,
          renderedOutputCount: 0,
          emittedOutputCount: 0,
          reusedOutputCount: 0,
          deletedOutputCount: 0,
          fullRegenerationRequired: !canUseIncremental,
          htmlOutputCount: 0,
          assetOutputCount: 0,
        };
        const result = await toSSG(
          app,
          {
            writeFile: async (filePath, data) => {
              const fileName = relative(
                config.build.outDir,
                filePath,
              ).replaceAll("\\", "/");
              if (canUseIncremental && !affectedPaths.has(fileName)) return;
              if (fileName.endsWith(".html") && typeof data === "string") {
                metrics.renderedOutputCount += 1;
                metrics.htmlOutputCount += 1;
                generatedHtml.push({ path: fileName, html: data });
              } else {
                metrics.assetOutputCount += 1;
              }
              this.emitFile({
                type: "asset",
                fileName,
                source: data,
              });
              metrics.emittedOutputCount += 1;
              nextOutputCache.outputs[fileName] = encodeOutput(data);
            },
            async mkdir() {},
          },
          {
            dir: config.build.outDir,
            plugins: [
              ...(options.plugins ?? []),
              ...(canUseIncremental
                ? [createIncrementalSsgPlugin(affectedPaths)]
                : []),
            ],
            extensionMap: options.extensionMap ?? defaultExtensionMap,
          },
        );
        if (!result.success) throw result.error;

        const emittedGeneratedOutputCount = await emitGeneratedOutputs(
          module,
          (asset) => {
            this.emitFile(asset);
            metrics.emittedOutputCount += 1;
            nextOutputCache.outputs[asset.fileName] = encodeOutput(
              asset.source,
            );
          },
          canUseIncremental
            ? new Set(
                outputChangeSet.affected
                  .filter((output) => output.kind === "generated")
                  .map((output) => output.path),
              )
            : undefined,
        );
        if (!outputChangeSet)
          metrics.candidateOutputCount =
            result.files.length + emittedGeneratedOutputCount;
        if (canUseIncremental) {
          for (const output of outputChangeSet.unchanged) {
            const cached = previousOutputCache.outputs[output.path];
            if (!cached) continue;
            this.emitFile({
              type: "asset",
              fileName: output.path,
              source: decodeOutput(cached),
            });
            metrics.emittedOutputCount += 1;
            metrics.reusedOutputCount += 1;
            nextOutputCache.outputs[output.path] = cached;
          }
          for (const output of outputChangeSet.removed) {
            await rm(join(config.build.outDir, output.path), { force: true });
            metrics.deletedOutputCount += 1;
          }
        }
        await saveOutputCache(outputCachePath, nextOutputCache);
        await writeSsgOutputMetrics(metrics);
        inspectGeneratedHtmlPages(module, generatedHtml, {
          warn: (message) => this.warn(message),
          info: (message) => this.info(message),
        });
      } finally {
        await server.close();
      }
    },
  };
}

export function shouldApplyRiebeckiteSsg(
  _config: unknown,
  env: ConfigEnv,
): boolean {
  return env.command === "build" && env.mode !== "client";
}

/**
 * Forwards plugin-generated files (registered through the Core output sink)
 * into the Vite build output. Plugins never write to disk themselves.
 */
async function emitGeneratedOutputs(
  module: SsgModule,
  emit: (asset: GeneratedOutputAsset) => void,
  affectedPaths?: ReadonlySet<string>,
): Promise<number> {
  const content = module.content;
  if (!content) return 0;

  const manifest = await content.getManifest();
  let count = 0;
  for (const output of manifest.generatedOutputs ?? []) {
    if (affectedPaths && !affectedPaths.has(output.path)) continue;
    emit({
      type: "asset",
      fileName: output.path,
      source: output.content,
    });
    count += 1;
  }
  return count;
}

function createIncrementalSsgPlugin(
  affectedPaths: ReadonlySet<string>,
): NonNullable<ToSsgOptions["plugins"]>[number] {
  return {
    afterResponseHook: async (response) => {
      const contentType =
        response.headers.get("Content-Type")?.split(";")[0] ?? "text/plain";
      if (!response.url) return response;
      const routePath = new URL(response.url).pathname;
      const outputPath = routeOutputPath(routePath, contentType);
      return affectedPaths.has(outputPath) ? response : false;
    },
  };
}

function routeOutputPath(routePath: string, contentType: string): string {
  const extension =
    contentType === "text/html"
      ? "html"
      : (defaultExtensionMap[contentType] ?? "html");
  if (routePath === "/") return `index.${extension}`;
  const normalized = routePath.split("/").filter(Boolean).join("/");
  if (normalized.endsWith(`.${extension}`)) return normalized;
  if (routePath.endsWith("/")) return `${normalized}/index.${extension}`;
  return `${normalized}.${extension}`;
}

export async function loadOutputCache(
  path: string,
): Promise<OutputCacheState | undefined> {
  try {
    const parsed = JSON.parse(await readFile(path, "utf8")) as unknown;
    return isOutputCacheState(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export async function saveOutputCache(
  path: string,
  state: OutputCacheState,
): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporaryPath = `${path}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(state)}\n`, "utf8");
  await rename(temporaryPath, path);
}

function isOutputCacheState(value: unknown): value is OutputCacheState {
  if (!value || typeof value !== "object") return false;
  const state = value as { version?: unknown; outputs?: unknown };
  if (state.version !== 1) return false;
  if (!state.outputs || typeof state.outputs !== "object") return false;
  for (const [path, entry] of Object.entries(state.outputs)) {
    if (typeof path !== "string") return false;
    if (!entry || typeof entry !== "object") return false;
    const output = entry as { source?: unknown; encoding?: unknown };
    if (typeof output.source !== "string") return false;
    if (output.encoding !== "utf8" && output.encoding !== "base64")
      return false;
  }
  return true;
}

function encodeOutput(source: string | Uint8Array): OutputCacheEntry {
  return typeof source === "string"
    ? { source, encoding: "utf8" }
    : { source: Buffer.from(source).toString("base64"), encoding: "base64" };
}

function decodeOutput(entry: OutputCacheEntry): string | Uint8Array {
  return entry.encoding === "utf8"
    ? entry.source
    : Buffer.from(entry.source, "base64");
}

async function writeSsgOutputMetrics(metrics: SsgOutputMetrics): Promise<void> {
  const file = process.env.RIEBECKITE_SSG_METRICS_FILE;
  if (!file) return;
  await writeFile(file, `${JSON.stringify(metrics)}\n`, "utf8");
}

/**
 * Runs post-SSG HTML inspections contributed by Core plugins. Structural rules
 * that need the whole document (a11y, duplicate ids, anchors) cannot see the
 * final page during the Core lifecycle, so `@riebeckite/honox` forwards every
 * emitted HTML file to plugins that declare `inspectGeneratedHtml`.
 */
function inspectGeneratedHtmlPages(
  module: SsgModule,
  pages: readonly { path: string; html: string }[],
  log: { warn: (message: string) => void; info: (message: string) => void },
): void {
  const plugins = module.config?.plugins ?? [];
  for (const plugin of plugins) {
    const inspector = plugin.inspectGeneratedHtml;
    if (typeof inspector !== "function") continue;

    for (const page of pages) {
      for (const diagnostic of inspector(page) ?? []) {
        const label = `[${plugin.name ?? "plugin"}] ${page.path}: ${diagnostic.message}`;
        if (diagnostic.severity === "info") log.info(label);
        else log.warn(label);
      }
    }
  }
}

function removeVirtualEntryChunk(
  bundle: Record<
    string,
    { type: string; fileName: string; moduleIds?: string[] }
  >,
  virtualEntryId: string,
): void {
  for (const chunk of Object.values(bundle)) {
    if (chunk.type === "chunk" && chunk.moduleIds?.includes(virtualEntryId)) {
      delete bundle[chunk.fileName];
    }
  }
}
