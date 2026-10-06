---
title: Framework
sidebar:
  label: Framework
  order: 60
  collapsed: true
---
# Framework

Framework documentation is for people who want to understand or develop Riebeckite itself. If you only want to build a site, start with [Getting Started](../getting-started/README.en.md) and use [Reference](../reference/README.en.md) when you need exact fields or commands.

## Read by responsibility

| I want to understand… | Page |
| --- | --- |
| Package ownership and dependency direction | [Architecture](./architecture.en.md) |
| How Markdown and assets become pages | [Content system](./content-system.en.md) |
| How plugins are resolved and run | [Plugin system](./plugin-system.en.md) |
| How plugins provide standalone pages | [Page system](./page-system.en.md) |
| How themes interact with CSS and plugin output | [Theme system](./theme-system.en.md) |
| Incremental builds, build state, and plugin cache | [Build system](./build-system.en.md) |
| How plugins declare build dependencies | [Build dependency contract](./build-dependency.en.md) |
| The HonoX/Vite adapter boundary | [HonoX integration](./honox-integration.en.md) |
| Diagnostics and Doctor | [Diagnostics](./diagnostics.en.md) |
| Read-only inspection commands | [Inspector](./inspector.en.md) |
| Logger, Tracer, and Profiler | [Observability](./observability.en.md) |
| Test layout and golden files | [Testing](./testing.en.md) |
| The monorepo development workflow | [Development](./development.en.md) |

## Responsibility boundaries

- **Core** owns content-processing contracts and orchestration. It does not depend on HonoX, Vite, a specific plugin, or a theme.
- **Plugins** extend Markdown, HTML, metadata, assets, client behavior, endpoints, SEO, diagnostics, and graph behavior.
- **Themes** own appearance: tokens, CSS, stable-hook styling, and safe theme attributes.
- **Integrations** connect Core to a web framework and bundler. The current supported adapter is HonoX/Vite.
- **Applications** hold site-specific routes, components, and islands.
- **CLI** is build-time tooling. Runtime Cloudflare Workers code must not access build state or filesystem caches.

## For repository development

The Riebeckite monorepo clone workflow is intentionally here, not in Getting Started. Use it only when you are changing Riebeckite itself: [Development](./development.en.md).

