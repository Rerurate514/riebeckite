---
publish: true
---

# Getting started

This site was generated from a Riebeckite scaffold preset. Everything
you see lives in this repository, ready to edit.

## Add a page

Drop a Markdown file into `content/` with `publish: true` in its
frontmatter and it appears in the built site:

```md
---
publish: true
---

# Hello

Body text...
```


## Run the site

```sh
npm install
npm exec riebeckite dev
npm exec riebeckite build
```


## Localize a page

Add a translated file next to the default one using the
`<base>.<lang>.md` convention (`about.ja.md`, `about.en.md`). With the
l10n plugin enabled, translations are served under `/lang/` paths and
linked by the language switcher.

## Extend

Plugins and themes are registered in `riebeckite.config.ts`. Install a
package, import its factory, and add it to the `plugins` array or point
`theme` at a new theme factory.
