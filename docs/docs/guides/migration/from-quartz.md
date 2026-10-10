---
title: Migrate from Quartz
sidebar:
  label: From Quartz
---
# Migrate from Quartz

## Overview

This guide covers digital garden with Markdown content. It is a **content migration**, not a binary or configuration conversion. Riebeckite is a static, Markdown-first site framework with a plugin, theme, and HonoX application boundary; Quartz 4.x has its own runtime and conventions. Content-only sites are usually practical to migrate. The difficulty is moderate when URLs and Markdown are conventional, and high when the site depends on Transformer / Filter / Emitter / Component / Layout.

**Evidence basis:** source behavior is checked against the official Quartz documentation for 4.x: [official documentation](https://quartz.jzhao.xyz/configuration). Re-check release notes and installed extensions before acting on this guide.

## Before You Migrate

- Create a Git backup, export the current URL list, and retain an asset backup.
- Use Node.js LTS, a terminal, and a separate destination directory.
- Inventory custom themes, extensions, generated pages, redirects, analytics, authentication, and host configuration.
- Quartz configuration and component layouts are not portable; rebuild them as Riebeckite plugins, theme CSS, or HonoX app code.
- This guide does not provide an automatic migration CLI or claim end-to-end verification against a live Quartz project.

## Platform-specific notes

Quartz pipeline concepts do not map one-for-one: Transformers change content, Filters select it, Emitters create output, and Components/Layouts render UI. In Riebeckite, use documented content/Plugin extension points for behavior, Theme CSS for presentation, and HonoX app code for routes or component structure.

## Feature Mapping

| Source capability | Riebeckite approach | Status |
| --- | --- | --- |
| Markdown pages and frontmatter | Put Markdown below the configured content root | Supported |
| Transformer / Filter / Emitter / Component / Layout | Rebuild with plugins, theme CSS, or application code | Manual Migration Required |
| Navigation and documentation hierarchy | Use Navigation or Docs plugin with published content and sidebar frontmatter | Partially Supported |
| Search, backlinks, graph | Enable the relevant Riebeckite plugins when needed | Partially Supported |
| Hosted/deployment-specific behavior | Configure the target host separately | Manual Migration Required |
| Unknown third-party extension behavior | Inspect its source and reproduce only verified behavior | Unverified |

## Step-by-Step Migration

1. **Back up the source repository and deployed URL inventory.** Keep the source online until redirects, assets, and crawl results are checked.
2. **Create a clean Riebeckite site.** Run `npx create-riebeckite my-site --preset starter`, then `cd my-site` and `npm install`. Do not run `init --force` in the source project.
3. **Copy or connect content deliberately.** Copy only public Markdown and referenced assets into `content/`, or set `content.directory` to a read-only source/vault path. content/ and quartz.config.ts is the usual source location.
4. **Normalize frontmatter.** Add `publish: true` to each public page. Preserve title, description, date, tags, image, canonical, and language fields after checking their values.
5. **Review Markdown and embeds.** Plain CommonMark-style Markdown transfers most safely. Replace source-specific directives, shortcodes, MDX, and template expressions individually; enable only the Riebeckite plugins that document equivalent syntax.
6. **Rebuild presentation and extensions.** Choose a preset/theme, use documented plugins, and implement genuinely site-specific routes or components in the generated HonoX app. Do not copy source theme or extension code as configuration.
7. **Preserve URLs and navigation.** Start with the default file-to-URL mapping, then use the Permalink plugin's `permalink` and `redirect_from` frontmatter where a legacy path must remain. Use Docs sidebar frontmatter or Navigation configuration for hierarchy.
8. **Validate and build locally.** Run `npm exec riebeckite check`, `npm exec riebeckite doctor`, and `npm exec riebeckite build`.
9. **Inspect output.** Use `npm exec riebeckite inspect content --list` and manually test links, assets, drafts, redirects, localized pages, search, and feeds.
10. **Deploy the built site.** Follow the deployment guide for Cloudflare Workers or use the host that serves `dist/`. Set `site.baseUrl` before the production build.

## Configuration Mapping

| Quartz configuration | Riebeckite replacement | Notes |
| --- | --- | --- |
| content/ and quartz.config.ts | `riebeckite.config.ts` plus `content/` | Do not mechanically convert configuration files. |
| Site title/base URL | `site.title`, `site.baseUrl` | Set the final public URL before production build. |
| Navigation/sidebar | Navigation plugin or Docs plugin | Docs uses published Markdown and `sidebar` frontmatter. |
| Theme/layout | Theme CSS or generated HonoX application | Theme is presentation only; routes/components belong to the app. |
| Extensions/plugins | Documented Riebeckite plugins | Install and configure each capability explicitly. |

A minimal safe configuration is:

```ts
import { defineConfig } from "@riebeckite/core";

export default defineConfig({
  site: { title: "My site", baseUrl: "https://example.com" },
  content: { directory: "content", filters: { publishStrategy: "explicit" } },
  plugins: [],
});
```

## URL and SEO Preservation

Riebeckite maps `content/index.md` to `/` and other content paths to slugs by default. Enabling `@riebeckite/plugin-permalink` changes its canonical default to `/n/<id>`; do not enable it as a URL-preservation step without an explicit policy. Use `permalink` and `redirect_from` frontmatter for entry-specific legacy URLs, or configure `path` or `resolvePath` for a site-wide policy. Verify redirect output on the deployed host—do not assume the host adds redirects itself.

Enable `@riebeckite/plugin-seo` for canonical metadata, sitemap, `robots.txt`, and RSS/Atom/JSON feeds. It honors a `canonical` field and resolved permalinks. Use `@riebeckite/plugin-l10n` only for actual translations; it emits `hreflang` for existing translations and does not create fallback pages. Local Markdown image references to files under `content/` are copied only when a public page references them; relative and root-relative image paths are normalized to site-root URLs. Keep referenced files within the content root and test every relative and root-relative path. Provide a host or app-level 404 page if the destination needs one; this guide does not assume automatic 404 parity.

## Common Issues

- **A page is absent:** add `publish: true`, verify `content.directory` and exclusions, then run `npm exec riebeckite inspect content --list`.
- **An old URL changed:** use explicit `permalink` or `redirect_from`; keep an ID stable when using rename detection.
- **Raw template syntax appears:** it is source-specific; replace it with Markdown, a documented plugin, or application code.
- **Sidebar order differs:** add `sidebar.label` and `sidebar.order` frontmatter and ensure the Docs root is correct.
- **Assets are broken:** inspect case, URL base, relative path, and the copied file before changing Markdown globally.

## Verification Checklist

- [ ] Source repository, URL list, and assets are backed up.
- [ ] Every intended public page has `publish: true`.
- [ ] `npm exec riebeckite check`, `doctor`, and `build` succeed.
- [ ] Canonical URLs, redirects, navigation, links, images, feeds, sitemap, and robots output are checked locally and after deployment.
- [ ] Draft/private content is absent from the production manifest and output.
- [ ] Custom source features are either manually rebuilt, intentionally removed, or documented as unsupported.

## Related Documentation

- [Migration guides](./README.md)
- [Writing content](../writing-content.md)
- [Obsidian vaults](../obsidian.md)
- [Configuration](../../reference/configuration.md)
- [CLI reference](../../reference/cli.md)
- [Permalink plugin](../../plugins/permalink.md)
- [SEO plugin](../../plugins/seo.md)
- [Deployment](../deployment/README.md)
