# Official Plugin catalog

## Source of truth

When the Riebeckite MCP server is available, call `riebeckite_plugin_catalog` to search published `@riebeckite/plugin-*` packages by capability or package name. Otherwise browse <https://riebeckite.dev/docs/plugins/> before choosing a dependency. The catalog links to each Plugin's API, setup, content syntax, requirements, and compatibility notes; use <https://riebeckite.dev/docs/plugins/showcase> when rendered behavior matters.

Do not maintain a copied package list in application code: the catalog changes independently of this scaffold.

## Start with the requested outcome

| Need | First candidates |
| --- | --- |
| Obsidian notes, WikiLinks, embeds, callouts | Obsidian Markdown; add Attachment, Canvas, Excalidraw, or Bases only when needed |
| Search and discovery | Search, Backlinks, Local Graph, Garden Explorer, Related Posts, Recent Posts |
| Tags, folders, queries, generated listings | Taxonomy, Query, Dataview, Folder Pages, Archive, Timeline |
| Diagrams, charts, or slides | Mermaid, Mermaid (Pele), D2, Graphviz, PlantUML, Chart.js, Vega-Lite, Marp |
| Images, video, PDFs, or link cards | Image Optimizer, Responsive Image, Lightbox, Media, PDF, Rich Embed, AutoCardLink |
| Publishing, metadata, and sharing | SEO, OG Image, Article Metadata, Permalink, Rename, Share, Webmention |
| Language, documentation, quality, or migrations | Localization, Docs, Quality, Diagnostics, Frontmatter Transformer |

The table is a starting point, not proof of fit. Check the Plugin reference for its syntax, options, and generated output.

## Selection rules

- Prefer a Plugin over recreating its feature in an app component or ad-hoc Markdown transform.
- Prefer the narrowest Plugin: use Mermaid (Pele) when Chromium is unavailable; use Diagnostics or Quality for inspection rather than a custom checker.
- Add plugins independently. Do not install a broad bundle to obtain one feature.
- Verify prerequisites and companion plugins. For example, attachment rendering and link previews can depend on Obsidian Markdown; styling may require an explicit CSS import.
- Do not add server-side or browser-side behavior merely for a build-time request.

## Safe installation

Install the chosen package with the repository's package manager, then add its documented factory to `plugins` in `riebeckite.config.ts`. Preserve existing order unless the Plugin documentation requires an order. Run `npm run check` and `npm run build` after the change.
