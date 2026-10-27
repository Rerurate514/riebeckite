# @riebeckite/theme-signal

<!-- Generated from docs/docs/themes/signal.md. Edit the canonical documentation in docs/docs/themes and run `pnpm docs:sync`. -->

[日本語](./README_ja.md)

`@riebeckite/theme-signal` provides the **Signal** official theme. Its identity is `signal`: a Swiss neo-brutalist reading surface with graphic rules and markers.

## Use it

```ts
import { defineConfig } from "@riebeckite/core";
import { signalTheme } from "@riebeckite/theme-signal";

export default defineConfig({
  theme: signalTheme({
    colorMode: "system",
    preset: "editorial",
    settings: { accentColor: "#e63b17" },
  }),
});
```

`colorMode` is `"light"`, `"dark"`, or `"system"`; `layout` is `"article"`, `"sidebar"`, or `"full-width"`; `stylesheets` adds site-owned stylesheets after theme CSS. A preset is applied before explicit `settings`.

## Settings

Signal provides `accentColor`, `borderWeight`, `typography`, `density`, and `markers`. Its presets are `poster`, `editorial`, and `reading`.

Settings are reflected as `data-rb-setting-<name>` attributes. The root carries `data-rb-theme="signal"`, `data-rb-mode` only for explicit light or dark mode, and `data-rb-layout`.

See [Theme API](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/reference/theme-api.md) and [Writing a theme](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/themes/writing-a-theme.md).
