import {
  type HtmlElement,
  hasNonEmptyAttribute,
  scanElements,
} from "./scanner.js";

export const QUALITY_PLUGIN_NAME = "quality";

export type InspectionContext = {
  html: string;
  elements: readonly HtmlElement[];
};

export function hasAccessibleName(element: HtmlElement): boolean {
  if (hasNonEmptyAttribute(element, "aria-label")) return true;
  if (hasNonEmptyAttribute(element, "title")) return true;
  return scanElements(element.content).some(
    (candidate) =>
      candidate.tag === "img" && hasNonEmptyAttribute(candidate, "alt"),
  );
}
