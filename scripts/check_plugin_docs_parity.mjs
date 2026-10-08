import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..");
const pluginsRoot = path.join(repositoryRoot, "packages", "plugins");
const docsPluginsRoot = path.join(repositoryRoot, "docs", "docs", "plugins");

const GENERATED_MARKER_PREFIX = "<!-- Generated from packages/plugins/";

const OPTION_TABLE_HEADER =
  /(option|field|config|setting|設定|項目|オプション|フィールド|設定項目|パラメータ|プロパティ|引数)/i;
const EXPORTS_SECTION =
  /^(exports?|public api|api|main exports|公開 api|エクスポート|主なエクスポート)$/i;
const PRIMITIVE_IDENTIFIERS = new Set([
  "any",
  "boolean",
  "false",
  "null",
  "number",
  "object",
  "string",
  "true",
  "undefined",
  "unknown",
  "void",
]);

export function collectPluginSlugs(root = pluginsRoot) {
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

export function parseTables(text) {
  const tables = [];
  let current = null;
  for (const line of text.split(/\r?\n/)) {
    if (/^\s*\|.*\|\s*$/.test(line)) {
      const cells = line
        .trim()
        .replace(/^\||\|$/g, "")
        .split("|")
        .map((cell) => cell.trim());
      if (!current) current = { header: cells, rows: [] };
      else if (!/^[-: ]+$/.test(cells.join(""))) current.rows.push(cells);
    } else if (current) {
      tables.push(current);
      current = null;
    }
  }
  if (current) tables.push(current);
  return tables;
}

function inlineCodeTokens(cell) {
  return [...cell.matchAll(/`([^`]+)`/g)].map((match) => match[1].trim());
}

export function collectOptionIdentifiers(text) {
  const identifiers = new Set();
  for (const table of parseTables(text)) {
    if (table.header.length < 2) continue;
    if (!OPTION_TABLE_HEADER.test(table.header[0])) continue;
    for (const row of table.rows) {
      for (const token of inlineCodeTokens(row[0] ?? "")) {
        if (token.startsWith("-")) continue;
        if (/^[A-Za-z_$][A-Za-z0-9_$.]*$/.test(token)) identifiers.add(token);
      }
    }
  }
  return identifiers;
}

function sectionBodies(text) {
  const sections = [];
  let current = null;
  for (const line of text.split(/\r?\n/)) {
    const heading = /^(#{2,6})\s+(.*)$/.exec(line);
    if (heading) {
      if (current) sections.push(current);
      current = { title: heading[2].trim(), body: [] };
    } else if (current) {
      current.body.push(line);
    }
  }
  if (current) sections.push(current);
  return sections;
}

export function collectExportIdentifiers(text) {
  const identifiers = new Set();
  for (const section of sectionBodies(text)) {
    if (!EXPORTS_SECTION.test(section.title)) continue;
    for (const token of inlineCodeTokens(section.body.join("\n"))) {
      const base = token.split(/[(<[{\s]/)[0].replace(/[?]+$/, "");
      if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(base)) continue;
      if (PRIMITIVE_IDENTIFIERS.has(base.toLowerCase())) continue;
      if (base.length < 2) continue;
      identifiers.add(base);
    }
  }
  return identifiers;
}

function missingFrom(text, identifiers) {
  return [...identifiers].filter((identifier) => !text.includes(identifier));
}

export function checkReadmePair(slug, readmeDirectory) {
  const issues = [];
  const englishPath = path.join(readmeDirectory, "README.md");
  const japanesePath = path.join(readmeDirectory, "README_ja.md");
  if (!fs.existsSync(englishPath)) {
    issues.push(`${slug}: README.md is missing`);
    return issues;
  }
  if (!fs.existsSync(japanesePath)) {
    issues.push(`${slug}: README_ja.md is missing`);
    return issues;
  }
  const english = fs.readFileSync(englishPath, "utf8");
  const japanese = fs.readFileSync(japanesePath, "utf8");

  const manifest = JSON.parse(
    fs.readFileSync(path.join(readmeDirectory, "package.json"), "utf8"),
  );
  const expectedTitle = `# ${manifest.name}`;
  if (!english.startsWith(expectedTitle)) {
    issues.push(
      `${slug}: README.md must start with "${expectedTitle}" to match package.json`,
    );
  }
  if (!japanese.startsWith(expectedTitle)) {
    issues.push(
      `${slug}: README_ja.md must start with "${expectedTitle}" to match package.json`,
    );
  }

  const englishOptions = collectOptionIdentifiers(english);
  const japaneseOptions = collectOptionIdentifiers(japanese);
  for (const identifier of missingFrom(japanese, englishOptions)) {
    issues.push(
      `${slug}: option \`${identifier}\` is documented in README.md but missing from README_ja.md`,
    );
  }
  for (const identifier of missingFrom(english, japaneseOptions)) {
    issues.push(
      `${slug}: option \`${identifier}\` is documented in README_ja.md but missing from README.md`,
    );
  }

  const englishExports = collectExportIdentifiers(english);
  const japaneseExports = collectExportIdentifiers(japanese);
  for (const identifier of missingFrom(japanese, englishExports)) {
    issues.push(
      `${slug}: export \`${identifier}\` is documented in README.md but missing from README_ja.md`,
    );
  }
  for (const identifier of missingFrom(english, japaneseExports)) {
    issues.push(
      `${slug}: export \`${identifier}\` is documented in README_ja.md but missing from README.md`,
    );
  }

  return issues;
}

export function checkWebsitePages(slug, root = docsPluginsRoot) {
  const issues = [];
  const englishPath = path.join(root, `${slug}.md`);
  const japanesePath = path.join(root, `${slug}.ja.md`);
  if (!fs.existsSync(englishPath)) {
    issues.push(`docs/docs/plugins/${slug}.md is missing`);
  } else if (
    !fs.readFileSync(englishPath, "utf8").startsWith(GENERATED_MARKER_PREFIX)
  ) {
    issues.push(`docs/docs/plugins/${slug}.md is not a generated page`);
  }
  if (!fs.existsSync(japanesePath)) {
    issues.push(`docs/docs/plugins/${slug}.ja.md is missing`);
  } else if (
    !fs.readFileSync(japanesePath, "utf8").startsWith(GENERATED_MARKER_PREFIX)
  ) {
    issues.push(`docs/docs/plugins/${slug}.ja.md is not a generated page`);
  }
  return issues;
}

export function collectLegacyFiles(root) {
  const found = [];
  if (!fs.existsSync(root)) return found;
  const stack = [root];
  while (stack.length > 0) {
    const directory = stack.pop();
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name === ".git") continue;
        stack.push(absolute);
      } else if (entry.name.endsWith(".en.md")) {
        found.push(path.relative(repositoryRoot, absolute).replace(/\\/g, "/"));
      }
    }
  }
  return found;
}

export function runCheck() {
  const issues = [];
  const slugs = collectPluginSlugs();
  for (const slug of slugs) {
    issues.push(...checkReadmePair(slug, path.join(pluginsRoot, slug)));
    issues.push(...checkWebsitePages(slug));
  }
  for (const legacy of collectLegacyFiles(path.join(repositoryRoot, "docs"))) {
    issues.push(`${legacy} uses the legacy .en.md convention`);
  }
  for (const legacy of collectLegacyFiles(pluginsRoot)) {
    issues.push(`${legacy} uses the legacy .en.md convention`);
  }
  return { slugs, issues };
}

export function main() {
  const { slugs, issues } = runCheck();
  if (issues.length > 0) {
    console.error(
      `Plugin documentation parity check failed (${issues.length} issue(s)):`,
    );
    for (const issue of issues) console.error(`  - ${issue}`);
    process.exitCode = 1;
    return;
  }
  console.log(
    `Plugin documentation parity check passed for ${slugs.length} plugin(s).`,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
