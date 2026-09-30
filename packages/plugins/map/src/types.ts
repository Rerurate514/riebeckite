/**
 * Public types for the Map plugin.
 *
 * This module is imported by the build-time transformer, the browser
 * initializer, and the package entry point, so it must stay free of Node-only
 * imports.
 */

/** A single latitude/longitude pair. */
export type MapCoordinates = {
  lat: number;
  lng: number;
};

/** A marker on the map, optionally named. */
export type MapMarker = MapCoordinates & {
  /** Human-readable place name, shown in the popup and static fallback. */
  label?: string;
  /** Optional longer text shown in the marker popup. */
  description?: string;
};

/**
 * A parsed map specification. It is the notation-neutral seam of the plugin:
 * the fenced-block parser and the frontmatter normalizer both produce it, and
 * the figure emitter consumes it without knowing the input notation.
 */
export type MapData = {
  /** Markers to draw, in document order. May be empty when only a view is set. */
  markers: MapMarker[];
  /** Explicit map center. Defaults to the first marker when omitted. */
  center?: MapCoordinates;
  /** Zoom level. Defaults to the plugin option when omitted. */
  zoom?: number;
  /** Human-readable place name for the whole map. */
  label?: string;
  /** Per-map tile URL template override. */
  tiles?: string;
  /** Per-map attribution override. */
  attribution?: string;
  /** Per-map static image URL (already resolved). */
  image?: string;
};

/** Options accepted by the `map` plugin factory. */
export type MapOptions = {
  /** Fenced-code language to recognize. Defaults to `"map"`. */
  language?: string;
  /** Base CSS class applied to the figure. Defaults to `"rr-map"`. */
  className?: string;
  /** Map height in pixels. Defaults to `320`. */
  height?: number;
  /** Default zoom level (0–19). Defaults to `13`. */
  zoom?: number;
  /** Minimum zoom level forwarded to the tile layer. Defaults to `1`. */
  minZoom?: number;
  /** Maximum zoom level forwarded to the tile layer. Defaults to `19`. */
  maxZoom?: number;
  /**
   * Tile URL template with `{z}`, `{x}`, `{y}` placeholders. Defaults to the
   * OpenStreetMap standard tiles. See the README for the tile usage policy.
   */
  tileUrl?: string;
  /**
   * Attribution HTML required by the tile provider. Defaults to the
   * OpenStreetMap attribution. Keep it visible on every map.
   */
  attribution?: string;
  /** Render a `<details>` block holding the raw block source. Defaults to `true`. */
  fallback?: boolean;
  /**
   * Render the static fallback (coordinates, place, OpenStreetMap links) that
   * stays visible when JavaScript is disabled. Defaults to `true`.
   */
  staticFallback?: boolean;
  /**
   * Optional static image URL template with `{lat}`, `{lng}`, `{zoom}`, `{width}`
   * and `{height}` placeholders. No default: a static map service usually needs
   * a key, which site owners must supply themselves.
   */
  staticImageUrl?: string;
  /** Frontmatter property holding map coordinates. Defaults to `"map"`. */
  frontmatterKey?: string;
};

/** Options after defaults have been applied. */
export type ResolvedMapOptions = {
  language: string;
  className: string;
  height: number;
  zoom: number;
  minZoom: number;
  maxZoom: number;
  tileUrl: string;
  attribution: string;
  fallback: boolean;
  staticFallback: boolean;
  staticImageUrl: string | null;
  frontmatterKey: string;
};

/** The JSON payload embedded in the figure and consumed by `initMap`. */
export type MapPayload = {
  markers: MapMarker[];
  center: MapCoordinates;
  zoom: number;
  label: string | null;
  tiles: string;
  attribution: string;
  image: string | null;
};

/** Options accepted by `initMap` when called programmatically. */
export type MapClientOptions = {
  /** Default tile URL when a figure does not carry its own. */
  tileUrl?: string;
  /** Default attribution when a figure does not carry its own. */
  attribution?: string;
  /** Default minimum zoom level. Defaults to `1`. */
  minZoom?: number;
  /** Default maximum zoom level. Defaults to `19`. */
  maxZoom?: number;
  /** ESM/UMD URL of the Leaflet script. Defaults to the pinned jsDelivr build. */
  leafletScriptUrl?: string;
  /** URL of the Leaflet stylesheet. Defaults to the pinned jsDelivr build. */
  leafletStyleUrl?: string;
  /** Preloaded Leaflet runtime, used to skip the network load. */
  runtime?: MapRuntime;
};

/** The subset of the Leaflet API the initializer uses. */
export type LeafletLayer = {
  addTo(map: LeafletMap): LeafletLayer;
  bindPopup?(content: string): LeafletLayer;
};

export type LeafletMap = {
  setView(center: [number, number], zoom: number): LeafletMap;
  fitBounds(bounds: unknown, options?: Record<string, unknown>): LeafletMap;
  remove(): void;
};

export type MapRuntime = {
  map(element: HTMLElement, options?: Record<string, unknown>): LeafletMap;
  tileLayer(url: string, options?: Record<string, unknown>): LeafletLayer;
  marker(
    coordinates: [number, number],
    options?: Record<string, unknown>,
  ): LeafletLayer;
  latLngBounds(coordinates: Array<[number, number]>): unknown;
};

export type ElementNode = {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

export type ParentNode = HastNode & {
  children?: HastNode[];
};

export type TextNode = {
  type: "text";
  value: string;
};

export type RawNode = {
  type: "raw";
  value: string;
};

export type HastNode =
  | ElementNode
  | TextNode
  | RawNode
  | { type: string; [key: string]: unknown };
