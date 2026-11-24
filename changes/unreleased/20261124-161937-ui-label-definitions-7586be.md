---
packages:
  - "@riebeckite/core"
  - "@riebeckite/ui"
  - "@riebeckite/plugin-toc"
  - "@riebeckite/plugin-navigation"
  - "@riebeckite/plugin-search"
  - "@riebeckite/plugin-series"
  - "@riebeckite/plugin-l10n"
  - "@riebeckite/plugin-local-graph"
  - "@riebeckite/plugin-diff"
  - "@riebeckite/plugin-garden-explorer"
type: changed
breaking: true
migration: "Replace `ui.labels.<language>.<key>` with `ui.labels.<plugin>.<language>.<key>`. If you build UI with `@riebeckite/ui`, declare labels with `defineUiLabels(namespace, { en, ja })` and read them with `useUiLabels(definition)`. `DEFAULT_UI_LABELS`, the flat `UiLabels` type, and `resolveUiLabels(language, labels)` are removed."
pr: ""
issue: ""
adr: ""
---

Plugin UI strings now ship with the plugin that renders them, in English and Japanese. The UI follows the content language by default, `ui.locale` still pins it, and `ui.labels` overrides individual strings per plugin namespace, for example `ui.labels.search.ja.searchPlaceholder`. Sites no longer copy framework dictionaries into their config to get a translated interface.
