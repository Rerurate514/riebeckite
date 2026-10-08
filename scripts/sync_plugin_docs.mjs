#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const repositoryRoot = path.resolve(import.meta.dirname, "..");
const pluginsRoot = path.join(repositoryRoot, "packages", "plugins");
const docsPluginsRoot = path.join(repositoryRoot, "docs", "docs", "plugins");
const repositoryUrl = "https://github.com/Rerurate514/riebeckite";

export const GENERATED_MARKER_PREFIX = "<!-- Generated from docs/docs/plugins/";
const LEGACY_MARKER_PREFIX = "<!-- Generated from packages/plugins/";
const EXTERNAL_PATTERN = /^(https?:|mailto:|tel:|data:)/i;
const FENCE_PATTERN = /^\s*(`{3,}|~{3,})/;
const LINK_PATTERN = /(!?)\[([^\]]*)\]\(([^)\s]+)(\s+"[^"]*")?\)/g;

function toPosix(value) {
  return value.split(path.sep).join("/");
}

function splitTarget(rawTarget) {
  const hashIndex = rawTarget.indexOf("#");
  const queryIndex = rawTarget.indexOf("?");
  const indexes = [hashIndex, queryIndex].filter((index) => index >= 0);
  const index = indexes.length === 0 ? -1 : Math.min(...indexes);
  return index < 0
    ? { pathname: rawTarget, suffix: "" }
    : { pathname: rawTarget.slice(0, index), suffix: rawTarget.slice(index) };
}

export function generatedMarker(pageName) {
  return `${GENERATED_MARKER_PREFIX}${pageName}. Edit the canonical documentation in docs/docs/plugins and run \`pnpm docs:sync\`. -->`;
}

export function rewriteTarget(
  rawTarget,
  {
    documentDirectory,
    slug,
    docsPluginsDirectory = docsPluginsRoot,
    repositoryDirectory = repositoryRoot,
  },
) {
  if (EXTERNAL_PATTERN.test(rawTarget) || rawTarget.startsWith("/")) {
    return rawTarget;
  }
  const { pathname, suffix } = splitTarget(rawTarget);
  if (pathname === "") return rawTarget;

  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    decoded = pathname;
  }
  const absolute = path.resolve(documentDirectory, decoded);
  const docsPluginRelative = path.relative(docsPluginsDirectory, absolute);
  if (
    docsPluginRelative !== "" &&
    !docsPluginRelative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(docsPluginRelative)
  ) {
    const name = toPosix(docsPluginRelative);
    const match = /^(.*?)(\.ja)?\.md$/.exec(name);
    if (match && !match[1].includes("/")) {
      const [, targetSlug, japanese] = match;
      if (targetSlug === slug) {
        return `./${japanese ? "README_ja.md" : "README.md"}${suffix}`;
      }
      return `../${targetSlug}/${japanese ? "README_ja.md" : "README.md"}${suffix}`;
    }
  }

  const repositoryRelative = toPosix(
    path.relative(repositoryDirectory, absolute),
  );
  if (
    repositoryRelative === ".." ||
    repositoryRelative.startsWith("../") ||
    path.isAbsolute(repositoryRelative)
  ) {
    throw new Error(`link target escapes the repository: ${rawTarget}`);
  }
  return `${repositoryUrl}/blob/main/${repositoryRelative}${suffix}`;
}

export function rewriteDocumentLinks(text, options) {
  const lines = text.split(/\r?\n/);
  let openFence = null;
  return lines
    .map((line) => {
      const fence = FENCE_PATTERN.exec(line);
      if (fence) {
        const character = fence[1][0];
        const length = fence[1].length;
        if (openFence === null) openFence = { character, length };
        else if (
          openFence.character === character &&
          length >= openFence.length
        ) {
          openFence = null;
        }
        return line;
      }
      if (openFence !== null) return line;
      return line.replace(
        LINK_PATTERN,
        (_match, bang, text, rawTarget, title = "") =>
          `${bang}[${text}](${rewriteTarget(rawTarget, options)}${title})`,
      );
    })
    .join("\n");
}

export function topLevelHeadings(text) {
  const headings = [];
  let openFence = null;
  for (const line of text.split(/\r?\n/)) {
    const fence = FENCE_PATTERN.exec(line);
    if (fence) {
      const character = fence[1][0];
      const length = fence[1].length;
      if (openFence === null) openFence = { character, length };
      else if (
        openFence.character === character &&
        length >= openFence.length
      ) {
        openFence = null;
      }
      continue;
    }
    if (openFence === null && /^#\s+\S/.test(line)) headings.push(line);
  }
  return headings;
}

function bodyWithoutTitle(text) {
  return text.replace(/^#\s+[^\n]*\n+/, "").trim();
}

export function renderReadme(manifestName, documentText, options) {
  const body = rewriteDocumentLinks(bodyWithoutTitle(documentText), options);
  return `# ${manifestName}\n\n${generatedMarker(options.pageName)}\n\n${body}\n`;
}

export function collectManifestSlugs(root = pluginsRoot) {
  if (!fs.existsSync(root)) return [];
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .filter((entry) =>
      fs.existsSync(path.join(root, entry.name, "package.json")),
    )
    .map((entry) => entry.name)
    .sort();
}

export function buildDesiredReadmes(options = {}) {
  const pluginRoot = options.pluginsRoot ?? pluginsRoot;
  const documentRoot = options.docsPluginsRoot ?? docsPluginsRoot;
  const errors = [];
  const readmes = [];
  for (const slug of collectManifestSlugs(pluginRoot)) {
    const packageDirectory = path.join(pluginRoot, slug);
    let manifest;
    try {
      manifest = JSON.parse(
        fs.readFileSync(path.join(packageDirectory, "package.json"), "utf8"),
      );
    } catch {
      errors.push(`packages/plugins/${slug}/package.json is invalid`);
      continue;
    }
    if (typeof manifest.name !== "string" || manifest.name.trim() === "") {
      errors.push(`packages/plugins/${slug}/package.json has no package name`);
      continue;
    }
    for (const [pageName, readmeName] of [
      [`${slug}.md`, "README.md"],
      [`${slug}.ja.md`, "README_ja.md"],
    ]) {
      const pagePath = path.join(documentRoot, pageName);
      if (!fs.existsSync(pagePath)) {
        errors.push(`docs/docs/plugins/${pageName} is missing`);
        continue;
      }
      const document = fs.readFileSync(pagePath, "utf8");
      if (document.startsWith(LEGACY_MARKER_PREFIX)) {
        errors.push(
          `docs/docs/plugins/${pageName} has an obsolete generated marker`,
        );
        continue;
      }
      if (
        topLevelHeadings(document).length !== 1 ||
        !document.startsWith("# ")
      ) {
        errors.push(
          `docs/docs/plugins/${pageName} must have exactly one leading H1`,
        );
        continue;
      }
      try {
        readmes.push({
          readmeName,
          readmePath: path.join(packageDirectory, readmeName),
          relativePath: `packages/plugins/${slug}/${readmeName}`,
          content: renderReadme(manifest.name, document, {
            documentDirectory: documentRoot,
            slug,
            pageName,
            docsPluginsDirectory: documentRoot,
            repositoryDirectory: options.repositoryRoot ?? repositoryRoot,
          }),
        });
      } catch (error) {
        errors.push(
          `docs/docs/plugins/${pageName} contains an invalid link: ${error.message}`,
        );
      }
    }
  }
  return { readmes, errors };
}

export function planSync(desiredReadmes) {
  return desiredReadmes.filter(
    (readme) =>
      !fs.existsSync(readme.readmePath) ||
      fs.readFileSync(readme.readmePath, "utf8") !== readme.content,
  );
}

function reportErrors(errors) {
  console.error(
    `Plugin documentation sync failed (${errors.length} issue(s)):`,
  );
  for (const error of errors) console.error(`- ${error}`);
}

export function main(argv = process.argv.slice(2)) {
  const check = argv.includes("--check");
  const { readmes, errors } = buildDesiredReadmes();
  if (errors.length > 0) {
    reportErrors(errors);
    process.exitCode = 1;
    return;
  }
  const writes = planSync(readmes);
  if (check) {
    if (writes.length > 0) {
      reportErrors(
        writes.map((readme) => `${readme.relativePath} is out of date`),
      );
      process.exitCode = 1;
      return;
    }
    console.log(
      `Plugin documentation sync check passed for ${readmes.length} README file(s).`,
    );
    return;
  }
  for (const readme of writes)
    fs.writeFileSync(readme.readmePath, readme.content);
  console.log(
    `Plugin documentation sync: ${writes.length} README file(s) written.`,
  );
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
if (invokedPath === import.meta.url) main();
