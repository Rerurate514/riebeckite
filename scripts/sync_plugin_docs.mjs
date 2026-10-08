#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const repositoryRoot = path.resolve(import.meta.dirname, "..");
const pluginsRoot = path.join(repositoryRoot, "packages", "plugins");
const docsPluginsRoot = path.join(repositoryRoot, "docs", "docs", "plugins");

const repositoryUrl = "https://github.com/Rerurate514/riebeckite";

export const GENERATED_MARKER_PREFIX = "<!-- Generated from packages/plugins/";

export const PLUGIN_PAGE_TITLES = {
  alias: "Alias",
  analytics: "Analytics",
  archive: "Archive",
  attachment: "Attachment",
  autocardlink: "AutoCardLink",
  backlinks: "Backlinks",
  bases: "Bases",
  breadcrumbs: "Breadcrumbs",
  canvas: "Canvas",
  changelog: "Changelog",
  chartjs: "Chart.js",
  citations: "Citations",
  "code-annotations": "Code Annotations",
  "code-enhance": "Code Enhance",
  "code-tabs": "Code Tabs",
  "color-mode": "color-mode",
  d2: "D2",
  "daily-notes": "Daily Notes",
  dataview: "Dataview",
  deploy: "Deploy",
  diagnostics: "Diagnostics",
  diff: "Diff",
  "discord-embed": "Discord Embed",
  docs: "Docs",
  excalibrain: "ExcaliBrain",
  excalidraw: "Excalidraw",
  flashcards: "Flashcards",
  "folder-pages": "Folder Pages",
  gallery: "Gallery",
  "garden-explorer": "Garden Explorer",
  graphviz: "Graphviz",
  "hard-breaks": "Hard Breaks",
  highlight: "Highlight",
  "hover-preview": "Hover Preview",
  kanban: "Kanban",
  l10n: "Localization",
  lightbox: "Lightbox",
  "local-graph": "Local Graph",
  map: "Map",
  markmap: "Markmap",
  marp: "Marp",
  media: "Media",
  mermaid: "Mermaid",
  navigation: "Navigation",
  "obsidian-markdown": "Obsidian Markdown",
  pdf: "PDF",
  permalink: "Permalink",
  plantuml: "PlantUML",
  properties: "Properties",
  "qr-code": "QR Code",
  quality: "Quality",
  query: "Query",
  "recent-posts": "Recent Posts",
  "related-posts": "Related Posts",
  rename: "Rename",
  "responsive-image": "Responsive Image",
  "rich-embed": "Rich Embed",
  search: "Search",
  seo: "SEO",
  series: "Series",
  share: "Share",
  shortcodes: "Shortcodes",
  sidenotes: "Sidenotes",
  taxonomy: "Taxonomy",
  "text-fragment": "Text Fragment",
  toc: "Table of Contents",
  ux: "UX",
  "vega-lite": "Vega-Lite",
  wavedrom: "WaveDrom",
  webmention: "Webmention",
};

function titleFromSlug(slug) {
  return (
    PLUGIN_PAGE_TITLES[slug] ??
    slug
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ")
  );
}

export function generatedMarker(slug, readmeName = "README.md") {
  return `${GENERATED_MARKER_PREFIX}${slug}/${readmeName}. Do not edit this page directly; edit the package README and run \`pnpm docs:sync\`. -->`;
}

const EXTERNAL_PATTERN = /^(https?:|mailto:|tel:|data:)/i;
const FENCE_PATTERN = /^\s*(?:`{3,}|~{3,})/;
const LINK_PATTERN = /(!?)\[([^\]]*)\]\(([^)\s]+)(\s+"[^"]*")?\)/g;

function toPosix(value) {
  return value.split(path.sep).join("/");
}

function relativeLink(fromDirectory, toAbsolute) {
  const relative = toPosix(path.relative(fromDirectory, toAbsolute));
  return relative.startsWith(".") ? relative : `./${relative}`;
}

export function rewriteTarget(
  rawTarget,
  { readmeDirectory, documentDirectory, slug },
) {
  if (EXTERNAL_PATTERN.test(rawTarget) || rawTarget.startsWith("/")) {
    return rawTarget;
  }
  const hashIndex = rawTarget.indexOf("#");
  const targetWithoutAnchor =
    hashIndex >= 0 ? rawTarget.slice(0, hashIndex) : rawTarget;
  const anchor = hashIndex >= 0 ? rawTarget.slice(hashIndex) : "";
  if (targetWithoutAnchor === "") return rawTarget;

  let decoded;
  try {
    decoded = decodeURIComponent(targetWithoutAnchor);
  } catch {
    decoded = targetWithoutAnchor;
  }

  const absolute = path.resolve(readmeDirectory, decoded);

  if (
    path.dirname(absolute) === readmeDirectory &&
    path.basename(absolute) === "README_ja.md"
  ) {
    return `./${slug}.ja.md${anchor}`;
  }

  const docsRoot = path.join(repositoryRoot, "docs");
  if (absolute === docsRoot || absolute.startsWith(`${docsRoot}${path.sep}`)) {
    return `${relativeLink(documentDirectory, absolute)}${anchor}`;
  }

  if (
    absolute === pluginsRoot ||
    absolute.startsWith(`${pluginsRoot}${path.sep}`)
  ) {
    const parts = path.relative(pluginsRoot, absolute).split(path.sep);
    if (parts.length === 2 && parts[1] === "README.md") {
      return `./${parts[0]}.md${anchor}`;
    }
    if (parts.length === 2 && parts[1] === "README_ja.md") {
      return `./${parts[0]}.ja.md${anchor}`;
    }
  }

  const repoRelative = toPosix(path.relative(repositoryRoot, absolute));
  return `${repositoryUrl}/blob/main/${repoRelative}${anchor}`;
}

export function rewriteReadmeLinks(text, options) {
  const lines = text.split(/\r?\n/);
  let insideFence = false;
  return lines
    .map((line) => {
      if (FENCE_PATTERN.test(line)) {
        insideFence = !insideFence;
        return line;
      }
      if (insideFence) return line;
      return line.replace(
        LINK_PATTERN,
        (match, bang, text, rawTarget, title = "") => {
          if (EXTERNAL_PATTERN.test(rawTarget) || rawTarget.startsWith("/")) {
            return match;
          }
          const rewritten = rewriteTarget(rawTarget, options);
          return `${bang}[${text}](${rewritten}${title})`;
        },
      );
    })
    .join("\n");
}

function stripLeadingTitle(text) {
  return text.replace(/^#\s+[^\n]*\n+/, "");
}

export function renderPluginPage(slug, readmeText, options = {}) {
  const readmeDirectory =
    options.readmeDirectory ?? path.join(pluginsRoot, slug);
  const documentDirectory = options.documentDirectory ?? docsPluginsRoot;
  const body = rewriteReadmeLinks(stripLeadingTitle(readmeText), {
    readmeDirectory,
    documentDirectory,
    slug,
  }).trim();
  return `${generatedMarker(slug, options.readmeName)}\n\n# ${titleFromSlug(slug)}\n\n${body}\n`;
}

function collectManifestSlugs() {
  return fs
    .readdirSync(pluginsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((slug) =>
      fs.existsSync(path.join(pluginsRoot, slug, "package.json")),
    )
    .sort();
}

export function buildDesiredPages() {
  const errors = [];
  const pages = [];
  for (const slug of collectManifestSlugs()) {
    for (const readmeName of ["README.md", "README_ja.md"]) {
      const readmePath = path.join(pluginsRoot, slug, readmeName);
      const pageName = `${slug}${readmeName === "README.md" ? "" : ".ja"}.md`;
      if (!fs.existsSync(readmePath)) {
        errors.push(`packages/plugins/${slug}/${readmeName} is missing`);
        continue;
      }
      pages.push({
        pageName,
        pagePath: path.join(docsPluginsRoot, pageName),
        content: renderPluginPage(slug, fs.readFileSync(readmePath, "utf8"), {
          readmeName,
        }),
      });
    }
  }
  return { pages, errors };
}

export function planSync(desiredPages, onDisk, expectedPageNames) {
  const writes = [];
  for (const page of desiredPages) {
    const current = onDisk.get(page.pageName);
    if (current === undefined || current !== page.content) {
      writes.push(page);
    }
  }
  const knownPageNames =
    expectedPageNames ?? new Set(desiredPages.map((page) => page.pageName));
  const stale = [...onDisk.keys()]
    .filter((pageName) => !knownPageNames.has(pageName))
    .sort();
  return { writes, stale };
}

export function readGeneratedPages(root = docsPluginsRoot) {
  if (!fs.existsSync(root)) return new Map();
  const onDisk = new Map();
  for (const name of fs.readdirSync(root)) {
    if (!name.endsWith(".md")) continue;
    const absolute = path.join(root, name);
    const text = fs.readFileSync(absolute, "utf8");
    if (!text.startsWith(GENERATED_MARKER_PREFIX)) continue;
    onDisk.set(name, text);
  }
  return onDisk;
}

function runWrite(desiredPages, onDisk, expectedPageNames, sourceErrors) {
  const { writes, stale } = planSync(desiredPages, onDisk, expectedPageNames);
  for (const page of writes) {
    fs.mkdirSync(path.dirname(page.pagePath), { recursive: true });
    fs.writeFileSync(page.pagePath, page.content);
  }
  for (const pageName of stale) {
    fs.rmSync(path.join(docsPluginsRoot, pageName));
  }
  console.log(
    `Plugin reference sync: ${writes.length} page(s) written, ${stale.length} stale page(s) removed.`,
  );
  if (stale.length > 0) {
    console.log(`Removed: ${stale.join(", ")}`);
  }
  for (const error of sourceErrors) console.error(`- ${error}`);
  if (sourceErrors.length > 0) process.exitCode = 1;
}

function runCheck(desiredPages, onDisk, expectedPageNames, sourceErrors) {
  const { writes, stale } = planSync(desiredPages, onDisk, expectedPageNames);
  const errors = [...sourceErrors];
  for (const page of writes) {
    errors.push(
      onDisk.has(page.pageName)
        ? `docs/docs/plugins/${page.pageName} is out of date`
        : `docs/docs/plugins/${page.pageName} is missing`,
    );
  }
  for (const pageName of stale) {
    errors.push(`docs/docs/plugins/${pageName} has no matching Plugin package`);
  }
  if (errors.length > 0) {
    console.error(
      `Plugin reference sync check failed (${errors.length} issue(s)):`,
    );
    for (const error of errors) console.error(`- ${error}`);
    console.error("Run `pnpm docs:sync` to regenerate the Plugin pages.");
    process.exitCode = 1;
    return;
  }
  console.log(
    `Plugin reference sync check passed for ${desiredPages.length} Plugin page(s).`,
  );
}

export function main(argv = process.argv.slice(2)) {
  const check = argv.includes("--check");
  const { pages: desiredPages, errors: sourceErrors } = buildDesiredPages();
  const onDisk = readGeneratedPages();
  const expectedPageNames = new Set(
    collectManifestSlugs().flatMap((slug) => [`${slug}.md`, `${slug}.ja.md`]),
  );
  if (check) {
    runCheck(desiredPages, onDisk, expectedPageNames, sourceErrors);
  } else {
    runWrite(desiredPages, onDisk, expectedPageNames, sourceErrors);
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
if (invokedPath === import.meta.url) {
  main();
}
