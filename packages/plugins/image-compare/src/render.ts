import { escapeHtml, escapeHtmlAttribute } from "@riebeckite/core";
import type { ResolvedImageCompareSpec } from "./types.js";

export const IMAGE_COMPARE_CLASS = "rr-image-compare";

export function renderImageCompare(spec: ResolvedImageCompareSpec): string {
  const label = spec.label ?? "Image comparison";
  const before = `<img class="${IMAGE_COMPARE_CLASS}__image ${IMAGE_COMPARE_CLASS}__image--before" src="${escapeHtmlAttribute(spec.before)}" alt="${escapeHtmlAttribute(spec.beforeAlt)}" loading="lazy" decoding="async">`;
  const after = `<div class="${IMAGE_COMPARE_CLASS}__layer"><img class="${IMAGE_COMPARE_CLASS}__image ${IMAGE_COMPARE_CLASS}__image--after" src="${escapeHtmlAttribute(spec.after)}" alt="${escapeHtmlAttribute(spec.afterAlt)}" loading="lazy" decoding="async"></div>`;

  return [
    `<figure class="${IMAGE_COMPARE_CLASS}" data-rr-image-compare data-orientation="${spec.orientation}" style="--rr-image-compare-position:50%" aria-label="${escapeHtmlAttribute(label)}">`,
    `<div class="${IMAGE_COMPARE_CLASS}__static">`,
    `<span class="${IMAGE_COMPARE_CLASS}__static-item"><img src="${escapeHtmlAttribute(spec.before)}" alt="${escapeHtmlAttribute(spec.beforeAlt)}" loading="lazy" decoding="async"><span>Before</span></span>`,
    `<span class="${IMAGE_COMPARE_CLASS}__static-item"><img src="${escapeHtmlAttribute(spec.after)}" alt="${escapeHtmlAttribute(spec.afterAlt)}" loading="lazy" decoding="async"><span>After</span></span>`,
    "</div>",
    `<div class="${IMAGE_COMPARE_CLASS}__stage">`,
    before,
    after,
    `<input class="${IMAGE_COMPARE_CLASS}__range" type="range" min="0" max="100" value="50" step="1" aria-label="Comparison position" data-image-compare-range>`,
    `<span class="${IMAGE_COMPARE_CLASS}__divider" aria-hidden="true"></span>`,
    "</div>",
    spec.label
      ? `<figcaption class="${IMAGE_COMPARE_CLASS}__caption">${escapeHtml(spec.label)}</figcaption>`
      : "",
    "</figure>",
  ].join("");
}

export function renderImageCompareError(message: string): string {
  return `<div class="${IMAGE_COMPARE_CLASS} ${IMAGE_COMPARE_CLASS}--error" role="status">${escapeHtml(message)}</div>`;
}
