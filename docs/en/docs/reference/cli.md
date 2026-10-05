# CLI Reference

Run commands from an application directory. The CLI resolves the application root from the current working directory and reports command errors safely with a non-zero exit code.

```text
riebeckite init [directory] [--preset <name>] [--force] [--list-presets]
riebeckite dev
riebeckite check
riebeckite doctor
riebeckite build [--full]
riebeckite clean [--output | --all]
riebeckite deploy [--dry-run | setup | domain]
riebeckite profile [--full]
riebeckite inspect [config | plugins | content [--list] | graph | build]
```

## Command contracts

| Command | Purpose | Writes build state? |
| --- | --- | --- |
| `init` | scaffold a self-contained site from a preset | no |
| `dev` | start the integration development workflow | integration-dependent |
| `check` | validate app configuration, content root availability, plugin options, and capability resolution | no |
| `doctor` | diagnose environment, project discovery, configuration, plugins, content source readability, deprecated usage, and build state | no |
| `build` | run the build path; `--full` bypasses incremental reuse | yes, on success |
| `clean` | remove Riebeckite-managed state (`--all` also removes the build output; `--output` removes only the build output) | no |
| `deploy` | publish the existing build output to Cloudflare Workers via Wrangler; `--dry-run` validates without uploading; `setup` prepares GitHub Actions continuous deployment; `domain` adds a Cloudflare Workers Custom Domain | no |
| `profile` | run tracing-based performance reporting; `--full` uses a full path | build-dependent |
| `inspect` | display factual resolved state | no |

`doctor` continues independent checks where possible and exits unsuccessfully when health checks fail. Deprecation findings are reported as warnings under `Deprecated usage`; they do not make `doctor` fail. `check` establishes basic project validity, not that output has been built or deployed. `inspect` is deliberately read-only: it must not trigger a build, write caches/assets/state, invoke Vite/HonoX builds, render special artifacts, or auto-fix problems.

Broken WikiLinks, missing referenced assets, publish-boundary warnings, and other content-integrity findings come from the build path or from plugins such as `@riebeckite/plugin-diagnostics`. Use `inspect content --list` and `inspect graph` to confirm what Riebeckite loaded, then run `build` or the relevant plugin diagnostics for rendered-content problems.

Plugin option validation runs as part of `check`. Each plugin's `validateOptions` (the analytics plugin, for example, validates its provider and collector URL) contributes to configuration validity, so an invalid plugin setup fails `check` before any build starts.

`init` scaffolds a self-contained site (configuration, Vite/HonoX application shell, routes, stylesheet, and starter content) in the target directory, which defaults to the current directory. It refuses to write into a directory that already contains generated files unless `--force` is passed. The composition is selected with `--preset <name>` (default: `starter`); run `--list-presets` to see the available presets and their descriptions. Install dependencies, then run `check` and `build` in the generated site. The `create-riebeckite` package runs the same generator through `npx create-riebeckite` and accepts the same `--preset` / `--list-presets` flags. In interactive mode it then asks for the deployment: `Not now` is the default and adds no deployment files, `Cloudflare Workers` adds the Wrangler dependency and `wrangler.jsonc` and offers `Deploy now?` after installing dependencies, and `GitHub Actions` generates the push-triggered workflow. Choosing `Yes` at `Deploy now?` runs the build and `riebeckite deploy` right after scaffolding.

`clean` removes Riebeckite-managed artifacts instead of user content. With no options it removes the managed state root (`.riebeckite/` under the application directory), which holds the build state, plugin cache, persistent content cache, and SSG output cache. `clean --output` removes only the build output directory, and `clean --all` removes both. The output location is resolved from project configuration rather than hard-coded, so an integration-defined location is honored. Missing targets are not an error, so `clean` is safe to run repeatedly, including from CI and troubleshooting scripts. It never removes content, configuration, theme or plugin sources, `public/` assets, or Git metadata, and it refuses to delete anything outside the application directory. Generated source entries under `app/.riebeckite/` are left in place because the integration regenerates them on the next `dev` or `build`. Use `riebeckite clean --all` followed by `riebeckite build` to reproduce a cold build that does not rely on persistent caches, incremental state, or previous output. In the default layout those caches live under `.riebeckite/`; a cache directory configured elsewhere is not removed.

`deploy` publishes the `dist/` produced by `build` to Cloudflare Workers by invoking Wrangler. It creates `wrangler.jsonc` from the site folder name when the file is missing, opens the Wrangler login on the first run, and forwards `--dry-run` for validation without uploading. It never rebuilds content, so run `npm exec riebeckite build` first. Because `npm` consumes a bare `--dry-run`, pass it as `npm exec -- riebeckite deploy --dry-run`. A site generated with `create-riebeckite`'s `Cloudflare Workers` choice already includes the Wrangler dependency and `wrangler.jsonc`.

`deploy setup` prepares continuous deployment to GitHub Actions for a project that is already a Git repository and published with Local-first. It detects the Git repository and the GitHub remote, checks the GitHub CLI (`gh`) and Wrangler logins, creates `.github/workflows/deploy.yml` from the same template used by `create-riebeckite`, reads the Cloudflare account from your Wrangler login (asking you to choose when there is more than one), and registers `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` as repository secrets. The token is read from a hidden prompt or from `CLOUDFLARE_API_TOKEN` in the environment and is sent to `gh secret set` through standard input; it is never passed as a command argument or written to disk. The command does not create a GitHub repository and does not push. An existing non-Riebeckite workflow is reported and left unchanged, and the command stops before registering any secrets. Wrangler must be installed in the site (Local-first sites already have it). Run it again any time: a matching workflow and existing secrets are detected and skipped, so only the remaining steps run.

`deploy domain` configures a Cloudflare Workers Custom Domain for the Worker that `deploy` publishes. Run it after the first `deploy`, because it reads the existing Wrangler configuration (`wrangler.jsonc` or `wrangler.json`) in the site and adds a declarative `routes` entry with `custom_domain: true`. It takes no arguments: the command prompts for a hostname such as `docs.example.com`, shows the planned change, and asks for confirmation before writing. A `wrangler.toml` is left unchanged, and the command stops with a hint when no Wrangler configuration exists or the terminal is not interactive. After writing, it offers `Deploy now?` and otherwise prints the `npm exec riebeckite deploy` command. Running it again detects an already-configured domain and skips the write.

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
