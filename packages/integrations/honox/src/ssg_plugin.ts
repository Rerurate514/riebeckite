import { defaultExtensionMap, toSSG } from "hono/ssg";
import { relative } from "node:path";
import { createServer, type Plugin, type ResolvedConfig } from "vite";

type ToSsgOptions = NonNullable<Parameters<typeof toSSG>[2]>;

export type RiebeckiteSsgOptions = {
  entry?: string;
  plugins?: ToSsgOptions["plugins"];
  extensionMap?: Record<string, string>;
};

const defaultEntry = "./src/index.tsx";

/**
 * Generates static files using the resolved Vite application configuration.
 *
 * This is equivalent to @hono/vite-ssg for Riebeckite applications, but keeps
 * the Vite root and define values supplied by the application instead of
 * falling back to the process working directory.
 */
export function riebeckiteSsg(options: RiebeckiteSsgOptions = {}): Plugin {
  const virtualId = "virtual:riebeckite-ssg-void-entry";
  const resolvedVirtualId = `\0${virtualId}`;
  const entry = options.entry ?? defaultEntry;
  let resolvedConfig: ResolvedConfig | undefined;

  return {
    name: "riebeckite-ssg",
    apply: "build",
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
        throw new Error("Riebeckite SSG could not resolve the Vite configuration.");
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

        const result = await toSSG(
          app,
          {
            writeFile: async (filePath, data) => {
              this.emitFile({
                type: "asset",
                fileName: relative(config.build.outDir, filePath),
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
      } finally {
        await server.close();
      }
    },
  };
}

function removeVirtualEntryChunk(
  bundle: Record<string, { type: string; fileName: string; moduleIds?: string[] }>,
  virtualEntryId: string,
): void {
  for (const chunk of Object.values(bundle)) {
    if (chunk.type === "chunk" && chunk.moduleIds?.includes(virtualEntryId)) {
      delete bundle[chunk.fileName];
    }
  }
}
