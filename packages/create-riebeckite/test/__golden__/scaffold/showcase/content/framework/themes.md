---
publish: true
---

# Themes

A theme changes the whole look and feel of a site — colors, typography, and layout — without touching your content or routes. Riebeckite ships with six themes; switch by installing a package and changing one line.

## Theme gallery

```gallery
columns: 3
items:
  - title: "Default"
    description: "The default theme: clean design tokens, light/dark/system color modes, and article layouts."
    meta: "defaultTheme()"
    href: "https://github.com/Rerurate514/riebeckite/blob/main/packages/themes/default/README.md"
  - title: "Minimal"
    description: "A quiet, typography-first theme."
    meta: "minimalTheme()"
    href: "https://github.com/Rerurate514/riebeckite/blob/main/packages/themes/minimal/README.md"
  - title: "Sakura"
    description: "A soft pink palette with warm accents."
    meta: "sakuraTheme()"
    href: "https://github.com/Rerurate514/riebeckite/blob/main/packages/themes/sakura/README.md"
  - title: "Gruvbox"
    description: "A warm, retro palette inspired by Gruvbox."
    meta: "gruvboxTheme()"
    href: "https://github.com/Rerurate514/riebeckite/blob/main/packages/themes/gruvbox/README.md"
  - title: "Tokyo Night"
    description: "A modern night palette with an optional neon accent."
    meta: "tokyonightTheme()"
    href: "https://github.com/Rerurate514/riebeckite/blob/main/packages/themes/tokyonight/README.md"
  - title: "Rerurate"
    description: "The author's personal design language."
    meta: "rerurateTheme()"
    href: "https://github.com/Rerurate514/riebeckite/blob/main/packages/themes/rerurate/README.md"
```

## Switching themes

This starter uses `@riebeckite/theme-default`. To try another theme:

Install the package:

```sh
npm install @riebeckite/theme-sakura
```

Point `theme` at the new factory in `riebeckite.config.ts`:

```ts
import { sakuraTheme } from "@riebeckite/theme-sakura";

export default defineConfig({
  theme: sakuraTheme(),
});
```

## The bundled themes

| Theme | Description |
| --- | --- |
| [`@riebeckite/theme-default`](https://github.com/Rerurate514/riebeckite/blob/main/packages/themes/default/README.md) · `defaultTheme()` | The default theme: clean design tokens, light/dark/system color modes, and article layouts. |
| [`@riebeckite/theme-minimal`](https://github.com/Rerurate514/riebeckite/blob/main/packages/themes/minimal/README.md) · `minimalTheme()` | A quiet, typography-first theme. |
| [`@riebeckite/theme-sakura`](https://github.com/Rerurate514/riebeckite/blob/main/packages/themes/sakura/README.md) · `sakuraTheme()` | A soft pink palette with warm accents. |
| [`@riebeckite/theme-gruvbox`](https://github.com/Rerurate514/riebeckite/blob/main/packages/themes/gruvbox/README.md) · `gruvboxTheme()` | A warm, retro palette inspired by Gruvbox. |
| [`@riebeckite/theme-tokyonight`](https://github.com/Rerurate514/riebeckite/blob/main/packages/themes/tokyonight/README.md) · `tokyonightTheme()` | A modern night palette with an optional neon accent. |
| [`@riebeckite/theme-rerurate`](https://github.com/Rerurate514/riebeckite/blob/main/packages/themes/rerurate/README.md) · `rerurateTheme()` | The author's personal design language. |

## Every theme supports light/dark color modes, typography, and article layouts; see each README for the full option list.


[Riebeckite themes on GitHub](https://github.com/Rerurate514/riebeckite/tree/main/packages/themes)

