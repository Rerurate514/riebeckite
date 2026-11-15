---
packages:
  - "@riebeckite/core"
  - "@riebeckite/cli"
  - "@riebeckite/node"
  - "@riebeckite/dev-inspector"
  - "@riebeckite/honox"
  - "@riebeckite/plugin-mdx"
  - "@riebeckite/plugin-search"
type: fixed
breaking: false
migration: ""
pr: ""
issue: ""
adr: ""
---

MDX content now produces correctly decoded plain text for search, excerpts, and headings, and the doctor no longer reports components imported by MDX as unused assets. Incremental SSG keeps navigation and recent-post projections reusable when only an MDX body changes, while still regenerating them when projected entries change. Link updates, provenance, source lookups, and the development inspector resolve non-Markdown content formats through the shared content format registry, and standalone SSG no longer loads its bundle twice when renderer chunks import it.
