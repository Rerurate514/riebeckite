import {
  element,
  getTextContent,
  hasClass,
  text,
  visitElements,
} from "./hast.js";
import {
  parseEmbedBlock,
  resolveEmbed,
  type SupportedEmbedResolution,
} from "./providers.js";
import type {
  ElementNode,
  HastNode,
  RichEmbedBlockOptions,
  RichEmbedOptions,
} from "./types.js";

const DIAGNOSTIC_SOURCE = "@riebeckite/plugin-rich-embed";
const RICH_EMBED_MARKER = "RIEBECKITE_EXTERNAL_RICHEMBED_MARKER";

export function rehypeRichEmbed(options: RichEmbedOptions = {}) {
  return (tree: HastNode, file: unknown) => {
    visitElements(tree, (node, parent, index) => {
      if (!parent || index === undefined || !isEmbedCodeBlock(node)) return;

      const code = findDirectChild(node, "code");
      const source = (
        code ? getTextContent(code) : getTextContent(node)
      ).trim();
      const parsed = parseEmbedBlock(source);
      if (!parsed) {
        reportDiagnostic(file, source, "the embed block is empty.");
        return;
      }

      const resolution = resolveEmbed(parsed.url, parsed.options, options);
      if (resolution.kind === "unsupported") {
        reportDiagnostic(file, parsed.url, resolution.message);
        return;
      }

      parent.children = parent.children ?? [];
      parent.children[index] = buildFigure(resolution, parsed.options);
    });
  };
}

function buildFigure(
  resolution: SupportedEmbedResolution,
  block: RichEmbedBlockOptions,
): ElementNode {
  const children: HastNode[] = [];

  if (resolution.kind === "iframe") {
    children.push(
      element(
        "div",
        {
          className: "rb-rich-embed__frame",
          style: `--rb-rich-embed-aspect:${resolution.aspect}`,
        },
        [
          element("iframe", {
            src: resolution.src,
            loading: "lazy",
            allowFullscreen: true,
            referrerPolicy: "strict-origin-when-cross-origin",
            title: resolution.title,
          }),
        ],
      ),
    );
  } else {
    children.push(
      element("div", { className: "rb-rich-embed__card" }, [
        element(
          "a",
          {
            className: "rb-rich-embed__link",
            href: resolution.href,
            rel: "noopener noreferrer",
            target: "_blank",
          },
          [text(resolution.label)],
        ),
      ]),
    );
  }

  const caption = block.caption?.trim();
  if (caption) {
    children.push(
      element("figcaption", { className: "rb-rich-embed__caption" }, [
        text(caption),
      ]),
    );
  }

  return element(
    "figure",
    {
      className: "rb-rich-embed",
      dataRichEmbed: resolution.provider,
      dataRichEmbedMarker: RICH_EMBED_MARKER,
    },
    children,
  );
}

function reportDiagnostic(file: unknown, target: string, message: string) {
  const reporter = (file as { message?: (reason: string) => unknown })?.message;
  if (typeof reporter !== "function") return;
  const diagnostic = reporter.call(
    file,
    `Rich embed kept as a code block: ${message} (${target})`,
  );
  if (diagnostic && typeof diagnostic === "object") {
    Object.assign(diagnostic, {
      source: DIAGNOSTIC_SOURCE,
      ruleId: "unsupported-embed",
    });
  }
}

function isEmbedCodeBlock(node: ElementNode): boolean {
  if (node.tagName !== "pre") return false;
  const code = findDirectChild(node, "code");
  return Boolean(code && hasClass(code, "language-embed"));
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
