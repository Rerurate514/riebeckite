import { attachmentUrl } from "@riebeckite/core";
import type { Content, Parent, Root, Text } from "mdast";
import { visit } from "unist-util-visit";
import {
  createAttachmentFallbackLink,
  createImageEmbedNode,
  createNoteEmbedNode,
  createUnresolvedEmbedNode,
  splitParagraphEmbeds,
} from "./wikilink_embeds.js";
import {
  BROKEN_WIKILINK_CLASS,
  buildAssetsUrl,
  parseFragment,
  resolveTarget,
  slugifyFragment,
  WIKILINK_CLASS,
  WIKILINK_PATTERN,
  type WikilinkFragment,
} from "./wikilink_shared.js";

export type { WikilinkFragment } from "./wikilink_shared.js";
export { escapeWikilinkAliasPipesInTables } from "./wikilink_tables.js";

export interface WikilinkOptions {
  contentIndex: Map<string, string>;
  resolvePermalink: (slug: string) => string;
  isRoutable?: (slug: string) => boolean;
  assetBase?: string;
  sourceSlug?: string;
  renderNoteEmbed?: (
    slug: string,
    fragment: WikilinkFragment | null,
  ) => Promise<string | null>;
  renderContent?: (input: {
    kind: string;
    path: string;
    raw: string;
    label: string;
    url: string;
    embed: boolean;
    fragment?: string;
  }) => Promise<string | null>;
}

export function remarkObsidianWikilink(opt: WikilinkOptions) {
  const {
    contentIndex,
    assetBase = "/",
    sourceSlug,
    renderNoteEmbed,
    renderContent,
    resolvePermalink,
    isRoutable,
  } = opt;

  return async (tree: Root) => {
    const replacements: {
      node: Text;
      index: number;
      parent: Parent;
    }[] = [];

    visit(tree, "text", (node: Text, index, parent: Parent | undefined) => {
      if (!parent || index === undefined) return;
      if (!node.value.includes("[[")) return;

      replacements.push({ node, index, parent });
    });

    for (const replacement of replacements.reverse()) {
      await replaceWikilinks(
        replacement.node,
        replacement.index,
        replacement.parent,
      );
    }

    splitParagraphEmbeds(tree);
  };

  async function replaceWikilinks(node: Text, index: number, parent: Parent) {
    const newNodes: Content[] = [];
    let lastIndex = 0;

    const wikilinkRe = new RegExp(WIKILINK_PATTERN, "g");

    for (
      let match = wikilinkRe.exec(node.value);
      match !== null;
      match = wikilinkRe.exec(node.value)
    ) {
      const [full, embedMark, rawTarget, rawFragment, alias] = match;
      const start = match.index;
      const target = rawTarget?.trim() ?? "";
      const fragment = parseFragment(rawFragment);
      const aliasText = alias?.trim();
      const isEmbed = embedMark === "!";

      if (!target && !fragment) {
        continue;
      }

      const rawDestination = `${target}${rawFragment ? `#${rawFragment}` : ""}`;
      const resolved = resolveTarget(target, contentIndex, sourceSlug);
      const routable =
        resolved?.kind === "note" && isRoutable && !isRoutable(resolved.value)
          ? null
          : resolved;

      if (start > lastIndex) {
        newNodes.push({
          type: "text",
          value: node.value.slice(lastIndex, start),
        });
      }
      lastIndex = start + full.length;

      if (isEmbed && routable?.kind === "image") {
        newNodes.push(
          createImageEmbedNode(
            buildAssetsUrl(routable.value, assetBase),
            aliasText,
            target,
          ),
        );
      } else if (isEmbed && routable?.kind === "note") {
        const html = await renderNoteEmbed?.(routable.value, fragment);

        if (html) {
          newNodes.push(createNoteEmbedNode(routable.value, fragment, html));
        } else {
          newNodes.push(
            createUnresolvedEmbedNode(
              rawDestination,
              resolvePermalink(routable.value),
            ),
          );
        }
      } else if (isEmbed && routable?.kind === "attachment") {
        const label = aliasText ?? target;
        const url = attachmentUrl(routable.value);
        const html = await renderContent?.({
          kind: "attachment",
          path: routable.value,
          raw: target,
          label,
          url,
          embed: true,
          fragment: rawFragment?.trim(),
        });

        newNodes.push(
          html
            ? { type: "html", value: html }
            : createAttachmentFallbackLink(routable.value, label, url),
        );
      } else if (isEmbed) {
        newNodes.push({
          type: "text",
          value: `[[Unresolved embed: ${rawDestination}]]`,
        });
      } else if (routable?.kind === "note") {
        const fragmentLabel = fragment
          ? fragment.kind === "block"
            ? `^${fragment.value}`
            : fragment.value
          : "";
        const label =
          aliasText ??
          (target
            ? fragmentLabel
              ? `${target} > ${fragmentLabel}`
              : target
            : fragmentLabel);
        const anchor = fragment ? `#${slugifyFragment(fragment)}` : "";
        newNodes.push({
          type: "link",
          url: `${resolvePermalink(routable.value)}${anchor}`,
          data: { hProperties: { class: WIKILINK_CLASS } },
          children: [{ type: "text", value: label }],
        });
      } else if (routable?.kind === "image") {
        const label = aliasText ?? target;
        newNodes.push({
          type: "link",
          url: buildAssetsUrl(routable.value, assetBase),
          data: { hProperties: { class: WIKILINK_CLASS } },
          children: [{ type: "text", value: label }],
        });
      } else if (routable?.kind === "attachment") {
        const label = aliasText ?? target;
        const url = attachmentUrl(routable.value);
        const html = await renderContent?.({
          kind: "attachment",
          path: routable.value,
          raw: target,
          label,
          url,
          embed: false,
          fragment: rawFragment?.trim(),
        });

        newNodes.push(
          html
            ? { type: "html", value: html }
            : createAttachmentFallbackLink(routable.value, label, url),
        );
      } else {
        const label = aliasText ?? rawDestination;
        newNodes.push({
          type: "link",
          url: "#",
          data: { hProperties: { class: BROKEN_WIKILINK_CLASS } },
          children: [{ type: "text", value: label }],
        });
      }
    }

    if (lastIndex < node.value.length) {
      newNodes.push({
        type: "text",
        value: node.value.slice(lastIndex),
      });
    }

    if (newNodes.length > 0) {
      parent.children.splice(index, 1, ...newNodes);
    }
  }
}
