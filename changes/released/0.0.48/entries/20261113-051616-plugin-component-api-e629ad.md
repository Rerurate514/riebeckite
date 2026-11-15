---
packages:
  - "@riebeckite/core"
  - "@riebeckite/honox"
  - "@riebeckite/cli"
  - "@riebeckite/plugin-backlinks"
  - "@riebeckite/plugin-breadcrumbs"
  - "@riebeckite/plugin-changelog"
  - "@riebeckite/plugin-code-enhance"
  - "@riebeckite/plugin-code-tabs"
  - "@riebeckite/plugin-diff"
  - "@riebeckite/plugin-docs"
  - "@riebeckite/plugin-image-compare"
  - "@riebeckite/plugin-l10n"
  - "@riebeckite/plugin-local-graph"
  - "@riebeckite/plugin-properties"
  - "@riebeckite/plugin-related-posts"
  - "@riebeckite/plugin-series"
  - "@riebeckite/plugin-share"
  - "@riebeckite/plugin-webmention"
type: changed
breaking: true
migration: "Replace PluginComponent with PluginSiteComponent and definePluginComponent with defineMarkdownComponent. Rename the plugin manifest field components to markdownComponents, and hastComponents to hastTransforms. Replace PluginHastComponent with PluginHastTransform and defineHastComponent with defineHastTransform. HAST transforms no longer accept a client entry. The public names preparePluginComponent, PreparedPluginComponent, renderPluginComponents, renderHastComponents, replaceHastComponents, and finalizeDeferredPluginComponents are renamed to their Markdown/HAST-specific equivalents. The code-tabs export codeTabsHastComponent is now codeTabsTransform."
pr: ""
issue: ""
adr: ""
---

Separate the three plugin extension mechanisms by responsibility. `PluginSiteComponent` is a JSX component the site places, `markdownComponents` renders HTML from Markdown fences and MDX with optional client hydration, and `hastTransforms` transforms sanitized document nodes without a client entry. Duplicate names are checked separately for Markdown components and HAST transforms, so both may use the same name. The diff plugin renders its history, viewer, panel, and lines with Hono JSX while keeping the existing string-returning public functions as boundaries.

| Old | New |
| --- | --- |
| `PluginComponent` | `PluginSiteComponent` |
| `definePluginComponent` | `defineMarkdownComponent` |
| `PluginComponentClient` | `PluginMarkdownComponentClient` |
| `PluginComponentResolveContext` | `PluginMarkdownComponentResolveContext` |
| `components` | `markdownComponents` |
| `PluginHastComponent` | `PluginHastTransform` |
| `defineHastComponent` | `defineHastTransform` |
| `hastComponents` | `hastTransforms` |
| `preparePluginComponent` | `prepareMarkdownComponent` |
| `PreparedPluginComponent` | `PreparedMarkdownComponent` |
| `renderPluginComponents` | `renderMarkdownComponents` |
| `renderHastComponents` | `renderHastTransforms` |
| `replaceHastComponents` | `replaceHastTransforms` |
| `finalizeDeferredPluginComponents` | `finalizeDeferredMarkdownComponents` |
| `codeTabsHastComponent` | `codeTabsTransform` |
