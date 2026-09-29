# create-riebeckite

Create a new Riebeckite site from an official starter preset.

## Usage

```sh
npx create-riebeckite my-site
cd my-site
npm install
npx riebeckite build
```

The default preset is `starter`. Pass `--preset <name>` to choose another
composition:

```sh
npx create-riebeckite my-site --preset rich
```

Pass `--force` to scaffold into a non-empty directory.

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
| `ultra` | default      | 51      | max + reference/plugins, reference/themes             |

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