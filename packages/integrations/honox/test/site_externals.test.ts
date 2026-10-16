import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { siteRiebeckiteExternals } from "../src/site_externals.js";

async function withSite(
  packageJson: string | undefined,
  run: (siteRoot: string) => void,
): Promise<void> {
  const siteRoot = await mkdtemp(
    path.join(tmpdir(), "riebeckite-site-externals-"),
  );
  try {
    if (packageJson !== undefined) {
      await writeFile(path.join(siteRoot, "package.json"), packageJson, "utf8");
    }
    run(siteRoot);
  } finally {
    await rm(siteRoot, { recursive: true, force: true });
  }
}

test("site externals select only the config-facing @riebeckite packages", async () => {
  await withSite(
    JSON.stringify({
      dependencies: {
        "@riebeckite/core": "^0.0.22",
        "@riebeckite/honox": "^0.0.22",
        "@riebeckite/plugin-seo": "^0.0.22",
        "@riebeckite/theme-default": "^0.0.22",
        hono: "^4.9.0",
        honox: "^0.1.0",
      },
      devDependencies: {
        "@riebeckite/plugin-dev-only": "^0.0.22",
      },
    }),
    (siteRoot) => {
      assert.deepEqual(siteRiebeckiteExternals(siteRoot), [
        "@riebeckite/core",
        "@riebeckite/plugin-seo",
        "@riebeckite/theme-default",
      ]);
    },
  );
});

test("site externals are empty when the package.json is missing", async () => {
  await withSite(undefined, (siteRoot) => {
    assert.deepEqual(siteRiebeckiteExternals(siteRoot), []);
  });
});

test("site externals are empty when the package.json is invalid", async () => {
  await withSite("{ invalid json", (siteRoot) => {
    assert.deepEqual(siteRiebeckiteExternals(siteRoot), []);
  });
});

test("site externals are empty when dependencies are absent", async () => {
  await withSite(JSON.stringify({ name: "site" }), (siteRoot) => {
    assert.deepEqual(siteRiebeckiteExternals(siteRoot), []);
  });
});
