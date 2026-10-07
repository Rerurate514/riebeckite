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

Third-party plugin authoring and packaging are exercised from an external
package's perspective in `tests/plugin-dx` (its own pnpm workspace):

```sh
pnpm test:plugin-dx            # unit tests for plugins that use only public APIs
pnpm test:plugin-dx:external   # pack tarballs, install into an isolated site, verify
```

`test:plugin-dx:external` packs `@riebeckite/core` and fixture plugins, installs
them into a site outside this monorepo, and confirms the plugin works through
published packages only. Use it as a regression check for a plugin you
distribute.

## Running tests

|Command|What it does|
|---|---|
|`pnpm test`|Run every package that defines a `test` script (`pnpm -r test`)|
|`pnpm --filter @riebeckite/plugin-toc test`|Run one package's tests|
|`pnpm test:update`|Rewrite every golden file with the current output|
|`pnpm test:e2e:external`|Run the external-site integration suite|
|`pnpm test:plugin-dx`|Run the external-package plugin fixtures|
|`pnpm test:plugin-dx:external`|Pack tarballs, install into an isolated site, and verify plugins|
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

## Testing a plugin

A plugin can be tested at four levels. You do not need all of them; start from the smallest level that proves the behavior you changed.

```text
Level 1  Pure logic               A normal test runner is enough.
Level 2  Markdown / HTML          Pass the plugin to a Pipeline and assert the transformed output.
Level 3  Content / lifecycle      Use ContentManager with an in-memory ContentSource.
Level 4  Public package boundary  Pack the tarball and install it into an isolated site.
```

### Level 1: Pure logic

Option resolution, string transforms, and AST helpers that do not depend on Riebeckite run under any runner such as `node:test`. No `@riebeckite/test` or `ContentManager` is needed at this level.

### Level 2: Markdown / HTML transformation

Pass the plugin to the public `Pipeline`:

```ts
import { Pipeline } from "@riebeckite/core";
import { tipPlugin } from "../src/index.ts";

const pipeline = new Pipeline(new Map(), new Map(), undefined, {
  plugins: [tipPlugin()],
});

const { html } = await pipeline.execute(":::tip\nSave often.\n:::");
assert.match(html, /<aside class="rr-tip">/);
```

The first argument is the content index and the second is the permalink map; empty `Map`s are enough for a single document. The third argument is only needed when the plugin resolves embeds or other content. This is the level most plugin tests need.

### Level 3: Content / lifecycle

Use `ContentManager` with an in-memory `ContentSource` (the same shape shown above) to test content loading, hooks, manifests, body slots, or Page Types. `getProcessedContent()` returns the result of the pipeline plus content hooks; `getManifest()` returns the manifest including resolved plugins.

### Level 4: Public package boundary

For a package you distribute, `pnpm pack` it and install the tarball into an isolated site outside the monorepo. This catches missing public exports, accidental `@riebeckite/core/src/**` imports, undeclared dependencies, and missing declarations. `tests/plugin-dx` in this repository is the working example and runs with `pnpm test:plugin-dx` and `pnpm test:plugin-dx:external`.

### The role of `@riebeckite/test`

`@riebeckite/test` provides shared test helpers such as the golden-file assertions `assertGolden` and `assertGoldenJson`. It is **optional**: most Level 1-3 tests can be written with just `node:test` and the public core APIs (`Pipeline` / `ContentManager`). `@riebeckite/test/e2e` is the repository-oriented engine that builds an external site; third-party plugins do not normally need it.

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
