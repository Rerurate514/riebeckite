---
publish: true
---

# Getting started

This site was generated from a Riebeckite scaffold preset.
Everything below lives in this repository, ready to edit.

## Run the site

```sh
npm install
npm exec riebeckite dev
```


Open the URL printed in the terminal. The page reloads every time
you save a Markdown file.

## Add a page

Create `content/hello.md`:

```md
---
publish: true
---

# Hello

This is my second page.
```


The dev server serves it at `/hello`.

## Link the pages

Write `[[hello]]` anywhere and it becomes a link to that page.

## Translate a page

Copy a file next to the original with the language suffix, for
example `hello.ja.md`. The language switcher picks it up.

## Build

```sh
npm exec riebeckite build
```


The static site is written to `dist/`.

## Extend

Plugins and themes are registered in `riebeckite.config.ts`.
Install a package, import its factory, and add it to the `plugins`
array, or point `theme` at a new theme factory.
