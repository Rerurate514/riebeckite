# @riebeckite/honox

The HonoX and Vite integration for Riebeckite. It connects portable Core
behavior to a HonoX application: application/config root resolution, the Vite
development and build workflow, static generation (SSG), generated plugin and
theme style entries, server mounting, and the public UI primitives.

[日本語](./README_ja.md)

## Overview

`@riebeckite/honox` is the framework bridge. Core stays portable; everything
HonoX, Vite, or Cloudflare specific lives here. A site registers the integration
in `vite.config.ts`, mounts Riebeckite endpoints in its HonoX server, and
imports the public UI primitives from `@riebeckite/honox/ui`.

## Installation

```sh
pnpm add @riebeckite/core @riebeckite/honox honox hono vite
```

`@riebeckite/honox` declares Core, HonoX, and Vite as dependencies, but a site
still installs `honox`, `hono`, and `vite` directly for its own build config.

## Usage

Register the integration in `vite.config.ts`:

```ts
import path from "node:path";
import { fileURLToPath } from "node:url";
import build from "@hono/vite-build/cloudflare-workers";
import {
  riebeckite,
  riebeckiteSsg,
  riebeckiteSsgExtensionMap,
} from "@riebeckite/honox";
import honox from "honox/vite";
import { defineConfig } from "vite";

const appRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [
    honox({ client: { input: ["/app/client.ts", "/app/style.css"] } }),
    riebeckite({ appRoot }),
    build(),
    riebeckiteSsg({
      entry: path.join(appRoot, "app/server.ts"),
      extensionMap: riebeckiteSsgExtensionMap(),
    }),
  ],
});
```

Mount plugin endpoints on the HonoX server:

```ts
import { mountRiebeckiteEndpoints } from "@riebeckite/honox/server";
import { createApp } from "honox/server";

const app = createApp({
  init: (app) => {
    mountRiebeckiteEndpoints(app, { config, content });
  },
});
```

`appRoot` defaults to the Vite root and is the base for `content.directory`;
`configRoot` defaults to `appRoot` and determines where `riebeckite.config.*` is
imported from. Installed npm consumers do not need `workspaceRoot`.

## Public API

### `@riebeckite/honox`

- `riebeckite(options?)` — Vite plugin (accepts `configRoot`, `appRoot`,
  `configFile`, and the monorepo-only `workspaceRoot`)
- `riebeckiteSsg(options?)` / `riebeckiteSsgExtensionMap()` — SSG integration
- `loadRiebeckiteConfig`, `resolveHonoxConfig`
- `resolveHonoxApplication`, `resolveHonoxApplicationRoot`,
  `buildHonoxApplication`, `startHonoxDevServer`
- Types: `RiebeckiteSsgOptions`, `ResolveHonoxApplicationOptions`,
  `ResolvedHonoxApplication`

The plugin also provides the bootstrap modules a generated site imports:
`virtual:riebeckite/config` (the resolved config) and
`virtual:riebeckite/content` (a configured `ContentManager`). Sites therefore no
longer need `app/config.ts`, `app/content.ts`, or `app/constants/paths.ts`.

### `@riebeckite/honox/runtime`

- `resolveHonoxConfig(config, appRoot)` — applies `appRoot` to a resolved
  config (build/output directories and absolute `content.directory`). It is a
  lightweight subpath, so scripts outside the Vite pipeline can resolve the same
  values without loading the Vite plugin.

### `@riebeckite/honox/server`

- `mountRiebeckiteEndpoints(app, { config, content })`
- `resolveContentRoute(manifest, path)`
- Type: `ResolvedContentRoute`

### `@riebeckite/honox/ui`

Structural composition primitives only: `Article`, `ArticleLayout`,
`ArticleHeader`, `ArticleContent`, `ArticleMeta`, `ArticleFooter`, `Sidebar`,
and their public `*Props` types. They provide semantic HTML, stable `rb-*`
styling hooks, and `class`/`className` composition; the site owns content,
layout, islands, and CSS.

## See also

- [HonoX Integration](../../../docs/docs/framework/honox-integration.md)
- [CLI Reference](../../../docs/docs/reference/cli.md)
- [Configuration](../../../docs/docs/reference/configuration.md)
- [Plugin System](../../../docs/docs/reference/plugin-api.md) / [Theme System](../../../docs/docs/reference/theme-api.md)

