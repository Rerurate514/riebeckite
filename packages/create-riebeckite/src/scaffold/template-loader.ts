import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { SiteTemplateFile } from "./templates.js";

const TEMPLATE_ROOT_CANDIDATES = [
  "../../templates/scaffold",
  "../../../templates/scaffold",
  "../templates/scaffold",
];

const TEXT_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".css",
  ".md",
  ".json",
  ".jsonc",
  ".txt",
  ".yml",
  ".yaml",
  ".svg",
  ".canvas",
  ".excalidraw",
]);

export function resolveTemplateRoot(): string {
  for (const candidate of TEMPLATE_ROOT_CANDIDATES) {
    const resolved = fileURLToPath(new URL(candidate, import.meta.url));
    if (fs.existsSync(resolved)) {
      return resolved;
    }
  }

  throw new Error("Riebeckite scaffold templates were not found.");
}

export function readTemplate(relativePath: string): Uint8Array {
  return fs.readFileSync(path.join(resolveTemplateRoot(), relativePath));
}

function isTextFile(relativePath: string): boolean {
  if (path.basename(relativePath) === ".gitignore") {
    return true;
  }

  return TEXT_EXTENSIONS.has(path.extname(relativePath));
}

function collectFiles(directory: string): string[] {
  const files: string[] = [];

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(entryPath));
    } else {
      files.push(entryPath);
    }
  }

  return files.sort();
}

export function copyTemplateTree(
  relativeDirectory: string,
  replacements: Readonly<Record<string, string>> = {},
  include: (relativePath: string) => boolean = () => true,
): SiteTemplateFile[] {
  const root = path.join(resolveTemplateRoot(), relativeDirectory);
  if (!fs.existsSync(root)) {
    return [];
  }

  return collectFiles(root)
    .map((filePath) => {
      const relativePath = path
        .relative(root, filePath)
        .split(path.sep)
        .join("/");
      const contents = fs.readFileSync(filePath);

      if (!isTextFile(relativePath)) {
        return { path: relativePath, content: contents };
      }

      let text = contents.toString("utf8");
      for (const [from, to] of Object.entries(replacements)) {
        text = text.split(from).join(to);
      }

      return { path: relativePath, content: text };
    })
    .filter((file) => include(file.path));
}
