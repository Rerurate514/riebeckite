<!-- Generated from packages/plugins/deploy/README.md. Do not edit this page directly; edit the package README and run `pnpm docs:sync`. -->

# Deploy

Static hosting output helpers for Riebeckite. The plugin prepares the files a
deploy target needs and emits them through the build's generated-output sink.
It does not upload anything and never writes to the filesystem.

[日本語](./deploy.ja.md)

## Overview

`deployPlugin()` reads public redirects from the content manifest and plans the
provider-specific files for Cloudflare Pages, Netlify, Vercel, or GitHub Pages.
All planning is pure and deterministic: no timestamps, no randomness, and a
stable path order.

## Usage

```ts
import { defineConfig } from "@riebeckite/core";
import { deployPlugin } from "@riebeckite/plugin-deploy";

export default defineConfig({
  plugins: [
    deployPlugin({
      provider: ["cloudflare-pages", "github-pages"],
      cname: "example.com",
      headers: { "X-Frame-Options": "DENY" },
    }),
  ],
});
```

Redirects come only from `manifest.publicRedirects`, so unpublished notes never
leak their old paths into deploy files. A redirect whose target slug is missing
is skipped and reported with a `deploy-unresolved-redirect` diagnostic.

## Per-provider output

| Provider | Files |
| --- | --- |
| `cloudflare-pages`, `netlify` | `_redirects` (when redirects exist), `_headers` (when headers are configured) |
| `vercel` | `vercel.json` |
| `github-pages` | `.nojekyll`, `404.html`, `CNAME` (when configured), one `<from>/index.html` meta-refresh stub per redirect |

GitHub Pages has no `_redirects` syntax, so every redirect becomes an HTML stub
with a meta refresh and a `<link rel="canonical">`. A redirect from `/` is
skipped because the root cannot be stubbed.

## Public API

- `deployPlugin(options: DeployOptions): RiebeckitePlugin`
- `planDeployOutputs({ provider, redirects, options }): DeployOutput[]`
- `renderRedirectLines(redirects): string`
- `renderVercelConfig({ redirects, options }): string`
- `renderRedirectStub(redirect): string`

## Notes

- Multiple providers are unioned. Identical files collapse into one; the same
  path with different content throws.
- Redirect `from` values are resolved (`.` and `..` segments) before they become
  output paths, and every planned path passes `normalizeGeneratedOutputPath`.
- Uploading, cache invalidation, and provider authentication are out of scope.

## See also

- [Plugin guide](../reference/plugin-api.md)
