# @riebeckite/cli

The Riebeckite command-line interface: Node.js build-time tooling for
validating a project, diagnosing it, inspecting resolved state, and building
the site.

[日本語](./README_ja.md)

## Overview

`@riebeckite/cli` provides the `riebeckite` binary. It resolves the application
root from the current working directory and reports command failures safely with
a non-zero exit code. `check`, `doctor`, and `inspect` are read-only; `profile`
runs the build path with tracing and writes build output. `build` writes output
and `dev` starts a server, and `clean` removes Riebeckite-managed state and build
output.

## Installation

```sh
pnpm add -D @riebeckite/cli
```

The package exposes only the binary (`bin/riebeckite.mjs`); it has no library
entry point.

```sh
npx @riebeckite/cli check
```

In a pnpm project, use `pnpm exec riebeckite`.

## Usage

```text
riebeckite init [directory] [--preset <name>] [--features <names>] [--utilities <names>] [--force] [--list-presets] [--github-actions | --cloudflare-workers] [--content-repository <owner/repo>] [--site-repository <owner/repo>]
riebeckite create site [create-riebeckite options]
riebeckite create plugin [name] [options]
riebeckite create theme [name] [options]
riebeckite create page-type [name] [options]
riebeckite create component [name] [options]
riebeckite theme preview <name> [--port <port>] [--no-open]
riebeckite plugin dev <path> [--port <port>] [--no-open]
riebeckite plugin verify <path> [--level basic | integration | full] [--json]
riebeckite bridge approve <plan>
riebeckite dev
riebeckite check
riebeckite doctor [--explain | --json | --fix [--dry-run]] [--fail-on <error|warning|info>] [--code <code> ...]
riebeckite upgrade --to <version|latest> [--check] [--json]
riebeckite build [--full]
riebeckite clean [--output | --all]
riebeckite deploy setup | deploy workflow [--check] | deploy domain
riebeckite publish plan | status | validate | approve <slug...> [--all] [--by <name>] | revoke <slug...> [--all] [--by <name>] | record --provider <name> [--trigger <manual|scheduled|ci|cli>] | gate --provider <name>
riebeckite publish run [--execute] [--force] [--trigger <manual|scheduled|ci|cli>] [--provider <name>]
riebeckite content create | edit | delete | move ... [--apply] [--json]
riebeckite content plan create | edit | delete | move ... [--out <name>] [--json]
riebeckite content apply <plan> --apply [--json]
riebeckite content recover <journal> --apply [--json]
riebeckite migrate list | plan [--id <migration>] [--out <path>] | apply [--plan <path>] [--id <migration>] [--apply] | status | history [--limit <n>] | rollback <planId | migrationId> --apply | recover [--journal <path>] --apply [--json]
riebeckite profile [--full]
riebeckite inspect [config | plugins | content [--list] [--path <path-or-permalink>] | graph | build | assets [--list] [--json] | provenance | api [--deprecated] [--json]]
riebeckite help [command...]
riebeckite completion <bash | zsh | powershell> [--project]
```

## Commands

| Command | Purpose | Writes build state? |
| --- | --- | --- |
| `init` | Scaffold a self-contained site from a preset | no |
| `create` | Run a Site, Plugin, Theme, PageType, or Component generator | generator-dependent |
| `theme preview` | Run an isolated HonoX preview of a local Theme | temporary files only |
| `plugin dev` | Run an isolated HonoX preview of a local Plugin | temporary files only |
| `plugin verify` | Check a distributable Plugin before adding it to a site | no |
| `dev` | Start the integration development workflow | integration-dependent |
| `check` | Validate app configuration, plugins, and capability resolution | no |
| `doctor` | Report shared diagnostics for environment, configuration, plugins, content, output, and theme | no |
| `upgrade` | Compare isolated baseline and candidate builds before updating Riebeckite packages | no |
| `build` | Run the build path; `--full` bypasses incremental reuse | yes, on success |
| `clean` | Remove managed state (`.riebeckite/`); `--output` removes only the build output, `--all` removes both | no |
| `deploy` | Prepare Cloudflare workflow and domain configuration; `deploy domain` can upload after confirmation | no |
| `publish` | Plan, inspect, validate, approve, and explicitly execute publication | yes, after an executed build |
| `content` | Plan explicit content mutations and write them with a journal | no |
| `migrate` | Plan and apply versioned content migrations, then inspect, roll back, or recover them | no |
| `profile` | Run tracing-based performance reporting; `--full` uses a full path | build-dependent |
| `inspect` | Display factual resolved state (`config`, `plugins`, `content`, `graph`, `build`, `assets`, `provenance`, `api`) | no |

`doctor` continues independent checks where possible and exits unsuccessfully
when health checks fail. `inspect` is deliberately read-only and never triggers
a build or writes state. See [Diagnostics](../../docs/docs/framework/diagnostics.md) and
[Framework Inspector](../../docs/docs/framework/inspector.md) for how to interpret output.

`doctor --explain` includes each finding's fingerprint, cause, details, and fix. Repeat `--code` to select findings, and use `--fail-on` to make info, warning, or error findings fail the command. `--fix --dry-run` only reports whether supported safe fixes exist; no safe automatic fix is currently provided.

`clean` deletes only Riebeckite-managed artifacts: with no options the managed
state root (`.riebeckite/`), with `--output` the build output, and with `--all`
both. Missing targets are not an error, so it is safe to run from scripts and CI.
Run `clean --all` before `build` to force a cold build (a cache directory configured outside `.riebeckite/` is not removed).

`create theme` writes an isolated local Theme under `themes/<name>/`. Use
`--list` to see templates, `--features` for optional public-hook styling, and
`--register` to conservatively update a recognizable Theme factory in the site
config. See [Theme Generator](../../docs/docs/themes/generator.md).

## Typical workflow

```sh
pnpm exec riebeckite check
pnpm exec riebeckite doctor
pnpm exec riebeckite inspect plugins
pnpm exec riebeckite build
```

## See also

- [CLI Reference](../../docs/docs/reference/cli.md)
- [Build System](../../docs/docs/framework/build-system.md)
- [Diagnostics](../../docs/docs/framework/diagnostics.md) / [Framework Inspector](../../docs/docs/framework/inspector.md)
