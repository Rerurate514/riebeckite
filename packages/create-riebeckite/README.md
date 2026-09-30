# create-riebeckite

Create a new Riebeckite site from an official starter preset.

[日本語](./README_ja.md)

## Usage

```sh
npx create-riebeckite my-site
cd my-site
npm install
npm exec riebeckite build
```

## Options

| Option | Description |
| --- | --- |
| `[directory]` | Directory to scaffold into (default: the current directory) |
| `--preset <name>` | Starter composition, e.g. `rich` (default: `starter`) |
| `--force` | Scaffold even when the target directory is not empty |
| `--list-presets` | Print the available presets and their descriptions, then exit |
| `--github-actions` | Generate the Cloudflare deployment workflow |
| `--content-repository <owner/repository>` | Check out this repository into `content/` during deployment (requires `--github-actions`) |
| `--site-repository <owner/repository>` | Site repository notified by the generated content workflow |
| `--notify-on-content-push` | Generate `github/notify-site.yml` for the content repository (requires Actions, content, and site repositories) |

For example, scaffold with the `rich` preset:

```sh
npx create-riebeckite my-site --preset rich
```

To use a separate content repository and deploy after its `main` branch is
pushed, generate the common workflow once (the preset does not affect it):

```sh
npx create-riebeckite my-site --github-actions \
  --content-repository OWNER/notes \
  --site-repository OWNER/my-site \
  --notify-on-content-push
```

Set `content.directory` to `"content"`, add the documented repository secrets,
then copy `github/notify-site.yml` into the content repository as
`.github/workflows/notify-site.yml`. See the [separate-content deployment
guide](../../templates/cloudflare/README_en.md).

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
