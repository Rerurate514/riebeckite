# CLI Reference

Run commands from an application directory. The CLI resolves the application root from the current working directory and reports command errors safely with a non-zero exit code.

```text
riebeckite init [directory] [--force]
riebeckite dev
riebeckite check
riebeckite doctor
riebeckite build [--full]
riebeckite profile [--full]
riebeckite inspect [config | plugins | content [--list] | graph | build]
```

## Command contracts

| Command | Purpose | Writes build state? |
| --- | --- | --- |
| `init` | generate a minimal site from the integration template | no |
| `dev` | start the integration development workflow | integration-dependent |
| `check` | validate app configuration, plugins, and capability resolution | no |
| `doctor` | diagnose environment, configuration, plugins, content, diagnostics, and build state | no |
| `build` | run the build path; `--full` bypasses incremental reuse | yes, on success |
| `profile` | run tracing-based performance reporting; `--full` uses a full path | build-dependent |
| `inspect` | display factual resolved state | no |

`doctor` continues independent checks where possible and exits unsuccessfully when health checks fail. `check` establishes validity, not that output has been built or deployed. `inspect` is deliberately read-only: it must not trigger a build, write caches/assets/state, invoke Vite/HonoX builds, render special artifacts, or auto-fix problems.

Plugin option validation runs as part of `check`. Each plugin's `validateOptions` (the analytics plugin, for example, validates its provider and collector URL) contributes to configuration validity, so an invalid plugin setup fails `check` before any build starts.

`init` scaffolds a self-contained site (configuration, Vite/HonoX application shell, routes, stylesheet, and starter content) in the target directory, which defaults to the current directory. It refuses to write into a directory that already contains generated files unless `--force` is passed. Install dependencies, then run `check` and `build` in the generated site. The `create-riebeckite` package runs the same generator through `npm create riebeckite`.

Command failures are reported with the error name, message, and, when present, the error `code`, file path, and a remediation `hint`. Nested causes are printed as `Caused by:` lines.

## Common workflow

```sh
pnpm exec riebeckite check
pnpm exec riebeckite doctor
pnpm exec riebeckite inspect plugins
pnpm exec riebeckite build
```

Choose `inspect content --list` for item-level content output and `inspect graph` when investigating links or graph extensions. Use [Diagnostics](diagnostics.md) for interpretation and [Build system](build-system.md) for state semantics.
