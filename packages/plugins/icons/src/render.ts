import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import {
  type ContentIcon,
  escapeHtml,
  escapeHtmlAttribute,
} from "@riebeckite/core";
import sanitizeHtml from "sanitize-html";
import { lookupEmoji } from "./emoji.js";
import {
  findIconPackFile,
  type IconPacks,
  type LoadedIconsSettings,
} from "./settings.js";
import type { IconPrecedence } from "./types.js";

const MAX_SVG_BYTES = 256 * 1024;
const ALLOWED_TAGS = [
  "svg",
  "g",
  "path",
  "circle",
  "ellipse",
  "line",
  "polyline",
  "polygon",
  "rect",
  "title",
  "desc",
  "defs",
  "lineargradient",
  "radialgradient",
  "stop",
];
const PRESENTATION_ATTRIBUTES = [
  "fill",
  "stroke",
  "stroke-width",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-miterlimit",
  "fill-rule",
  "clip-rule",
  "opacity",
  "fill-opacity",
  "stroke-opacity",
  "transform",
  "vector-effect",
];
const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: {
    svg: ["xmlns", "viewBox", "width", "height", "role", "focusable"],
    circle: ["cx", "cy", "r"],
    ellipse: ["cx", "cy", "rx", "ry"],
    line: ["x1", "y1", "x2", "y2"],
    rect: ["x", "y", "width", "height", "rx", "ry"],
    polyline: ["points"],
    polygon: ["points"],
    path: ["d", "pathLength"],
    g: ["clip-path", "mask"],
    lineargradient: [
      "id",
      "gradientUnits",
      "gradientTransform",
      "x1",
      "y1",
      "x2",
      "y2",
    ],
    radialgradient: [
      "id",
      "gradientUnits",
      "gradientTransform",
      "cx",
      "cy",
      "r",
      "fx",
      "fy",
    ],
    stop: ["offset", "stop-color", "stop-opacity"],
    "*": PRESENTATION_ATTRIBUTES,
  },
  allowedSchemes: [],
  allowedSchemesByTag: {},
  allowProtocolRelative: false,
  disallowedTagsMode: "discard",
  parser: {
    lowerCaseAttributeNames: false,
    lowerCaseTags: true,
  },
};

export type IconRenderOptions = {
  readonly source: IconPrecedence;
  readonly target: string;
  readonly color?: string;
  readonly label?: string;
};

export class IconRenderer {
  readonly #packs: IconPacks;
  readonly #cache = new Map<string, string | null>();
  readonly #lucideDirectory = resolveLucideDirectory();

  constructor(settings: LoadedIconsSettings) {
    this.#packs = settings.iconPacks;
  }

  render(
    reference: string,
    options: IconRenderOptions,
  ): ContentIcon | undefined {
    const inner = this.#inner(reference);
    if (inner === undefined) return undefined;
    const kind = reference.startsWith("emoji:")
      ? "emoji"
      : reference.startsWith("text:")
        ? "text"
        : "svg";
    const color = options.color;
    return {
      id: reference,
      kind,
      source: options.source,
      html: `<span class="rr-icon rr-icon--${kind}" aria-hidden="true"${color === undefined ? "" : ` style="color:${escapeHtmlAttribute(color)}"`}>${inner}</span>`,
      ...(color === undefined ? {} : { color }),
      ...(options.label === undefined ? {} : { label: options.label }),
    };
  }

  #inner(reference: string): string | undefined {
    const cached = this.#cache.get(reference);
    if (cached !== undefined) return cached ?? undefined;

    let html: string | undefined;
    if (reference.startsWith("emoji:")) {
      const raw = reference.slice("emoji:".length);
      const emoji = lookupEmoji(raw) ?? (raw.trim() ? raw : undefined);
      if (emoji) html = escapeHtml(emoji);
    } else if (reference.startsWith("pack:")) {
      const [, packName, ...rest] = reference.split(":");
      const file = packName
        ? findIconPackFile(this.#packs, packName, rest.join(":"))
        : undefined;
      if (file) html = renderSvg(readSvg(file.filePath));
    } else if (reference.startsWith("lucide:")) {
      const name = reference.slice("lucide:".length);
      if (/^[a-z0-9-]+$/.test(name) && this.#lucideDirectory) {
        html = renderSvg(
          readSvg(path.join(this.#lucideDirectory, `${name}.svg`)),
        );
      }
    } else if (reference.startsWith("text:")) {
      html = escapeHtml(reference.slice("text:".length));
    }

    this.#cache.set(reference, html ?? null);
    return html;
  }
}

function renderSvg(source: string | undefined): string | undefined {
  if (!source || !/<svg[\s>]/i.test(source)) return undefined;
  const sanitized = sanitizeHtml(source, SANITIZE_OPTIONS);
  if (
    !/<svg[\s>]/i.test(sanitized) ||
    /<script|<foreignObject|<style|<use|<image|<animate|<set|\son[a-z]+\s*=|javascript:|(?:xlink:)?href\s*=|url\s*\(/i.test(
      sanitized,
    )
  ) {
    return undefined;
  }
  return sanitized;
}

function readSvg(filePath: string | undefined): string | undefined {
  if (!filePath) return undefined;
  try {
    const bytes = readFileSync(filePath);
    if (bytes.byteLength > MAX_SVG_BYTES) return undefined;
    return bytes.toString("utf8");
  } catch {
    return undefined;
  }
}

function resolveLucideDirectory(): string | undefined {
  try {
    const require = createRequire(import.meta.url);
    try {
      return path.join(
        path.dirname(require.resolve("lucide-static/package.json")),
        "icons",
      );
    } catch {
      let current = path.dirname(require.resolve("lucide-static"));
      for (;;) {
        if (path.basename(current) === "lucide-static") {
          return path.join(current, "icons");
        }
        const parent = path.dirname(current);
        if (parent === current) return undefined;
        current = parent;
      }
    }
  } catch {
    return undefined;
  }
}
