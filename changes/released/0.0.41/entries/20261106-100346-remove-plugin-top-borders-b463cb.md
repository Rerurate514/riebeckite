---
packages:
  - "@riebeckite/plugin-article-metadata"
  - "@riebeckite/plugin-backlinks"
  - "@riebeckite/plugin-changelog"
  - "@riebeckite/plugin-daily-notes"
  - "@riebeckite/plugin-diff"
  - "@riebeckite/plugin-local-graph"
  - "@riebeckite/plugin-recent-posts"
  - "@riebeckite/plugin-related-posts"
  - "@riebeckite/plugin-sidenotes"
  - "@riebeckite/plugin-toc"
  - "@riebeckite/plugin-webmention"
  - "@riebeckite/theme-default"
  - "@riebeckite/theme-editorial"
  - "@riebeckite/theme-folio"
  - "@riebeckite/theme-garden"
  - "@riebeckite/theme-gruvbox"
  - "@riebeckite/theme-minimal"
  - "@riebeckite/theme-rerurate"
  - "@riebeckite/theme-sakura"
  - "@riebeckite/theme-tokyonight"
type: changed
breaking: false
migration: ""
pr: ""
issue: ""
adr: ""
---

Remove the top border from trailing plugin sections and the theme rules that re-added it. Stacked sections such as Recent Posts and Related Posts are now separated by spacing only, and Article Metadata and Table of Contents keep their bottom rule.
