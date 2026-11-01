---
date: 2026-11-01
title: External-site E2E
sidebar:
  label: External-site E2E
  order: 40
---
# External-site E2E

`@riebeckite/test/e2e` packs packages into tarballs, installs them into an empty consumer project, and validates the site that gets built. Nothing about the monorepo is hardcoded: the repository root, package list, fixtures, and assertions are all supplied by the caller.

In this repository, `tests/external-site` uses the engine and holds the repository-specific fixtures and checks.

## Usage

```ts
import path from "node:path";

import { runExternalSiteE2E } from "@riebeckite/test/e2e";

await runExternalSiteE2E({
  repoRoot,
  packages: [{ directory: "packages/core", name: "@riebeckite/core" }],
  fixture: { site: fixtureSite, vault: fixtureVault },
  dependencyCheckScript: path.join(repoRoot, "scripts/check_dependencies.mjs"),
  scope: "@riebeckite",
  cliName: "riebeckite",
  resolveCliEntry: (siteDir) =>
    path.join(siteDir, "node_modules", "@riebeckite", "cli", "bin", "riebeckite.mjs"),
  cliCommands: [{ args: ["build"] }],
  keepEnv: "RIEBECKITE_E2E_KEEP",
  assertions: {
    buildOutput: (siteDir, vaultDir) => {
      // assert on the built site
    },
  },
});
```

The temporary workspace is removed at the end of the run. When the environment variable named by `keepEnv` is set, the workspace is kept for later inspection.

## Lower-level API

`@riebeckite/test/e2e` also exports the steps it is built from.

- `run` / `runAsync` — spawn commands
- `packPackages` — create package tarballs
- `stageIsolatedSite` — build the consumer project
- Install and artifact assertions

Work that does not generalize, such as generating a starter site from the tarballs, runs in `afterSiteChecks`.

## See also

- [Testing](../testing.md)
- [Golden files](./golden-files.md)
