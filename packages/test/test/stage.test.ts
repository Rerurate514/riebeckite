import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";

import {
  assertPackedInstall,
  createLogger,
  type PackedPackages,
} from "../e2e/index.js";
import { withTemporaryDirectory } from "../fixtures.js";

const scope = "@scope";
const name = "@scope/example";
const tarball = "file:../tarballs/scope-example-1.0.0.tgz";

function packed(): PackedPackages {
  return new Map([
    [name, { tarball: "/tarballs/example.tgz", version: "1.0.0" }],
  ]);
}

async function writeSite(
  root: string,
  options: {
    dependency?: string;
    override?: string;
    installedVersion?: string;
  } = {},
): Promise<void> {
  await fs.mkdir(root, { recursive: true });
  await fs.writeFile(
    path.join(root, "package.json"),
    JSON.stringify(
      {
        dependencies: { [name]: options.dependency ?? tarball },
        overrides: { [name]: options.override ?? tarball },
      },
      null,
      2,
    ),
  );
  if (options.installedVersion === undefined) return;
  const installed = path.join(root, "node_modules", ...name.split("/"));
  await fs.mkdir(installed, { recursive: true });
  await fs.writeFile(
    path.join(installed, "package.json"),
    JSON.stringify({ name, version: options.installedVersion }),
  );
}

test("assertPackedInstall accepts file: dependencies and matching versions", async () => {
  await withTemporaryDirectory("riebeckite-packed-install-", async (root) => {
    await writeSite(root, { installedVersion: "1.0.0" });
    assertPackedInstall(root, {
      packed: packed(),
      scope,
      logger: createLogger("packed-install-test"),
    });
  });
});

test("assertPackedInstall rejects a registry dependency and a version mismatch", async () => {
  await withTemporaryDirectory("riebeckite-packed-install-", async (root) => {
    await writeSite(root, {
      dependency: "^1.0.0",
      installedVersion: "1.0.0",
    });
    assert.throws(
      () =>
        assertPackedInstall(root, {
          packed: packed(),
          scope,
          logger: createLogger("packed-install-test"),
        }),
      /file: dependency/u,
    );
  });

  await withTemporaryDirectory("riebeckite-packed-install-", async (root) => {
    await writeSite(root, { installedVersion: "0.9.0" });
    assert.throws(
      () =>
        assertPackedInstall(root, {
          packed: packed(),
          scope,
          logger: createLogger("packed-install-test"),
        }),
      /does not match the packed/u,
    );
  });
});

test("assertPackedInstall rejects an installed scoped package that was not packed", async () => {
  await withTemporaryDirectory("riebeckite-packed-install-", async (root) => {
    await writeSite(root, { installedVersion: "1.0.0" });
    const extra = path.join(root, "node_modules", "@scope", "published-only");
    await fs.mkdir(extra, { recursive: true });
    await fs.writeFile(
      path.join(extra, "package.json"),
      JSON.stringify({ name: "@scope/published-only", version: "1.0.0" }),
    );
    assert.throws(
      () =>
        assertPackedInstall(root, {
          packed: packed(),
          scope,
          logger: createLogger("packed-install-test"),
        }),
      /would come from the public registry/u,
    );
  });
});
