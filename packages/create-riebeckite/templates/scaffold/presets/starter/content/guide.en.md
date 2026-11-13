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

## Write an MDX page

Create a `.mdx` file when a page needs MDX syntax or a site component.
The starter includes the MDX plugin, and [the MDX demo](/mdx-demo) shows
a site component and a plugin component on one page.

## Build

```sh
npm exec riebeckite build
```


The static site is written to `dist/`.

## Extend

Plugins and themes are registered in `riebeckite.config.ts`.
Install a package, import its factory, and add it to the `plugins`
array, or point `theme` at a new theme factory.

## Interactive Markdown components

The starter enables `codeEnhance`, so the following fence renders a
`CodeCopy` button during the build and becomes interactive in the browser:

```riebeckite-component CodeCopy
text: "RIEBECKITE_SCAFFOLD_COMPONENT_MARKER"
label: "Copy example"
copiedLabel: "Copied example"
```

Each button keeps its own state. The second button copies text that looks
like markup, which is treated as data and never inserted as HTML:

```riebeckite-component CodeCopy
text: "<script>RIEBECKITE_SCAFFOLD_COMPONENT_MARKER</script>"
label: "Copy script text"
copiedLabel: "Copied script text"
```
