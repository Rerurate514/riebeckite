# @riebeckite/cli

The Riebeckite command-line interface: Node.js build-time tooling for
validating a project, diagnosing it, inspecting resolved state, and building
the site.

[日本語](./README_ja.md)

## Overview

`@riebeckite/cli` provides the `riebeckite` binary. It resolves the application
root from the current working directory and reports command failures safely with
a non-zero exit code. `check`, `doctor`, `inspect`, and `profile` are read-only;
`build` and `dev` write output or start a server, and `clean` removes
Riebeckite-managed state and build output.

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
riebeckite dev
riebeckite check
riebeckite doctor
riebeckite build [--full]
riebeckite clean [--output | --all]
riebeckite profile [--full]
riebeckite inspect [config | plugins | content [--list] | graph | build]
```

## Commands

| Command | Purpose | Writes build state? |
| --- | --- | --- |
| `dev` | Start the integration development workflow | integration-dependent |
| `check` | Validate app configuration, plugins, and capability resolution | no |
| `doctor` | Diagnose environment, configuration, plugins, content, diagnostics, and build state | no |
| `build` | Run the build path; `--full` bypasses incremental reuse | yes, on success |
| `clean` | Remove managed state (`.riebeckite/`); `--output` removes only the build output, `--all` removes both | no |
| `profile` | Run tracing-based performance reporting; `--full` uses a full path | build-dependent |
| `inspect` | Display factual resolved state (`config`, `plugins`, `content`, `graph`, `build`) | no |

`doctor` continues independent checks where possible and exits unsuccessfully
when health checks fail. `inspect` is deliberately read-only and never triggers
a build or writes state. See [Diagnostics](../../docs/docs/framework/diagnostics.md) and
[Framework Inspector](../../docs/docs/framework/inspector.md) for how to interpret output.

`clean` deletes only Riebeckite-managed artifacts: with no options the managed
state root (`.riebeckite/`), with `--output` the build output, and with `--all`
both. Missing targets are not an error, so it is safe to run from scripts and CI.
Run `clean --all` before `build` to force a cold build (a cache directory configured outside `.riebeckite/` is not removed).

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

