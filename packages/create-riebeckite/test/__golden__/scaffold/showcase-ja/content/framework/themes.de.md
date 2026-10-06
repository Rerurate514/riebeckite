---
publish: true
---

# Themen

Ein Theme verändert das gesamte Erscheinungsbild einer Seite — Farben, Typografie, Layout — ohne dass du Inhalte oder Routen anfasst. Riebeckite bringt sechs Themes mit; der Wechsel ist eine Paketinstallation plus eine Zeile.

## Theme-Galerie

```gallery
columns: 3
items:
  - title: "Default"
    description: "Das Standard-Theme: klare Design-Tokens, Licht/Dunkel/System-Modi und Artikel-Layouts."
    meta: "defaultTheme()"
    href: "https://github.com/Rerurate514/riebeckite/blob/main/packages/themes/default/README.md"
  - title: "Minimal"
    description: "Ein ruhiges, typografieorientiertes Theme."
    meta: "minimalTheme()"
    href: "https://github.com/Rerurate514/riebeckite/blob/main/packages/themes/minimal/README.md"
  - title: "Sakura"
    description: "Eine weiche rosa Palette mit warmen Akzenten."
    meta: "sakuraTheme()"
    href: "https://github.com/Rerurate514/riebeckite/blob/main/packages/themes/sakura/README.md"
  - title: "Gruvbox"
    description: "Eine warme, von Gruvbox inspirierte Retro-Palette."
    meta: "gruvboxTheme()"
    href: "https://github.com/Rerurate514/riebeckite/blob/main/packages/themes/gruvbox/README.md"
  - title: "Tokyo Night"
    description: "Eine moderne Night-Palette mit optionalem Neon-Akzent."
    meta: "tokyonightTheme()"
    href: "https://github.com/Rerurate514/riebeckite/blob/main/packages/themes/tokyonight/README.md"
  - title: "Rerurate"
    description: "Die persönliche Designsprache des Autors."
    meta: "rerurateTheme()"
    href: "https://github.com/Rerurate514/riebeckite/blob/main/packages/themes/rerurate/README.md"
```

## Theme wechseln

Dieser Starter verwendet `@riebeckite/theme-default`. Um ein anderes Theme zu testen:

Installiere das Paket:

```sh
npm install @riebeckite/theme-sakura
```

Setze `theme` in `riebeckite.config.ts` auf den neuen Factory:

```ts
import { sakuraTheme } from "@riebeckite/theme-sakura";

export default defineConfig({
  theme: sakuraTheme(),
});
```

## Die mitgelieferten Themes

| Theme | Beschreibung |
| --- | --- |
| [`@riebeckite/theme-default`](https://github.com/Rerurate514/riebeckite/blob/main/packages/themes/default/README.md) · `defaultTheme()` | Das Standard-Theme: klare Design-Tokens, Licht/Dunkel/System-Modi und Artikel-Layouts. |
| [`@riebeckite/theme-minimal`](https://github.com/Rerurate514/riebeckite/blob/main/packages/themes/minimal/README.md) · `minimalTheme()` | Ein ruhiges, typografieorientiertes Theme. |
| [`@riebeckite/theme-sakura`](https://github.com/Rerurate514/riebeckite/blob/main/packages/themes/sakura/README.md) · `sakuraTheme()` | Eine weiche rosa Palette mit warmen Akzenten. |
| [`@riebeckite/theme-gruvbox`](https://github.com/Rerurate514/riebeckite/blob/main/packages/themes/gruvbox/README.md) · `gruvboxTheme()` | Eine warme, von Gruvbox inspirierte Retro-Palette. |
| [`@riebeckite/theme-tokyonight`](https://github.com/Rerurate514/riebeckite/blob/main/packages/themes/tokyonight/README.md) · `tokyonightTheme()` | Eine moderne Night-Palette mit optionalem Neon-Akzent. |
| [`@riebeckite/theme-rerurate`](https://github.com/Rerurate514/riebeckite/blob/main/packages/themes/rerurate/README.md) · `rerurateTheme()` | Die persönliche Designsprache des Autors. |

## Jedes Theme unterstützt Hell/Dunkel-Modi, Typografie und Artikel-Layouts; die vollständige Optionsliste steht im jeweiligen README.


[Riebeckite themes on GitHub](https://github.com/Rerurate514/riebeckite/tree/main/packages/themes)

