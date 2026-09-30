#!/usr/bin/env node
// Read-only documentation health checks for the Riebeckite monorepo.
//
//   node scripts/check_docs.mjs
//
// Verifies the conventions the docs depend on:
//   1. Every relative Markdown link resolves to an existing file (case-insensitive).
//   2. docs/en and docs/ja contain the same relative document paths.
//   3. Every document under docs/en and docs/ja is reachable from its language
//      index through local Markdown links.
//   4. Every package directory exposes exactly README.md + README_ja.md
//      (extra README_en.md variants are rejected).
//   5. README.md and README_ja.md link to each other where both exist.
import fs from "node:fs";
import path from "node:path";

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
  path.join("tests", "external-site", "fixture"),
  path.join("apps", "web", "content"),
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

// Rule 1: relative links must resolve to an existing file.
function checkLinks(markdownFiles, allFiles) {
  const errors = [];
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
        if (targetWithoutAnchor === "") continue;
        let decoded;
        try {
          decoded = decodeURIComponent(targetWithoutAnchor);
        } catch {
          decoded = targetWithoutAnchor;
        }
        if (decoded.startsWith("/")) continue; // site-root URLs are out of scope
        const absolute = path.resolve(path.dirname(file.absolute), decoded);
        if (!allFiles.has(absolute.toLowerCase())) {
          errors.push(
            `${file.relative}:${index + 1}: broken link -> ${rawTarget}`,
          );
        }
      }
    });
  }
  return errors;
}

// Rule 2: docs/en and docs/ja must be path-for-path parallel.
function checkLanguageParity(documents) {
  const errors = [];
  const english = new Set(
    documents.en.map((file) => file.relative.slice("docs/en/".length)),
  );
  const japanese = new Set(
    documents.ja.map((file) => file.relative.slice("docs/ja/".length)),
  );
  const enOnly = [...english]
    .filter((relative) => !japanese.has(relative))
    .sort();
  const jaOnly = [...japanese]
    .filter((relative) => !english.has(relative))
    .sort();
  for (const relative of enOnly) {
    errors.push(`docs/en/${relative} has no docs/ja/${relative} counterpart`);
  }
  for (const relative of jaOnly) {
    errors.push(`docs/ja/${relative} has no docs/en/${relative} counterpart`);
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

// Rule 3: every language document must be reachable from docs/<lang>/README.md.
function checkReachability(documents) {
  const errors = [];
  for (const language of ["en", "ja"]) {
    const docsRoot = path.join(repositoryRoot, "docs", language);
    const byRelative = new Map(
      documents[language].map((file) => [
        file.relative.slice(`docs/${language}/`.length),
        file,
      ]),
    );
    const index = documents[language].find(
      (file) => file.relative === `docs/${language}/README.md`,
    );
    if (!index) {
      errors.push(`docs/${language}/README.md is missing`);
      continue;
    }
    const seen = new Set(["README.md"]);
    const queue = ["README.md"];
    while (queue.length > 0) {
      const current = queue.shift();
      const file = byRelative.get(current);
      if (!file) continue;
      for (const target of linkedMarkdownTargets(file, docsRoot, byRelative)) {
        if (!seen.has(target)) {
          seen.add(target);
          queue.push(target);
        }
      }
    }
    for (const relative of [...byRelative.keys()].sort()) {
      if (!seen.has(relative)) {
        errors.push(
          `docs/${language}/${relative} is not reachable from docs/${language}/README.md`,
        );
      }
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

const { markdownFiles, allFiles } = collectPaths();

const documents = {
  en: markdownFiles.filter((file) => file.relative.startsWith("docs/en/")),
  ja: markdownFiles.filter((file) => file.relative.startsWith("docs/ja/")),
};

const errors = [
  ...checkLinks(markdownFiles, allFiles),
  ...checkLanguageParity(documents),
  ...checkReachability(documents),
  ...checkPackageReadmes(markdownFiles),
  ...checkMutualReadmeLinks(markdownFiles, allFiles),
];

if (errors.length > 0) {
  console.error(`Documentation checks failed (${errors.length} issue(s)):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(
    `Documentation checked for ${markdownFiles.length} markdown files: links, language parity, index coverage, and README conventions are consistent.`,
  );
}
