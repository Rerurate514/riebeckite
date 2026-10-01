# @riebeckite/plugin-map

Turns a ` ```map ` fenced code block and/or frontmatter coordinates into an
embedded map. The page is rendered with a static fallback first (coordinates,
place name, OpenStreetMap links, and an optional static image), and upgraded to
an interactive Leaflet map in the browser only when a map is present.

[日本語](./README_ja.md)

## Configure

```ts
import { defineConfig } from "@riebeckite/core";
import { map } from "@riebeckite/plugin-map";

export default defineConfig({
  // ...
  plugins: [
    map({
      zoom: 13,
      height: 320,
      // Keyless default; see "Tiles and attribution" before changing it.
      tileUrl: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }),
  ],
});
```

The plugin runs with `order: -10`.

## Syntax

### Fenced code block

The block body is a small key/value format. A marker list follows `markers:` as
bullets, and a bare `lat, lng` line is an implicit marker.

````markdown
```map
center: 35.6812, 139.7671
zoom: 13
label: Tokyo Station
markers:
  - 35.6812, 139.7671 | Tokyo Station
  - 35.6586, 139.7454 | Tokyo Tower | A lattice tower
```
````

Marker lines use `lat, lng` or `lat, lng | label | description`. The block
`title` becomes the caption when present.

### Frontmatter

Coordinates in frontmatter produce one map at the top of the article. The
property name defaults to `map` and is configurable with `frontmatterKey`.

```yaml
---
title: A trip
map:
  lat: 35.6812
  lng: 139.7671
  zoom: 13
  label: Tokyo Station
  markers:
    - 35.6812, 139.7671 | Tokyo Station
    - lat: 35.6586
      lng: 139.7454
      label: Tokyo Tower
---
```

`lat`/`lng` also accept `latitude`/`longitude`, `coordinates: [lat, lng]` or
`coordinates: "lat, lng"`, and `label` also accepts `title`/`place`/`name`.

## How it renders

A block or frontmatter map becomes a `figure.rr-map`:

- `figure.rr-map`: carries `data-rr-map="pending"` and
  `data-rr-map-payload` (the resolved map data as JSON)
- `div.rr-map__canvas [data-rr-map-canvas]`: the element Leaflet renders into
- `figcaption.rr-map__caption`: the caption, when present
- `div.rr-map__static`: the always-available fallback, with
  `p.rr-map__place`, `ul.rr-map__markers` → `a.rr-map__link` (OpenStreetMap
  links), an optional `img.rr-map__image`, and `p.rr-map__attribution`
- `details.rr-map__fallback`: the raw block source, folded away

`initMap` finds every `[data-rr-map="pending"]`, loads Leaflet lazily, draws the
tile layer and markers, and flips the figure to `data-rr-map="rendered"` (the
static fallback is then hidden). On failure the figure becomes
`data-rr-map="error"`, the `details` block opens, and the static fallback stays
visible.

A block with no coordinates and no `center` is left as a normal code block, and
a diagnostic with `source: "@riebeckite/plugin-map"` is emitted.

## Options

| Option | Default | Description |
| --- | --- | --- |
| `language` | `"map"` | Fenced-code language to recognize |
| `className` | `"rr-map"` | Base class applied to the figure |
| `height` | `320` | Map height in pixels |
| `zoom` | `13` | Default zoom level (0–19) |
| `minZoom` | `1` | Minimum zoom level |
| `maxZoom` | `19` | Maximum zoom level |
| `tileUrl` | OpenStreetMap standard tiles | Tile URL template (`{z}`/`{x}`/`{y}`) |
| `attribution` | OpenStreetMap attribution | Attribution HTML required by the provider |
| `fallback` | `true` | Render the `<details>` block with the raw source |
| `staticFallback` | `true` | Render the static fallback block |
| `staticImageUrl` | — | Static image URL template (`{lat}`/`{lng}`/`{zoom}`/`{width}`/`{height}`) |
| `frontmatterKey` | `"map"` | Frontmatter property read for coordinates |

## Tiles and attribution

The default is the keyless
[OpenStreetMap standard tile layer](https://tile.openstreetmap.org/). It is fine
for low-traffic sites, but OpenStreetMap's
[tile usage policy](https://operations.osmfoundation.org/policies/tiles/)
expects a valid identifying referrer and forbids bulk or heavy use. Sites with
meaningful traffic should point `tileUrl` at their own tile server or a
commercial provider.

Attribution is not optional. `attribution` is passed to Leaflet and rendered in
the static fallback (as plain text). Keep the provider's required credit visible.

The plugin ships no API keys or credentials. If a provider's tile or static
image URL needs a key, that key travels to the browser and is therefore public;
prefer a keyless server or a proxy that keeps the key server-side. Only the
tile URL, attribution, and zoom bounds are exposed through `publicConfig`; no
plugin option is copied there implicitly.

## Client rendering

Leaflet (`leaflet.js` + `leaflet.css`) is fetched from jsDelivr only when at
least one `[data-rr-map="pending"]` figure exists. Because the library is loaded
lazily, pages without maps pay nothing, and pages with maps still show the
static fallback when JavaScript is disabled or the CDN is unreachable.

`initMap(options?)` accepts `tileUrl`, `attribution`, `minZoom`, `maxZoom`,
`leafletScriptUrl`, `leafletStyleUrl`, and a preloaded `runtime` (used by tests
to inject a fake Leaflet).

## Output hooks

- `figure[data-rr-map]`: state (`pending` / `rendered` / `error`)
- `figure[data-rr-map-payload]`: resolved map data as JSON
- `[data-rr-map-canvas]`: Leaflet render target
- `[data-rr-map-static]`: static fallback block
- `details.rr-map__fallback`: raw block source

## Main exports

- `map(options?)`: create the plugin (`mapPlugin` is an alias)
- `initMap`: initialize client-side maps
- `parseMapSource`: parse a fenced block into `MapData`
- `normalizeMapInput`: normalize frontmatter into `MapData`
- `describeMap`, `formatCoordinates`, `openStreetMapUrl`
- Types: `MapOptions`, `MapData`, `MapMarker`, `MapPayload`, `MapClientOptions`

## Limitations

- Rendering is client-only. Without JavaScript the page shows the static
  fallback (coordinates, place, OpenStreetMap links, optional image) but no
  interactive map.
- The first interactive render waits on the CDN for Leaflet and the tiles.
- The tile provider's terms and attribution are the site owner's responsibility.
- Leaflet is BSD-2-Clause licensed; the default OpenStreetMap tiles are
  © OpenStreetMap contributors (ODbL).

## See also

- [Plugin system](../../../docs/en/docs/reference/plugin-api.md)

