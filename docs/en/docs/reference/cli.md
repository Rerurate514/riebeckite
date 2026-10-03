# CLI Reference

Run commands from an application directory. The CLI resolves the application root from the current working directory and reports command errors safely with a non-zero exit code.

```text
riebeckite init [directory] [--preset <name>] [--force] [--list-presets]
riebeckite dev
riebeckite check
riebeckite doctor
riebeckite build [--full]
riebeckite deploy [--dry-run]
riebeckite profile [--full]
riebeckite inspect [config | plugins | content [--list] | graph | build]
```

## Command contracts

| Command | Purpose | Writes build state? |
| --- | --- | --- |
| `init` | scaffold a self-contained site from a preset | no |
| `dev` | start the integration development workflow | integration-dependent |
| `check` | validate app configuration, plugins, and capability resolution | no |
| `doctor` | diagnose environment, configuration, plugins, content, diagnostics, and build state | no |
| `build` | run the build path; `--full` bypasses incremental reuse | yes, on success |
| `deploy` | publish the existing build output to Cloudflare Workers via Wrangler; `--dry-run` validates without uploading | no |
| `profile` | run tracing-based performance reporting; `--full` uses a full path | build-dependent |
| `inspect` | display factual resolved state | no |

`doctor` continues independent checks where possible and exits unsuccessfully when health checks fail. Deprecation findings are reported as warnings under `Deprecated usage`; they do not make `doctor` fail. `check` establishes validity, not that output has been built or deployed. `inspect` is deliberately read-only: it must not trigger a build, write caches/assets/state, invoke Vite/HonoX builds, render special artifacts, or auto-fix problems.

Plugin option validation runs as part of `check`. Each plugin's `validateOptions` (the analytics plugin, for example, validates its provider and collector URL) contributes to configuration validity, so an invalid plugin setup fails `check` before any build starts.

`init` scaffolds a self-contained site (configuration, Vite/HonoX application shell, routes, stylesheet, and starter content) in the target directory, which defaults to the current directory. It refuses to write into a directory that already contains generated files unless `--force` is passed. The composition is selected with `--preset <name>` (default: `starter`); run `--list-presets` to see the available presets and their descriptions. Install dependencies, then run `check` and `build` in the generated site. The `create-riebeckite` package runs the same generator through `npx create-riebeckite` and accepts the same `--preset` / `--list-presets` flags. In interactive mode it then asks for the deployment: `Cloudflare Workers` adds the Wrangler dependency and `wrangler.jsonc` and offers `Deploy now?` after installing dependencies, `GitHub Actions` generates the push-triggered workflow, and `Not now` adds no deployment files. Choosing `Yes` at `Deploy now?` runs the build and `riebeckite deploy` right after scaffolding.

`deploy` publishes the `dist/` produced by `build` to Cloudflare Workers by invoking Wrangler. It creates `wrangler.jsonc` from the site folder name when the file is missing, opens the Wrangler login on the first run, and forwards `--dry-run` for validation without uploading. It never rebuilds content, so run `npm exec riebeckite build` first. Because `npm` consumes a bare `--dry-run`, pass it as `npm exec -- riebeckite deploy --dry-run`. A site generated with `create-riebeckite`'s `Cloudflare Workers` choice already includes the Wrangler dependency and `wrangler.jsonc`.

Command failures are reported with the error name, message, and, when present, the error `code`, file path, and a remediation `hint`. Nested causes are printed as `Caused by:` lines.

## Common workflow

```sh
pnpm exec riebeckite check
pnpm exec riebeckite doctor
pnpm exec riebeckite inspect plugins
pnpm exec riebeckite build
pnpm exec riebeckite deploy
```

Choose `inspect content --list` for item-level content output and `inspect graph` when investigating links or graph extensions. Use [Diagnostics](../framework/diagnostics.md) for interpretation, [Upgrading](../guides/upgrading.md) for deprecation and migration guidance, and [Build system](../framework/build-system.md) for state semantics.
