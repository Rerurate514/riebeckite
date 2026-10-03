import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { riebeckiteVite } from "../../index.js";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../..",
);
export const workParent = path.join(repoRoot, "apps", "web", ".riebeckite");
const appRequire = createRequire(
  path.join(repoRoot, "apps", "web", "package.json"),
);

const { build, defineConfig } = (await import(
  pathToFileURL(appRequire.resolve("vite")).href
)) as {
  build: (config: unknown) => Promise<unknown>;
  defineConfig: (config: unknown) => unknown;
};
const { default: honox } = (await import(
  pathToFileURL(appRequire.resolve("honox/vite")).href
)) as { default: (options?: unknown) => unknown };
const { default: viteBuild } = (await import(
  pathToFileURL(
    path.join(
      repoRoot,
      "apps",
      "web",
      "node_modules",
      "@hono",
      "vite-build",
      "dist",
      "adapter",
      "node",
      "index.mjs",
    ),
  ).href
)) as { default: () => unknown };

const alias = [
  {
    find: /^@riebeckite\/core$/,
    replacement: path.join(repoRoot, "packages", "core", "index.ts"),
  },
  {
    find: /^@riebeckite\/honox\/server$/,
    replacement: path.join(
      repoRoot,
      "packages",
      "integrations",
      "honox",
      "server.ts",
    ),
  },
  {
    find: /^@riebeckite\/honox$/,
    replacement: path.join(
      repoRoot,
      "packages",
      "integrations",
      "honox",
      "index.ts",
    ),
  },
];

export type SiteSources = {
  readonly title: string;
  readonly renderTag: string;
  readonly noteCount: number;
  readonly editedNotes: readonly number[];
  readonly buildDirectory?: string;
  readonly generatedAsset?: {
    readonly path: string;
    readonly content: string;
  };
  readonly contentAsset?: {
    readonly path: string;
    readonly content: string;
  };
  readonly publicFiles?: Readonly<Record<string, string>>;
  readonly duplicateGeneratedOutput?: boolean;
};

export type Metrics = Record<string, number | boolean | null>;

export function noteSlug(index: number): string {
  return `notes/note-${index}`;
}

export function notePath(siteRoot: string, index: number): string {
  return path.join(siteRoot, "vault", `${noteSlug(index)}.md`);
}

export function distPath(siteRoot: string): string {
  return path.join(siteRoot, "dist");
}

export function cachePath(siteRoot: string): string {
  return path.join(siteRoot, ".riebeckite", "ssg-output-cache.json");
}

export function contentStatePath(siteRoot: string): string {
  return path.join(siteRoot, ".riebeckite", "build", "content-state.json");
}

export function pluginCachePath(siteRoot: string): string {
  return path.join(siteRoot, ".riebeckite", "cache");
}

export function persistentStatePaths(siteRoot: string): readonly string[] {
  return [
    pluginCachePath(siteRoot),
    contentStatePath(siteRoot),
    cachePath(siteRoot),
  ];
}

export async function writeNote(
  siteRoot: string,
  index: number,
  edited: boolean,
): Promise<void> {
  const file = notePath(siteRoot, index);
  await mkdir(path.dirname(file), { recursive: true });
  const lines = [
    "---",
    `title: Note ${index}`,
    "visibility: public",
    `tags: ["tag${index}"]`,
    "---",
    "",
    `# Note ${index}`,
    "",
    `Body ${index}.`,
    "",
  ];
  if (edited) lines.push(`Edited note ${index}.`, "");
  await writeFile(file, lines.join("\n"), "utf8");
}

export function renderSource(renderTag: string): string {
  return [
    "export function pageShell(",
    "  body: string,",
    "  config: { site: { title: string } },",
    "): string {",
    "  return (",
    "    '<!doctype html><html><head><title>' +",
    "    config.site.title +",
    `    ' ${renderTag}</title></head><body>' +`,
    "    body +",
    "    '</body></html>'",
    "  );",
    "}",
    "",
  ].join("\n");
}

function serverSource(): string {
  return [
    'import { Hono } from "hono";',
    'import { ssgParams } from "hono/ssg";',
    "import {",
    "  resolveRiebeckiteRoute,",
    "  riebeckiteSsgParams,",
    '} from "@riebeckite/honox/server";',
    'import { content } from "./content";',
    'import { config } from "./config";',
    'import { pageShell } from "./render";',
    "const app = new Hono();",
    'app.get("/", (c) => c.html(pageShell("home", config)));',
    "app.get(",
    '  "/feed.xml",',
    "  (c) =>",
    "    c.body(",
    '      "<feed><title>" + config.site.title + "</title></feed>",',
    "      200,",
    '      { "Content-Type": "application/xml" },',
    "    ),",
    ");",
    'app.get("/archive/first", (c) => c.html(pageShell("archive", config)));',
    'app.get("/404", (c) => c.html(pageShell("not found", config), 404));',
    "app.get(",
    '  "/:slug{.+}",',
    "  ssgParams(() => riebeckiteSsgParams(content)),",
    "  async (c) => {",
    "    const route = await resolveRiebeckiteRoute(content, c.req.path);",
    "    if (!route) return c.notFound();",
    '    if (route.kind === "redirect") {',
    "      return c.redirect(route.location, route.status);",
    "    }",
    '    if (route.kind === "page") {',
    "      return c.html(pageShell(route.page.body, config));",
    "    }",
    "    const post = await content.getProcessedContent(route.entry.slug);",
    "    return c.html(pageShell(post.html, config));",
    "  },",
    ");",
    'app.notFound((c) => c.html(pageShell("not found", config), 404));',
    "export default app;",
    "export { config, content };",
    "",
  ].join("\n");
}

export function configSource(siteRoot: string, sources: SiteSources): string {
  const asset = sources.generatedAsset;
  const contentAsset = sources.contentAsset;
  const lines = [
    'import { defineConfig, definePlugin } from "@riebeckite/core";',
    "const demo = definePlugin({",
    '  name: "demo",',
    "  pageTypes: [",
    "    {",
    '      id: "demo-explore",',
    '      paths: ["/explore"],',
    '      outputDependencies: [{ type: "global" }],',
    "      resolve: ({ pathname, config }) =>",
    '        pathname === "/explore"',
    "          ? {",
    '              type: "demo-explore",',
    "              pathname,",
    "              body:",
    '                "<p>explore " + config.site.title + "</p>",',
    "            }",
    "          : null,",
    "    },",
    "  ],",
    "  buildEnd: ({ output }) => {",
    "    output.emit({",
    '      path: "custom.json",',
    "      content: JSON.stringify({ ok: true }),",
    '      dependencies: [{ type: "global" }],',
    "    });",
  ];
  if (asset) {
    lines.push(
      "    output.emit({",
      `      path: ${JSON.stringify(asset.path)},`,
      `      content: ${JSON.stringify(asset.content)},`,
      '      dependencies: [{ type: "global" }],',
      "    });",
    );
  }
  if (contentAsset) {
    lines.push(
      "    output.emitAsset({",
      `      path: ${JSON.stringify(contentAsset.path)},`,
      `      content: ${JSON.stringify(contentAsset.content)},`,
      '      dependencies: [{ type: "global" }],',
      "    });",
    );
  }
  lines.push("  },", "});");
  if (asset && sources.duplicateGeneratedOutput) {
    lines.push(
      "const duplicate = definePlugin({",
      '  name: "duplicate",',
      "  buildEnd: ({ output }) => {",
      "    output.emit({",
      `      path: ${JSON.stringify(asset.path)},`,
      '      content: "DUPLICATE",',
      '      dependencies: [{ type: "global" }],',
      "    });",
      "  },",
      "});",
    );
  }
  lines.push(
    "export default defineConfig({",
    ...(sources.buildDirectory
      ? [`  buildDirectory: ${JSON.stringify(sources.buildDirectory)},`]
      : []),
    `  site: { title: ${JSON.stringify(sources.title)} },`,
    "  content: {",
    `    directory: ${JSON.stringify(path.join(siteRoot, "vault"))},`,
    '    filters: { publishStrategy: "selective" },',
    "  },",
    "  cache: {",
    "    enabled: true,",
    `    directory: ${JSON.stringify(path.join(siteRoot, ".riebeckite", "cache"))},`,
    "  },",
    `  plugins: [demo${asset && sources.duplicateGeneratedOutput ? ", duplicate" : ""}],`,
    "});",
    "",
  );
  return lines.join("\n");
}

export async function createSite(
  siteRoot: string,
  sources: SiteSources,
): Promise<void> {
  await mkdir(path.join(siteRoot, "app", "routes"), { recursive: true });
  await writeFile(
    path.join(siteRoot, "package.json"),
    JSON.stringify({ type: "module", private: true }),
  );
  await writeFile(path.join(siteRoot, "app", "client.ts"), "");
  await writeFile(
    path.join(siteRoot, "riebeckite.config.ts"),
    configSource(siteRoot, sources),
  );
  const configLines = [
    'import { resolveConfigModule } from "@riebeckite/core";',
    'import * as rawConfigModule from "../riebeckite.config";',
    "const resolvedConfig = resolveConfigModule(rawConfigModule);",
    "export const config = {",
    "  ...resolvedConfig,",
    ...(sources.buildDirectory
      ? [`  buildDirectory: ${JSON.stringify(sources.buildDirectory)},`]
      : []),
    "};",
    "",
  ];
  await writeFile(
    path.join(siteRoot, "app", "config.ts"),
    configLines.join("\n"),
  );
  await writeFile(
    path.join(siteRoot, "app", "content.ts"),
    [
      'import { ContentManager } from "@riebeckite/core";',
      'import { config } from "./config";',
      "export const content = new ContentManager(",
      "  config.content.directory,",
      "  config.content.exclude,",
      "  { config, plugins: config.plugins },",
      ");",
      "",
    ].join("\n"),
  );
  await writeFile(
    path.join(siteRoot, "app", "render.ts"),
    renderSource(sources.renderTag),
  );
  await writeFile(path.join(siteRoot, "app", "server.ts"), serverSource());
  await writeFile(
    path.join(siteRoot, "app", "routes", "_renderer.tsx"),
    [
      'import { jsxRenderer } from "hono/jsx-renderer";',
      "export default jsxRenderer(({ children }) => (",
      "  <html><body>{children}</body></html>",
      "));",
      "",
    ].join("\n"),
  );
  await writeFile(
    path.join(siteRoot, "app", "routes", "index.tsx"),
    [
      'import { createRoute } from "honox/factory";',
      "export default createRoute((c) => c.render(<main>bench</main>));",
      "",
    ].join("\n"),
  );
  for (const [relativePath, content] of Object.entries(
    sources.publicFiles ?? {},
  )) {
    const file = path.join(siteRoot, "public", relativePath);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, content, "utf8");
  }
  for (let index = 0; index < sources.noteCount; index++) {
    await writeNote(siteRoot, index, sources.editedNotes.includes(index));
  }
}

export async function buildSite(
  siteRoot: string,
  label: string,
  options: { adapter?: boolean; emptyOutDir?: boolean } = {},
): Promise<Metrics> {
  const metricsDirectory = path.join(siteRoot, ".riebeckite", "metrics");
  await mkdir(metricsDirectory, { recursive: true });
  const metricsFile = path.join(metricsDirectory, `${label}.json`);
  process.env.RIEBECKITE_SSG_METRICS_FILE = metricsFile;
  await build(
    defineConfig({
      root: siteRoot,
      resolve: { alias },
      plugins: [
        honox({
          client: { input: ["/app/client.ts"] },
          islandComponents: { reactApiImportSource: "hono/jsx" },
        }),
        ...riebeckiteVite(),
        ...(options.adapter === false ? [] : [viteBuild()]),
      ],
      logLevel: "silent",
      build: {
        minify: false,
        ...(options.emptyOutDir === undefined
          ? {}
          : { emptyOutDir: options.emptyOutDir }),
      },
    }),
  );
  return JSON.parse(await readFile(metricsFile, "utf8")) as Metrics;
}

export function diffSnapshotKeys(
  left: Record<string, string>,
  right: Record<string, string>,
): string[] {
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  return [...keys].filter((key) => left[key] !== right[key]).sort();
}

export async function incrementalBuild(
  siteRoot: string,
  label: string,
  options: { adapter?: boolean; emptyOutDir?: boolean } = {},
): Promise<Metrics> {
  await rm(distPath(siteRoot), { recursive: true, force: true });
  return buildSite(siteRoot, label, options);
}

export async function snapshotTree(
  root: string,
): Promise<Record<string, string>> {
  const snapshot: Record<string, string> = {};
  async function walk(directory: string): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true }).catch(
      () => [],
    );
    for (const entry of entries) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile()) {
        const key = path.relative(root, full).replaceAll("\\", "/");
        snapshot[key] = (await readFile(full)).toString("base64");
      }
    }
  }
  await walk(root);
  return snapshot;
}
