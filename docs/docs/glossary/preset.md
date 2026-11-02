---
date: 2026-10-14
title: Preset
sidebar:
  hidden: true
---

# Preset

A prepared set of options for a common setup. Riebeckite uses presets in two places.

## Scaffold presets

`create-riebeckite` and `riebeckite init` use scaffold presets to generate a complete site. A preset chooses the plugins, theme, generated content, and application files.

The available presets are `empty`, `minimal`, `starter`, `digital-garden`, `blog`, `docs`, `portfolio`, and `showcase`; `starter` is the default. Choose one with `--preset <name>` and list them with `--list-presets`.

```sh
npx create-riebeckite my-site --preset blog
```

See [Presets](../getting-started/presets.md) for what each preset includes.

## Theme presets

A theme can declare named presets in `defineTheme`. A theme preset is a partial set of theme settings selected with the `preset` option:

```ts
export const myTheme = defineTheme({
  name: "my-theme",
  styles: [{ moduleSpecifier: "/themes/my-theme.css" }],
  presets: {
    compact: { label: "Compact", settings: { density: "compact" } },
  },
});
```

```ts
theme: myTheme({ preset: "compact" })
```

Resolution order is schema defaults, then the preset, then explicit `settings`; explicit settings win. See [Theme API](../reference/theme-api.md).

## Related terms

- [[glossary/theme|Theme]]
- [[glossary/config|Config]]
- [[glossary/plugin|Plugin]]

## Learn more

- [Presets](../getting-started/presets.md)
- [Theme API](../reference/theme-api.md)
