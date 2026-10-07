# create-riebeckite

Create a new Riebeckite site from an official starter preset.

[日本語](./README_ja.md)

## Usage

Interactive (recommended): run without arguments and answer the prompts for
the project name, preset, project files, content source, and deployment.

```sh
npx create-riebeckite
```

Passing any argument keeps the command non-interactive:

```sh
npx create-riebeckite my-site
cd my-site
npm install
npm exec riebeckite build
```

## Choices

The prompts ask, in order:

| Prompt | Options | Recommendation |
| --- | --- | --- |
| Project name | the folder to create (empty input uses the default name) | any name, e.g. `my-site` |
| Preset | `starter`, `minimal`, `showcase`, `empty` | `starter` for most sites |
| Project files | `.editorconfig`, `.gitattributes`, `biome.json`, `.npmrc`, `.vscode/settings.json` | the recommended set is pre-selected |
| Content source | `This project`, `Separate GitHub repository` | `This project` to start |
| Deployment | `GitHub Actions + Cloudflare Workers`, `Not now` | `Not now` for local development |

`Separate GitHub repository` also asks for the content and site repositories,
and GitHub Actions deployment is then configured for you. That setup is covered
in the [content repository guide](../../docs/docs/guides/content-repositories.md).
Deployment can be added later, described in
[Deployment](../../docs/docs/getting-started/deployment.md).

## Options

| Option | Description |
| --- | --- |
| `[directory]` | Directory to scaffold into (default: the current directory) |
| `--preset <name>` | Starter composition, e.g. `showcase` (default: `starter`) |
| `--utilities <names>` | Comma-separated project files to generate: `editorconfig`, `gitattributes`, `biome`, `npmrc`, `vscode`, or `none` (default: `editorconfig,gitattributes,biome`) |
| `--force` | Scaffold even when the target directory is not empty |
| `--list-presets` | Print the available presets and their descriptions, then exit |
| `--github-actions` | Generate the Cloudflare deployment workflow |
| `--content-repository <owner/repository>` | Use this repository as the deployment content source. Requires `--github-actions` and `--site-repository`; also generates `github/notify-site.yml`. |
| `--site-repository <owner/repository>` | Site repository that the generated content workflow notifies. Required with `--content-repository`. |

For example, scaffold the complete feature tour:

```sh
npx create-riebeckite my-site --preset showcase
```

## Project files

Alongside the preset, `create-riebeckite` writes optional project files. In
interactive mode the `Extra project files` prompt pre-selects the recommended
set; toggle any of them there. Non-interactive runs select them with a
comma-separated `--utilities` value.

| Name | File | Default |
| --- | --- | --- |
| `editorconfig` | `.editorconfig` | yes |
| `gitattributes` | `.gitattributes` | yes |
| `biome` | `biome.json` | yes |
| `npmrc` | `.npmrc` | no |
| `vscode` | `.vscode/settings.json` | no |

Pass `none` to write no project files, or list the ones you want:

```sh
npx create-riebeckite my-site --utilities editorconfig,npmrc,vscode
```

## External content repository

To use a separate content repository and deploy after its `main` branch is
pushed, generate the common workflow once (the preset does not affect it):

```sh
npx create-riebeckite my-site --github-actions \
  --content-repository OWNER/notes \
  --site-repository OWNER/my-site
```

Set `content.directory` to `"content"`, add the documented repository secrets,
then copy `github/notify-site.yml` into the content repository as
`.github/workflows/notify-site.yml`. See the [separate-content deployment
guide](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/guides/deployment/separate-content-repository.md).

`--content-repository` automatically configures the external checkout, the
`content-updated` repository-dispatch receiver, and `github/notify-site.yml`.
The previous notification option was removed; omit it when migrating an older command.

## Presets

List the available presets with `--list-presets`:

```sh
npx create-riebeckite --list-presets
```

Every preset is a self-contained starter description:

| Preset | Purpose |
| --- | --- |
| `starter` | Recommended for most sites |
| `minimal` | Small Markdown site with minimal configuration |
| `showcase` | Explore Riebeckite features and plugins with rendered examples and local fixtures |
| `empty` | Blank shell for custom setups |

Each preset has a one-line description, shown by `--list-presets`:

- `starter` — Recommended for most sites: practical Markdown publishing, search, and discovery.
- `minimal` — The smallest useful site: Obsidian Markdown, the minimal theme, and one page.
- `showcase` — The complete plugin catalog with rendered examples, local fixtures, and reference pages.
- `empty` — A blank application shell: no plugins, theme, content, or components.

Presets are defined in `create-riebeckite/scaffold` and can be imported into
your own tooling:

```ts
import { scaffoldRiebeckiteSite } from "create-riebeckite/scaffold";

await scaffoldRiebeckiteSite({
  targetDirectory: "./my-site",
  preset: "showcase",
});
```

## Further reading

Riebeckite is an extensible framework for publishing Markdown and
Obsidian-oriented notes on the web. See the
[Riebeckite documentation](https://github.com/Rerurate514/riebeckite#readme)
for configuration and plugin guidance.
