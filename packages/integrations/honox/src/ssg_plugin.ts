import { relative } from "node:path";
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
  };
  config?: {
    plugins?: readonly SsgHtmlInspectorPlugin[];
  };
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

        const generatedHtml: { path: string; html: string }[] = [];
        const result = await toSSG(
          app,
          {
            writeFile: async (filePath, data) => {
              const fileName = relative(
                config.build.outDir,
                filePath,
              ).replaceAll("\\", "/");
              if (fileName.endsWith(".html") && typeof data === "string") {
                generatedHtml.push({ path: fileName, html: data });
              }
              this.emitFile({
                type: "asset",
                fileName,
                source: data,
              });
            },
            async mkdir() {},
          },
          {
            dir: config.build.outDir,
            plugins: options.plugins ?? [],
            extensionMap: options.extensionMap ?? defaultExtensionMap,
          },
        );
        if (!result.success) throw result.error;

        await emitGeneratedOutputs(module, (asset) => this.emitFile(asset));
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
): Promise<void> {
  const content = module.content;
  if (!content) return;

  const manifest = await content.getManifest();
  for (const output of manifest.generatedOutputs ?? []) {
    emit({
      type: "asset",
      fileName: output.path,
      source: output.content,
    });
  }
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
