# Riebeckite

> [日本語](./README_ja.md)

Riebeckite is an extensible content framework for publishing Markdown and Obsidian-oriented notes on the web. It separates content loading, interpretation, extensions, presentation, and builds, so a site can grow without turning its Markdown pipeline into one large application-specific process.

The repository is a pnpm monorepo. Its reference application uses HonoX, Vite, and Cloudflare Workers, while Core keeps the content contracts independent of those framework details.

## What it provides

- A content system that scans Markdown and assets, produces a manifest, and builds a graph of content relationships.
- A plugin system for Markdown and HTML transforms, assets, browser behavior, endpoints, SEO, diagnostics, and more.
- Theme contracts based on semantic CSS tokens, stable hooks, color modes, and typography settings.
- HonoX/Vite integration for development, static builds, and deployment-oriented applications.
- Build and operational tooling: incremental builds, plugin caches, diagnostics, Doctor, Inspector, logging, tracing, and profiling.

Included plugins cover Obsidian Markdown, WikiLinks and embeds, attachments, Mermaid, Excalidraw, media, syntax-highlighted code blocks, tabs, table of contents, backlinks, search, local graphs, garden exploration, SEO, feeds, and sitemaps.

## How the pieces connect

```text
Markdown and assets
        │
        ▼
ContentSource ── scan, read, and describe source files
        │
        ▼
ContentManager ── interpret content and coordinate processing
        ├── Manifest
        ├── Content Graph
        └── Pipeline
                     │
                     ▼
                  Plugins
                     │
                     ▼
        HonoX / Vite integration
                     │
                     ▼
       Application / Cloudflare Workers
```

Core owns portable contracts and orchestration. Plugins add reusable behavior, integrations adapt Core to external frameworks, themes own presentation, and an application owns its routes and site-specific components. See the [architecture guide](./docs/en/architecture.md) for the dependency rules.

## Get started

Install workspace dependencies, then validate the reference application from the repository root:

```bash
pnpm install
pnpm exec riebeckite check
pnpm exec riebeckite doctor
```

For day-to-day development of the included application:

```bash
pnpm dev
pnpm build
```

The CLI is intended to run from a root directory. Its main commands are:

```bash
pnpm exec riebeckite check          # validate configuration and plugins
pnpm exec riebeckite doctor         # run read-only health checks
pnpm exec riebeckite inspect        # inspect resolved framework state
pnpm exec riebeckite dev            # start development
pnpm exec riebeckite build          # run an incremental build
pnpm exec riebeckite build --full   # rebuild without incremental reuse
pnpm exec riebeckite profile        # produce a trace-based performance report
```

`check`, `doctor`, and `inspect` do not replace one another: validation, health diagnostics, and state inspection are separate operations. Read the [CLI reference](./docs/en/cli.md) before automating them.

## Use an external Obsidian vault

The site application and the Obsidian vault do not need to live in the same
directory. This is the recommended layout when the vault is also used by the
Obsidian desktop application or is versioned independently:

```text
workspace/
├─ site/                         # package.json, vite.config.ts, app/
│  └─ riebeckite.config.ts
└─ vault/                        # the Obsidian vault; not part of site/
   ├─ index.md
   ├─ notes/
   │  └─ project.md
   ├─ attachments/
   │  └─ proposal.pdf
   └─ media/
      └─ recording.mp3
```

### 1. Point the configuration at the vault

`content.directory` is resolved relative to the HonoX/Vite `appRoot`, **not**
the shell's current directory. With `riebeckite.config.ts` and
`vite.config.ts` in `site/`, configure the sibling vault as follows:

```ts
// site/riebeckite.config.ts
import { defineConfig } from "@riebeckite/core";
import { attachment } from "@riebeckite/plugin-attachment";
import { media } from "@riebeckite/plugin-media";
import { obsidianMarkdown } from "@riebeckite/plugin-obsidian-markdown";

export default defineConfig({
  site: { title: "My notes" },
  content: {
    directory: "../vault",
    exclude: [".obsidian/**", "Templates/**"],
  },
  plugins: [obsidianMarkdown(), media(), attachment()],
});
```

An absolute path also works. Relative paths are usually preferable because the
site and vault can be moved together without editing configuration. Do not use
`process.cwd()` to construct this path: commands can be invoked from a nested
directory, CI directory, or editor task. `riebeckite check`, `doctor`,
`inspect`, and `build` all use the same resolved absolute vault root.

### 2. Keep application-side content loading on the resolved path

The integration resolves `content.directory` for its own build. If the
application creates `ContentManager` itself for routes or islands, resolve the
same path once before constructing it:

```ts
// site/app/config.ts
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveConfigModule } from "@riebeckite/core";
import * as rawConfigModule from "../riebeckite.config";

const appRoot = fileURLToPath(new URL("../", import.meta.url));
const rawConfig = resolveConfigModule(rawConfigModule);

export const config = {
  ...rawConfig,
  content: {
    ...rawConfig.content,
    directory: path.resolve(appRoot, rawConfig.content.directory),
  },
};
```

```ts
// site/app/content.ts
import { ContentManager } from "@riebeckite/core";
import { config } from "./config";

export const content = new ContentManager(
  config.content.directory,
  config.content.exclude,
  { config, plugins: config.plugins },
);
```

Do not resolve the directory a second time against another base. After this
step it is already absolute. A custom `content.source` replaces filesystem
scanning; do not configure it as a second, competing reader for the same vault.

### 3. Configure Vite with the site as its application root

Keep `appRoot` pointed at the site, not at the vault. The vault is content data;
the Vite application owns routes, client entries, generated plugin styles, and
the output directory.

```ts
// site/vite.config.ts
import { fileURLToPath } from "node:url";
import { riebeckite } from "@riebeckite/honox";
import { defineConfig } from "vite";

const appRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [riebeckite({ appRoot })],
});
```

Set `configRoot` only when `riebeckite.config.ts` intentionally lives outside
the Vite application. It identifies the directory that contains the config;
it does not change the base used by relative `content.directory` values.

### 4. Publish binary attachments deliberately

`obsidianMarkdown()` converts `[[attachments/proposal.pdf]]` and
`![[media/recording.mp3]]` into URLs below
`/assets/attachments/<logical-vault-path>`. `attachment()` reads an embedded
file's size from the resolved vault root; `media()` renders audio/video embeds.
Neither plugin copies arbitrary vault binaries into the Vite public output.

Add a site-owned prebuild step that copies only the attachments you intend to
publish into `site/public/assets/attachments/`, preserving their paths relative
to the vault. The reference implementation is
[`apps/web/scripts/build_images.ts`](./apps/web/scripts/build_images.ts): it
collects referenced assets, copies incrementally, and removes no-longer-used
public files. Do not expose the entire vault blindly—private files and
Obsidian metadata must remain outside the deployment artifact.

### 5. Verify from a nested directory

This confirms that the result does not depend on the current working directory:

```bash
cd site/app
pnpm exec riebeckite check
pnpm exec riebeckite doctor
pnpm exec riebeckite inspect content --list
pnpm exec riebeckite build
```

If a filesystem path is wrong, `doctor` reports the content inspection failure.
Use `riebeckite inspect config` to see the resolved content directory and
`riebeckite inspect content --list` to verify that expected logical paths are
present before investigating Markdown links.

## Repository layout

| Path | Responsibility |
| --- | --- |
| [`packages/core`](./packages/core) | Content contracts, pipeline, plugin and theme APIs, diagnostics, and observability |
| [`packages/cli`](./packages/cli) | Node.js CLI and build-time tooling |
| [`packages/integrations/honox`](./packages/integrations/honox) | HonoX and Vite integration |
| [`packages/plugins`](./packages/plugins) | Reusable content, presentation, and publishing extensions |
| [`packages/themes`](./packages/themes) | Built-in CSS themes and token implementations |
| [`apps/web`](./apps/web) | Reference HonoX application |
| [`docs/en`](./docs/en/README.md) | English documentation |
| [`docs/ja`](./docs/ja/README.md) | Japanese documentation |

## Documentation

Start with the [English documentation index](./docs/en/README.md), especially:

1. [Getting Started](./docs/en/getting-started.md) for the workspace and a minimal configuration.
2. [Configuration](./docs/en/configuration.md) for `riebeckite.config.ts`.
3. [Content System](./docs/en/content-system.md) for sources, manifests, and graphs.
4. [Plugin System](./docs/en/plugin-system.md) or [Theme System](./docs/en/theme-system.md) before extending a site.

Package-specific documentation is kept beside each package. Japanese readers can use [README_ja.md](./README_ja.md) or the [Japanese documentation index](./docs/ja/README.md).

## Development

The root scripts are:

```bash
pnpm lint       # biome lint .
pnpm format     # format files with Biome
pnpm check      # apply Biome checks and fixes
pnpm build      # build the CLI and reference web application
```

Before changing Core, a plugin, an integration, or a theme, read [Repository Development](./docs/en/development.md) and the relevant architectural guide. Keep Core free of framework- and package-specific reverse dependencies.
