import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startHonoxDevServer } from "@riebeckite/honox";
import { scaffoldRiebeckiteSite } from "create-riebeckite/scaffold";
import {
  previewApplication,
  previewContent,
} from "../theme_preview/fixtures.js";
import { assertThemeName } from "./create_theme.js";

export type ThemePreviewOptions = {
  readonly name: string;
  readonly port?: number;
  readonly open: boolean;
};

export async function runThemePreview(
  options: ThemePreviewOptions,
): Promise<void> {
  assertThemeName(options.name);
  const projectRoot = process.cwd();
  const themeRoot = path.join(projectRoot, "themes", options.name);
  await assertLocalTheme(themeRoot, options.name);
  const previewRoot = path.join(
    projectRoot,
    "themes",
    `.riebeckite-preview-${process.pid}-${Date.now()}`,
  );
  try {
    await scaffoldRiebeckiteSite({
      targetDirectory: previewRoot,
      preset: "minimal",
      utilities: [],
      deployment: { type: "none" },
      site: { title: `${options.name} preview` },
    });
    await linkDependencies(previewRoot);
    await writePreviewViteConfig(previewRoot);
    await linkTheme(previewRoot, themeRoot, options.name);
    await writePreviewConfig(previewRoot, themeRoot, options.name);
    await writePreviewFixtures(previewRoot);
    await writePreviewApplication(previewRoot);
    console.log(`Previewing local Theme "${options.name}".`);
    await startHonoxDevServer({
      root: previewRoot,
      server: { host: "127.0.0.1", open: options.open, port: options.port },
      restartOnChange: [path.join(themeRoot, "index.ts")],
      onServerReady: (urls) => {
        const url = urls[0];
        if (url) console.log(`Theme preview: ${url}`);
      },
    });
  } finally {
    await fs.rm(previewRoot, { recursive: true, force: true });
  }
}

async function linkTheme(
  previewRoot: string,
  themeRoot: string,
  name: string,
): Promise<void> {
  const previewThemes = path.join(previewRoot, "themes");
  await fs.mkdir(previewThemes, { recursive: true });
  await fs.symlink(themeRoot, path.join(previewThemes, name), "junction");
}

async function linkDependencies(previewRoot: string): Promise<void> {
  await Promise.all(
    [
      ["@hono/vite-build", "@hono/vite-build/node"],
      ["@riebeckite/core", "@riebeckite/core"],
      ["@riebeckite/honox", "@riebeckite/honox"],
      ["@riebeckite/plugin-color-mode", "@riebeckite/plugin-color-mode"],
      ["@riebeckite/plugin-docs", "@riebeckite/plugin-docs"],
      [
        "@riebeckite/plugin-obsidian-markdown",
        "@riebeckite/plugin-obsidian-markdown",
      ],
      ["@riebeckite/plugin-toc", "@riebeckite/plugin-toc"],
      ["@riebeckite/ui", "@riebeckite/ui"],
      ["hono", "hono"],
      ["honox", "honox"],
      ["vite", "vite"],
    ].map(async ([name, specifier]) => {
      const packageDirectory = await findPackageDirectory(
        await resolveModuleSpecifier(specifier),
      );
      const target = path.join(previewRoot, "node_modules", name);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.symlink(packageDirectory, target, "junction");
    }),
  );
}

async function findPackageDirectory(file: string): Promise<string> {
  let current = path.dirname(file);
  while (true) {
    try {
      await fs.access(path.join(current, "package.json"));
      return current;
    } catch {}
    const parent = path.dirname(current);
    if (parent === current)
      throw new Error("Could not resolve preview dependencies.");
    current = parent;
  }
}

async function assertLocalTheme(root: string, name: string): Promise<void> {
  try {
    await fs.access(path.join(root, "index.ts"));
  } catch {
    throw new Error(`Could not find local Theme "${name}" in themes/${name}.`);
  }
}

async function writePreviewConfig(
  previewRoot: string,
  themeRoot: string,
  name: string,
): Promise<void> {
  const identifier = `${name.replace(/-([a-z0-9])/g, (_, letter: string) => letter.toUpperCase())}Theme`;
  const [core, colorMode, docsPlugin, obsidianMarkdown, tocPlugin] =
    await Promise.all([
      resolveModuleSpecifier("@riebeckite/core"),
      resolveModuleSpecifier("@riebeckite/plugin-color-mode"),
      resolveModuleSpecifier("@riebeckite/plugin-docs"),
      resolveModuleSpecifier("@riebeckite/plugin-obsidian-markdown"),
      resolveModuleSpecifier("@riebeckite/plugin-toc"),
    ]);
  const source = `import { defineConfig, type RiebeckiteTheme } from ${JSON.stringify(core)};
import { colorModePlugin } from ${JSON.stringify(colorMode)};
import { docs } from ${JSON.stringify(docsPlugin)};
import { obsidianMarkdown } from ${JSON.stringify(obsidianMarkdown)};
import { tocPlugin } from ${JSON.stringify(tocPlugin)};
import * as themeModule from ${JSON.stringify(path.join(themeRoot, "index.ts"))};

const themeFactory = (themeModule.${identifier} ?? Object.values(themeModule).find(
  (value): value is () => RiebeckiteTheme => typeof value === "function",
));

if (!themeFactory) throw new Error("Theme must export a Theme factory.");

export default defineConfig({
  site: { title: ${JSON.stringify(`${name} preview`)}, description: "Isolated Theme preview", baseUrl: "", locale: "en" },
  content: { directory: "content" },
  theme: themeFactory(),
  plugins: [
    obsidianMarkdown(),
    colorModePlugin(),
    tocPlugin(),
    docs({ root: "docs", sidebar: { auto: true, label: "Documentation" }, prevNext: true }),
  ],
});
`;
  await fs.writeFile(
    path.join(previewRoot, "riebeckite.config.ts"),
    source,
    "utf8",
  );
}

async function writePreviewFixtures(previewRoot: string): Promise<void> {
  const contentRoot = path.join(previewRoot, "content");
  await Promise.all(
    [...previewContent].map(async ([relativePath, content]) => {
      const target = path.join(contentRoot, relativePath);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, content, "utf8");
    }),
  );
}

async function writePreviewApplication(previewRoot: string): Promise<void> {
  await fs.rm(path.join(previewRoot, "app", "routes", "[slug{.+}].tsx"), {
    force: true,
  });
  await Promise.all(
    [...previewApplication].map(async ([relativePath, content]) => {
      const target = path.join(previewRoot, relativePath);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, content, "utf8");
    }),
  );
}

async function writePreviewViteConfig(previewRoot: string): Promise<void> {
  const [build, core, honoxIntegration, honox, vite] = await Promise.all([
    resolveModuleSpecifier("@hono/vite-build/node"),
    resolveModuleSpecifier("@riebeckite/core"),
    resolveModuleSpecifier("@riebeckite/honox"),
    resolveModuleSpecifier("honox/vite"),
    resolveModuleSpecifier("vite"),
  ]);
  const source = `import build from ${JSON.stringify(build)};
import { riebeckiteVite } from ${JSON.stringify(honoxIntegration)};
import honox from ${JSON.stringify(honox)};
import { defineConfig } from ${JSON.stringify(vite)};

export default defineConfig({
  resolve: { alias: { "@riebeckite/core": ${JSON.stringify(core)} } },
  plugins: [
    honox({ client: { input: ["/app/client.ts", "/app/style.css"] } }),
    ...riebeckiteVite(),
    build(),
  ],
});
`;
  await fs.writeFile(path.join(previewRoot, "vite.config.ts"), source, "utf8");
}

async function resolveModuleSpecifier(specifier: string): Promise<string> {
  return fileURLToPath(await import.meta.resolve(specifier));
}
