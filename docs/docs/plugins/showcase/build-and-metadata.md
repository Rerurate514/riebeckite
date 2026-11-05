# Plugins that act at build time or on metadata

These Plugins do not appear in the body. Their results show up as generated files, head tags, or redirects. Some are opt-in and not enabled on this site; the table describes what they generate.

| Plugin | What it generates |
| --- | --- |
| [`seo`](../seo.md) | sitemap.xml / robots.txt / feeds, plus canonical and OGP head tags |
| [`citations`](../citations.md) | Numbered citations and a References section |
| [`webmention`](../webmention.md) | webmentions.json and the send/receive endpoints |
| [`alias`](../alias.md) | Redirects from alternative names |
| [`series`](../series.md) | Previous/next navigation and landing pages from `series` frontmatter |
| [`recent-posts`](../recent-posts.md) | A list of recent notes, placed by the site |
| [`daily-notes`](../daily-notes.md) | Short snippets from Daily Notes, placed by the site |
| [`rename`](../rename.md) | Redirects from old paths |
| [`deploy`](../deploy.md) | Deployment config files for each host |
| [`diagnostics`](../diagnostics.md) | Diagnostics for orphan notes and unused assets |
| [`quality`](../quality.md) | Quality checks such as heading order and duplicate ids |
| [`hard-breaks`](../hard-breaks.md) | Converts soft line breaks to `<br>` at build time (opt-in) |
| [`mermaid`](../mermaid.md) | Build-time SVG via a headless browser (this site uses Mermaid (Pele)) |
| [`permalink`](../permalink.md) | Stable public URLs from frontmatter ids and redirects |
| [`analytics`](../analytics.md) | Collector configuration and the client event script |
| [`discord-embed`](../discord-embed.md) | Discord link-preview metadata |
| [`image-optimizer`](../image-optimizer.md) | WebP / AVIF variants used by Responsive Image |
| [`svg-optimizer`](../svg-optimizer.md) | Optimized SVG bytes at the same path |

See [Plugins in Depth](/series/plugins-in-depth-en) for a live series.
