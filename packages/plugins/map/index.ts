import {
  type ConfigValidationIssue,
  createClientEntry,
  createStyleAsset,
  definePlugin,
} from "@riebeckite/core";
import { resolveMapOptions } from "./src/options.js";
import { rehypeMap } from "./src/rehype.js";
import type { MapOptions } from "./src/types.js";

export { resolveMapOptions } from "./src/options.js";
export {
  describeMap,
  formatCoordinates,
  normalizeMapInput,
  openStreetMapUrl,
  parseMapSource,
} from "./src/parse.js";
export { rehypeMap } from "./src/rehype.js";
export type {
  MapClientOptions,
  MapCoordinates,
  MapData,
  MapMarker,
  MapOptions,
  MapPayload,
  MapRuntime,
  ResolvedMapOptions,
} from "./src/types.js";

export const MAP_PLUGIN_NAME = "map";

/**
 * Turns a fenced `map` code block and/or frontmatter coordinates into an
 * embedded OpenStreetMap.
 *
 * The build emits a static fallback (coordinates, place, OpenStreetMap links)
 * and a JSON payload; `initMap` lazily loads Leaflet from the CDN only when a
 * map is present and upgrades each figure to an interactive map.
 */
export function map(options: MapOptions = {}) {
  const resolved = resolveMapOptions(options);
  return definePlugin({
    name: MAP_PLUGIN_NAME,
    order: -10,
    options,
    validateOptions: validateMapOptions,
    extendHtmlPipeline: (pipeline) => {
      pipeline.use(rehypeMap, options);
    },
    assets: [createStyleAsset(MAP_PLUGIN_NAME)],
    clientEntries: [
      createClientEntry(MAP_PLUGIN_NAME, "initMap", {
        tileUrl: resolved.tileUrl,
        attribution: resolved.attribution,
        minZoom: resolved.minZoom,
        maxZoom: resolved.maxZoom,
      }),
    ],
  });
}

/** Alias matching the `*Plugin` suffix used by other plugin factories. */
export const mapPlugin = map;

function validateMapOptions(
  options: MapOptions | undefined,
): readonly ConfigValidationIssue[] {
  if (!options) return [];

  const issues: ConfigValidationIssue[] = [];

  for (const key of [
    "language",
    "className",
    "tileUrl",
    "attribution",
    "staticImageUrl",
    "frontmatterKey",
  ] as const) {
    const value = options[key];
    if (
      value !== undefined &&
      (typeof value !== "string" || value.trim() === "")
    ) {
      issues.push({ path: key, message: "Expected a non-empty string." });
    }
  }

  if (
    options.height !== undefined &&
    (typeof options.height !== "number" ||
      !Number.isFinite(options.height) ||
      options.height <= 0)
  ) {
    issues.push({ path: "height", message: "Expected a positive number." });
  }

  for (const key of ["zoom", "minZoom", "maxZoom"] as const) {
    const value = options[key];
    if (
      value !== undefined &&
      (!Number.isInteger(value) || value < 0 || value > 19)
    ) {
      issues.push({
        path: key,
        message: "Expected an integer between 0 and 19.",
      });
    }
  }

  for (const key of ["fallback", "staticFallback"] as const) {
    if (options[key] !== undefined && typeof options[key] !== "boolean") {
      issues.push({ path: key, message: "Expected a boolean." });
    }
  }

  if (
    typeof options.minZoom === "number" &&
    typeof options.maxZoom === "number" &&
    options.minZoom > options.maxZoom
  ) {
    issues.push({
      path: "maxZoom",
      message: "Expected maxZoom to be greater than or equal to minZoom.",
    });
  }

  return issues;
}
