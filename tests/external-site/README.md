# A1.6 — External Site Build E2E

This directory proves that Riebeckite works outside its monorepo: a site that
lives in a temporary directory, installs only packed `@riebeckite/*` tarballs
plus normal npm dependencies, and builds without any workspace alias, root
`tsconfig` path, `workspace:` protocol, direct source import, or symlink back
into the Riebeckite repository.

## Layout

```
tests/external-site/
├─ run.mjs                       # the automated test
├─ README.md                     # this file
└─ fixture/
   ├─ site/                      # copied to <temp>/site (owns node_modules)
   │  ├─ package.json            # normal deps; tarballs injected by run.mjs
   │  ├─ tsconfig.json           # moduleResolution: bundler (base; see below)
   │  ├─ tsconfig.nodenext.json  # moduleResolution: NodeNext (skipLibCheck: false)
   │  ├─ riebeckite.config.ts
   │  ├─ vite.config.ts
   │  ├─ typecheck/nodenext.ts   # imports every published entry point
   │  ├─ extensions/             # site-local plugin + theme (definePlugin/defineTheme)
   │  └─ app/...                 # minimal HonoX site (server, client, routes)
   └─ vault/                     # copied to <temp>/vault
      ├─ index.md
      ├─ notes/example.md
      └─ attachments/README.txt
```

`vault/` is copied **next to** `site/`, not inside it. The site's
`content.directory` is `../vault`, so any code that assumes content lives under
the app/site root fails immediately.

## What it does

1. `pnpm pack` the published packages into `<temp>/tarballs`.
2. Copy the fixture site and vault into `<temp>/site` and `<temp>/vault`, then
   layer the external-consumer type library `vite/client` onto the copied
   `site/tsconfig.json`.
3. Rewrite `site/package.json` with `file:` dependencies (and `overrides`) that
   point at the tarballs, so transitive `@riebeckite/*` requirements also
   resolve to the local tarballs and never hit the public registry.
4. `npm install` (real directories, no symlinks into the repository).
5. Assert the site contains no `packages/` directory and no `workspace:` /
   monorepo-path escape hatches, and that `node_modules/@riebeckite/*` resolves
   outside the repository.
6. Check that every bare import in the site is a declared dependency of the
   site (`scripts/check_dependencies.mjs`), so the fixture cannot silently rely
   on hoisted packages.
7. Run `riebeckite check`, `riebeckite doctor`, `riebeckite inspect`, and
   `riebeckite build` from `site/app`, rather than the application root.
8. Assert the generated `dist/` HTML contains the fixture markers, including one
   produced by a **site-local plugin** (`extensions/local-plugin.ts`) and theme
   attributes produced by a **site-local theme** (`extensions/local-theme.ts`),
   and that both site-local stylesheets are bundled into the emitted CSS.
9. Type-check with `moduleResolution: bundler` and `moduleResolution: NodeNext`.
   Both configs use `skipLibCheck: false`; the NodeNext config imports every
   published entry point so a broken declaration cannot hide behind unused code.
10. Generate a second site with `riebeckite init` (and check the `create-riebeckite`
    launcher), inject the same tarballs, then run `check`, `doctor`, and `build`
    on it. This proves the starter generated from the template is buildable and
    that `init` refuses a non-empty target without `--force`.

## Why `vite/client` lives only in the isolated copy

`vite` is a real dependency of the standalone site, so `vite/client` is a real
type library there — it is not being faked. But the checked-in fixture
intentionally has no `node_modules`, and an editor's TypeScript server discovers
`fixture/site/tsconfig.json` directly and reports `TS2688 Cannot find type
definition file for 'vite/client'` for a library that only exists after the
copy + install.

`fixture/site/typecheck/development-riebeckite-modules.d.ts` therefore provides
editor-only declarations for the uninstalled fixture. `run.mjs` excludes that
file from the copied configs, then layers the external-consumer requirement —
`node` + `vite/client` — onto `site/tsconfig.json` immediately before installing.
The isolated copy therefore still proves that published packages resolve exactly
as they would for any other consumer.

Nothing here weakens isolation: no monorepo alias, root `tsconfig` path,
symlink, or `workspace:` protocol is involved, and `tsconfig.nodenext.json` is
unchanged.

## Site-local extensions

`fixture/site/extensions/` contains a plugin and a theme defined **inside the
site** with `definePlugin` / `defineTheme`, exactly as a site author would write
them. They are passed to `riebeckite.config.ts` alongside the installed
`@riebeckite/plugin-*` / `@riebeckite/theme-*` packages.

This proves the extensibility contract does not depend on npm packaging:

- the local plugin's `extendHtmlPipeline` hook renders its marker into every
  post, and its `assets` stylesheet is bundled into `dist/`;
- the local theme composes `@riebeckite/theme-default` and adds its own
  stylesheet plus a `data-*` attribute, which reaches `<html>` through the same
  attribute contract as a packaged theme;
- `riebeckite inspect plugins` and `riebeckite inspect config` report the
  site-local plugin and theme by name.

Local plugins cannot use `createStyleAsset()` (it hardcodes
`@riebeckite/plugin-<name>/style.css`). They declare `assets` with an explicit
module specifier the host bundler resolves; the fixture uses `/extensions/*.css`
(Vite root = app root).

## Running

```sh
pnpm test:e2e:external
```

Set `RIEBECKITE_E2E_KEEP=1` to keep the temporary workspace for inspection.

## Third-party findings captured by the fixture

These are external-consumer issues the fixture surfaced. They are not
Riebeckite defects, but they affect anyone installing the published packages,
so they are documented here instead of being hidden with `skipLibCheck`.

- **`hono` is pinned to `4.12.26`.** `hono@4.13.x` ships
  `dist/types/jsx/base.d.ts` with a self-referential `IntrinsicElements` that
  TypeScript reports as `TS2310` when `skipLibCheck: false`, which then cascades
  into spurious `Module '"hono"' has no exported member 'Hono'/'ErrorHandler'`
  errors inside `honox`'s declarations. `4.12.26` (the version the monorepo
  develops against) is clean.
- **`hono`'s `Env` is a type alias, not an interface.** It therefore cannot be
  augmented with `declare module "hono" { interface Env { ... } }`: written in a
  global script the declaration *overrides* the real module, and written in a
  module it reports `Duplicate identifier 'Env'`. The fixture does not need
  custom bindings, so it only declares the virtual `virtual:riebeckite/client`
  module. (`apps/web/app/global.d.ts` still contains the invalid augmentation,
  masked there by `skipLibCheck: true`.)
- **CommonJS deps must stay external in the SSR build.** `riebeckiteVite()`
  supplies `environments.ssr.resolve.external` (`defaultSsrExternals`); without
  it Vite inlines `extend` and the SSG pass fails with `ReferenceError: module
  is not defined`. The fixture relies on those defaults instead of restating
  them.
- **SSG belongs to `@riebeckite/honox`.** `riebeckiteVite()` adds
  `createRiebeckiteSsg`, which fills in the root-relative `./app/server.ts`
  entry and the Riebeckite extension map. The underlying `riebeckiteSsg`
  creates its internal Vite server with the resolved Vite `root` and `define`
  options. It replaces the local patch previously needed for `@hono/vite-ssg`
  and works from a descendant working directory in an npm-installed site.

## Root model

The fixture calls `riebeckiteVite()` without options and without a workspace
option. `appRoot` defaults to the Vite root and determines the base for
`content.directory`; `configRoot` defaults to that same directory and determines
where `riebeckite.config.*` is imported from. The fixture intentionally points
content outside `appRoot` to exercise the resolved absolute `contentRoot`.

`workspaceRoot` is only an explicit monorepo-development option for resolving
unbuilt source packages. It is not needed by installed npm consumers. The CLI
and the Vite integration both use `resolveHonoxApplication`, which resolves
`configRoot`, `appRoot`, and `contentRoot` together.
