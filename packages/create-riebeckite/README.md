# create-riebeckite

Create a new Riebeckite site from an official starter preset.

[日本語](./README_ja.md)

## Usage

```sh
npx create-riebeckite my-site
cd my-site
npm install
npx riebeckite build
```

## Options

| Option | Description |
| --- | --- |
| `[directory]` | Directory to scaffold into (default: the current directory) |
| `--preset <name>` | Starter composition, e.g. `rich` (default: `starter`) |
| `--force` | Scaffold even when the target directory is not empty |
| `--list-presets` | Print the available presets and their descriptions, then exit |

For example, scaffold with the `rich` preset:

```sh
npx create-riebeckite my-site --preset rich
```

## Presets

List the available presets with `--list-presets`:

```sh
npx create-riebeckite --list-presets
```

Every preset is a self-contained starter description. From smallest to
largest:

| Preset  | Theme        | Plugins | Content pages                                        |
| ------- | ------------ | ------- | ---------------------------------------------------- |
| `empty` | none         | none    | none (static index)                                  |
| `minimal` | minimal    | 1       | index                                                |
| `starter` | default    | 3       | index (7 languages)                                  |
| `rich`  | default      | 8       | index, framework/plugins, framework/themes (7 languages) |
| `full`  | default      | 23      | rich + guide                                          |
| `max`   | default      | 46      | full + examples                                       |
| `ultra` | default      | 52      | max + reference/plugins, reference/themes             |

Each preset has a one-line description, shown by `--list-presets`:

- `empty` — A blank application shell: no plugins, theme, content, or components.
- `minimal` — The smallest useful site: Obsidian Markdown, the minimal theme, one page.
- `starter` — The default starter: Obsidian Markdown, color mode, seven languages, and a site header.
- `rich` — Publishing and reading plugins plus guided ecosystem tour pages in seven languages.
- `full` — A ready blog: discovery, media, and reading plugins plus a build guide.
- `max` — Diagram and knowledge plugins on top of `full`, with showcase example pages.
- `ultra` — The full plugin catalog and theme reference pages — everything the ecosystem offers.

Presets are defined in `@riebeckite/honox` and can be imported into your own
tooling:

```ts
import { scaffoldRiebeckiteSite, rich } from "@riebeckite/honox";

await scaffoldRiebeckiteSite({
  targetDirectory: "./my-site",
  preset: rich,
});
```

## Further reading

Riebeckite is an extensible framework for publishing Markdown and
Obsidian-oriented notes on the web. See the
[Riebeckite documentation](https://github.com/Rerurate514/riebeckite#readme)
for configuration and plugin guidance.