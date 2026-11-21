# Configuration guide

Configuration is the source of truth for site identity, content locations, publishing, extensions, and presentation. Change it narrowly and verify the resolved result.

## Inspect first

Read:

- `riebeckite.config.ts` (or `.js`/`.mjs`).
- `package.json` scripts and dependencies.
- The configured content directory and ignore/exclude rules.
- Deployment files and environment variable names.
- Installed Plugins and the active Theme.

Useful commands:

```sh
npm exec riebeckite inspect config
npm run check
npm run doctor
npm run build
```

`inspect config` shows resolved values; it is more reliable than reading only the source when defaults or environment values are involved.

## Common configuration areas

```ts
import { defineConfig } from "@riebeckite/core";

export default defineConfig({
  site: {
    title: "My site",
    description: "A short description",
    baseUrl: "https://example.com",
    locale: "en",
  },
  content: {
    directory: "content",
    exclude: [".obsidian/**", "templates/**"],
  },
  filters: {
    publishStrategy: "explicit",
  },
  plugins: [],
});
```

Keep the actual fields and extension factories used by the project. This example is illustrative, not a schema replacement.

- `site`: title, description, public origin, default locale, and site-wide metadata.
- `content`: directory, excludes, and content-format settings.
- `filters`: publishing and collection behaviour, including `publishStrategy`.
- `theme`: active Theme, layout, colour mode, settings, and site stylesheets.
- `plugins`: official or local extension factories.
- Deployment settings: provider-specific files, build output, and external content checkout.

## Change rules

1. Prefer the smallest existing option over a new one.
2. Preserve unknown fields; do not normalize the whole file.
3. Change `baseUrl` only when the public origin truly changes.
4. Treat `content.directory`, excludes, locale, and publish strategy as route-affecting.
5. Do not put credentials, tokens, or private URLs in committed configuration.
6. Keep script names consistent with the project's existing commands.
7. Do not add a dependency for a value that configuration or the standard library can express.

## Validation matrix

| Change | Validate with |
| --- | --- |
| Site title, description, metadata | `npm run check`, inspect built HTML. |
| `baseUrl` or base path | `npm run build`, inspect canonical, assets, and links. |
| Content directory or excludes | `inspect config`, `inspect content --list`, `npm run build`. |
| Publish strategy | `inspect content --list`, verify listings/feeds/private pages. |
| Locale | Build and inspect language routes and canonical/alternate URLs. |
| Plugin or Theme settings | `npm run check`, `npm run build`, inspect affected page. |
| Scripts | Run the script directly; do not assume it works because it parses. |

## Secrets

Use environment variables or the deployment provider's secret store. Never commit values. When reporting, name the variable, not its contents. Do not expose secrets in URLs, logs, or generated client code.

## Common failures

| Symptom | Likely cause |
| --- | --- |
| Content is not found | Wrong `content.directory`, exclude match, or working directory. |
| Assets 404 after deployment | Wrong `baseUrl`, base path, or output directory. |
| Pages unexpectedly private | Publish strategy or frontmatter visibility. |
| Config change has no effect | Cached build, wrong config file, or resolved value overridden elsewhere. |
| Check passes but build fails | Runtime-only path, asset, or environment issue. |

## Report

State the setting changed, why the smallest option was chosen, resolved values, commands run, and any route, publication, or deployment impact.
