---
publish: true
---

# Temas

Un tema cambia toda la apariencia del sitio — colores, tipografía y diseño — sin tocar tu contenido ni tus rutas. Riebeckite incluye seis temas: instala un paquete y cambia una línea.

## Galería de temas

```gallery
columns: 3
items:
  - title: "Default"
    description: "El tema por defecto: tokens limpios, modos claro/oscuro/sistema y distintos diseños de artículo."
    meta: "defaultTheme()"
    href: "https://github.com/Rerurate514/riebeckite/blob/main/packages/themes/default/README.md"
  - title: "Minimal"
    description: "Un tema sobrio, centrado en la tipografía."
    meta: "minimalTheme()"
    href: "https://github.com/Rerurate514/riebeckite/blob/main/packages/themes/minimal/README.md"
  - title: "Sakura"
    description: "Una paleta rosa suave con acentos cálidos."
    meta: "sakuraTheme()"
    href: "https://github.com/Rerurate514/riebeckite/blob/main/packages/themes/sakura/README.md"
  - title: "Gruvbox"
    description: "Una paleta retro cálida inspirada en Gruvbox."
    meta: "gruvboxTheme()"
    href: "https://github.com/Rerurate514/riebeckite/blob/main/packages/themes/gruvbox/README.md"
  - title: "Tokyo Night"
    description: "Una paleta nocturna moderna con acento neón opcional."
    meta: "tokyonightTheme()"
    href: "https://github.com/Rerurate514/riebeckite/blob/main/packages/themes/tokyonight/README.md"
  - title: "Rerurate"
    description: "El lenguaje de diseño personal del autor."
    meta: "rerurateTheme()"
    href: "https://github.com/Rerurate514/riebeckite/blob/main/packages/themes/rerurate/README.md"
```

## Cambiar de tema

Este starter usa `@riebeckite/theme-default`. Para probar otro tema:

Instala el paquete:

```sh
npm install @riebeckite/theme-sakura
```

Apunta `theme` al nuevo factory en `riebeckite.config.ts`:

```ts
import { sakuraTheme } from "@riebeckite/theme-sakura";

export default defineConfig({
  theme: sakuraTheme(),
});
```

## Los temas incluidos

| Tema | Descripción |
| --- | --- |
| [`@riebeckite/theme-default`](https://github.com/Rerurate514/riebeckite/blob/main/packages/themes/default/README.md) · `defaultTheme()` | El tema por defecto: tokens limpios, modos claro/oscuro/sistema y distintos diseños de artículo. |
| [`@riebeckite/theme-minimal`](https://github.com/Rerurate514/riebeckite/blob/main/packages/themes/minimal/README.md) · `minimalTheme()` | Un tema sobrio, centrado en la tipografía. |
| [`@riebeckite/theme-sakura`](https://github.com/Rerurate514/riebeckite/blob/main/packages/themes/sakura/README.md) · `sakuraTheme()` | Una paleta rosa suave con acentos cálidos. |
| [`@riebeckite/theme-gruvbox`](https://github.com/Rerurate514/riebeckite/blob/main/packages/themes/gruvbox/README.md) · `gruvboxTheme()` | Una paleta retro cálida inspirada en Gruvbox. |
| [`@riebeckite/theme-tokyonight`](https://github.com/Rerurate514/riebeckite/blob/main/packages/themes/tokyonight/README.md) · `tokyonightTheme()` | Una paleta nocturna moderna con acento neón opcional. |
| [`@riebeckite/theme-rerurate`](https://github.com/Rerurate514/riebeckite/blob/main/packages/themes/rerurate/README.md) · `rerurateTheme()` | El lenguaje de diseño personal del autor. |

## Todos los temas admiten modos claro/oscuro, tipografía y diseño de artículo; consulta cada README para la lista completa de opciones.


[Riebeckite themes on GitHub](https://github.com/Rerurate514/riebeckite/tree/main/packages/themes)

