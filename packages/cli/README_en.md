# @riebeckite/cli

The Riebeckite command-line interface: Node.js build-time tooling for
validating a project, diagnosing it, inspecting resolved state, and building
the site.

[日本語](./README_ja.md)

## Overview

`@riebeckite/cli` provides the `riebeckite` binary. It resolves the application
root from the current working directory and reports command failures safely with
a non-zero exit code. `check`, `doctor`, `inspect`, and `profile` are read-only;
only `build` and `dev` mutate output or start a server.

## Installation

```sh
npm install --save-dev @riebeckite/cli
```

The package exposes only the binary (`bin/riebeckite.mjs`); it has no library
entry point.

```sh
npx riebeckite check
```

In a pnpm project, use `pnpm exec riebeckite`.

## Usage

```text
riebeckite dev
riebeckite check
riebeckite doctor
riebeckite build [--full]
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
| `profile` | Run tracing-based performance reporting; `--full` uses a full path | build-dependent |
| `inspect` | Display factual resolved state (`config`, `plugins`, `content`, `graph`, `build`) | no |

`doctor` continues independent checks where possible and exits unsuccessfully
when health checks fail. `inspect` is deliberately read-only and never triggers
a build or writes state. See [Diagnostics](../../docs/en/diagnostics.md) and
[Framework Inspector](../../docs/en/inspector.md) for how to interpret output.

## Typical workflow

```sh
pnpm exec riebeckite check
pnpm exec riebeckite doctor
pnpm exec riebeckite inspect plugins
pnpm exec riebeckite build
```

## See also

- [CLI Reference](../../docs/en/cli.md)
- [Build System](../../docs/en/build-system.md)
- [Diagnostics](../../docs/en/diagnostics.md) / [Framework Inspector](../../docs/en/inspector.md)
