import { scopeMarpCss } from "./css.js";
import {
  element,
  getStringProperty,
  getTextContent,
  hasClass,
  raw,
  text,
  visitElements,
} from "./hast.js";
import { renderMarpDeck } from "./render.js";
import type {
  ElementNode,
  HastNode,
  MarpOptions,
  ParentNode,
} from "./types.js";

const DEFAULT_CLASS_NAME = "rb-marp";
const LANGUAGE_CLASS = "language-marp";

type MarpBlock = {
  parent: ParentNode;
  index: number;
  pre: ElementNode;
};

type MarpFile = {
  value?: string;
  data?: {
    matter?: Record<string, unknown>;
  };
};

/**
 * `marp: true` in YAML frontmatter is the detection signal used by the Marp
 * ecosystem (Marp CLI and the VS Code extension) to treat a whole document as
 * a Marp deck. The Obsidian Marp plugins (Marp by jichoup, Marp Slides by
 * samuele-cozzi) render the entire note, so this flag and the code block below
 * are the two supported entry points.
 */
export function isMarpDocument(
  matter: Record<string, unknown> | undefined,
): boolean {
  if (!matter || typeof matter !== "object") return false;
  const flag = matter.marp;
  return flag === true || flag === "true";
}

export function rehypeMarp(options: MarpOptions = {}) {
  const className = normalizeClassName(options.className);
  const deckClassName = `${className}__deck`;

  return async (tree: HastNode, file: unknown) => {
    const fileContext = file as MarpFile;
    if (isMarpDocument(fileContext.data?.matter)) {
      await renderWholeDocument(tree, file, fileContext.value ?? "", options);
      return;
    }

    const blocks: MarpBlock[] = [];
    visitElements(tree, (node, parent, index) => {
      if (!parent || index === undefined || !isMarpCodeBlock(node)) return;
      blocks.push({ parent, index, pre: node });
    });
    if (blocks.length === 0) return;

    // Generated Marp CSS is identical for decks with the same theme, so it is
    // inlined once per page even when several decks share it.
    const emittedCss = new Set<string>();

    for (const block of blocks) {
      const code = findDirectChild(block.pre, "code");
      const source = (
        code ? getTextContent(code) : getTextContent(block.pre)
      ).trim();
      const caption =
        options.caption === false ? null : extractCaption(block.pre, code);

      const result = await renderMarpDeck(source, {
        theme: options.theme?.trim() || "default",
        allowHtml: options.allowHtml !== false,
        math: options.math !== false,
        inlineSVG: options.inlineSVG,
        deckClassName,
      });

      if (result.ok === false) {
        reportDiagnostic(
          file,
          `Marp rendering failed: ${result.message}`,
          "render-error",
        );
        console.warn(`[marp] rendering failed: ${result.message}`);
        continue;
      }

      if (result.warning) {
        reportDiagnostic(file, result.warning, "theme-fallback");
        console.warn(`[marp] ${result.warning}`);
      }

      const scopedCss = scopeMarpCss(result.deck.css, className, deckClassName);
      const includeCss = !emittedCss.has(scopedCss);
      if (includeCss) emittedCss.add(scopedCss);

      const parent = block.parent;
      parent.children = parent.children ?? [];
      parent.children[block.index] = buildFigure({
        className,
        deckClassName,
        caption,
        source,
        slides: result.deck.slides,
        deckHtml: result.deck.html,
        scopedCss: includeCss ? scopedCss : null,
      });
    }
  };
}

/**
 * Renders the entire document (frontmatter included) as a Marp deck, matching
 * how the Obsidian Marp plugins treat a note. The rendered figure replaces the
 * whole document tree because Marp owns the full document once the `marp` flag
 * is set.
 */
async function renderWholeDocument(
  tree: HastNode,
  file: unknown,
  source: string,
  options: MarpOptions,
): Promise<void> {
  const className = normalizeClassName(options.className);
  const deckClassName = `${className}__deck`;
  const trimmed = source.trim();
  if (!trimmed) return;

  const result = await renderMarpDeck(trimmed, {
    theme: options.theme?.trim() || "default",
    allowHtml: options.allowHtml !== false,
    math: options.math !== false,
    inlineSVG: options.inlineSVG,
    deckClassName,
  });

  if (result.ok === false) {
    reportDiagnostic(
      file,
      `Marp rendering failed: ${result.message}`,
      "render-error",
    );
    console.warn(`[marp] rendering failed: ${result.message}`);
    return;
  }

  if (result.warning) {
    reportDiagnostic(file, result.warning, "theme-fallback");
    console.warn(`[marp] ${result.warning}`);
  }

  const scopedCss = scopeMarpCss(result.deck.css, className, deckClassName);
  const root = tree as ParentNode;
  root.children = [
    buildFigure({
      className,
      deckClassName,
      caption: null,
      source: trimmed,
      slides: result.deck.slides,
      deckHtml: result.deck.html,
      scopedCss,
    }),
  ];
}

function buildFigure(input: {
  className: string;
  deckClassName: string;
  caption: string | null;
  source: string;
  slides: number;
  deckHtml: string;
  scopedCss: string | null;
}): ElementNode {
  const children: HastNode[] = [];

  if (input.scopedCss) {
    children.push(element("style", {}, [text(input.scopedCss)]));
  }
  if (input.caption) {
    children.push(
      element("figcaption", { className: `${input.className}__caption` }, [
        text(input.caption),
      ]),
    );
  }

  children.push(raw(input.deckHtml));
  children.push(
    element("details", { className: `${input.className}__fallback` }, [
      element("summary", {}, [text("Marp source")]),
      element("pre", {}, [element("code", {}, [text(input.source)])]),
    ]),
  );

  return element(
    "figure",
    {
      className: input.className,
      role: "group",
      ariaLabel: input.caption ?? "Marp slide deck",
      dataMarp: true,
      dataMarpSlides: String(input.slides),
    },
    children,
  );
}

function isMarpCodeBlock(node: ElementNode): boolean {
  if (node.tagName !== "pre") return false;
  const code = findDirectChild(node, "code");
  return Boolean(code && hasClass(code, LANGUAGE_CLASS));
}

function findDirectChild(
  node: ElementNode,
  tagName: string,
): ElementNode | null {
  return (
    node.children?.find(
      (child): child is ElementNode =>
        child.type === "element" && child.tagName === tagName,
    ) ?? null
  );
}

function extractCaption(
  pre: ElementNode,
  code: ElementNode | null,
): string | null {
  const title =
    getStringProperty(pre, "title") ?? getStringProperty(code ?? pre, "title");
  return title?.trim() || null;
}

function normalizeClassName(value: string | undefined): string {
  return value?.trim() || DEFAULT_CLASS_NAME;
}

function reportDiagnostic(
  file: unknown,
  message: string,
  ruleId: string,
): void {
  const reporter = (file as { message?: (reason: string) => unknown })?.message;
  if (typeof reporter !== "function") return;
  const diagnostic = reporter.call(file, message);
  if (diagnostic && typeof diagnostic === "object") {
    Object.assign(diagnostic, {
      source: "@riebeckite/plugin-marp",
      ruleId,
    });
  }
}
