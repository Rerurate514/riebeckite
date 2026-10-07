# starter

Recommended default: a practical Markdown garden with search, navigation, and reading essentials.

## What's included

- **Languages**: en, ja, zh-CN, es, de, fr, ko
- **Theme**: `@riebeckite/theme-default`
- **Plugins** (18): `@riebeckite/plugin-obsidian-markdown`, `@riebeckite/plugin-color-mode`, `@riebeckite/plugin-l10n`, `@riebeckite/plugin-seo`, `@riebeckite/plugin-toc`, `@riebeckite/plugin-properties`, `@riebeckite/plugin-alias`, `@riebeckite/plugin-code-enhance`, `@riebeckite/plugin-search`, `@riebeckite/plugin-backlinks`, `@riebeckite/plugin-breadcrumbs`, `@riebeckite/plugin-navigation`, `@riebeckite/plugin-related-posts`, `@riebeckite/plugin-recent-posts`, `@riebeckite/plugin-responsive-image`, `@riebeckite/plugin-lightbox`, `@riebeckite/plugin-series`, `@riebeckite/plugin-taxonomy`
- **Content pages**: /index, /guide, /examples

## Commands

```sh
npm install
npm exec riebeckite check
npm exec riebeckite dev
npm exec riebeckite build
```

## First edits

- `content/index.md`: the first published page.
- `riebeckite.config.ts`: set `site.title`, `site.baseUrl`, and `content.directory`.
- `public/favicon.ico`: replace the site icon when you are ready.
