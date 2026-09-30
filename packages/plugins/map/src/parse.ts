import type { MapCoordinates, MapData, MapMarker } from "./types.js";

/** Matches `key: value` lines in a map block. */
const KEY_VALUE = /^([A-Za-z][\w-]*)\s*:\s*(.*)$/;

/** Matches a list item (`-` or `*`), keeping the original indentation. */
const BULLET = /^\s*[-*]\s+(.*)$/;

/** Matches `lat, lng` (comma or whitespace separated, brackets optional). */
const COORDINATES = /^(-?\d+(?:\.\d+)?)\s*[,\s]\s*(-?\d+(?:\.\d+)?)$/;

/**
 * Parses a fenced `map` code block into a notation-neutral {@link MapData}.
 *
 * The body is a small, dependency-free key/value format:
 *
 * ```text
 * center: 35.6812, 139.7671
 * zoom: 13
 * label: Tokyo Station
 * markers:
 *   - 35.6812, 139.7671 | Tokyo Station
 *   - 35.6586, 139.7454 | Tokyo Tower | A lattice tower
 * ```
 *
 * A bare `lat, lng` line is treated as an implicit marker, so a single-point
 * map can be written as just the coordinates. Returns `null` when the body
 * contains neither a marker nor a center, which the rehype transformer reports
 * as an invalid block.
 */
export function parseMapSource(source: string): MapData | null {
  const markers: MapMarker[] = [];
  let center: MapCoordinates | undefined;
  let zoom: number | undefined;
  let label: string | undefined;
  let tiles: string | undefined;
  let attribution: string | undefined;
  let image: string | undefined;

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === "" || line.startsWith("#")) continue;

    const bullet = BULLET.exec(rawLine);
    if (bullet) {
      const marker = parseMarker(bullet[1]);
      if (marker) markers.push(marker);
      continue;
    }

    const keyValue = KEY_VALUE.exec(line);
    if (keyValue) {
      const key = keyValue[1].toLowerCase();
      const value = keyValue[2].trim();
      switch (key) {
        case "center": {
          const parsed = parseCoordinates(value);
          if (parsed) center = parsed;
          break;
        }
        case "zoom": {
          const parsed = parseZoom(value);
          if (parsed !== undefined) zoom = parsed;
          break;
        }
        case "label":
        case "title":
        case "place":
          label = value || undefined;
          break;
        case "tiles":
        case "tile":
        case "tileurl":
          tiles = value || undefined;
          break;
        case "attribution":
          attribution = value || undefined;
          break;
        case "image":
        case "staticimage":
          image = value || undefined;
          break;
        default:
          break;
      }
      continue;
    }

    const coordinates = parseCoordinates(line);
    if (coordinates) markers.push(coordinates);
  }

  if (markers.length === 0 && !center) return null;

  const data: MapData = { markers };
  if (center) data.center = center;
  else if (markers[0])
    data.center = { lat: markers[0].lat, lng: markers[0].lng };
  if (zoom !== undefined) data.zoom = zoom;
  if (label) data.label = label;
  if (tiles) data.tiles = tiles;
  if (attribution) data.attribution = attribution;
  if (image) data.image = image;
  return data;
}

/**
 * Normalizes a frontmatter value into {@link MapData}.
 *
 * Accepts a coordinate string (`"35.68, 139.76"`), a `[lat, lng]` pair, an
 * array of markers, or an object with `lat`/`lng` (or `latitude`/`longitude`),
 * `zoom`, `label`, `tiles`, `attribution`, `image`, and `markers`.
 */
export function normalizeMapInput(value: unknown): MapData | null {
  if (typeof value === "string") {
    const direct = parseCoordinates(value);
    return direct ? { markers: [direct], center: direct } : null;
  }

  if (Array.isArray(value)) {
    const pair = coordinateFromArray(value);
    if (pair) return { markers: [pair], center: pair };
    const markers = value
      .map((item) => markerFromUnknown(item))
      .filter((marker): marker is MapMarker => marker !== null);
    if (markers.length === 0) return null;
    return { markers, center: { lat: markers[0].lat, lng: markers[0].lng } };
  }

  if (!isRecord(value)) return null;

  const markers = Array.isArray(value.markers)
    ? value.markers
        .map((item) => markerFromUnknown(item))
        .filter((marker): marker is MapMarker => marker !== null)
    : [];

  const center =
    (readNumber(value, "lat", "latitude") !== undefined &&
    readNumber(value, "lng", "lon", "longitude") !== undefined
      ? {
          lat: readNumber(value, "lat", "latitude") as number,
          lng: readNumber(value, "lng", "lon", "longitude") as number,
        }
      : undefined) ??
    parseCoordinatesValue(value.coordinates) ??
    (markers[0] ? { lat: markers[0].lat, lng: markers[0].lng } : undefined);

  if (!center && markers.length === 0) return null;

  const data: MapData = { markers };
  if (center) data.center = center;
  const zoom = readNumber(value, "zoom");
  if (zoom !== undefined) {
    const normalized = normalizeZoom(zoom);
    if (normalized !== undefined) data.zoom = normalized;
  }
  const label = readString(value, "label", "title", "place", "name");
  if (label) data.label = label;
  const tiles = readString(value, "tiles", "tile", "tileUrl", "tile_url");
  if (tiles) data.tiles = tiles;
  const attribution = readString(value, "attribution");
  if (attribution) data.attribution = attribution;
  const image = readString(value, "image", "staticImage", "static_image");
  if (image) data.image = image;
  return data;
}

/** Formats coordinates for display (`35.6812, 139.7671`). */
export function formatCoordinates(coordinates: MapCoordinates): string {
  return `${formatNumber(coordinates.lat)}, ${formatNumber(coordinates.lng)}`;
}

/** Builds a human-readable label for the whole map. */
export function describeMap(data: MapData): string {
  if (data.label) return data.label;
  const named = data.markers.find((marker) => marker.label);
  if (named?.label) return named.label;
  if (data.center) return formatCoordinates(data.center);
  return "";
}

/** Builds an OpenStreetMap link centered on the coordinates. */
export function openStreetMapUrl(
  coordinates: MapCoordinates,
  zoom: number,
): string {
  const level = normalizeZoom(zoom) ?? 13;
  return `https://www.openstreetmap.org/?mlat=${coordinates.lat}&mlon=${coordinates.lng}#map=${level}/${coordinates.lat}/${coordinates.lng}`;
}

function parseMarker(value: string): MapMarker | null {
  const [coordinatesPart, label, description] = value
    .split("|")
    .map((part) => part.trim());
  const coordinates = parseCoordinates(coordinatesPart ?? "");
  if (!coordinates) return null;
  const marker: MapMarker = { ...coordinates };
  if (label) marker.label = label;
  if (description) marker.description = description;
  return marker;
}

function markerFromUnknown(value: unknown): MapMarker | null {
  const stringMarker = typeof value === "string" ? parseMarker(value) : null;
  if (stringMarker) return stringMarker;

  if (Array.isArray(value)) {
    const coordinates = coordinateFromArray(value);
    if (!coordinates) return null;
    const label = typeof value[2] === "string" ? value[2].trim() : "";
    const marker: MapMarker = { ...coordinates };
    if (label) marker.label = label;
    return marker;
  }

  if (!isRecord(value)) return null;
  const lat = readNumber(value, "lat", "latitude");
  const lng = readNumber(value, "lng", "lon", "longitude");
  const coordinates =
    lat !== undefined && lng !== undefined
      ? validateCoordinates(lat, lng)
      : parseCoordinatesValue(value.coordinates);
  if (!coordinates) return null;
  const marker: MapMarker = { ...coordinates };
  const label = readString(value, "label", "title", "name");
  if (label) marker.label = label;
  const description = readString(value, "description", "desc");
  if (description) marker.description = description;
  return marker;
}

function parseCoordinatesValue(value: unknown): MapCoordinates | null {
  if (typeof value === "string") return parseCoordinates(value);
  if (Array.isArray(value)) return coordinateFromArray(value);
  if (isRecord(value)) {
    const lat = readNumber(value, "lat", "latitude");
    const lng = readNumber(value, "lng", "lon", "longitude");
    if (lat !== undefined && lng !== undefined)
      return validateCoordinates(lat, lng);
  }
  return null;
}

function coordinateFromArray(value: unknown[]): MapCoordinates | null {
  const lat = typeof value[0] === "number" ? value[0] : undefined;
  const lng = typeof value[1] === "number" ? value[1] : undefined;
  // A two-element array of strings is `[label, label]`, not coordinates.
  if (lat === undefined || lng === undefined) return null;
  return validateCoordinates(lat, lng);
}

function parseCoordinates(value: string): MapCoordinates | null {
  const normalized = value
    .trim()
    .replace(/^[[(]\s*/, "")
    .replace(/\s*[\])]$/, "")
    .trim();
  const match = COORDINATES.exec(normalized);
  if (!match) return null;
  return validateCoordinates(Number(match[1]), Number(match[2]));
}

function validateCoordinates(lat: number, lng: number): MapCoordinates | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90) return null;
  if (lng < -180 || lng > 180) return null;
  return { lat, lng };
}

function parseZoom(value: string): number | undefined {
  const parsed = Number(value.trim());
  if (!Number.isFinite(parsed)) return undefined;
  return normalizeZoom(parsed);
}

function normalizeZoom(value: number): number | undefined {
  if (!Number.isFinite(value)) return undefined;
  const rounded = Math.round(value);
  if (rounded < 0) return 0;
  if (rounded > 19) return 19;
  return rounded;
}

function readNumber(
  record: Record<string, unknown>,
  ...keys: string[]
): number | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return undefined;
}

function readString(
  record: Record<string, unknown>,
  ...keys: string[]
): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim() !== "") return value.trim();
  }
  return undefined;
}

function formatNumber(value: number): string {
  return String(Math.round(value * 100000) / 100000);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
