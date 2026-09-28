# HonoX Integration

`@riebeckite/integrations-honox` connects portable Core behavior to HonoX and Vite. It owns application-root/config resolution, Vite development and build integration, SSG extension mapping, generated plugin/theme style entries, and the HonoX application build workflow.

## Public API

The integration exports `riebeckite`, `loadRiebeckiteConfig`, `buildHonoxApplication`, `resolveHonoxApplicationRoot`, `startHonoxDevServer`, and `riebeckiteSsgExtensionMap`.

The Vite plugin accepts optional `workspaceRoot`, `appRoot`, and `configFile`. It resolves the application configuration, creates generated import entries below `app/.riebeckite/`, installs workspace aliases, and exposes the required client module. Generated files are integration output: do not edit them as application source.

## Boundary rules

Keep HonoX, Vite, Cloudflare, and route APIs in this package or `apps/web`; Core remains portable. A plugin can expose assets, client entries, endpoints, and renderers, but Core does not become a HonoX router. The application decides concrete route composition and islands.

Use [Build system](build-system.md) for state behavior and [Architecture](architecture.md) for package ownership.
