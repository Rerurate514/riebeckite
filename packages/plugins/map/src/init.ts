import type { MapClientOptions, MapPayload, MapRuntime } from "./types.js";

const DEFAULT_LEAFLET_SCRIPT_URL =
  "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js";
const DEFAULT_LEAFLET_STYLE_URL =
  "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css";
const DEFAULT_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const DEFAULT_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

let leafletPromise: Promise<MapRuntime | null> | null = null;

/**
 * Upgrades every server-emitted `[data-rr-map="pending"]` figure to an
 * interactive Leaflet map.
 *
 * Leaflet is fetched lazily from the CDN only when at least one map is
 * present, so pages without maps pay nothing. The map data travels in
 * `data-rr-map-payload`, which means the page still renders its static
 * fallback when JavaScript is disabled or the CDN is unreachable.
 */
export async function initMap(options: MapClientOptions = {}): Promise<void> {
  const figures = Array.from(
    document.querySelectorAll<HTMLElement>('[data-rr-map="pending"]'),
  );
  if (figures.length === 0) return;

  const runtime = options.runtime ?? (await loadLeaflet(options));
  if (!runtime) {
    for (const figure of figures) setError(figure);
    return;
  }

  for (const figure of figures) {
    renderMap(runtime, figure, options);
  }
}

function renderMap(
  runtime: MapRuntime,
  figure: HTMLElement,
  options: MapClientOptions,
) {
  const canvas = figure.querySelector<HTMLElement>("[data-rr-map-canvas]");
  const payload = readPayload(figure);
  if (!canvas || !payload) {
    setError(figure);
    return;
  }

  try {
    // The stylesheet collapses the canvas until the map is rendered; make it
    // measurable before Leaflet initializes so tiles lay out correctly.
    canvas.style.display = "block";
    const map = runtime.map(canvas, {
      scrollWheelZoom: false,
      minZoom: options.minZoom,
      maxZoom: options.maxZoom,
    });

    runtime
      .tileLayer(payload.tiles || options.tileUrl || DEFAULT_TILE_URL, {
        attribution:
          payload.attribution || options.attribution || DEFAULT_ATTRIBUTION,
        minZoom: options.minZoom,
        maxZoom: options.maxZoom,
      })
      .addTo(map);

    for (const marker of payload.markers) {
      const layer = runtime.marker([marker.lat, marker.lng]);
      const popup = formatPopup(marker);
      if (popup && layer.bindPopup) layer.bindPopup(popup);
      layer.addTo(map);
    }

    if (payload.markers.length > 1) {
      map.fitBounds(
        runtime.latLngBounds(
          payload.markers.map((marker): [number, number] => [
            marker.lat,
            marker.lng,
          ]),
        ),
        { padding: [24, 24] },
      );
    } else {
      map.setView([payload.center.lat, payload.center.lng], payload.zoom);
    }

    figure.dataset.rrMap = "rendered";
  } catch {
    setError(figure);
  }
}

function readPayload(figure: HTMLElement): MapPayload | null {
  const raw = figure.getAttribute("data-rr-map-payload");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as MapPayload;
    if (!parsed || !Array.isArray(parsed.markers) || !parsed.center) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function formatPopup(marker: MapPayload["markers"][number]): string {
  const label = marker.label?.trim() || `${marker.lat}, ${marker.lng}`;
  const parts = [`<strong>${escapeHtml(label)}</strong>`];
  if (marker.description) {
    parts.push(`<span>${escapeHtml(marker.description)}</span>`);
  }
  return parts.join("<br>");
}

function setError(figure: HTMLElement) {
  figure.dataset.rrMap = "error";
  const canvas = figure.querySelector<HTMLElement>("[data-rr-map-canvas]");
  if (canvas) canvas.style.display = "none";
  const fallback = figure.querySelector<HTMLDetailsElement>("details");
  if (fallback) fallback.open = true;
}

async function loadLeaflet(
  options: MapClientOptions,
): Promise<MapRuntime | null> {
  const existing = readLeafletGlobal();
  if (existing) return existing;

  if (!leafletPromise) {
    const scriptUrl = options.leafletScriptUrl ?? DEFAULT_LEAFLET_SCRIPT_URL;
    const styleUrl = options.leafletStyleUrl ?? DEFAULT_LEAFLET_STYLE_URL;
    leafletPromise = Promise.all([loadScript(scriptUrl), loadStyle(styleUrl)])
      .then(() => readLeafletGlobal())
      .catch(() => null);
  }
  return leafletPromise;
}

function readLeafletGlobal(): MapRuntime | null {
  const value = (globalThis as { L?: MapRuntime }).L;
  return value ?? null;
}

function loadScript(src: string): Promise<void> {
  const existing = document.querySelector<HTMLScriptElement>(
    'script[data-rr-map-script="true"]',
  );
  if (existing) {
    return existing.dataset.rrMapScriptLoaded === "true"
      ? Promise.resolve()
      : waitForLoad(existing);
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.dataset.rrMapScript = "true";
    script.addEventListener(
      "load",
      () => {
        script.dataset.rrMapScriptLoaded = "true";
        resolve();
      },
      { once: true },
    );
    script.addEventListener(
      "error",
      () => reject(new Error("Failed to load Leaflet")),
      { once: true },
    );
    document.head.appendChild(script);
  });
}

function loadStyle(href: string): Promise<void> {
  const existing = document.querySelector<HTMLLinkElement>(
    'link[data-rr-map-style="true"]',
  );
  if (existing) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.dataset.rrMapStyle = "true";
    link.addEventListener("load", () => resolve(), { once: true });
    link.addEventListener(
      "error",
      () => reject(new Error("Failed to load Leaflet styles")),
      { once: true },
    );
    document.head.appendChild(link);
  });
}

function waitForLoad(element: HTMLElement): Promise<void> {
  return new Promise((resolve) => {
    element.addEventListener("load", () => resolve(), { once: true });
    element.addEventListener("error", () => resolve(), { once: true });
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
