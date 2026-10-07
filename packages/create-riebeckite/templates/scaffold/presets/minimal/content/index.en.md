---
publish: true
---

# {{title}}

Welcome to your Riebeckite site. This is the smallest useful preset: one page, one plugin, and the `minimal` theme.

## How this site is built

- `app/routes/_renderer.tsx` wraps every page in the shared HTML shell.
- `app/routes/index.tsx` renders this page, and `app/routes/[slug{.+}].tsx` renders every other page.
- `app/components/article.tsx` lays out an article.
- `riebeckite.config.ts` registers the plugin and the theme.

## Edit this site

Content lives in `content/` as plain Markdown. Change this file and the browser updates while you write. Add another `.md` file with `publish: true` in its frontmatter and it becomes a page.

## Add a feature

Install a plugin package and register its factory in `riebeckite.config.ts`. The `starter` preset shows a practical plugin set, and `showcase` demonstrates the complete ecosystem.
