# create-riebeckite

Create a new Riebeckite site from an official starter preset.

[日本語](./README_ja.md)

## Usage

Interactive (recommended): run without arguments and answer the prompts for
the project name, preset, optional feature packs, extra project files, content
source, deployment, and dependency installation.

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
| What would you like to build? | `Starter site`, `Digital garden`, `Blog`, `Documentation`, `Portfolio`, `Minimal site`, `Plugin showcase`, `Empty application` | `Starter site` (`starter`) for most sites |
| Add optional feature packs? | `Yes` or `No`; `Yes` then selects feature packs | `No` |
| Customize extra project files? | `Yes` or `No`; `Yes` then selects project files | `No` uses the recommended set |
| Where will you write content? | `This project`, `Separate GitHub repository` | `This project` to start |
| Set up deployment? | `Cloudflare Workers`, `GitHub Actions`, `Not now` | `Not now` for local development |
| Install dependencies now? | `Yes` or `No` | `Yes` |

`Separate GitHub repository` also asks for the content and site repositories,
and GitHub Actions deployment is then configured for you. That setup is covered
in the [content repository guide](../../docs/docs/guides/content-repositories.md).
Deployment can be added later, described in
[Deployment](../../docs/docs/getting-started/deployment.md).

## Options

| Option | Description |
| --- | --- |
| `[directory]` | Directory to scaffold into (default: the current directory) |
| `--help`, `-h` | Print usage and exit |
| `--preset <name>` | Starter composition, e.g. `showcase` (default: `starter`) |
| `--utilities <names>` | Comma-separated project files to generate: `gitignore`, `editorconfig`, `gitattributes`, `biome`, `npmrc`, `vscode`, or `none` (default: `gitignore,editorconfig,gitattributes,biome`) |
| `--force` | Scaffold even when the target directory is not empty |
| `--list-presets` | Print the available presets and their descriptions, then exit |
| `--github-actions` | Generate the Cloudflare deployment workflow |
| `--cloudflare-workers` | Generate the Cloudflare Workers deployment configuration |
| `--features <names>` | Comma-separated feature pack names to add extra plugins |
| `--content-repository <owner/repository>` | Use this repository as the deployment content source. Requires `--github-actions` and `--site-repository`; also generates `github/notify-site.yml`. |
| `--site-repository <owner/repository>` | Site repository that the generated content workflow notifies. Required with `--content-repository`. |

For example, scaffold the complete feature tour:

```sh
npx create-riebeckite my-site --preset showcase
```

## Project files

Alongside the preset, `create-riebeckite` writes optional project files. The
`Customize extra project files?` prompt defaults to `No` and generates the
recommended set; choose `Yes` to toggle individual files. Non-interactive runs
select them with a comma-separated `--utilities` value.

| Name | File | Default |
| --- | --- | --- |
| `gitignore` | `.gitignore` | yes |
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
| `starter` | Recommended default: a practical Markdown garden with search, navigation, and reading essentials. |
| `digital-garden` | An Obsidian-compatible digital garden with linked notes, backlinks, and a local graph. |
| `blog` | A publishing-focused blog with tags, series, related posts, sharing, and feeds. |
| `docs` | A documentation site with an automatic sidebar, table of contents, and previous/next navigation. |
| `portfolio` | A calm portfolio for projects and contact details, with image and media support when you add it. |
| `minimal` | The smallest readable site, for learning how a Riebeckite site is assembled. |
| `showcase` | A feature-rich example that demonstrates the Riebeckite plugin ecosystem with rendered samples and references. |
| `empty` | A blank canvas with only the Riebeckite wiring. Add the theme, plugins, and content yourself. |

Each preset has a one-line description, shown by `--list-presets`:

- `starter` — Recommended default: a practical Markdown garden with search, navigation, and reading essentials.
- `digital-garden` — An Obsidian-compatible digital garden with linked notes, backlinks, and a local graph.
- `blog` — A publishing-focused blog with tags, series, related posts, sharing, and feeds.
- `docs` — A documentation site with an automatic sidebar, table of contents, and previous/next navigation.
- `portfolio` — A calm portfolio for projects and contact details, with image and media support when you add it.
- `minimal` — The smallest readable site, for learning how a Riebeckite site is assembled.
- `showcase` — A feature-rich example that demonstrates the Riebeckite plugin ecosystem with rendered samples and references.
- `empty` — A blank canvas with only the Riebeckite wiring. Add the theme, plugins, and content yourself.

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
