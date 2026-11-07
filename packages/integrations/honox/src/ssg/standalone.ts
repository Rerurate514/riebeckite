import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { build, type Plugin, type ResolvedConfig } from "vite";
import type { SsgModule } from "./types.js";

const standaloneSsgMode = "riebeckite-ssr";
const frameworkRequire = createRequire(import.meta.url);

export type StandaloneSsgBundle = {
  readonly app: NonNullable<SsgModule["default"]>;
  readonly module: SsgModule;
};

export async function loadStandaloneSsgBundle(input: {
  readonly root: string;
  readonly entry: string;
  readonly outputDirectory: string;
  readonly clientOutputDirectory?: string;
  readonly config?: Pick<
    ResolvedConfig,
    "define" | "oxc" | "plugins" | "resolve"
  >;
}): Promise<StandaloneSsgBundle> {
  const root = resolve(input.root);
  const outputDirectory = resolve(input.outputDirectory);
  await mkdir(outputDirectory, { recursive: true });
  await build({
    root,
    configFile: input.config ? false : undefined,
    mode: standaloneSsgMode,
    ...(input.config
      ? {
          define: input.config.define,
          oxc: input.config.oxc,
          plugins: [
            ...input.config.plugins.filter(
              (plugin) =>
                plugin.name !== "riebeckite-ssg" &&
                plugin.name !== "riebeckite-ssr-externals" &&
                !plugin.name.startsWith("@hono/vite-build/"),
            ),
            createFrameworkResolutionPlugin(),
            createRuntimeExternalPlugin(),
            ...(input.clientOutputDirectory
              ? [createClientManifestPlugin(root, input.clientOutputDirectory)]
              : []),
          ],
          resolve: {
            ...input.config.resolve,
            external: [],
          },
        }
      : {}),
    build: {
      emptyOutDir: false,
      outDir: outputDirectory,
      ssr: true,
      rollupOptions: {
        input: input.entry,
        output: { entryFileNames: "ssg-server.mjs", format: "es" },
      },
    },
    environments: { ssr: { resolve: { noExternal: true } } },
  });
  const module = (await import(
    `${pathToFileURL(resolve(outputDirectory, "ssg-server.mjs")).href}?v=${Date.now()}`
  )) as SsgModule;
  if (!module.default) {
    throw new Error(`Failed to find a default export from ${input.entry}.`);
  }
  return { app: module.default, module };
}

export function createFrameworkResolutionPlugin(): Plugin {
  return {
    name: "riebeckite-ssg-framework-resolution",
    enforce: "pre",
    resolveId(source) {
      if (
        !(
          source === "hono" ||
          source.startsWith("hono/") ||
          source === "honox" ||
          source.startsWith("honox/")
        )
      ) {
        return undefined;
      }
      return frameworkRequire.resolve(source);
    },
  };
}

const runtimeExternalPackages = new Set(["@d2lang/d2", "@marp-team/marp-core"]);

function createRuntimeExternalPlugin(): Plugin {
  return {
    name: "riebeckite-ssg-runtime-externals",
    enforce: "pre",
    async resolveId(source, importer) {
      if (!runtimeExternalPackages.has(source)) return undefined;
      const resolved = await this.resolve(source, importer, { skipSelf: true });
      return resolved
        ? { id: pathToFileURL(resolved.id).href, external: true }
        : undefined;
    },
  };
}

export function createClientManifestPlugin(
  root: string,
  clientOutputDirectory: string,
): Plugin {
  const manifestPath = `/${relative(root, clientOutputDirectory).replaceAll("\\", "/")}/.vite/manifest.json`;
  return {
    name: "riebeckite-client-manifest",
    enforce: "pre",
    transform(code, id) {
      return id.includes("honox/dist/server/components/")
        ? code.replaceAll("/dist/.vite/manifest.json", manifestPath)
        : undefined;
    },
  };
}

export function isStandaloneSsgMode(mode: string): boolean {
  return mode === standaloneSsgMode;
}
