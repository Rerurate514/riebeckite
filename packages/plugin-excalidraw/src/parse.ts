import * as lzString from "lz-string";
import type {
  ExcalidrawScene,
  ObsidianEmbeddedFile,
  ParsedExcalidrawDocument,
} from "./types.js";

const EXCALIDRAW_FRONTMATTER_RE =
  /^---\s*\r?\n[\s\S]*?^excalidraw-plugin:\s*parsed\s*$[\s\S]*?^---\s*$/im;

export function parseExcalidrawScene(
  raw: string,
  filePath: string,
): ParsedExcalidrawDocument {
  const source = filePath.toLowerCase().endsWith(".md")
    ? extractObsidianDrawing(raw)
    : raw;
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
    embeddedFiles: filePath.toLowerCase().endsWith(".md")
      ? extractEmbeddedFiles(raw)
      : [],
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
  return getLzString().decompressFromBase64(value);
}

function decompressFromEncodedURIComponent(value: string): string | null {
  return getLzString().decompressFromEncodedURIComponent(value);
}

function getLzString(): {
  decompressFromBase64(value: string): string | null;
  decompressFromEncodedURIComponent(value: string): string | null;
} {
  const module = lzString as typeof lzString & {
    default?: typeof lzString;
  };
  return module.default ?? module;
}

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
