# Testing

Riebeckite tests run on the Node.js built-in test runner (`node:test`) with
`tsx` for TypeScript, so no separate test framework is required. Output that is
expensive to assert by hand is recorded as committed golden files, which keeps
changes to that output visible in review.

End-to-end coverage of a real site lives separately in `tests/external-site` and
runs with `pnpm test:e2e:external`; this document covers package unit tests. The
reusable engine that drives it lives in `@riebeckite/test/e2e`, while the
repository-specific fixture, package list, and assertions stay in
`tests/external-site`.

## Running tests

|Command|What it does|
|---|---|
|`pnpm test`|Run every package that defines a `test` script (`pnpm -r test`)|
|`pnpm --filter @riebeckite/plugin-toc test`|Run one package's tests|
|`pnpm test:update`|Rewrite every golden file with the current output|
|`pnpm test:e2e:external`|Run the external-site integration suite|
|`pnpm test:registry`|Run the scaffold install contracts against npm-published artifacts|

The scaffold install contracts validate the generated site against **locally
packed workspace artifacts** by default, so a branch that adds a new package can
be verified before it is published. `pnpm test:registry` switches the same
contracts to install from npm and assert the published artifacts resolve; run it
after a release.

For a single package you can also update only its golden files by setting
`UPDATE_GOLDEN=1` before its test script. In PowerShell:

```powershell
$env:UPDATE_GOLDEN=1; pnpm --filter @riebeckite/plugin-toc test
```

## Where tests live

Each package keeps its tests in `test/*.test.ts` and declares its own `test`
script (`node --import tsx --test "test/*.test.ts"`). Test directories and test
files are excluded from type checking, from builds, and from published `files`,
so they never ship or affect consumers.

Shared test utilities live in the workspace package `@riebeckite/test`. Add it
to a package's `devDependencies` and import from `@riebeckite/test`.

## Writing a test

Import the public surface of the package under test and assert on the output.
Most plugin logic is pure and can be tested without a full build pipeline.

```ts
import assert from "node:assert/strict";
import { test } from "node:test";

import { renderBreadcrumbNav } from "../src/render.ts";

test("renders nothing for a single root item", () => {
  assert.equal(renderBreadcrumbNav([]), "");
});
```

Content-facing behavior is usually exercised through an in-memory
`ContentSource` and `resolveConfig`, then `ContentManager`:

```ts
const source = {
  async scan() {
    return [{ path: "notes/index.md" }];
  },
  async read(entry) {
    return `# ${entry.path}`;
  },
};
const config = resolveConfig({ content: { directory: "." } });
const manager = new ContentManager(source, [], { config });
const manifest = await manager.getManifest();
```

## Golden files

`@riebeckite/test` provides two helpers for large or structured output:

- `assertGolden(actual, goldenUrl)` for text (HTML, Markdown, serialized JSON).
- `assertGoldenJson(value, goldenUrl)` for objects, which formats the value
  with `JSON.stringify(value, null, 2)` before comparing.

Pass the expected file as a `URL` built from `import.meta.url` and keep the
recorded file under `test/__golden__/`:

```ts
import { assertGolden } from "@riebeckite/test";

test("renders the table of contents", () => {
  assertGolden(renderToc(entries), new URL("./__golden__/toc.html", import.meta.url));
});
```

On default normalization the helper converts CRLF/CR to LF and collapses
trailing newlines to one, so golden files stay stable across platforms and
editors. Pass `{ normalize: false }` when byte-exact output matters.

A missing or mismatched golden file fails the test. When the new output is
correct, regenerate it with `pnpm test:update` and review the resulting diff.
Golden files are committed on purpose: a change to recorded output should be
readable in a pull request.

Node's built-in snapshot assertion (`--test-update-snapshots`) is intentionally
not used because it requires Node 22.3+, while Riebeckite supports Node 20.19+.

## Adding tests to a package

1. Add `tsx` to the package's `devDependencies` and a `test` script:
   `node --import tsx --test "test/*.test.ts"`.
2. If the tests use the golden helpers, add `@riebeckite/test` to
   `devDependencies` and import them from `@riebeckite/test`.
3. If the package is a plugin, add its directory name to the `hasTests` list in
   `scripts/package_metadata.mjs`.
4. Run `pnpm install` when dependencies change, then `pnpm check:packages` to
   confirm the expected metadata matches.

`scripts/check_packages.mjs` compares each package's metadata against
`scripts/package_metadata.mjs`, so a missing `test` script or an unlisted plugin
is reported as a failure.

## What to test

Prefer deterministic, pure behavior:

- Option resolution, validation, and default handling.
- Content processing such as permalink resolution, TOC construction, and
  metadata extraction.
- Rendered HTML and generated JSON, captured as golden files.
- Boundary cases: empty input, missing frontmatter, duplicate slugs, and
  malformed attributes.

Avoid tests that depend on the network, the wall clock, or absolute paths.
When time or randomness matters, inject it rather than asserting on real values.
