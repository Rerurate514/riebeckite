import fs from "node:fs/promises";
import path from "node:path";
import { startHonoxDevServer } from "@riebeckite/honox";
import {
  linkPreviewDependencies,
  resolveModuleSpecifier,
  scaffoldPreviewSite,
  writePreviewViteConfig,
} from "../preview_site.js";
import {
  previewApplication,
  previewContent,
} from "../theme_preview/fixtures.js";
import { assertThemeName } from "./create_theme.js";

type ThemePreviewOptions = {
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
    await scaffoldPreviewSite(previewRoot, `${options.name} preview`);
    await linkPreviewDependencies(previewRoot);
    await writePreviewViteConfig(previewRoot, [
      {
        find: "@riebeckite/core",
        replacement: await resolveModuleSpecifier("@riebeckite/core"),
      },
    ]);
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
  const [core, colorMode, docs, obsidianMarkdown, toc] = await Promise.all([
    resolveModuleSpecifier("@riebeckite/core"),
    resolveModuleSpecifier("@riebeckite/plugin-color-mode"),
    resolveModuleSpecifier("@riebeckite/plugin-docs"),
    resolveModuleSpecifier("@riebeckite/plugin-obsidian-markdown"),
    resolveModuleSpecifier("@riebeckite/plugin-toc"),
  ]);
  const source = `import { defineConfig, type ThemeDefinition } from ${JSON.stringify(core)};
import { colorMode } from ${JSON.stringify(colorMode)};
import { docs } from ${JSON.stringify(docs)};
import { obsidianMarkdown } from ${JSON.stringify(obsidianMarkdown)};
import { toc } from ${JSON.stringify(toc)};
import * as themeModule from ${JSON.stringify(path.join(themeRoot, "index.ts"))};

const themeDefinition = (themeModule.${identifier} ?? Object.values(themeModule).find(
  (value): value is ThemeDefinition => typeof value === "function",
));

if (!themeDefinition) throw new Error("Theme must export a Theme definition.");

export default defineConfig({
  site: { title: ${JSON.stringify(`${name} preview`)}, description: "Isolated Theme preview", baseUrl: "", locale: "en" },
  content: { directory: "content" },
  theme: themeDefinition(),
  plugins: [
    obsidianMarkdown(),
    colorMode(),
    toc(),
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
