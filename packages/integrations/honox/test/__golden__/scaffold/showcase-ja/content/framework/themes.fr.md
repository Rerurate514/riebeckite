---
publish: true
---

# Thèmes

Un thème change tout l'aspect d'un site — couleurs, typographie, mise en page — sans toucher au contenu ni aux routes. Riebeckite fournit six thèmes ; installez un paquet et changez une ligne.

## Galerie des thèmes

```gallery
columns: 3
items:
  - title: "Default"
    description: "Le thème par défaut : tokens épurés, modes clair/sombre/système et mises en page d'article."
    meta: "defaultTheme()"
    href: "https://github.com/Rerurate514/riebeckite/blob/main/packages/themes/default/README.md"
  - title: "Minimal"
    description: "Un thème sobre, axé sur la typographie."
    meta: "minimalTheme()"
    href: "https://github.com/Rerurate514/riebeckite/blob/main/packages/themes/minimal/README.md"
  - title: "Sakura"
    description: "Une palette rose douce aux accents chaleureux."
    meta: "sakuraTheme()"
    href: "https://github.com/Rerurate514/riebeckite/blob/main/packages/themes/sakura/README.md"
  - title: "Gruvbox"
    description: "Une palette rétro chaleureuse inspirée de Gruvbox."
    meta: "gruvboxTheme()"
    href: "https://github.com/Rerurate514/riebeckite/blob/main/packages/themes/gruvbox/README.md"
  - title: "Tokyo Night"
    description: "Une palette nocturne moderne avec accent néon optionnel."
    meta: "tokyonightTheme()"
    href: "https://github.com/Rerurate514/riebeckite/blob/main/packages/themes/tokyonight/README.md"
  - title: "Rerurate"
    description: "Le langage de design personnel de l'auteur."
    meta: "rerurateTheme()"
    href: "https://github.com/Rerurate514/riebeckite/blob/main/packages/themes/rerurate/README.md"
```

## Changer de thème

Ce starter utilise `@riebeckite/theme-default`. Pour essayer un autre thème :

Installez le paquet :

```sh
npm install @riebeckite/theme-sakura
```

Pointez `theme` vers le nouveau factory dans `riebeckite.config.ts` :

```ts
import { sakuraTheme } from "@riebeckite/theme-sakura";

export default defineConfig({
  theme: sakuraTheme(),
});
```

## Les thèmes inclus

| Thème | Description |
| --- | --- |
| [`@riebeckite/theme-default`](https://github.com/Rerurate514/riebeckite/blob/main/packages/themes/default/README.md) · `defaultTheme()` | Le thème par défaut : tokens épurés, modes clair/sombre/système et mises en page d'article. |
| [`@riebeckite/theme-minimal`](https://github.com/Rerurate514/riebeckite/blob/main/packages/themes/minimal/README.md) · `minimalTheme()` | Un thème sobre, axé sur la typographie. |
| [`@riebeckite/theme-sakura`](https://github.com/Rerurate514/riebeckite/blob/main/packages/themes/sakura/README.md) · `sakuraTheme()` | Une palette rose douce aux accents chaleureux. |
| [`@riebeckite/theme-gruvbox`](https://github.com/Rerurate514/riebeckite/blob/main/packages/themes/gruvbox/README.md) · `gruvboxTheme()` | Une palette rétro chaleureuse inspirée de Gruvbox. |
| [`@riebeckite/theme-tokyonight`](https://github.com/Rerurate514/riebeckite/blob/main/packages/themes/tokyonight/README.md) · `tokyonightTheme()` | Une palette nocturne moderne avec accent néon optionnel. |
| [`@riebeckite/theme-rerurate`](https://github.com/Rerurate514/riebeckite/blob/main/packages/themes/rerurate/README.md) · `rerurateTheme()` | Le langage de design personnel de l'auteur. |

## Chaque thème prend en charge les modes clair/sombre, la typographie et les mises en page d'article ; voir chaque README pour la liste complète des options.


[Riebeckite themes on GitHub](https://github.com/Rerurate514/riebeckite/tree/main/packages/themes)

