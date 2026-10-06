import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import type { SiteTemplateFile } from "./templates.js";

const require = createRequire(import.meta.url);
const TEMPLATE_ROOT = path.join("templates", "scaffold");

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
  let packageRoot: string;
  try {
    packageRoot = path.dirname(
      require.resolve("create-riebeckite/package.json"),
    );
  } catch (cause) {
    throw new Error(
      "Riebeckite scaffold templates were not found: the create-riebeckite package could not be resolved from its own scaffold entry point.",
      { cause },
    );
  }

  const templateRoot = path.join(packageRoot, TEMPLATE_ROOT);
  if (!fs.existsSync(templateRoot)) {
    throw new Error(
      `Riebeckite scaffold templates were not found at ${templateRoot}.`,
    );
  }

  return templateRoot;
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
