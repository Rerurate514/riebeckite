---
packages:
  - "@riebeckite/core"
  - "@riebeckite/honox"
  - "@riebeckite/plugin-article-metadata"
  - "@riebeckite/plugin-folder-pages"
  - "@riebeckite/plugin-garden-explorer"
  - "@riebeckite/plugin-navigation"
  - "@riebeckite/plugin-recent-posts"
  - "@riebeckite/plugin-seo"
  - "@riebeckite/plugin-taxonomy"
  - "@riebeckite/plugin-timeline"
type: fixed
breaking: false
migration: ""
pr: ""
issue: ""
adr: ""
---

Match `exclude` against logical content slugs so localized pages are filtered independently, keep authored calendar dates instead of UTC dates, fall back to the next valid date field when `published` is not a date, include notes dated only by `published` in Recent Posts, and center article-layout page bodies again.
