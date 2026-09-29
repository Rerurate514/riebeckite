# Getting Started

## 1. Prepare the workspace

For a new site, generate one first, then install and validate:

```sh
pnpm exec riebeckite init my-site
# or, using the scaffolder package: npm create riebeckite my-site
cd my-site
pnpm install
pnpm exec riebeckite check
pnpm exec riebeckite doctor
```

`init` writes a self-contained site (configuration, HonoX application shell, routes, stylesheet, and starter content) and refuses a non-empty target unless `--force` is passed. Choose the starter composition with `--preset <name>`; the default is `starter`, which observes and highlights seven languages. Run `pnpm exec riebeckite init --list-presets` to see every preset from `empty` and `minimal` up to `full`, `max`, and `ultra`.

Run these from the application directory when using the CLI. `check` confirms configuration and plugin capability validity; `doctor` reports broader health. Neither generates a deployment build.

## 2. Add configuration

Create the application's Riebeckite config with a required `site` object, then choose content directory/source, publication policy, plugins, and a theme. Start with the defaults and add only behavior the site needs. See [Configuration](configuration.md).

## 3. Create and inspect content

Place content in the configured source, then inspect resolved results:

```sh
pnpm exec riebeckite inspect config
pnpm exec riebeckite inspect content --list
pnpm exec riebeckite inspect graph
```

Inspect is read-only. If configuration or content is invalid, correct it instead of expecting inspection to generate missing state.

## 4. Develop and build

```sh
pnpm exec riebeckite dev
pnpm exec riebeckite build
```

Use `build --full` when deliberately bypassing incremental reuse. Add functionality as a plugin, presentation as a theme, and routes/islands in the application. Follow [Architecture](architecture.md) before choosing a package.

## Suggested reading

Read [Content system](content-system.md), [Plugin system](plugin-system.md), [Theme system](theme-system.md), then [HonoX integration](honox-integration.md) for deployment-specific behavior.
