---
packages:
  - "@riebeckite/ui"
  - "@riebeckite/plugin-article-metadata"
  - "@riebeckite/plugin-autocardlink"
  - "@riebeckite/plugin-bases"
  - "@riebeckite/plugin-calculator"
  - "@riebeckite/plugin-canvas"
  - "@riebeckite/plugin-code-enhance"
  - "@riebeckite/plugin-flashcards"
  - "@riebeckite/plugin-image-compare"
  - "@riebeckite/plugin-marp"
  - "@riebeckite/plugin-navigation"
  - "@riebeckite/plugin-properties"
  - "@riebeckite/plugin-qr-code"
  - "@riebeckite/plugin-search"
  - "@riebeckite/plugin-series"
  - "@riebeckite/plugin-sidenotes"
  - "@riebeckite/plugin-taxonomy"
  - "@riebeckite/plugin-timeline"
type: changed
breaking: false
migration: ""
pr: ""
issue: ""
adr: ""
---

The remaining plugin UI strings now come from the shared label definitions in English and Japanese instead of hardcoded English, including the search status messages, copy buttons, canvas, bases views, slides, and timeline labels. Overrides use the same `ui.labels.<plugin>.<language>.<key>` shape. `@riebeckite/ui` also exposes a `@riebeckite/ui/labels` entry point for code that needs label resolution without the component runtime.
