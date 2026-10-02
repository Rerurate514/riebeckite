import assert from "node:assert/strict";
import {
  appendFile,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { riebeckiteVite } from "../index.js";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);
const workParent = path.join(repoRoot, "apps", "web", ".riebeckite");
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

type SiteSources = {
  readonly title: string;
  readonly renderTag: string;
  readonly noteCount: number;
  readonly editedNotes: readonly number[];
};

type Metrics = Record<string, number | boolean | null>;

function noteSlug(index: number): string {
  return `notes/note-${index}`;
}

function notePath(siteRoot: string, index: number): string {
  return path.join(siteRoot, "vault", `${noteSlug(index)}.md`);
}

function distPath(siteRoot: string): string {
  return path.join(siteRoot, "dist");
}

function cachePath(siteRoot: string): string {
  return path.join(siteRoot, ".riebeckite", "ssg-output-cache.json");
}

async function writeNote(
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

function renderSource(renderTag: string): string {
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

function configSource(siteRoot: string, sources: SiteSources): string {
  return [
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
    "  },",
    "});",
    "export default defineConfig({",
    `  site: { title: ${JSON.stringify(sources.title)} },`,
    "  content: {",
    `    directory: ${JSON.stringify(path.join(siteRoot, "vault"))},`,
    '    filters: { publishStrategy: "selective" },',
    "  },",
    "  cache: {",
    "    enabled: true,",
    `    directory: ${JSON.stringify(path.join(siteRoot, ".riebeckite", "cache"))},`,
    "  },",
    "  plugins: [demo],",
    "});",
    "",
  ].join("\n");
}

async function createSite(
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
  await writeFile(
    path.join(siteRoot, "app", "config.ts"),
    [
      'import { resolveConfigModule } from "@riebeckite/core";',
      'import * as rawConfigModule from "../riebeckite.config";',
      "export const config = resolveConfigModule(rawConfigModule);",
      "",
    ].join("\n"),
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
  for (let index = 0; index < sources.noteCount; index++) {
    await writeNote(siteRoot, index, sources.editedNotes.includes(index));
  }
}

async function buildSite(siteRoot: string, label: string): Promise<Metrics> {
  const metricsDirectory = path.join(siteRoot, ".riebeckite", "metrics");
  await mkdir(metricsDirectory, { recursive: true });
  const metricsFile = path.join(metricsDirectory, `${label}.json`);
  process.env.RIEBECKITE_SSG_METRICS_FILE = metricsFile;
  await build(
    defineConfig({
      root: siteRoot,
      resolve: { alias },
      plugins: [
        honox({ client: { input: ["/app/client.ts"] } }),
        ...riebeckiteVite(),
        viteBuild(),
      ],
      logLevel: "silent",
      build: { minify: false },
    }),
  );
  return JSON.parse(await readFile(metricsFile, "utf8")) as Metrics;
}

function diffSnapshotKeys(
  left: Record<string, string>,
  right: Record<string, string>,
): string[] {
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  return [...keys].filter((key) => left[key] !== right[key]).sort();
}

async function incrementalBuild(
  siteRoot: string,
  label: string,
): Promise<Metrics> {
  await rm(distPath(siteRoot), { recursive: true, force: true });
  return buildSite(siteRoot, label);
}

async function snapshotTree(root: string): Promise<Record<string, string>> {
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

test("incremental SSG matches a clean cold build", async (t) => {
  await mkdir(workParent, { recursive: true });
  const root = await mkdtemp(path.join(workParent, "incremental-ssg-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));

  const inc = path.join(root, "inc");
  let sources: SiteSources = {
    title: "Incremental",
    renderTag: "v1",
    noteCount: 2,
    editedNotes: [],
  };
  await createSite(inc, sources);

  const coldMetrics = await buildSite(inc, "cold");
  const coldSnapshot = await snapshotTree(distPath(inc));
  assert.equal(coldMetrics.fullRegenerationRequired, true);
  for (const required of [
    "index.html",
    "feed.xml",
    "archive/first.html",
    "404.html",
    "notes/note-0.html",
    "notes/note-1.html",
    "explore.html",
    "custom.json",
  ]) {
    assert.ok(
      Object.hasOwn(coldSnapshot, required),
      `cold build missing ${required}`,
    );
  }
  const coldCache = JSON.parse(await readFile(cachePath(inc), "utf8")) as {
    appFingerprint?: string;
    outputs: Record<string, unknown>;
  };
  assert.equal(typeof coldCache.appFingerprint, "string");
  assert.ok(Object.hasOwn(coldCache.outputs, "index.html"));
  assert.ok(Object.hasOwn(coldCache.outputs, "custom.json"));

  await rm(path.join(inc, ".riebeckite"), { recursive: true, force: true });
  await rm(path.join(inc, "vault", ".riebeckite"), {
    recursive: true,
    force: true,
  });
  await rm(distPath(inc), { recursive: true, force: true });
  await buildSite(inc, "cold-again");
  const coldAgainSnapshot = await snapshotTree(distPath(inc));
  assert.deepEqual(
    diffSnapshotKeys(coldSnapshot, coldAgainSnapshot),
    [],
    "two clean cold builds must be byte-identical",
  );

  async function compareAgainstColdBuild(label: string): Promise<void> {
    const incremental = await snapshotTree(distPath(inc));
    await rm(path.join(inc, ".riebeckite"), { recursive: true, force: true });
    await rm(path.join(inc, "vault", ".riebeckite"), {
      recursive: true,
      force: true,
    });
    await rm(distPath(inc), { recursive: true, force: true });
    await buildSite(inc, `cold-after-${label}`);
    const rebuilt = await snapshotTree(distPath(inc));
    assert.deepEqual(
      diffSnapshotKeys(incremental, rebuilt),
      [],
      `${label}: incremental dist must equal a clean cold dist`,
    );
  }

  await rm(distPath(inc), { recursive: true, force: true });
  const noChangeMetrics = await buildSite(inc, "no-change");
  assert.deepEqual(await snapshotTree(distPath(inc)), coldSnapshot);
  assert.equal(noChangeMetrics.fullRegenerationRequired, false);
  assert.equal(noChangeMetrics.affectedOutputCount, 0);
  assert.equal(noChangeMetrics.unchangedOutputCount, sources.noteCount + 2);
  assert.equal(
    noChangeMetrics.reusedOutputCount,
    noChangeMetrics.unchangedOutputCount,
  );
  assert.equal(noChangeMetrics.skippedRouteCount, sources.noteCount + 1);

  await appendFile(notePath(inc, 0), "\nEdited note 0.\n", "utf8");
  sources = { ...sources, editedNotes: [0] };
  const editMetrics = await incrementalBuild(inc, "edit");
  await compareAgainstColdBuild("edit");
  assert.equal(editMetrics.fullRegenerationRequired, false);
  assert.equal(editMetrics.affectedOutputCount, 3);
  assert.equal(editMetrics.reusedOutputCount, editMetrics.unchangedOutputCount);

  await writeNote(inc, sources.noteCount, false);
  sources = { ...sources, noteCount: sources.noteCount + 1 };
  const addMetrics = await incrementalBuild(inc, "add");
  await compareAgainstColdBuild("add");
  assert.equal(addMetrics.fullRegenerationRequired, false);
  assert.equal(addMetrics.affectedOutputCount, 3);

  await rm(notePath(inc, sources.noteCount - 1));
  sources = {
    ...sources,
    noteCount: sources.noteCount - 1,
    editedNotes: sources.editedNotes.filter(
      (index) => index < sources.noteCount - 1,
    ),
  };
  const deleteMetrics = await incrementalBuild(inc, "delete");
  await compareAgainstColdBuild("delete");
  assert.equal(deleteMetrics.fullRegenerationRequired, false);
  assert.ok(Number(deleteMetrics.removedOutputCount) >= 1);

  await writeFile(path.join(inc, "app", "render.ts"), renderSource("v2"));
  sources = { ...sources, renderTag: "v2" };
  const appMetrics = await incrementalBuild(inc, "app-change");
  await compareAgainstColdBuild("app-change");
  assert.equal(appMetrics.fullRegenerationRequired, true);

  await writeFile(
    path.join(inc, "riebeckite.config.ts"),
    configSource(inc, { ...sources, title: "Changed" }),
  );
  sources = { ...sources, title: "Changed" };
  const configMetrics = await incrementalBuild(inc, "config-change");
  await compareAgainstColdBuild("config-change");
  assert.equal(configMetrics.fullRegenerationRequired, true);

  await rm(cachePath(inc), { force: true });
  const missingMetrics = await incrementalBuild(inc, "missing-cache");
  await compareAgainstColdBuild("missing-cache");
  assert.equal(missingMetrics.fullRegenerationRequired, true);

  await writeFile(cachePath(inc), "{ not valid json", "utf8");
  const malformedMetrics = await incrementalBuild(inc, "malformed-cache");
  await compareAgainstColdBuild("malformed-cache");
  assert.equal(malformedMetrics.fullRegenerationRequired, true);

  await writeNote(inc, sources.noteCount, false);
  sources = { ...sources, noteCount: sources.noteCount + 1 };
  await buildSite(inc, "stale-prep");
  await rm(notePath(inc, sources.noteCount - 1));
  const removedNoteIndex = sources.noteCount - 1;
  sources = {
    ...sources,
    noteCount: sources.noteCount - 1,
    editedNotes: sources.editedNotes.filter(
      (index) => index < removedNoteIndex,
    ),
  };
  const staleMetrics = await buildSite(inc, "stale-delete");
  const staleSnapshot = await snapshotTree(distPath(inc));
  assert.ok(
    !Object.hasOwn(staleSnapshot, `notes/note-${removedNoteIndex}.html`),
    "incremental build must delete removed outputs from a populated dist",
  );
  assert.ok(Number(staleMetrics.removedOutputCount) >= 1);

  const finalSnapshot = await snapshotTree(distPath(inc));
  assert.ok(Object.hasOwn(finalSnapshot, "index.html"));
  assert.ok(Object.hasOwn(finalSnapshot, "404.html"));
  assert.ok(Object.hasOwn(finalSnapshot, "explore.html"));
  assert.ok(Object.hasOwn(finalSnapshot, "custom.json"));
});
