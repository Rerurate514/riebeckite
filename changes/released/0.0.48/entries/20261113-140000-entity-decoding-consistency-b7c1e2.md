---
packages:
  - "@riebeckite/plugin-toc"
  - "@riebeckite/plugin-hover-preview"
  - "@riebeckite/plugin-garden-explorer"
  - "@riebeckite/plugin-seo"
  - "@riebeckite/plugin-taxonomy"
  - "@riebeckite/plugin-map"
type: fixed
breaking: false
migration: ""
pr: ""
issue: ""
adr: ""
---

Decode HTML character references consistently through the shared `htmlToPlainText` helper. Numeric references such as `&#x3C;` no longer appear as raw entity text in table of contents titles, hover preview excerpts, garden explorer headings and bodies, SEO descriptions, taxonomy summaries, or map attribution.
