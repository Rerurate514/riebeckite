import { getStringProperty, mergeClassName, visitElements } from "./hast";
import type { HastNode, LightboxOptions } from "./types";
import { DEFAULT_TRIGGER_CLASS } from "./types";

export function rehypeLightbox(options: LightboxOptions = {}) {
  const triggerClass = options.selectorClass ?? DEFAULT_TRIGGER_CLASS;

  return (tree: HastNode) => {
    visitElements(tree, (node, parent, index) => {
      if (!parent || index === undefined || node.tagName !== "img") return;
      if (!parent.children) return;

      const src = getStringProperty(node, "src");
      if (!src) return;

      const alt = getStringProperty(node, "alt") ?? "";
      const className = mergeClassName(
        getStringProperty(node, "className"),
        "rr-lightbox-image",
      );

      parent.children[index] = {
        type: "element",
        tagName: "a",
        properties: {
          className: triggerClass,
          href: src,
          dataLightboxSrc: src,
          dataLightboxAlt: alt,
          ariaLabel: alt ? `画像を拡大表示: ${alt}` : "画像を拡大表示",
        },
        children: [
          {
            ...node,
            properties: {
              ...node.properties,
              className,
            },
          },
        ],
      };
    });
  };
}
