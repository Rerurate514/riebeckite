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
   │  ├─ tsconfig.json           # moduleResolution: bundler
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
2. Copy the fixture site and vault into `<temp>/site` and `<temp>/vault`.
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
8. Type-check with `moduleResolution: bundler` and `moduleResolution: NodeNext`
   (the NodeNext config type-checks every published entry point with
   `skipLibCheck: false`).

## Running

```sh
pnpm test:e2e:external
```

Set `RIEBECKITE_E2E_KEEP=1` to keep the temporary workspace for inspection.

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
