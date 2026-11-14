import path from "node:path";
import {
  CHANGE_KEYS,
  CHANGE_TYPES,
  ChangeEntryError,
  ENTRY_NAME_PATTERN,
} from "./changelog_schema.mjs";

export function unquote(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

export function parseFrontmatter(text, file) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(
    text.replace(/^\uFEFF/, ""),
  );

  if (!match) {
    throw new ChangeEntryError(`${file}: missing frontmatter`);
  }

  const data = {};
  let currentList = null;

  for (const line of match[1].split(/\r?\n/)) {
    if (line.trim() === "") {
      continue;
    }

    const item = /^\s+-\s+(.*)$/.exec(line);
    if (item) {
      if (currentList === null) {
        throw new ChangeEntryError(
          `${file}: list item without a list field: ${line.trim()}`,
        );
      }
      data[currentList].push(unquote(item[1]));
      continue;
    }

    const pair = /^([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$/.exec(line);
    if (!pair) {
      throw new ChangeEntryError(`${file}: invalid frontmatter line: ${line}`);
    }

    const [, key, raw] = pair;
    if (!CHANGE_KEYS.has(key)) {
      throw new ChangeEntryError(`${file}: unknown frontmatter field: ${key}`);
    }
    if (Object.hasOwn(data, key)) {
      throw new ChangeEntryError(
        `${file}: duplicate frontmatter field: ${key}`,
      );
    }

    currentList = null;

    if (raw === "") {
      data[key] = [];
      currentList = key;
    } else if (raw === "[]") {
      data[key] = [];
    } else {
      data[key] = unquote(raw);
    }
  }

  return { data, body: match[2].trim() };
}

export function parseChangeEntry(text, file) {
  const filename = path.basename(file);
  const { data, body } = parseFrontmatter(text, file);

  return {
    id: filename.replace(/\.md$/, ""),
    filename,
    file,
    packages: Array.isArray(data.packages) ? data.packages : [],
    hasPackagesList: Array.isArray(data.packages),
    type: data.type,
    breaking: data.breaking === "true",
    breakingValue: data.breaking,
    migration: typeof data.migration === "string" ? data.migration : "",
    pr: typeof data.pr === "string" ? data.pr : "",
    issue: typeof data.issue === "string" ? data.issue : "",
    adr: typeof data.adr === "string" ? data.adr : "",
    body,
  };
}

export function validateEntry(entry, packageNames) {
  const errors = [];
  const display = entry.file ?? entry.filename;

  if (!ENTRY_NAME_PATTERN.test(entry.filename)) {
    errors.push(
      `${display}: file name must match YYYYMMDD-HHmmss-<slug>-<6 hex>.md`,
    );
  }

  if (!CHANGE_TYPES.includes(entry.type)) {
    errors.push(`${display}: type must be one of ${CHANGE_TYPES.join(", ")}`);
  }

  if (!entry.hasPackagesList) {
    errors.push(`${display}: packages must be a list`);
  }

  if (new Set(entry.packages).size !== entry.packages.length) {
    errors.push(`${display}: packages must not contain duplicates`);
  }

  for (const packageName of entry.packages) {
    if (!packageNames.has(packageName)) {
      errors.push(`${display}: unknown package ${packageName}`);
    }
  }

  if (entry.breakingValue !== "true" && entry.breakingValue !== "false") {
    errors.push(`${display}: breaking must be true or false`);
  }

  if (entry.breaking && entry.migration.trim() === "") {
    errors.push(`${display}: a breaking change requires migration steps`);
  }

  if (entry.body === "") {
    errors.push(`${display}: description body must not be empty`);
  }

  for (const field of ["migration", "pr", "issue", "adr"]) {
    if (typeof entry[field] !== "string") {
      errors.push(`${display}: ${field} must be a string`);
    }
  }

  return errors;
}
