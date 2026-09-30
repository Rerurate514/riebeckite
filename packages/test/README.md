# @riebeckite/test

Shared test utilities for Riebeckite packages, plus a generic external-consumer
end-to-end engine.

[日本語](./README_ja.md)

## Overview

`@riebeckite/test` has two entry points:

- `@riebeckite/test` — dependency-free helpers for package unit tests.
- `@riebeckite/test/e2e` — a reusable engine for testing a built site end to
  end against published tarballs. It knows nothing about the Riebeckite
  monorepo: the repository root, the package list, the fixtures, and the
  content assertions are all supplied by the caller.

## Installation

```sh
pnpm add -D @riebeckite/test
```

## Unit-test helpers

`assertGolden` and `assertGoldenJson` record expensive output as committed
golden files instead of asserting it by hand. Node's built-in snapshot
assertion needs Node 22.3+, but Riebeckite supports Node 20.19+, so this helper
covers the supported range.

```ts
import { assertGolden, assertGoldenJson } from "@riebeckite/test";

assertGolden(renderHtml(), new URL("./__golden__/page.html", import.meta.url));
assertGoldenJson(manifest, new URL("./__golden__/manifest.json", import.meta.url));
```

The helpers normalize CRLF/CR to LF and collapse trailing newlines by default so
golden files stay stable across platforms and editors. Pass
`{ normalize: false }` when byte-exact output matters, and `{ message }` to add
context to failures.

A missing or mismatched golden file fails the test. Regenerate the recorded
files with `pnpm test:update` at the repository root (or `UPDATE_GOLDEN=1` for a
single package) and review the resulting diff.

See [Testing](../../docs/en/framework/testing.md) for the full workflow.

## External-site engine

`@riebeckite/test/e2e` packages a set of workspace packages into tarballs,
installs them into an empty consumer project alongside a fixture site, and runs
assertions against the result. Nothing about the monorepo is hardcoded.

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

The engine also exports the lower-level steps it is built from —
`run`/`runAsync` for spawning commands, `packPackages` for tarball creation,
`stageIsolatedSite` for building the consumer project, and the install and
artifact assertions — so a repository can compose its own flow. Work that does
not generalize, such as generating a starter site from the packed tarballs, runs
through the `afterSiteChecks` callback.

## See also

- [Testing](../../docs/en/framework/testing.md)
