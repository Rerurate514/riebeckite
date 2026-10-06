# Framework Development

This page is for people developing Riebeckite itself: core, CLI, HonoX integration, official plugins, official themes, templates, or the reference app. It is intentionally separate from [Getting Started](../getting-started/README.md). Users who only want to publish a site should use `create-riebeckite` instead of cloning this monorepo.

## Clone and install

```bash
git clone https://github.com/rerurate/riebeckite.git
cd riebeckite
pnpm install
pnpm build
```

## Common commands

```bash
pnpm dev
pnpm build
pnpm check
pnpm check:docs
pnpm check:scaffold
pnpm test
```

Use targeted commands when possible:

- `pnpm check:docs` validates Markdown links and docs structure.
- `pnpm check:scaffold` validates generated scaffold output.
- `pnpm typecheck` checks packages.
- `pnpm --filter <package> test` runs a package test when available.

## Repository layout

| Path | Purpose |
| --- | --- |
| `packages/core` | public config, content, pipeline, plugin, theme, diagnostics, observability APIs |
| `packages/cli` | `riebeckite` command |
| `packages/integrations/honox` | HonoX integration and scaffold generator |
| `packages/create-riebeckite` | public site scaffolding entrypoint |
| `packages/plugins/*` | official plugins |
| `packages/themes/*` | official themes |
| `apps/web` | official documentation app and framework-development reference application |
| `docs/` | documentation source read by the official docs app |
| `templates/analytics-cloudflare` | Analytics Worker deployment templates |

## Boundaries

- Core must not depend on app, plugin package internals, or framework-specific reverse dependencies.
- External plugins and themes must use public exports, not `src/**` imports.
- General-user docs must not require monorepo setup.
- Generated scaffolds must remain self-contained sites.

See [Architecture](./architecture.md), [Testing](./testing.md), [CLI](../reference/cli.md), and [HonoX Integration](./honox-integration.md).
