# @riebeckite/theme-terminal

<!-- Generated from docs/docs/themes/terminal.md. Edit the canonical documentation in docs/docs/themes and run `pnpm docs:sync`. -->

[日本語](./README_ja.md)

`@riebeckite/theme-terminal` provides the **Terminal** official theme. Its identity is `terminal`: a restrained phosphor CLI surface for code and technical notes.

## Use it

```ts
import { defineConfig } from "@riebeckite/core";
import { terminalTheme } from "@riebeckite/theme-terminal";

export default defineConfig({
  theme: terminalTheme({
    colorMode: "system",
    preset: "classic",
    settings: { phosphor: "green" },
  }),
});
```

`colorMode` is `"light"`, `"dark"`, or `"system"`; `layout` is `"article"`, `"sidebar"`, or `"full-width"`; `stylesheets` adds site-owned stylesheets after theme CSS. A preset is applied before explicit `settings`.

## Settings

Terminal provides `phosphor`, `scanlines`, `glow`, `frameStyle`, and `cursor`. Its presets are `classic`, `amber`, and `modern`. Cursor motion is disabled when reduced motion is requested.

Settings are reflected as `data-rb-setting-<name>` attributes. The root carries `data-rb-theme="terminal"`, `data-rb-mode` only for explicit light or dark mode, and `data-rb-layout`.

See [Theme API](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/reference/theme-api.md) and [Writing a theme](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/themes/writing-a-theme.md).
