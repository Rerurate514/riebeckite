import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import build from "@hono/vite-build/cloudflare-workers";
import { defaultOptions } from "@hono/vite-dev-server";
import adapter from "@hono/vite-dev-server/cloudflare";
import ssg from "@hono/vite-ssg";
import tailwindcss from "@tailwindcss/vite";
import honox from "honox/vite";
import { defineConfig, type Plugin } from "vite";

const webRoot = path.dirname(fileURLToPath(import.meta.url));
const coreEntry = path.resolve(webRoot, "../../packages/core/index.ts");
const attachmentEntry = path.resolve(
  webRoot,
  "../../packages/plugin-attachment/index.ts",
);
const attachmentStyle = path.resolve(
  webRoot,
  "../../packages/plugin-attachment/style.css",
);
const autoCardLinkEntry = path.resolve(
  webRoot,
  "../../packages/plugin-autocardlink/index.ts",
);
const autoCardLinkStyle = path.resolve(
  webRoot,
  "../../packages/plugin-autocardlink/style.css",
);
const codeEnhanceEntry = path.resolve(
  webRoot,
  "../../packages/plugin-code-enhance/index.ts",
);
const codeEnhanceClientEntry = path.resolve(
  webRoot,
  "../../packages/plugin-code-enhance/client.ts",
);
const codeEnhanceStyle = path.resolve(
  webRoot,
  "../../packages/plugin-code-enhance/style.css",
);
const lightboxEntry = path.resolve(
  webRoot,
  "../../packages/plugin-lightbox/index.ts",
);
const lightboxStyle = path.resolve(
  webRoot,
  "../../packages/plugin-lightbox/style.css",
);
const mermaidEntry = path.resolve(
  webRoot,
  "../../packages/plugin-mermaid/index.ts",
);
const mermaidClientEntry = path.resolve(
  webRoot,
  "../../packages/plugin-mermaid/client.ts",
);
const mermaidStyle = path.resolve(
  webRoot,
  "../../packages/plugin-mermaid/style.css",
);
const diagnosticsEntry = path.resolve(
  webRoot,
  "../../packages/plugin-diagnostics/index.ts",
);
const seoEntry = path.resolve(webRoot, "../../packages/plugin-seo/index.ts");
const pluginAssetUrlPrefix = "/riebeckite/plugin-assets/";

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@riebeckite\/core$/, replacement: coreEntry },
      {
        find: /^@riebeckite\/plugin-attachment$/,
        replacement: attachmentEntry,
      },
      {
        find: /^@riebeckite\/plugin-attachment\/style\.css$/,
        replacement: attachmentStyle,
      },
      {
        find: /^@riebeckite\/plugin-autocardlink$/,
        replacement: autoCardLinkEntry,
      },
      {
        find: /^@riebeckite\/plugin-autocardlink\/style\.css$/,
        replacement: autoCardLinkStyle,
      },
      {
        find: /^@riebeckite\/plugin-code-enhance$/,
        replacement: codeEnhanceEntry,
      },
      {
        find: /^@riebeckite\/plugin-code-enhance\/client$/,
        replacement: codeEnhanceClientEntry,
      },
      {
        find: /^@riebeckite\/plugin-code-enhance\/style\.css$/,
        replacement: codeEnhanceStyle,
      },
      {
        find: /^@riebeckite\/plugin-lightbox$/,
        replacement: lightboxEntry,
      },
      {
        find: /^@riebeckite\/plugin-lightbox\/style\.css$/,
        replacement: lightboxStyle,
      },
      {
        find: /^@riebeckite\/plugin-mermaid$/,
        replacement: mermaidEntry,
      },
      {
        find: /^@riebeckite\/plugin-mermaid\/client$/,
        replacement: mermaidClientEntry,
      },
      {
        find: /^@riebeckite\/plugin-mermaid\/style\.css$/,
        replacement: mermaidStyle,
      },
      {
        find: /^@riebeckite\/plugin-diagnostics$/,
        replacement: diagnosticsEntry,
      },
      {
        find: /^@riebeckite\/plugin-seo$/,
        replacement: seoEntry,
      },
    ],
  },
  plugins: [
    honox({
      devServer: {
        adapter,
        exclude: [...defaultOptions.exclude, /\.(png|jpe?g|gif|svg|webp)$/],
      },
      client: { input: ["/app/client.ts", "/app/style.css"] },
    }),
    tailwindcss(),
    riebeckitePluginAssets(),
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
          "mermaid",
          "slugify",
          "vfile-matter",
        ],
      },
    },
  },
});

function riebeckitePluginAssets(): Plugin {
  const assetSpecifiers = new Set<string>();
  let isBuild = false;

  return {
    name: "riebeckite-plugin-assets",
    configResolved(config) {
      isBuild = config.command === "build";
    },
    async buildStart() {
      if (!isBuild) return;

      for (const specifier of await collectPluginAssetSpecifiers()) {
        const resolved = await this.resolve(specifier);
        if (!resolved) continue;

        assetSpecifiers.add(specifier);
        this.emitFile({
          type: "asset",
          fileName: toPluginAssetFileName(specifier),
          source: await fs.readFile(resolved.id),
        });
      }
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const pathname = req.url?.split("?", 1)[0];
        if (!pathname?.startsWith(pluginAssetUrlPrefix)) {
          next();
          return;
        }

        const specifier = toPluginAssetSpecifier(pathname);
        const resolved = await server.pluginContainer.resolveId(specifier);
        if (!resolved) {
          next();
          return;
        }

        res.setHeader("Content-Type", getPluginAssetContentType(specifier));
        res.end(await fs.readFile(resolved.id));
      });
    },
    generateBundle(_, bundle) {
      for (const specifier of assetSpecifiers) {
        const fileName = toPluginAssetFileName(specifier);
        if (bundle[fileName]) continue;
        this.warn(`Plugin asset was not emitted: ${specifier}`);
      }
    },
  };
}

async function collectPluginAssetSpecifiers(): Promise<string[]> {
  const packagesRoot = path.resolve(webRoot, "../../packages");
  const entries = await fs.readdir(packagesRoot, { withFileTypes: true });
  const specifiers: string[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory() || !entry.name.startsWith("plugin-")) continue;

    const pluginDirectory = path.join(packagesRoot, entry.name);
    for (const fileName of await fs.readdir(pluginDirectory)) {
      if (!/\.(css|js)$/.test(fileName)) continue;
      specifiers.push(`@riebeckite/${entry.name}/${fileName}`);
    }
  }

  return specifiers;
}

function toPluginAssetSpecifier(pathname: string): string {
  return `@riebeckite/${pathname.slice(pluginAssetUrlPrefix.length)}`;
}

function toPluginAssetFileName(specifier: string): string {
  return `riebeckite/plugin-assets/${specifier.replace("@riebeckite/", "")}`;
}

function getPluginAssetContentType(specifier: string): string {
  if (specifier.endsWith(".css")) return "text/css; charset=utf-8";
  if (specifier.endsWith(".js")) return "text/javascript; charset=utf-8";
  return "application/octet-stream";
}
