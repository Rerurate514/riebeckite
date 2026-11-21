#!/usr/bin/env node
// Read-only documentation health checks for the Riebeckite monorepo.
//
//   node scripts/check_docs.mjs
//
// Verifies the conventions the docs depend on:
//   1. Every relative Markdown link resolves to an existing file (case-insensitive).
//   2. Every translated document (X.ja.md) has a canonical counterpart (X.md)
//      and vice versa.
//   3. Every document under docs is reachable from docs/README.md or
//      docs/README.ja.md through local Markdown links.
//   4. Every package directory exposes exactly README.md + README_ja.md
//      (extra README_en.md variants are rejected).
//   5. README.md and README_ja.md link to each other where both exist.
//   6. Every WikiLink in a published document resolves to exactly one note in
//      the same language.
import fs from "node:fs";
import path from "node:path";
import GithubSlugger from "github-slugger";

const repositoryRoot = path.resolve(import.meta.dirname, "..");

// Directories that behave as content rather than committed documentation.
const EXCLUDED_SEGMENTS = new Set([
  "node_modules",
  ".git",
  "dist",
  "content",
  ".riebeckite",
  ".github",
]);

const EXCLUDED_PREFIXES = [
  "tests/external-site/fixture",
  "website/content",
  "packages/create-riebeckite/test/__golden__",
];

function isExcluded(relativePath) {
  const segments = relativePath.split("/");
  if (segments.some((segment) => EXCLUDED_SEGMENTS.has(segment))) {
    return true;
  }
  return EXCLUDED_PREFIXES.some(
    (prefix) =>
      relativePath === prefix || relativePath.startsWith(`${prefix}/`),
  );
}

function collectMarkdownFiles() {
  const files = [];
  const walk = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      const relative = path
        .relative(repositoryRoot, absolute)
        .split(path.sep)
        .join("/");
      if (isExcluded(relative)) continue;
      if (entry.isDirectory()) {
        walk(absolute);
      } else if (entry.name.toLowerCase().endsWith(".md")) {
        files.push({ absolute, relative });
      }
    }
  };
  walk(repositoryRoot);
  return files;
}

function existingFileMap() {
  const map = new Map();
  const walk = (directory) => {
    // Directories are valid link targets too (e.g. ./packages/create-riebeckite).
    const relativeDirectory = path
      .relative(repositoryRoot, directory)
      .split(path.sep)
      .join("/");
    if (relativeDirectory !== "") {
      map.set(directory.toLowerCase(), relativeDirectory);
    }
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      const relative = path
        .relative(repositoryRoot, absolute)
        .split(path.sep)
        .join("/");
      if (isExcluded(relative)) continue;
      if (entry.isDirectory()) {
        walk(absolute);
      } else {
        map.set(absolute.toLowerCase(), relative);
      }
    }
  };
  walk(repositoryRoot);
  return map;
}

function collectPaths() {
  const markdownFiles = collectMarkdownFiles();
  const allFiles = existingFileMap();
  return { markdownFiles, allFiles };
}

const LINK_PATTERN = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

function headingIds(file, cache) {
  if (cache.has(file.absolute)) return cache.get(file.absolute);
  const ids = new Set();
  const slugger = new GithubSlugger();
  let fence;
  for (const line of fs.readFileSync(file.absolute, "utf8").split(/\r?\n/)) {
    const fenceMatch = line.match(/^\s*(`{3,}|~{3,})/);
    if (fenceMatch) {
      fence = fence ? undefined : fenceMatch[1][0];
      continue;
    }
    if (fence) continue;
    const heading = line.match(/^ {0,3}#{1,6}(?:[ \t]+|$)(.*)$/);
    if (!heading) continue;
    const text = heading[1]
      .replace(/[ \t]+#+[ \t]*$/, "")
      .replace(/<[^>]*>/g, "")
      .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/[`*_~]/g, "")
      .replace(/\\(.)/g, "$1");
    ids.add(slugger.slug(text));
  }
  cache.set(file.absolute, ids);
  return ids;
}

// Rule 1: relative links must resolve to an existing file.
function checkLinks(markdownFiles, allFiles) {
  const errors = [];
  const headingCache = new Map();
  for (const file of markdownFiles) {
    const text = fs.readFileSync(file.absolute, "utf8");
    const lines = text.split(/\r?\n/);
    lines.forEach((line, index) => {
      LINK_PATTERN.lastIndex = 0;
      for (
        let match = LINK_PATTERN.exec(line);
        match;
        match = LINK_PATTERN.exec(line)
      ) {
        const rawTarget = match[1];
        if (/^(https?:|mailto:|tel:)|^(data:)/i.test(rawTarget)) continue;
        const anchorIndex = rawTarget.indexOf("#");
        const targetWithoutAnchor =
          anchorIndex >= 0 ? rawTarget.slice(0, anchorIndex) : rawTarget;
        const rawAnchor =
          anchorIndex >= 0 ? rawTarget.slice(anchorIndex + 1) : undefined;
        if (targetWithoutAnchor === "" && rawAnchor === undefined) continue;
        let decoded;
        try {
          decoded = decodeURIComponent(targetWithoutAnchor);
        } catch {
          decoded = targetWithoutAnchor;
        }
        if (decoded.startsWith("/")) continue; // site-root URLs are out of scope
        const absolute =
          targetWithoutAnchor === ""
            ? file.absolute
            : path.resolve(path.dirname(file.absolute), decoded);
        const linkedFile = allFiles.get(absolute.toLowerCase());
        if (!linkedFile) {
          errors.push(
            `${file.relative}:${index + 1}: broken link -> ${rawTarget}`,
          );
          continue;
        }
        if (
          rawAnchor &&
          !rawAnchor.startsWith("^") &&
          path.extname(absolute).toLowerCase() === ".md"
        ) {
          let anchor;
          try {
            anchor = decodeURIComponent(rawAnchor);
          } catch {
            anchor = rawAnchor;
          }
          if (!headingIds({ absolute }, headingCache).has(anchor)) {
            errors.push(
              `${file.relative}:${index + 1}: broken anchor -> ${rawTarget}`,
            );
          }
        }
      }
    });
  }
  return errors;
}

const DOCS_ROOT = path.join(repositoryRoot, "docs");
const DOCS_EXCLUDED_SEGMENTS = new Set([
  "agents",
  "assets",
  "blog",
  ".obsidian",
  ".riebeckite",
]);

function isDocsDocument(relative) {
  if (!relative.startsWith("docs/")) return false;
  const rest = relative.slice("docs/".length);
  const first = rest.split("/")[0];
  if (DOCS_EXCLUDED_SEGMENTS.has(first)) return false;
  if (rest === "index.md" || rest === "index.ja.md") return false;
  return true;
}

function hasPrivateFrontmatter(file) {
  const text = fs.readFileSync(file.absolute, "utf8");
  const frontmatter = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!frontmatter) return false;
  return /^private:\s*true\s*$/m.test(frontmatter[1]);
}

// Rule 2: default and translated documents must come in pairs.
function checkTranslationParity(markdownFiles) {
  const errors = [];
  const docsFiles = markdownFiles.filter((file) =>
    isDocsDocument(file.relative),
  );
  const known = new Set(docsFiles.map((file) => file.relative));
  for (const file of docsFiles) {
    const counterpart = file.relative.endsWith(".ja.md")
      ? file.relative.replace(/\.ja\.md$/, ".md")
      : file.relative.replace(/\.md$/, ".ja.md");
    if (!known.has(counterpart)) {
      errors.push(`${file.relative} has no ${counterpart} counterpart`);
    }
  }
  return errors;
}

function linkedMarkdownTargets(file, docsRoot, knownDocuments) {
  const targets = [];
  const text = fs.readFileSync(file.absolute, "utf8");
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    LINK_PATTERN.lastIndex = 0;
    for (
      let match = LINK_PATTERN.exec(line);
      match;
      match = LINK_PATTERN.exec(line)
    ) {
      const rawTarget = match[1];
      if (/^(https?:|mailto:|tel:)|^(data:)/i.test(rawTarget)) continue;
      const anchorIndex = rawTarget.indexOf("#");
      const targetWithoutAnchor =
        anchorIndex >= 0 ? rawTarget.slice(0, anchorIndex) : rawTarget;
      if (targetWithoutAnchor === "" || targetWithoutAnchor.startsWith("/")) {
        continue;
      }
      let decoded;
      try {
        decoded = decodeURIComponent(targetWithoutAnchor);
      } catch {
        decoded = targetWithoutAnchor;
      }
      const absolute = path.resolve(path.dirname(file.absolute), decoded);
      let target = absolute;
      if (fs.existsSync(absolute) && fs.statSync(absolute).isDirectory()) {
        target = path.join(absolute, "README.md");
      }
      const relative = path
        .relative(docsRoot, target)
        .split(path.sep)
        .join("/");
      if (!relative.startsWith("../") && knownDocuments.has(relative)) {
        targets.push(relative);
      }
    }
  }
  return targets;
}

// Rule 3: every published document must be reachable from a documentation index.
function checkReachability(markdownFiles) {
  const errors = [];
  const docsFiles = markdownFiles.filter(
    (file) => isDocsDocument(file.relative) && !hasPrivateFrontmatter(file),
  );
  const byRelative = new Map(
    docsFiles.map((file) => [file.relative.slice("docs/".length), file]),
  );
  const roots = ["README.md", "README.ja.md"].filter((root) =>
    byRelative.has(root),
  );
  const seen = new Set(roots);
  const queue = [...roots];
  while (queue.length > 0) {
    const current = queue.shift();
    const file = byRelative.get(current);
    if (!file) continue;
    for (const target of linkedMarkdownTargets(file, DOCS_ROOT, byRelative)) {
      if (!seen.has(target)) {
        seen.add(target);
        queue.push(target);
      }
    }
  }
  for (const relative of [...byRelative.keys()].sort()) {
    if (!seen.has(relative)) {
      errors.push(
        `docs/${relative} is not reachable from docs/README.md or docs/README.ja.md`,
      );
    }
  }
  return errors;
}

// Rule 4: package READMEs follow the README.md + README_ja.md convention.
function checkPackageReadmes() {
  const errors = [];
  const scan = (directory) => {
    const entries = fs.readdirSync(directory, { withFileTypes: true });
    for (const entry of entries) {
      const absolute = path.join(directory, entry.name);
      const relative = path
        .relative(repositoryRoot, absolute)
        .split(path.sep)
        .join("/");
      if (isExcluded(relative)) continue;
      if (entry.isDirectory()) scan(absolute);
    }
    if (!fs.existsSync(path.join(directory, "package.json"))) return;
    const relative = path
      .relative(repositoryRoot, directory)
      .split(path.sep)
      .join("/");
    const readmes = entries
      .filter((entry) => /^README.*\.md$/i.test(entry.name))
      .map((entry) => entry.name)
      .sort();
    if (!readmes.includes("README.md")) {
      errors.push(`${relative}: README.md is required`);
    }
    if (!readmes.includes("README_ja.md")) {
      errors.push(`${relative}: README_ja.md is required`);
    }
    for (const name of readmes) {
      if (name !== "README.md" && name !== "README_ja.md") {
        errors.push(
          `${relative}: unexpected README variant "${name}" (use README.md + README_ja.md)`,
        );
      }
    }
  };
  scan(path.join(repositoryRoot, "packages"));
  return errors;
}

// Rule 5: README.md and README_ja.md link to each other where both exist.
function checkMutualReadmeLinks(markdownFiles, allFiles) {
  const errors = [];
  for (const file of markdownFiles) {
    const basename = path.basename(file.relative);
    if (basename !== "README.md" && basename !== "README_ja.md") continue;
    const directory = path.dirname(file.absolute);
    const partner =
      basename === "README.md"
        ? path.join(directory, "README_ja.md")
        : path.join(directory, "README.md");
    if (!allFiles.has(partner.toLowerCase())) continue;
    const content = fs.readFileSync(file.absolute, "utf8");
    const expected = basename === "README.md" ? "README_ja.md" : "README.md";
    if (!content.includes(`./${expected}`)) {
      errors.push(`${file.relative} does not link ./${expected}`);
    }
  }
  return errors;
}

// Rule 6: every WikiLink resolves to exactly one note in the same language.
const DOCS_CONTENT_ROOT = "docs/docs/";
const WIKILINK_PATTERN = /\[\[([^\]\n]+)\]\]/g;

function noteSlug(relative, root) {
  return relative.slice(root.length).replace(/\.md$/, "").replace(/\.ja$/, "");
}

function matchingNotes(slugs, wanted) {
  return slugs.filter((slug) => {
    const value = slug.toLowerCase();
    return wanted.includes("/")
      ? value === wanted || value.endsWith(`/${wanted}`)
      : value.split("/").at(-1) === wanted;
  });
}

function markdownLinesOutsideCode(text) {
  const lines = [];
  let fence;
  for (const line of text.split(/\r?\n/)) {
    const fenceMatch = line.match(/^ {0,3}(`{3,}|~{3,})/);
    if (fenceMatch) {
      const marker = fenceMatch[1];
      if (!fence) {
        fence = marker;
        continue;
      }
      if (marker[0] === fence[0] && marker.length >= fence.length) {
        fence = undefined;
        continue;
      }
    }
    if (fence) continue;
    lines.push(line.replace(/(`+)[^`]*?\1/g, ""));
  }
  return lines;
}

function checkWikiLinks(markdownFiles) {
  const errors = [];
  const documents = markdownFiles
    .filter(
      (file) =>
        isDocsDocument(file.relative) &&
        file.relative.startsWith(DOCS_CONTENT_ROOT),
    )
    .map((file) => ({
      file,
      language: file.relative.endsWith(".ja.md") ? "ja" : "en",
      slug: noteSlug(file.relative, DOCS_CONTENT_ROOT),
    }));
  const byLanguage = { en: [], ja: [] };
  for (const document of documents)
    byLanguage[document.language].push(document);
  // The site indexes every note under the content root, so a target may also
  // resolve outside the published docs root (for example a drawing note).
  const vaultSlugs = markdownFiles
    .filter(
      (file) =>
        file.relative.startsWith("docs/") &&
        !file.relative.startsWith(DOCS_CONTENT_ROOT) &&
        !/(^|\/)\.(obsidian|riebeckite)\//.test(file.relative) &&
        !file.relative.startsWith("docs/agents/"),
    )
    .map((file) => noteSlug(file.relative, "docs/"));

  for (const document of documents) {
    const peers = byLanguage[document.language].map((peer) => peer.slug);
    const lines = markdownLinesOutsideCode(
      fs.readFileSync(document.file.absolute, "utf8"),
    );
    for (const line of lines) {
      WIKILINK_PATTERN.lastIndex = 0;
      for (
        let match = WIKILINK_PATTERN.exec(line);
        match;
        match = WIKILINK_PATTERN.exec(line)
      ) {
        const body = match[1];
        const pipe = body.indexOf("|");
        const targetAndFragment = pipe < 0 ? body : body.slice(0, pipe);
        const fragmentAt = targetAndFragment.search(/[#^]/);
        const target = (
          fragmentAt < 0
            ? targetAndFragment
            : targetAndFragment.slice(0, fragmentAt)
        ).trim();
        if (!target) continue;
        const extension = path.posix.extname(target).toLowerCase();
        if (extension && extension !== ".md") continue;
        const wanted = target
          .replace(/\\/g, "/")
          .replace(/\.md$/i, "")
          .toLowerCase();
        const matches = matchingNotes(peers, wanted);
        if (matches.length === 0) {
          if (matchingNotes(vaultSlugs, wanted).length > 0) continue;
          errors.push(
            `${document.file.relative}: unresolvable wikilink [[${target}]]`,
          );
        } else if (matches.length > 1) {
          errors.push(
            `${document.file.relative}: ambiguous wikilink [[${target}]] (${matches.length} candidates)`,
          );
        }
      }
    }
  }
  return errors;
}

const { markdownFiles, allFiles } = collectPaths();

const errors = [
  ...checkLinks(markdownFiles, allFiles),
  ...checkTranslationParity(markdownFiles),
  ...checkReachability(markdownFiles),
  ...checkPackageReadmes(markdownFiles),
  ...checkMutualReadmeLinks(markdownFiles, allFiles),
  ...checkWikiLinks(markdownFiles),
];

if (errors.length > 0) {
  console.error(`Documentation checks failed (${errors.length} issue(s)):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(
    `Documentation checked for ${markdownFiles.length} markdown files: links, translation parity, WikiLinks, index coverage, and README conventions are consistent.`,
  );
}
