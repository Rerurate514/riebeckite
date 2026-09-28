#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..");
const fixtureRoot = path.join(here, "fixture");

const PACKAGES = [
  { directory: "packages/core", name: "@riebeckite/core" },
  { directory: "packages/cli", name: "@riebeckite/cli" },
  { directory: "packages/integrations/honox", name: "@riebeckite/honox" },
  { directory: "packages/themes/default", name: "@riebeckite/theme-default" },
  {
    directory: "packages/plugins/obsidian-markdown",
    name: "@riebeckite/plugin-obsidian-markdown",
  },
  {
    directory: "packages/plugins/d2",
    name: "@riebeckite/plugin-d2",
  },
  {
    directory: "packages/plugins/autocardlink",
    name: "@riebeckite/plugin-autocardlink",
  },
  {
    directory: "packages/plugins/attachment",
    name: "@riebeckite/plugin-attachment",
  },
  {
    directory: "packages/plugins/code-annotations",
    name: "@riebeckite/plugin-code-annotations",
  },
  {
    directory: "packages/plugins/highlight",
    name: "@riebeckite/plugin-highlight",
  },
  { directory: "packages/plugins/toc", name: "@riebeckite/plugin-toc" },
  {
    directory: "packages/plugins/backlinks",
    name: "@riebeckite/plugin-backlinks",
  },
  {
    directory: "packages/plugins/canvas",
    name: "@riebeckite/plugin-canvas",
  },
  { directory: "packages/plugins/query", name: "@riebeckite/plugin-query" },
  { directory: "packages/plugins/alias", name: "@riebeckite/plugin-alias" },
  { directory: "packages/plugins/kanban", name: "@riebeckite/plugin-kanban" },
  {
    directory: "packages/plugins/dataview",
    name: "@riebeckite/plugin-dataview",
  },
  {
    directory: "packages/plugins/properties",
    name: "@riebeckite/plugin-properties",
  },
  {
    directory: "packages/plugins/recent-posts",
    name: "@riebeckite/plugin-recent-posts",
  },
  {
    directory: "packages/plugins/related-posts",
    name: "@riebeckite/plugin-related-posts",
  },
  {
    directory: "packages/plugins/responsive-image",
    name: "@riebeckite/plugin-responsive-image",
  },
  {
    directory: "packages/plugins/rich-embed",
    name: "@riebeckite/plugin-rich-embed",
  },
  { directory: "packages/plugins/search", name: "@riebeckite/plugin-search" },
  {
    directory: "packages/plugins/diagnostics",
    name: "@riebeckite/plugin-diagnostics",
  },
  {
    directory: "packages/plugins/plantuml",
    name: "@riebeckite/plugin-plantuml",
  },
  { directory: "packages/plugins/series", name: "@riebeckite/plugin-series" },
  {
    directory: "packages/plugins/analytics",
    name: "@riebeckite/plugin-analytics",
  },
  { directory: "packages/plugins/media", name: "@riebeckite/plugin-media" },
  {
    directory: "packages/plugins/graphviz",
    name: "@riebeckite/plugin-graphviz",
  },
  {
    directory: "packages/plugins/chartjs",
    name: "@riebeckite/plugin-chartjs",
  },
  {
    directory: "packages/plugins/hover-preview",
    name: "@riebeckite/plugin-hover-preview",
  },
  {
    directory: "packages/plugins/flashcards",
    name: "@riebeckite/plugin-flashcards",
  },
  {
    directory: "packages/plugins/shortcodes",
    name: "@riebeckite/plugin-shortcodes",
  },
  {
    directory: "packages/plugins/vega-lite",
    name: "@riebeckite/plugin-vega-lite",
  },
  {
    directory: "packages/create-riebeckite",
    name: "create-riebeckite",
  },
];

const HOME_MARKER = "RIEBECKITE_EXTERNAL_HOME_MARKER";
const NOTE_MARKER = "RIEBECKITE_EXTERNAL_NOTE_MARKER";
const QUERY_MARKER = "RIEBECKITE_EXTERNAL_QUERY_MARKER";
const DATAVIEW_NOTE_TITLE = "Dataview Alpha";
const PROPERTY_MARKER = "RIEBECKITE_EXTERNAL_PROPERTY_MARKER";
const KANBAN_MARKER = "RIEBECKITE_EXTERNAL_KANBAN_MARKER";
const KANBAN_BLOCK_MARKER = "RIEBECKITE_EXTERNAL_KANBAN_BLOCK_MARKER";
const SITE_COMPONENT_MARKER = "RIEBECKITE_SITE_COMPONENT_MARKER";
const SITE_ISLAND_MARKER = "RIEBECKITE_SITE_ISLAND_MARKER";
const LOCAL_PLUGIN_MARKER = "RIEBECKITE_EXTERNAL_LOCAL_PLUGIN_MARKER";
const PRIVATE_MARKER = "RIEBECKITE_EXTERNAL_PRIVATE_MARKER";
const HOVER_PREVIEW_TITLE_MARKER = "Hover Preview Alpha Note";
const FLASHCARDS_MARKER = "RIEBECKITE_EXTERNAL_FLASHCARDS_MARKER";
const FLASHCARDS_CLIENT_IDENTIFIER = "rb-flashcards";
const CODE_ANNOTATIONS_MARKER = "RIEBECKITE_EXTERNAL_CODE_ANNOTATIONS_MARKER";
const SHORTCODE_MARKER = "RIEBECKITE_EXTERNAL_SHORTCODE_MARKER";
const CANVAS_MARKER = "RIEBECKITE_EXTERNAL_CANVAS_MARKER";
const RICHEMBED_MARKER = "RIEBECKITE_EXTERNAL_RICHEMBED_MARKER";
const CHARTJS_MARKER = "RIEBECKITE_EXTERNAL_CHARTJS_MARKER";
const PLANTUML_MARKER = "RIEBECKITE_EXTERNAL_PLANTUML_MARKER";
const ALIAS_MARKER = "RIEBECKITE_EXTERNAL_ALIAS_MARKER";
const HIGHLIGHT_MARKER = "RIEBECKITE_EXTERNAL_HIGHLIGHT_MARKER";
const SERIES_MARKER = "RIEBECKITE_EXTERNAL_SERIES_MARKER";
const SERIES_PART_1_PERMALINK = "/notes/series-demo-1";
const SERIES_PART_2_PERMALINK = "/notes/series-demo-2";
const ANALYTICS_SCRIPT_PATH = "/_analytics.js";
const ANALYTICS_SCRIPT_ATTRIBUTE = "data-riebeckite-analytics";
const D2_MARKER = "RIEBECKITE_EXTERNAL_D2_MARKER";
const GRAPHVIZ_MARKER = "RIEBECKITE_EXTERNAL_GRAPHVIZ_MARKER";
const VEGALITE_MARKER = "RIEBECKITE_EXTERNAL_VEGALITE_MARKER";

const step = (message) => console.log(`\n[external-site] ${message}`);
const fail = (message) => {
  throw new Error(message);
};

function quote(value) {
  const text = String(value);
  return /[\s"]/.test(text) ? `"${text.replace(/"/g, '\\"')}"` : text;
}

function run(command, args, options = {}) {
  const line = [command, ...args].map(quote).join(" ");
  const result = spawnSync(line, {
    shell: true,
    cwd: options.cwd ?? repoRoot,
    env: { ...process.env, ...options.env },
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
  });

  if (result.error) {
    fail(`Failed to run: ${line}\n${result.error.message}`);
  }
  if (result.status !== 0 && !options.allowFailure) {
    fail(
      `Command failed (exit ${result.status}): ${line}\n` +
        `--- stdout ---\n${result.stdout ?? ""}\n` +
        `--- stderr ---\n${result.stderr ?? ""}`,
    );
  }
  return result;
}

function walkFiles(root, predicate = () => true) {
  const found = [];
  if (!fs.existsSync(root)) return found;
  const stack = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (predicate(full)) {
        found.push(full);
      }
    }
  }
  return found;
}

function extractHoverPreviewPayload(html) {
  const matches = html.matchAll(
    /<script[^>]*data-rb-hover-preview[^>]*>([\s\S]*?)<\/script>/g,
  );
  return [...matches].map((match) => match[1] ?? "").join("\n");
}

function packPackages(tarballDir) {
  step(`packing ${PACKAGES.length} packages with pnpm pack`);
  const packed = new Map();

  for (const pkg of PACKAGES) {
    const packageDir = path.join(repoRoot, pkg.directory);
    if (!fs.existsSync(packageDir)) {
      fail(`Package directory is missing: ${pkg.directory}`);
    }
    const manifest = JSON.parse(
      fs.readFileSync(path.join(packageDir, "package.json"), "utf8"),
    );
    run("pnpm", ["pack", "--pack-destination", tarballDir], {
      cwd: packageDir,
    });

    const sanitized = pkg.name.replace(/^@/, "").replace(/\//g, "-");
    const tarball = path.join(
      tarballDir,
      `${sanitized}-${manifest.version}.tgz`,
    );
    if (!fs.existsSync(tarball)) {
      fail(`pnpm pack did not produce the expected tarball: ${tarball}`);
    }
    packed.set(pkg.name, { tarball, version: manifest.version });
    console.log(`  packed ${pkg.name} -> ${path.basename(tarball)}`);
  }

  return packed;
}

function writeSitePackageJson(siteDir, packed) {
  const manifestPath = path.join(siteDir, "package.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  manifest.dependencies = { ...manifest.dependencies };
  manifest.devDependencies = { ...manifest.devDependencies };
  manifest.overrides = { ...manifest.overrides };

  for (const [name, info] of packed) {
    const fileSpec = `file:${path
      .relative(siteDir, info.tarball)
      .split(path.sep)
      .join("/")}`;
    if (name in manifest.devDependencies) {
      manifest.devDependencies[name] = fileSpec;
    } else {
      manifest.dependencies[name] = fileSpec;
    }
    manifest.overrides[name] = fileSpec;
  }

  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

function writeExternalConsumerTsconfig(siteDir) {
  step("layering the external-consumer type libraries (vite/client)");
  const configPath = path.join(siteDir, "tsconfig.json");
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  const types = new Set(config.compilerOptions?.types ?? []);
  types.add("node");
  types.add("vite/client");
  config.compilerOptions = { ...config.compilerOptions, types: [...types] };
  config.exclude = ["typecheck/development-riebeckite-modules.d.ts"];
  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);

  const nodeNextConfigPath = path.join(siteDir, "tsconfig.nodenext.json");
  const nodeNextConfig = JSON.parse(
    fs.readFileSync(nodeNextConfigPath, "utf8"),
  );
  nodeNextConfig.include = ["typecheck/nodenext.ts"];
  fs.writeFileSync(
    nodeNextConfigPath,
    `${JSON.stringify(nodeNextConfig, null, 2)}\n`,
  );

  const written = JSON.parse(fs.readFileSync(configPath, "utf8"));
  const effective = new Set(written.compilerOptions?.types ?? []);
  if (!effective.has("vite/client")) {
    fail("external-consumer tsconfig is missing the vite/client type library");
  }
  console.log(`  site/tsconfig.json types: ${[...effective].join(", ")}`);
}

function assertDeclaredDependencies(siteDir) {
  step("checking the site for undeclared (hoisted) dependencies");
  run(process.execPath, [
    path.join(repoRoot, "scripts", "check_dependencies.mjs"),
    siteDir,
  ]);
}

function assertNoMonorepoEscapeHatches(siteDir) {
  step("checking the site for monorepo escape hatches");
  const manifest = JSON.parse(
    fs.readFileSync(path.join(siteDir, "package.json"), "utf8"),
  );
  if (JSON.stringify(manifest).includes("workspace:")) {
    fail("site/package.json must not contain `workspace:` protocol references");
  }

  const sourceFiles = walkFiles(siteDir, (full) => {
    const rel = path.relative(siteDir, full);
    if (rel.startsWith(`node_modules${path.sep}`)) return false;
    if (rel.startsWith(`dist${path.sep}`)) return false;
    return /\.(ts|tsx|mts|cts|js|mjs|json)$/.test(full);
  });

  for (const file of sourceFiles) {
    const contents = fs.readFileSync(file, "utf8");
    if (contents.includes("workspace:")) {
      fail(`${path.relative(siteDir, file)} contains \`workspace:\``);
    }
    if (/\.\.\/\.\.\/(\.\.\/)*packages\//.test(contents)) {
      fail(
        `${path.relative(siteDir, file)} reaches into the monorepo \`packages/\``,
      );
    }
  }

  if (fs.existsSync(path.join(siteDir, "packages"))) {
    fail("site must not contain a `packages/` directory");
  }
}

function assertIsolatedInstall(siteDir, tempRoot) {
  step("verifying standalone install (no pnpm/monorepo inheritance)");

  const relativeToRepo = path.relative(repoRoot, tempRoot);
  const insideRepo =
    relativeToRepo === "" ||
    (!relativeToRepo.startsWith("..") && !path.isAbsolute(relativeToRepo));
  if (insideRepo) {
    fail("the external workspace must live outside the Riebeckite repository");
  }

  const forbiddenState = [
    path.join(tempRoot, "pnpm-workspace.yaml"),
    path.join(tempRoot, "pnpm-lock.yaml"),
    path.join(siteDir, "pnpm-workspace.yaml"),
    path.join(siteDir, "pnpm-lock.yaml"),
    path.join(siteDir, "node_modules", ".pnpm"),
  ];
  for (const file of forbiddenState) {
    if (fs.existsSync(file)) {
      fail(
        `external site must not inherit pnpm workspace state: ${path.relative(
          tempRoot,
          file,
        )}`,
      );
    }
  }

  const nodeModules = path.join(siteDir, "node_modules");
  if (!fs.existsSync(nodeModules)) {
    fail("the isolated install did not create site/node_modules");
  }

  const viteClientTypes = path.join(nodeModules, "vite", "client.d.ts");
  if (!fs.existsSync(viteClientTypes)) {
    fail("vite/client types are missing from the isolated install");
  }

  const tsc = path.join(nodeModules, "typescript", "bin", "tsc");
  if (!fs.existsSync(tsc)) {
    fail("the isolated install has no local TypeScript compiler");
  }

  console.log(
    `  site/node_modules is local; vite/client -> ${path.relative(
      siteDir,
      viteClientTypes,
    )}`,
  );
}

function assertPublishedArtifacts(siteDir) {
  step("verifying @riebeckite/* resolves to installed tarballs only");
  const scopeDir = path.join(siteDir, "node_modules", "@riebeckite");
  if (!fs.existsSync(scopeDir)) {
    fail("no @riebeckite/* packages were installed");
  }

  for (const entry of fs.readdirSync(scopeDir)) {
    const full = path.join(scopeDir, entry);
    const real = fs.realpathSync(full);
    const relativeToRepo = path.relative(repoRoot, real);
    const insideRepo =
      relativeToRepo === "" ||
      (!relativeToRepo.startsWith("..") && !path.isAbsolute(relativeToRepo));
    if (insideRepo) {
      fail(
        `@riebeckite/${entry} resolves into the Riebeckite repository (${real}); ` +
          "the fixture must use installed tarballs only",
      );
    }
    if (fs.lstatSync(full).isSymbolicLink()) {
      fail(
        `@riebeckite/${entry} is a symlink; expected a real installed directory`,
      );
    }
    console.log(`  @riebeckite/${entry} -> ${real}`);
  }
}

function runCli(siteDir, command, cwd = siteDir) {
  step(`riebeckite ${command}`);
  const cli = path.join(
    siteDir,
    "node_modules",
    "@riebeckite",
    "cli",
    "bin",
    "riebeckite.mjs",
  );
  const result = run(process.execPath, [cli, ...command.split(" ")], {
    cwd,
  });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
  if (output) console.log(output);
  return result;
}

function cliText(result) {
  return `${result.stdout ?? ""}${result.stderr ?? ""}`;
}

function runTypecheck(siteDir, project) {
  step(`tsc --noEmit -p ${project}`);
  const tsc = path.join(siteDir, "node_modules", "typescript", "bin", "tsc");
  const result = run(process.execPath, [tsc, "--noEmit", "-p", project], {
    cwd: siteDir,
  });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
  if (output) console.log(output);
  return result;
}

function formatBytes(bytes) {
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  const digits = value >= 10 || unitIndex === 0 ? 0 : 1;
  return `${value.toFixed(digits)} ${units[unitIndex]}`;
}

function assertBuildOutput(siteDir, vaultDir) {
  step("checking generated site output");
  const distDir = path.join(siteDir, "dist");
  if (!fs.existsSync(distDir)) {
    fail("build did not create a dist/ directory");
  }

  const htmlFiles = walkFiles(distDir, (full) => full.endsWith(".html"));
  if (htmlFiles.length === 0) {
    fail("build did not emit any HTML files under dist/");
  }

  const combined = htmlFiles
    .map((file) => fs.readFileSync(file, "utf8"))
    .join("\n");

  if (!combined.includes(HOME_MARKER)) {
    fail(`generated HTML is missing the home marker (${HOME_MARKER})`);
  }
  if (!combined.includes(NOTE_MARKER)) {
    fail(`generated HTML is missing the note marker (${NOTE_MARKER})`);
  }
  if (!combined.includes(QUERY_MARKER)) {
    fail(`generated HTML is missing the query marker (${QUERY_MARKER})`);
  }
  if (!combined.includes(SITE_COMPONENT_MARKER)) {
    fail(
      `generated HTML is missing the site component (${SITE_COMPONENT_MARKER})`,
    );
  }
  if (!combined.includes(SITE_ISLAND_MARKER)) {
    fail(`generated HTML is missing the site island (${SITE_ISLAND_MARKER})`);
  }
  if (!combined.includes('class="article-shell rb-article fixture-article"')) {
    fail("site component did not compose the public Article primitive");
  }
  if (!combined.includes("rr-query__table")) {
    fail("generated HTML is missing the query plugin table output");
  }
  if (!combined.includes("data-rr-query-result")) {
    fail("query placeholder was not replaced with rendered output");
  }
  if (!combined.includes('data-dataview-type="list"')) {
    fail("dataview plugin did not render a LIST result");
  }
  if (!combined.includes('data-dataview-type="table"')) {
    fail("dataview plugin did not render a TABLE result");
  }
  if (!combined.includes('data-dataview-type="task"')) {
    fail("dataview plugin did not render a TASK result");
  }
  if (!combined.includes('data-dataview-type="calendar"')) {
    fail("dataview plugin did not render a CALENDAR result");
  }
  if (!combined.includes("rb-dataview__table")) {
    fail("generated HTML is missing the dataview table output");
  }
  if (!combined.includes("rb-dataview__tasks")) {
    fail("generated HTML is missing the dataview task list output");
  }
  if (!combined.includes('data-task="x"')) {
    fail("dataview task output is missing the completed data-task state");
  }
  if (!combined.includes("rb-dataview__fallback")) {
    fail("dataview output is missing the raw-query fallback");
  }
  if (!combined.includes(DATAVIEW_NOTE_TITLE)) {
    fail("dataview did not render a title from the external vault");
  }
  if (!combined.includes("language-dataviewjs")) {
    fail("dataviewjs code blocks must stay code blocks");
  }
  if (!combined.includes("rb-properties")) {
    fail("generated HTML is missing the properties plugin panel");
  }
  if (!combined.includes('data-property-key="marker"')) {
    fail("properties panel did not render the fixture frontmatter key");
  }
  if (!combined.includes(PROPERTY_MARKER)) {
    fail("properties panel did not render the fixture frontmatter value");
  }
  if (!combined.includes("data-related-posts")) {
    fail("related-posts plugin did not annotate any entry");
  }
  if (!combined.includes('class="rb-related-posts"')) {
    fail("related-posts plugin did not render its navigation container");
  }
  if (!combined.includes("rb-related-posts__link")) {
    fail("related-posts plugin did not render its links");
  }
  if (!combined.includes('data-related-score="')) {
    fail("related-posts plugin did not render related scores");
  }
  if (!combined.includes('href="/notes/related-b"')) {
    fail("related-posts plugin did not link a known related fixture note");
  }
  if (!combined.includes('data-flashcards-count="')) {
    fail("generated HTML is missing the flashcards deck output");
  }
  if (!combined.includes("rb-flashcards__list")) {
    fail("flashcards fallback list was not rendered");
  }
  if (
    !combined.includes('class="rb-flashcards__front"') ||
    !combined.includes('class="rb-flashcards__back"')
  ) {
    fail("flashcards fallback did not expose front and back content");
  }
  if (!combined.includes("data-flashcards-payload")) {
    fail("flashcards payload script was not emitted");
  }
  if (!combined.includes(FLASHCARDS_MARKER)) {
    fail(
      `generated HTML is missing the flashcards fixture card text (${FLASHCARDS_MARKER})`,
    );
  }
  if (!combined.includes(RICHEMBED_MARKER)) {
    fail(`generated HTML is missing the rich embed marker (${RICHEMBED_MARKER})`);
  }
  if (!combined.includes("www.youtube-nocookie.com/embed/")) {
    fail("generated HTML is missing the rich embed YouTube iframe");
  }
  if (!combined.includes(CHARTJS_MARKER)) {
    fail(`generated HTML is missing the chartjs marker (${CHARTJS_MARKER})`);
  }
  if (!combined.includes("data-chartjs-config")) {
    fail("generated HTML is missing the chartjs canvas configuration");
  }
  if (!combined.includes("rb-chartjs")) {
    fail("generated HTML is missing the chartjs figure markup");
  }
  if (!combined.includes(PLANTUML_MARKER)) {
    fail(`generated HTML is missing the PlantUML marker (${PLANTUML_MARKER})`);
  }
  if (!combined.includes("data-plantuml")) {
    fail("generated HTML is missing the PlantUML figure output");
  }
  if (!combined.includes("/svg/")) {
    fail("generated HTML is missing the PlantUML image URL");
  }
  if (!combined.includes(ALIAS_MARKER)) {
    fail(`generated HTML is missing the alias marker (${ALIAS_MARKER})`);
  }
  if (!combined.includes("kind=redirect target=/notes/alias-demo")) {
    fail("an Obsidian alias did not resolve to a redirect route");
  }
  if (!combined.includes(HIGHLIGHT_MARKER)) {
    fail(`generated HTML is missing the highlight marker (${HIGHLIGHT_MARKER})`);
  }
  if (!combined.includes("<mark")) {
    fail("generated HTML is missing the highlight <mark> element");
  }
  if (!combined.includes("rb-highlight")) {
    fail("generated HTML is missing the rb-highlight class");
  }
  // The series marker is fixture-origin now: it is the series name declared in
  // the vault notes, so it flows into the generated `data-series` attribute and
  // the rendered heading instead of a plugin-hardcoded attribute.
  if (!combined.includes("rb-series")) {
    fail("generated HTML is missing the series plugin output");
  }
  if (!combined.includes(`data-series="${SERIES_MARKER}"`)) {
    fail(
      `series navigation is missing the fixture series name (${SERIES_MARKER})`,
    );
  }
  if (!combined.includes(`>${SERIES_MARKER}</a>`)) {
    fail(
      `series heading does not render the fixture-origin marker (${SERIES_MARKER})`,
    );
  }
  if (!combined.includes(`href="${SERIES_PART_1_PERMALINK}"`)) {
    fail(`series navigation is missing part 1 (${SERIES_PART_1_PERMALINK})`);
  }
  if (!combined.includes(`href="${SERIES_PART_2_PERMALINK}"`)) {
    fail(
      `series navigation is missing the part 1 -> part 2 link (${SERIES_PART_2_PERMALINK})`,
    );
  }
  if (!combined.includes('rel="prev"') || !combined.includes('rel="next"')) {
    fail("series navigation is missing the previous/next links");
  }
  if (!combined.includes(ANALYTICS_SCRIPT_PATH)) {
    fail(
      `generated HTML is missing the analytics script path (${ANALYTICS_SCRIPT_PATH})`,
    );
  }
  if (!combined.includes(ANALYTICS_SCRIPT_ATTRIBUTE)) {
    fail(
      `generated HTML is missing the analytics script attribute (${ANALYTICS_SCRIPT_ATTRIBUTE})`,
    );
  }
  if (!combined.includes(GRAPHVIZ_MARKER)) {
    fail(`generated HTML is missing the graphviz marker (${GRAPHVIZ_MARKER})`);
  }
  if (!combined.includes("rb-graphviz")) {
    fail("generated HTML is missing the graphviz plugin output");
  }
  if (!combined.includes('data-graphviz="rendered"')) {
    fail("graphviz diagram was not rendered at build time");
  }
  if (
    !combined.includes('data-attachment-path="attachments/external-guide.pdf"')
  ) {
    fail("attachment plugin did not resolve a file from the external vault");
  }
  if (!combined.includes('class="attachment-card rr-attachment"')) {
    fail("attachment plugin did not expose its stable rr-attachment hook");
  }
  const attachmentSize = formatBytes(
    fs.statSync(path.join(vaultDir, "attachments", "external-guide.pdf")).size,
  );
  if (!combined.includes(`attachment-card__size">${attachmentSize}</span>`)) {
    fail(
      `attachment plugin did not read the external vault file size (expected ${attachmentSize})`,
    );
  }
  if (!combined.includes('class="media-embed rr-media media-embed--audio"')) {
    fail("media plugin did not render an external vault media embed");
  }
  if (!combined.includes('class="search-bar rr-search"')) {
    fail("search plugin did not expose its stable rr-search hook");
  }
  if (!combined.includes("/assets/attachments/media/external-audio.mp3")) {
    fail("external vault media URL was not generated from its logical path");
  }
  if (!combined.includes(VEGALITE_MARKER)) {
    fail(`generated HTML is missing the Vega-Lite marker (${VEGALITE_MARKER})`);
  }
  if (!combined.includes("rb-vega-lite")) {
    fail("generated HTML is missing the Vega-Lite plugin output (rb-vega-lite)");
  }
  if (!combined.includes("data-vega-lite")) {
    fail("Vega-Lite figure is missing the output data attributes");
  }
  if (!combined.includes('class="rb-responsive-image"')) {
    fail("responsive-image plugin did not wrap a marked image in <picture>");
  }
  if (!combined.includes("<picture")) {
    fail("responsive-image plugin did not emit a <picture> element");
  }
  if (!combined.includes('loading="lazy"')) {
    fail('responsive-image plugin did not add loading="lazy"');
  }
  if (!combined.includes('decoding="async"')) {
    fail('responsive-image plugin did not add decoding="async"');
  }
  if (!combined.includes("/attachments/rb-photo-640.webp")) {
    fail("responsive-image plugin did not discover a pre-generated variant");
  }
  if (!combined.includes('srcset="/attachments/rb-photo-640.webp 640w')) {
    fail("responsive-image plugin did not emit a width-described srcset");
  }
  if (!combined.includes("data-kanban-plugin")) {
    fail("generated HTML is missing the kanban plugin board output");
  }
  if (!combined.includes('data-kanban-source="note"')) {
    fail("kanban did not render the auto-detected note board");
  }
  if (!combined.includes('data-kanban-source="block"')) {
    fail("kanban did not render the fenced block board");
  }
  if (!combined.includes('data-column="In Progress"')) {
    fail("kanban did not parse columns from the fixture");
  }
  if (!combined.includes('data-checked="true"')) {
    fail("kanban did not render a checked card");
  }
  if (!combined.includes('data-checked="false"')) {
    fail("kanban did not render an unchecked card");
  }
  if (!combined.includes('data-kanban-link="index"')) {
    fail("kanban did not resolve a wikilink into an href");
  }
  if (!combined.includes("rb-kanban__fallback")) {
    fail("kanban did not preserve unsupported lines in the fallback");
  }
  if (!combined.includes(KANBAN_MARKER)) {
    fail(`generated HTML is missing the kanban note marker (${KANBAN_MARKER})`);
  }
  if (!combined.includes(KANBAN_BLOCK_MARKER)) {
    fail(
      `generated HTML is missing the kanban block marker (${KANBAN_BLOCK_MARKER})`,
    );
  }
  if (!combined.includes("rb-code__line--highlighted")) {
    fail("code-annotations did not highlight a line from fence meta");
  }
  if (!combined.includes("rb-code__line--added")) {
    fail("code-annotations did not mark a [!code ++] line as added");
  }
  if (!combined.includes("rb-code__line--removed")) {
    fail("code-annotations did not mark a [!code --] line as removed");
  }
  if (!combined.includes('data-line="2"')) {
    fail("code-annotations did not materialize per-line wrappers with data-line");
  }
  if (!combined.includes(CODE_ANNOTATIONS_MARKER)) {
    fail(
      `generated HTML is missing the fixture code marker (${CODE_ANNOTATIONS_MARKER})`,
    );
  }
  if (combined.includes("[!code ")) {
    fail("code-annotations did not strip the inline marker comments");
  }
  if (!combined.includes("rb-shortcode--youtube")) {
    fail("shortcodes plugin did not render the youtube built-in");
  }
  if (!combined.includes("rb-shortcode--kbd")) {
    fail("shortcodes plugin did not render the kbd built-in");
  }
  if (!combined.includes("rb-shortcode--note")) {
    fail("shortcodes plugin did not render the note built-in");
  }
  if (!combined.includes("rb-shortcode--badge")) {
    fail("shortcodes plugin did not render the badge built-in");
  }
  if (!combined.includes(SHORTCODE_MARKER)) {
    fail(
      `generated HTML is missing the shortcode fixture marker (${SHORTCODE_MARKER})`,
    );
  }
  if (!combined.includes("rb-canvas")) {
    fail("generated HTML is missing the canvas plugin output");
  }
  if (!combined.includes("data-canvas")) {
    fail("canvas plugin output is missing its data-canvas attributes");
  }
  if (!combined.includes(CANVAS_MARKER)) {
    fail(`generated HTML is missing the canvas marker (${CANVAS_MARKER})`);
  }
  if (!combined.includes(LOCAL_PLUGIN_MARKER)) {
    fail(
      `generated HTML is missing the site-local plugin marker (${LOCAL_PLUGIN_MARKER})`,
    );
  }
  if (!combined.includes(`data-local-plugin-marker="${LOCAL_PLUGIN_MARKER}"`)) {
    fail("site-local plugin marker attribute was not rendered");
  }
  if (!combined.includes('data-theme-name="fixture-local"')) {
    fail("site-local theme name was not applied to the document");
  }
  if (!combined.includes('data-fixture-theme="local"')) {
    fail("site-local theme attribute was not applied to the document");
  }
  if (!combined.includes("data-rb-hover-preview")) {
    fail("generated HTML is missing the hover preview payload script");
  }
  const hoverPreviewPayload = extractHoverPreviewPayload(combined);
  if (!hoverPreviewPayload.includes(HOVER_PREVIEW_TITLE_MARKER)) {
    fail("hover preview payload is missing the fixture note title");
  }

  const scriptFiles = walkFiles(distDir, (full) => full.endsWith(".js"));
  const scripts = scriptFiles
    .map((file) => fs.readFileSync(file, "utf8"))
    .join("\n");
  if (!scripts.includes("rb-hover-preview")) {
    fail("client bundle is missing the hover preview runtime (rb-hover-preview)");
  }
  if (!scripts.includes("initHoverPreview")) {
    fail(
      "client bundle is missing the hover preview initializer (initHoverPreview)",
    );
  }

  if (combined.includes(PRIVATE_MARKER)) {
    fail("non-published note content leaked into the generated HTML");
  }
  const distFiles = walkFiles(distDir);
  const leakedAsset = distFiles.find((file) =>
    path.basename(file).includes("private-only"),
  );
  if (leakedAsset) {
    fail(
      `non-published attachment leaked into dist: ${path.relative(siteDir, leakedAsset)}`,
    );
  }
  for (const file of distFiles.filter((full) => full.endsWith(".json"))) {
    if (fs.readFileSync(file, "utf8").includes(PRIVATE_MARKER)) {
      fail(
        `non-published note leaked into a generated index: ${path.relative(siteDir, file)}`,
      );
    }
  }

  const cssFiles = walkFiles(distDir, (full) => full.endsWith(".css"));
  const css = cssFiles.map((file) => fs.readFileSync(file, "utf8")).join("\n");
  if (!css.includes("fixture-local-plugin")) {
    fail("site-local plugin stylesheet was not bundled into the dist CSS");
  }
  if (!css.includes("data-fixture-theme")) {
    fail("site-local theme stylesheet was not bundled into the dist CSS");
  }
  if (!css.includes("rb-dataview")) {
    fail("dataview plugin stylesheet was not bundled into the dist CSS");
  }
  if (!css.includes("rb-flashcards__deck")) {
    fail("flashcards stylesheet was not bundled into the dist CSS");
  }

  const jsFiles = walkFiles(distDir, (full) => full.endsWith(".js"));
  const js = jsFiles.map((file) => fs.readFileSync(file, "utf8")).join("\n");
  if (!js.includes(FLASHCARDS_CLIENT_IDENTIFIER)) {
    fail(
      `emitted client bundle is missing the flashcards identifier (${FLASHCARDS_CLIENT_IDENTIFIER})`,
    );
  }
  if (!css.includes("rb-kanban")) {
    fail("kanban plugin stylesheet was not bundled into the dist CSS");
  }

  if (!js.includes("rb-canvas")) {
    fail("canvas styles/logic were not bundled into the dist JavaScript");
  }
  if (!js.includes("initCanvas")) {
    fail("the canvas client initializer was not bundled into the dist JavaScript");
  }
  if (!combined.includes("rb-d2")) {
    fail("generated HTML is missing the D2 plugin output (rb-d2)");
  }
  if (!combined.includes('data-d2="rendered"')) {
    fail("D2 diagram was not rendered to SVG at build time");
  }
  const d2Source = combined.match(/data-d2-source="([^"]*)"/);
  if (!d2Source?.[1].includes(D2_MARKER)) {
    fail(`D2 figure source does not contain the fixture marker (${D2_MARKER})`);
  }
  if (!/<figure[^>]*\bclass="rb-d2"[^>]*>[\s\S]*?<svg/.test(combined)) {
    fail("D2 figure does not contain a rendered inline SVG");
  }

  for (const file of htmlFiles) {
    console.log(`  ${path.relative(siteDir, file)}`);
  }
  for (const file of cssFiles) {
    console.log(`  ${path.relative(siteDir, file)}`);
  }
}

function generateStarterSite(tempRoot) {
  step("generating a starter site with riebeckite init");
  const starterDir = path.join(tempRoot, "starter");
  const cli = path.join(repoRoot, "packages", "cli", "bin", "riebeckite.mjs");
  run(process.execPath, [cli, "init", starterDir]);

  const rerun = run(process.execPath, [cli, "init", starterDir], {
    allowFailure: true,
  });
  if (rerun.status === 0) {
    fail("riebeckite init must refuse a non-empty target without --force");
  }

  return starterDir;
}

function generateCreateStarterSite(tempRoot) {
  step("generating a starter site with create-riebeckite");
  const starterDir = path.join(tempRoot, "starter-create");
  run(process.execPath, [
    path.join(
      repoRoot,
      "packages",
      "create-riebeckite",
      "bin",
      "create-riebeckite.mjs",
    ),
    starterDir,
  ]);
  if (!fs.existsSync(path.join(starterDir, "riebeckite.config.ts"))) {
    fail("create-riebeckite did not generate riebeckite.config.ts");
  }
}

function assertStarterOutput(siteDir) {
  step("checking generated starter output");
  const distDir = path.join(siteDir, "dist");
  if (!fs.existsSync(distDir)) {
    fail("starter build did not create a dist/ directory");
  }

  const htmlFiles = walkFiles(distDir, (full) => full.endsWith(".html"));
  if (htmlFiles.length === 0) {
    fail("starter build did not emit any HTML files under dist/");
  }

  const combined = htmlFiles
    .map((file) => fs.readFileSync(file, "utf8"))
    .join("\n");
  if (!combined.includes("starter")) {
    fail("starter HTML is missing the generated site title");
  }

  for (const file of htmlFiles) {
    console.log(`  ${path.relative(siteDir, file)}`);
  }
}

function main() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "riebeckite-e2e-"));
  const siteDir = path.join(tempRoot, "site");
  const vaultDir = path.join(tempRoot, "vault");
  const tarballDir = path.join(tempRoot, "tarballs");
  fs.mkdirSync(tarballDir, { recursive: true });

  step(`temporary workspace: ${tempRoot}`);
  try {
    const packed = packPackages(tarballDir);

    step(
      "copying fixture site and vault (content stays outside the site root)",
    );
    fs.cpSync(path.join(fixtureRoot, "site"), siteDir, { recursive: true });
    fs.cpSync(path.join(fixtureRoot, "vault"), vaultDir, { recursive: true });

    writeExternalConsumerTsconfig(siteDir);
    writeSitePackageJson(siteDir, packed);

    step("npm install (tarballs + normal registry dependencies)");
    run("npm", ["install", "--no-audit", "--no-fund", "--loglevel=error"], {
      cwd: siteDir,
    });

    assertIsolatedInstall(siteDir, tempRoot);
    assertNoMonorepoEscapeHatches(siteDir);
    assertDeclaredDependencies(siteDir);
    assertPublishedArtifacts(siteDir);

    step("verifying capability dependency resolution");
    run(process.execPath, [path.join(siteDir, "capability-check.mjs")], {
      cwd: siteDir,
    });

    step("verifying the publish boundary");
    run(process.execPath, [path.join(siteDir, "publish-boundary-check.mjs")], {
      cwd: siteDir,
    });

    const nestedWorkingDirectory = path.join(siteDir, "app");
    runCli(siteDir, "check", nestedWorkingDirectory);
    runCli(siteDir, "doctor", nestedWorkingDirectory);
    runCli(siteDir, "inspect", nestedWorkingDirectory);
    const configInspection = runCli(
      siteDir,
      "inspect config",
      nestedWorkingDirectory,
    );
    if (!cliText(configInspection).includes("fixture-local")) {
      fail(
        "inspect config did not report the site-local theme (fixture-local)",
      );
    }
    const pluginInspection = runCli(
      siteDir,
      "inspect plugins",
      nestedWorkingDirectory,
    );
    if (!cliText(pluginInspection).includes("fixture-local")) {
      fail(
        "inspect plugins did not report the site-local plugin (fixture-local)",
      );
    }
    runCli(siteDir, "build", nestedWorkingDirectory);

    assertBuildOutput(siteDir, vaultDir);

    runTypecheck(siteDir, "tsconfig.json");
    runTypecheck(siteDir, "tsconfig.nodenext.json");

    generateCreateStarterSite(tempRoot);
    const starterDir = generateStarterSite(tempRoot);
    writeSitePackageJson(starterDir, packed);
    assertNoMonorepoEscapeHatches(starterDir);
    assertDeclaredDependencies(starterDir);

    step("npm install the generated starter");
    run("npm", ["install", "--no-audit", "--no-fund", "--loglevel=error"], {
      cwd: starterDir,
    });

    runCli(starterDir, "check");
    runCli(starterDir, "doctor");
    runCli(starterDir, "build");
    assertStarterOutput(starterDir);

    console.log(
      "\n[external-site] PASS: external site built from published artifacts",
    );
  } finally {
    if (process.env.RIEBECKITE_E2E_KEEP) {
      console.log(`\n[external-site] kept workspace: ${tempRoot}`);
    } else {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  }
}

try {
  main();
} catch (error) {
  console.error(`\n[external-site] FAIL: ${error.message}`);
  process.exitCode = 1;
}
