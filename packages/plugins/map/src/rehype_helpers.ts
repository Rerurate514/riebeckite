import { element, text } from "./hast.js";
import { formatCoordinates, openStreetMapUrl } from "./parse.js";
import type { ElementNode, HastNode, MapMarker } from "./types.js";

export const DIAGNOSTIC_SOURCE = "@riebeckite/plugin-map";

export const STATIC_IMAGE_WIDTH = 640;

export function buildMarker(
  marker: MapMarker,
  zoom: number,
  base: string,
): ElementNode {
  const coordinates = formatCoordinates(marker);
  const label = marker.label ? `${marker.label} · ${coordinates}` : coordinates;
  const children: HastNode[] = [
    element(
      "a",
      {
        className: `${base}__link`,
        href: openStreetMapUrl(marker, zoom),
        target: "_blank",
        rel: "noopener noreferrer",
      },
      [text(label)],
    ),
  ];
  if (marker.description) {
    children.push(
      element("span", { className: `${base}__description` }, [
        text(` — ${marker.description}`),
      ]),
    );
  }
  return element("li", { className: `${base}__marker` }, children);
}
