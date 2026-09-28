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
6. Run `riebeckite check`, `riebeckite doctor`, `riebeckite inspect`, and
   `riebeckite build`.
7. Assert the generated `dist/` HTML contains the fixture markers.
8. Type-check with `moduleResolution: bundler` and `moduleResolution: NodeNext`.
   Both configs use `skipLibCheck: false`; the NodeNext config imports every
   published entry point so a broken declaration cannot hide behind unused code.

## Why `vite/client` lives only in the isolated copy

`vite` is a real dependency of the standalone site, so `vite/client` is a real
type library there — it is not being faked. But the checked-in fixture
intentionally has no `node_modules`, and an editor's TypeScript server discovers
`fixture/site/tsconfig.json` directly and reports `TS2688 Cannot find type
definition file for 'vite/client'` for a library that only exists after the
copy + install.

`fixture/site/tsconfig.json` is therefore the editable base that both Vite and
the editor discover, and it lists only `types: ["node"]` (resolvable from the
dev environment and from the site itself). `run.mjs` layers the
external-consumer requirement — `node` + `vite/client` — onto the copied
`site/tsconfig.json` immediately before installing, so the isolated copy still
proves that `vite/client` resolves exactly as it would for any other external
consumer.

Nothing here weakens isolation: no monorepo alias, root `tsconfig` path,
symlink, or `workspace:` protocol is involved, and `tsconfig.nodenext.json` is
unchanged.

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
- **CommonJS deps must stay external in the SSR build.** The fixture sets
  `environments.ssr.resolve.external` (mirroring `apps/web`); without it Vite
  inlines `extend` and the SSG pass fails with `ReferenceError: module is not
  defined`.
- **The `@hono/vite-ssg` patch is not applied to external installs.**
  `pnpm-lock`/`patches/@hono__vite-ssg@0.3.3.patch` fixes the plugin to use
  `config.root`; a plain `npm install` gets the unpatched package. The fixture
  still builds because the CLI is run with `cwd` set to the site, which is what
  the unpatched plugin falls back to. Running the CLI from a different working
  directory would break. This is a latent external-consumer risk worth tracking.

## Root model note (A3/A4)

The fixture's `vite.config.ts` passes `workspaceRoot: appRoot` to
`riebeckite(...)` explicitly. The default is `resolve(root, "../..")`, which
assumes the HonoX app sits at `<repo>/apps/<name>` and that the Riebeckite
monorepo is two directories up. For a standalone site that assumption points
above the site, and the config loader then fails to find `riebeckite.config.ts`.

The CLI's own `resolveRiebeckiteProject` uses the discovered `configRoot` as
both project root and workspace root, while the Vite plugin has a separate
`workspaceRoot`. `workspaceRoot`, `projectRoot`, `configRoot`, `appRoot`, and
the content root are not yet unified. Passing `workspaceRoot` explicitly is the
minimum change needed to make this fixture build; unifying those roots is
tracked as A3/A4.
