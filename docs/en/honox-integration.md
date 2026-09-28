# HonoX Integration

`@riebeckite/integrations-honox` connects portable Core behavior to HonoX and Vite. It owns application-root/config resolution, Vite development and build integration, SSG extension mapping, generated plugin/theme style entries, and the HonoX application build workflow.

## Public API

The integration exports `riebeckite`, `loadRiebeckiteConfig`, `resolveHonoxApplication`, `buildHonoxApplication`, `resolveHonoxApplicationRoot`, `startHonoxDevServer`, `riebeckiteSsg`, and `riebeckiteSsgExtensionMap`.

The Vite plugin accepts optional `configRoot`, `appRoot`, `configFile`, and the monorepo-only `workspaceRoot`. `appRoot` defaults to the Vite root, and `configRoot` defaults to `appRoot`. A config path is imported relative to `configRoot`; `content.directory` is resolved relative to `appRoot`. `resolveHonoxApplication` returns these roots together with the resolved config, so CLI and Vite use the same model. `workspaceRoot` is only for source-package aliases during monorepo development; installed npm consumers use their own `node_modules` without it. The plugin creates generated import entries below `app/.riebeckite/` and exposes the required client module. Generated files are integration output: do not edit them as application source.

Use `riebeckiteSsg({ entry, extensionMap })` for static generation. It starts
its internal Vite server with the resolved application root and define values,
so invoking `riebeckite build` from a subdirectory yields the same output as
invoking it from the application root.

## Boundary rules

Article routing resolves a request against the manifest's already-resolved public locations (`byPermalink`, then `redirects`), never by inferring a URL from a filesystem path, directory layout, or slug. A slug remains an internal content lookup key; the public URL is the resolved `permalink`.

Keep HonoX, Vite, Cloudflare, and route APIs in this package or `apps/web`; Core remains portable. A plugin can expose assets, client entries, endpoints, and renderers, but Core does not become a HonoX router. The application decides concrete route composition and islands.

Use [Build system](build-system.md) for state behavior and [Architecture](architecture.md) for package ownership.
