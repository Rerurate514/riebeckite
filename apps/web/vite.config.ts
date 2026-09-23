import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import build from "@hono/vite-build/cloudflare-workers";
import { defaultOptions } from "@hono/vite-dev-server";
import adapter from "@hono/vite-dev-server/cloudflare";
import ssg from "@hono/vite-ssg";
import tailwindcss from "@tailwindcss/vite";
import { build as buildWithEsbuild } from "esbuild";
import honox from "honox/vite";
import { defineConfig, type Plugin } from "vite";

const webRoot = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(webRoot, "../..");

const pluginClientModuleId = "virtual:riebeckite-plugin-client";
const resolvedPluginClientModuleId = `\0${pluginClientModuleId}`;

export default defineConfig(async () => {
  const config = await loadRiebeckiteConfig();
  writePluginStylesModule(config);

  return {
    resolve: {
      alias: createWorkspacePackageAliases(),
    },
    plugins: [
      honox({
        devServer: {
          adapter,
          exclude: [
            ...defaultOptions.exclude,
            /\.(png|jpe?g|gif|svg|webp)$/,
            /^\/assets\/attachments\//,
          ],
        },
        client: { input: ["/app/client.ts", "/app/style.css"] },
      }),
      tailwindcss(),
      riebeckitePluginModules(config),
      build(),
      ssg({
        entry: "./app/server.ts",
      }),
    ],
    optimizeDeps: {
      include: ["debug"],
    },
    environments: {
      ssr: {
        resolve: {
          external: [
            "extend",
            "debug",
            "node:fs/promises",
            "node:path",
            "parse-numeric-range",
            "slugify",
            "vfile-matter",
          ],
        },
      },
    },
  };
});

function riebeckitePluginModules(config: ResolvedConfig): Plugin {
  return {
    name: "riebeckite-plugin-modules",
    resolveId(id) {
      if (id === pluginClientModuleId) return resolvedPluginClientModuleId;
      return null;
    },
    load(id) {
      if (id === resolvedPluginClientModuleId)
        return createPluginClientModule(config);
      return null;
    },
  };
}

function writePluginStylesModule(config: ResolvedConfig): void {
  const outputFile = path.join(webRoot, "app/.riebeckite/plugin-styles.css");
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, createPluginStylesModule(config));
}

function createPluginStylesModule(config: ResolvedConfig): string {
  return collectPluginStyleSpecifiers(config)
    .map((specifier) => `@import ${JSON.stringify(specifier)};`)
    .join("\n");
}

function createPluginClientModule(config: ResolvedConfig): string {
  const imports: string[] = [];
  const initializers: string[] = [];

  for (const [index, entry] of config.plugins
    .flatMap((plugin) => plugin.clientEntries ?? [])
    .entries()) {
    const localName = `pluginClientInitializer${index}`;
    const importTarget = entry.exportName
      ? `{ ${entry.exportName} as ${localName} }`
      : localName;
    imports.push(
      `import ${importTarget} from ${JSON.stringify(entry.moduleSpecifier)};`,
    );
    initializers.push(localName);
  }

  return `${imports.join("\n")}

export function initRiebeckitePlugins() {
${initializers.map((name) => `  ${name}();`).join("\n")}
}
`;
}

function collectPluginStyleSpecifiers(config: ResolvedConfig): string[] {
  return config.plugins.flatMap((plugin) =>
    (plugin.assets ?? [])
      .filter((asset) => asset.kind === "style")
      .map((asset) => asset.moduleSpecifier),
  );
}

type ResolvedConfig = {
  plugins: Array<{
    assets?: Array<{ kind: string; moduleSpecifier: string }>;
    clientEntries?: Array<{ moduleSpecifier: string; exportName?: string }>;
  }>;
};

async function loadRiebeckiteConfig(): Promise<ResolvedConfig> {
  const outputFile = path.join(
    workspaceRoot,
    "node_modules/.vite/riebeckite.config.generated.mjs",
  );
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });

  await buildWithEsbuild({
    stdin: {
      contents: `
        import rawConfig from ${JSON.stringify(path.join(workspaceRoot, "riebeckite.config.ts"))};
        import { resolveConfig } from ${JSON.stringify(path.join(workspaceRoot, "packages/core/index.ts"))};
        export default resolveConfig(rawConfig);
      `,
      resolveDir: workspaceRoot,
      loader: "ts",
    },
    outfile: outputFile,
    bundle: true,
    platform: "node",
    format: "esm",
    plugins: [workspacePackageResolver()],
  });

  const module = await import(`${pathToFileUrl(outputFile)}?t=${Date.now()}`);
  return module.default;
}

function createWorkspacePackageAliases() {
  const packagesRoot = path.join(workspaceRoot, "packages");
  if (!fs.existsSync(packagesRoot)) return [];

  return fs
    .readdirSync(packagesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => {
      const packageDirectory = path.join(packagesRoot, entry.name);
      const packageJsonPath = path.join(packageDirectory, "package.json");
      if (!fs.existsSync(packageJsonPath)) return [];

      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
      if (typeof packageJson.name !== "string") return [];

      return createPackageAliases(
        packageJson.name,
        packageDirectory,
        packageJson,
      );
    });
}

function workspacePackageResolver() {
  const aliases = createWorkspacePackageAliases();
  return {
    name: "workspace-package-resolver",
    setup(buildApi: {
      onResolve: (
        options: { filter: RegExp },
        callback: (args: { path: string }) => { path: string } | null,
      ) => void;
    }) {
      buildApi.onResolve({ filter: /.*/ }, (args) => {
        const alias = aliases.find((currentAlias) =>
          currentAlias.find.test(args.path),
        );
        return alias ? { path: alias.replacement } : null;
      });
    },
  };
}

function createPackageAliases(
  packageName: string,
  packageDirectory: string,
  packageJson: { exports?: Record<string, string>; main?: string },
) {
  const aliases: { find: RegExp; replacement: string }[] = [];
  const mainEntry = packageJson.exports?.["."] ?? packageJson.main;
  if (mainEntry) {
    aliases.push({
      find: new RegExp(`^${escapeRegExp(packageName)}$`),
      replacement: path.join(packageDirectory, mainEntry),
    });
  }

  for (const [subpath, target] of Object.entries(packageJson.exports ?? {})) {
    if (subpath === ".") continue;
    aliases.push({
      find: new RegExp(`^${escapeRegExp(packageName + subpath.slice(1))}$`),
      replacement: path.join(packageDirectory, target),
    });
  }

  return aliases;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function pathToFileUrl(filePath: string): string {
  return `file:///${filePath.replace(/\\/g, "/").replace(/^([A-Za-z]):/, "$1:")}`;
}
