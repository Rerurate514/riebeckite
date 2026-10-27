---
title: Fieldnotes
---
# Fieldnotes

[日本語](./fieldnotes.ja.md)

`@riebeckite/theme-fieldnotes` provides the **Fieldnotes** official theme. Its identity is `fieldnotes`: a research notebook surface with paper, margins, and archival marks.

## Use it

```ts
import { defineConfig } from "@riebeckite/core";
import { fieldnotesTheme } from "@riebeckite/theme-fieldnotes";

export default defineConfig({
  theme: fieldnotesTheme({
    colorMode: "system",
    preset: "journal",
    settings: { paperStyle: "ruled" },
  }),
});
```

`colorMode` is `"light"`, `"dark"`, or `"system"`; `layout` is `"article"`, `"sidebar"`, or `"full-width"`; `stylesheets` adds site-owned stylesheets after theme CSS. A preset is applied before explicit `settings`.

## Settings

Fieldnotes provides `paperStyle`, `inkColor`, `marginRule`, `indexMarks`, and `texture`. Its presets are `journal`, `laboratory`, and `archive`.

Settings are reflected as `data-rb-setting-<name>` attributes. The root carries `data-rb-theme="fieldnotes"`, `data-rb-mode` only for explicit light or dark mode, and `data-rb-layout`.

See [Theme API](../reference/theme-api.md) and [Writing a theme](./writing-a-theme.md).
