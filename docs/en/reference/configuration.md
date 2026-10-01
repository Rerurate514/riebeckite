# Configuration

Create configuration with `defineConfig` and let the integration resolve it before content or plugins run. The required top-level field is `site`; optional sections are `content`, `markdown`, `theme`, and `plugins`.

```ts
import { defineConfig } from "@riebeckite/core";

export default defineConfig({
  site: { title: "My site", baseUrl: "https://example.com" },
  content: {
    directory: "content",
    exclude: ["drafts/**"],
    filters: { publishStrategy: "explicit" },
  },
  markdown: { syntaxHighlight: { theme: "github-dark" } },
  theme: { colorMode: "system", articleLayout: "article" },
  plugins: [],
});
```

## Content selection

`content.directory` selects the default filesystem location. Use `content.source` to provide a different `ContentSource`; do not configure two competing readers. `exclude` removes matching material before it becomes content. `filters.publishStrategy` controls the default publishing policy, and frontmatter can override the resolved publishing state.

### Publishing state

Publishing is resolved once in Core and exposed to plugins as two manifest views:

| View | Contains | Use for |
| --- | --- | --- |
| `manifest.publicEntries` | Routable entries: public and unlisted | page rendering and SSG paths |
| `manifest.discoverableEntries` | Public entries only | docs navigation, search, feeds, sitemap, taxonomy, graphs, backlinks, related/recent lists |

The default `publishStrategy` still applies when no explicit visibility is set.

| Frontmatter | Result |
| --- | --- |
| `visibility: public` | routable and discoverable |
| `visibility: unlisted` | routable by direct URL, but excluded from discovery surfaces |
| `visibility: draft` | not routable and not discoverable |
| `publishAt: 2026-01-01T00:00:00.000Z` | hidden before the build time, public on the first build after that time |
| no `visibility` / `publishAt` | falls back to `publishStrategy` (`explicit` requires `publish: true`; `selective` excludes `private: true` and `draft: true`) |

Malformed `visibility` or `publishAt` values fail the build instead of being guessed. Scheduled publishing is build-time only: Riebeckite does not start a runtime timer.

`exclude` is different from publishing. Excluded files never enter the content pipeline, so they are unavailable for links, metadata, graph analysis, and diagnostics. Draft, unlisted, and scheduled-before entries remain in the raw manifest for internal processing, but Core keeps them out of the route or discovery views according to the table above.

## Filesystem roots and external vaults

Riebeckite keeps the site application and its source material separate. The
following names describe different directories and must not be used
interchangeably:

| Name | Responsibility | Default / resolution base |
| --- | --- | --- |
| `appRoot` | The HonoX/Vite application: `app/`, `public/`, routes, generated styles, and build output configuration | Vite's `root` |
| `configRoot` | Directory containing `riebeckite.config.ts`, `.js`, or `.mjs` | `appRoot` |
| `contentRoot` | Absolute filesystem root for the configured content directory or Obsidian vault | `path.resolve(appRoot, content.directory)` |

`configRoot` determines where the config module is imported from. It does
**not** change the base for a relative `content.directory`: that base is always
`appRoot`. The integration resolves all three roots before running content or
plugins, and CLI commands reuse that result. Consequently, execution from a
nested directory, CI working directory, or editor task does not change which
vault is read.

### Recommended layout

Keep an Obsidian vault outside the site when it is used independently by
Obsidian, shared by multiple site applications, or stored in another Git
repository:

```text
workspace/
├─ site/
│  ├─ package.json
│  ├─ vite.config.ts
│  ├─ riebeckite.config.ts
│  ├─ app/
│  └─ public/
└─ vault/
   ├─ index.md
   ├─ notes/
   ├─ attachments/
   └─ media/
```

With this layout, the site configuration is explicit and portable:

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

An absolute `directory` is valid, but a relative path is normally easier to
move between developer machines and CI. Do not derive the value with
`process.cwd()`, and do not make `appRoot` point to the vault. The vault is
source data; Vite's application root must remain the site.

### Application-side content access

The HonoX integration resolves the content root automatically. An application
that constructs `ContentManager` for routes or islands must use the same
resolved absolute directory instead of the raw relative config value:

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

Construct `ContentManager` with `config.content.directory` after this step. It
is already absolute, so resolving it against a second base is an error-prone
duplicate transformation. If `content.source` is configured, it replaces the
filesystem reader; do not use it as a second reader for the same vault.

### Attachments and media

`obsidianMarkdown()` gives vault files logical paths relative to
`contentRoot`. For example, `![[attachments/report.pdf]]` is rendered by
`attachment()` and `![[media/interview.mp3]]` by `media()`. Their generated
URLs use this stable public shape:

```text
/assets/attachments/<logical-path-relative-to-the-vault>
```

`attachment()` reads the embedded file size from the resolved vault root and
rejects paths outside it. `media()` renders supported audio and video formats
using the same logical path. Rendering a URL does **not** copy a binary file
into the Vite public directory. The site application must copy only assets that
it intends to publish to `public/assets/attachments/`, preserving their logical
vault-relative paths. The reference application's
[`build_images.ts`](../../../apps/web/scripts/build_images.ts) shows an
incremental, referenced-asset-only implementation.

Do not copy the whole vault as a shortcut. It can expose private notes,
unreferenced attachments, and `.obsidian` metadata. Publish filtering and
asset-copy policy belong to the site application until the publish-boundary
check is introduced.

### Verification and troubleshooting

Run the CLI from a nested application directory to prove that configuration is
not tied to the current working directory:

```sh
cd site/app
pnpm exec riebeckite check
pnpm exec riebeckite doctor
pnpm exec riebeckite inspect config
pnpm exec riebeckite inspect content --list
pnpm exec riebeckite build
```

Use the results in this order:

1. `check` validates the config and plugin contracts.
2. `doctor` reports an unreadable or invalid filesystem content source.
3. `inspect config` confirms the resolved directory.
4. `inspect content --list` confirms the expected logical paths before you
   diagnose a WikiLink or embed.
5. `build` verifies the integration and route rendering.

If `riebeckite.config.ts` intentionally lives outside the Vite application,
pass `configRoot` to `riebeckiteVite()`. Keep `appRoot` set to the site root and
keep relative `content.directory` values relative to that root.

## Plugins and themes

Plugins accept plugin inputs, including `false`, `null`, and `undefined` for conditional configuration. Resolution discards disabled/falsy inputs, orders enabled plugins stably, and checks capabilities. Theme input can be a raw theme config or a declared theme. Keep framework-specific configuration at the integration/application boundary.

Configuration errors are reported as `ConfigValidationError`; do not catch and hide them. Run `riebeckite check` after changes. Continue with [Plugin system](plugin-api.md) or [Theme system](theme-api.md) for their option contracts.
