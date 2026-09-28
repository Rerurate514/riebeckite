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

export function rehypeMarp(options: MarpOptions = {}) {
  const className = normalizeClassName(options.className);
  const deckClassName = `${className}__deck`;

  return async (tree: HastNode, file: unknown) => {
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
