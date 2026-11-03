---
date: 2026-10-06
title: Setup and creation
sidebar:
  label: Setup and creation
  order: 10
---
# Setup and creation

## `upgrade --check`

Upgrade Lab is a check-only preflight: it does not modify the project, `node_modules`, `dist`, or `.riebeckite`. The `--check` flag is accepted for compatibility, but `upgrade` always runs the check, so it can be omitted. It copies the project twice into a temporary directory, installs with lifecycle scripts and pnpmfiles disabled, then compares the current dependency set with the requested Riebeckite version.

```sh
npm exec -- riebeckite upgrade --to 0.0.35
npm exec -- riebeckite upgrade --to latest --json
```

The report compares dependency/peer/Node-engine resolution, TypeScript checking when
`tsconfig.json` is present, `riebeckite check`, diagnostics, a full production build,
generated URLs, and output files. `READY` means both environments passed and no URL or
output-file change was found. `REVIEW REQUIRED` means the candidate differs or fails.
`BLOCKED` means an isolated dependency install could not be resolved. `UNVERIFIED`
means the baseline failed or a check could not safely run.

Only npm and pnpm projects with exactly one of `package-lock.json` or `pnpm-lock.yaml`
are supported. Symlinks and content roots outside the project are not copied: symlinked
content roots throw and become `BLOCKED`, while outside-project content roots return
`UNVERIFIED`. It does not run install scripts, pnpmfiles, deployment, or browser E2E
tests. A temporary directory is not a security sandbox; builds still execute the site's
own configuration and plugins.
Child processes receive only the path, temporary-directory, and temporary user-home variables needed
to run, plus an isolated npm cache and user configuration. This reduces accidental environment-secret
exposure but does not make untrusted build code safe to execute.

## `init`

`init` scaffolds a self-contained site (configuration, Vite/HonoX application shell, routes, stylesheet, and starter content) in the target directory, which defaults to the current directory. The generated site is a self-contained application that does not depend on the Riebeckite monorepo.

```sh
npm exec riebeckite init
```

Pass a directory to create the site somewhere else:

```sh
npm exec riebeckite init my-site
```

Install dependencies, then run `check` and `build` in the generated site.

### Choosing a preset

The composition is selected with `--preset <name>` (default: `starter`).

```sh
npm exec -- riebeckite init my-site --preset starter
```

Run `--list-presets` to see the available presets and their descriptions.

```sh
npm exec -- riebeckite init --list-presets
```

### Adding feature packs

Use `--features <names>` for a comma-separated set of optional packs: `knowledge`, `diagrams`, `media`, and `i18n`. `none` adds no pack. A pack that duplicates a plugin already selected by the preset is ignored/skipped.

```sh
npm exec -- riebeckite init my-site --preset portfolio --features diagrams,i18n
```

### Choosing project files

Project files are selected separately from the preset with `--utilities <names>`, a comma-separated list of `gitignore`, `editorconfig`, `gitattributes`, `biome`, `npmrc`, and `vscode`.

```sh
npm exec -- riebeckite init my-site --utilities editorconfig,npmrc,vscode
```

| Name | File |
| --- | --- |
| `gitignore` | `.gitignore` |
| `editorconfig` | `.editorconfig` |
| `gitattributes` | `.gitattributes` |
| `biome` | `biome.json` |
| `npmrc` | `.npmrc` |
| `vscode` | `.vscode/settings.json` |

The default is `gitignore,editorconfig,gitattributes,biome`, and `none` writes none. In interactive mode, choose `Yes` for `Customize extra project files?` to open the `Extra project files` prompt, which pre-selects the default set.

### When files already exist

`init` refuses to write into a directory that already contains generated files unless `--force` is passed.

```sh
npm exec -- riebeckite init my-site --force
```

Because `--force` affects existing files, review their contents before using it.

### `create-riebeckite`

The `create-riebeckite` package runs the same generator through `npx create-riebeckite` and accepts the same `--preset`, `--features`, and `--list-presets` flags.

```sh
npx create-riebeckite
```

Passing a directory, for example `npx create-riebeckite my-site --preset starter`, skips the prompts and does not install dependencies; run `npm install` in the generated folder before `check` and `build`.

In interactive mode it asks for the content source and then for the deployment:

| Choice | What is generated |
| --- | --- |
| `Cloudflare Workers` | the Wrangler dependency and `wrangler.jsonc`; after installing dependencies it offers `Deploy now?` |
| `GitHub Actions` | `wrangler.jsonc` and `.github/workflows/publish.yml` |
| `Not now` | no deployment files |

Choosing `Yes` at `Deploy now?` runs the build and `riebeckite publish run --execute` right after scaffolding. Choosing `Later` only generates the site; publish it with:

```sh
npm exec riebeckite build
npm exec -- riebeckite publish run --execute
```

After generating the site, verify the setup. The interactive flow installs dependencies by default; if you answered `No` to the install prompt, run `npm install` first:

```sh
npm exec riebeckite check
npm exec riebeckite build
```

## `create`

`create` is the unified generator entry point. In a TTY it asks whether to create a Site, Plugin, Theme, PageType, or Component, then delegates to the relevant generator without duplicating its generation logic.

```sh
riebeckite create
riebeckite create site my-site --preset starter
riebeckite create plugin reading-time --features transform
riebeckite create theme my-theme --template blog --register
riebeckite create page-type glossary --path /glossary/ --with-tests
riebeckite create component note-card --target site --with-styles
riebeckite create --help
```

In scripts, select a target explicitly. `create site` passes its arguments to `create-riebeckite`; `create plugin` and `create theme` retain their existing options and non-TTY validation. `create page-type` creates a Plugin PageType; `create component` respects the Site, Plugin, and Theme ownership boundary.

`create theme` defaults to `--template minimal` with dark mode, tests, and documentation enabled; use `--no-dark-mode`, `--no-tests`, or `--no-docs` to disable them. `create component` defaults to `--target site`.
