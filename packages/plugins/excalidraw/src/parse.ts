import { createRequire } from "node:module";
import type {
  ExcalidrawScene,
  ObsidianEmbeddedFile,
  ParsedExcalidrawDocument,
} from "./types.js";

const require = createRequire(import.meta.url);
const lzString = loadLzString();

const EXCALIDRAW_FRONTMATTER_RE =
  /^---\s*\r?\n[\s\S]*?^excalidraw-plugin:\s*parsed\s*$[\s\S]*?^---\s*$/im;

export function parseExcalidrawScene(
  raw: string,
  _filePath: string,
): ParsedExcalidrawDocument {
  const isObsidianMarkdown = isObsidianExcalidrawMarkdown(raw);
  const source = isObsidianMarkdown ? extractObsidianDrawing(raw) : raw;
  const scene = JSON.parse(source) as Partial<ExcalidrawScene>;

  if (!Array.isArray(scene.elements)) {
    throw new Error("Invalid Excalidraw scene: elements is missing.");
  }

  return {
    scene: {
      ...scene,
      elements: scene.elements,
      appState: scene.appState ?? {},
      files: scene.files ?? {},
    },
    embeddedFiles: isObsidianMarkdown ? extractEmbeddedFiles(raw) : [],
  };
}

export function isObsidianExcalidrawMarkdown(raw: string): boolean {
  return EXCALIDRAW_FRONTMATTER_RE.test(raw);
}

function extractObsidianDrawing(markdown: string): string {
  const fence = markdown.match(
    /## Drawing\s*\r?\n```(json|compressed-json)\s*\r?\n([\s\S]*?)\r?\n```/i,
  );
  if (!fence?.[1] || !fence[2]) {
    throw new Error("Obsidian Excalidraw drawing block was not found.");
  }

  const kind = fence[1].toLowerCase();
  const body = fence[2].trim();
  if (kind === "json") return body;

  const decompressed = decompressCompressedJson(body);
  if (!decompressed) {
    throw new Error(
      "Obsidian Excalidraw compressed-json could not be decompressed.",
    );
  }
  return decompressed;
}

function decompressCompressedJson(value: string): string | null {
  const normalized = value.replace(/\s+/g, "");
  return (
    decompressFromBase64(normalized) ??
    decompressFromEncodedURIComponent(normalized) ??
    null
  );
}

function decompressFromBase64(value: string): string | null {
  return lzString.decompressFromBase64(value);
}

function decompressFromEncodedURIComponent(value: string): string | null {
  return lzString.decompressFromEncodedURIComponent(value);
}

function loadLzString(): LzStringExports {
  const loaded = require(getLzStringPackageName()) as unknown;
  const candidate = selectLzStringExports(loaded);

  if (!candidate) {
    throw new Error("Invalid lz-string module shape.");
  }

  return candidate;
}

function selectLzStringExports(value: unknown): LzStringExports | null {
  if (isLzStringExports(value)) return value;
  if (!value || typeof value !== "object") return null;

  const module = value as { default?: unknown };
  return isLzStringExports(module.default) ? module.default : null;
}

function isLzStringExports(value: unknown): value is LzStringExports {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<LzStringExports>;
  return (
    typeof candidate.decompressFromBase64 === "function" &&
    typeof candidate.decompressFromEncodedURIComponent === "function"
  );
}

function getLzStringPackageName(): string {
  return "lz-string";
}

type LzStringExports = {
  decompressFromBase64(value: string): string | null;
  decompressFromEncodedURIComponent(value: string): string | null;
};

function extractEmbeddedFiles(markdown: string): ObsidianEmbeddedFile[] {
  const section = markdown.match(
    /## Embedded Files\s*\r?\n([\s\S]*?)(?:\r?\n## |\r?\n%%|$)/i,
  )?.[1];
  if (!section) return [];

  return Array.from(
    section.matchAll(
      /^([a-f0-9]{40}):\s*\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]\s*$/gim,
    ),
    (match) => ({
      fileId: match[1] ?? "",
      target: (match[2] ?? "").trim(),
    }),
  ).filter((file) => file.fileId && file.target);
}
