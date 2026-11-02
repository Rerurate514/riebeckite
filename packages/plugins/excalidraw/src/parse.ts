import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type {
  ExcalidrawScene,
  ObsidianEmbeddedFile,
  ParsedExcalidrawDocument,
} from "./types.js";

const EXCALIDRAW_FRONTMATTER_RE =
  /^---\s*\r?\n[\s\S]*?^excalidraw-plugin:\s*parsed\s*$[\s\S]*?^---\s*$/im;

export async function parseExcalidrawScene(
  raw: string,
  _filePath: string,
): Promise<ParsedExcalidrawDocument> {
  const isObsidianMarkdown = isObsidianExcalidrawMarkdown(raw);
  const source = isObsidianMarkdown ? await extractObsidianDrawing(raw) : raw;
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

async function extractObsidianDrawing(markdown: string): Promise<string> {
  const fence = markdown.match(
    /## Drawing\s*\r?\n```(json|compressed-json)\s*\r?\n([\s\S]*?)\r?\n```/i,
  );
  if (!fence?.[1] || !fence[2]) {
    throw new Error("Obsidian Excalidraw drawing block was not found.");
  }

  const kind = fence[1].toLowerCase();
  const body = fence[2].trim();
  if (kind === "json") return body;

  const decompressed = await decompressCompressedJson(body);
  if (!decompressed) {
    throw new Error(
      "Obsidian Excalidraw compressed-json could not be decompressed.",
    );
  }
  return decompressed;
}

async function decompressCompressedJson(value: string): Promise<string | null> {
  const normalized = value.replace(/\s+/g, "");
  const lzString = loadLzString();
  return (
    lzString.decompressFromBase64(normalized) ??
    lzString.decompressFromEncodedURIComponent(normalized) ??
    null
  );
}

let lzString: LzStringExports | undefined;

function loadLzString(): LzStringExports {
  if (lzString) return lzString;

  const cwdBase = pathToFileURL(path.join(process.cwd(), "package.json")).href;
  const bases = [import.meta.url, cwdBase];
  try {
    const pluginEntry = createRequire(cwdBase).resolve(
      "@riebeckite/plugin-excalidraw",
    );
    bases.push(pathToFileURL(pluginEntry).href);
  } catch {}

  for (const base of bases) {
    try {
      const candidate = selectLzString(createRequire(base)("lz-string"));
      if (candidate) {
        lzString = candidate;
        return candidate;
      }
    } catch {}
  }

  throw new Error("lz-string is not available.");
}

function selectLzString(value: unknown): LzStringExports | null {
  let candidate: unknown = value;
  for (let depth = 0; depth < 4; depth += 1) {
    if (isLzStringExports(candidate)) return candidate;
    if (!candidate || typeof candidate !== "object") return null;
    candidate = (candidate as { default?: unknown }).default;
  }
  return null;
}

function isLzStringExports(value: unknown): value is LzStringExports {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<LzStringExports>;
  return (
    typeof candidate.decompressFromBase64 === "function" &&
    typeof candidate.decompressFromEncodedURIComponent === "function"
  );
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
