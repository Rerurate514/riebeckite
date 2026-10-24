import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";

import { createLogger, packPackages } from "../e2e/index.js";
import { withTemporaryDirectory } from "../fixtures.js";

async function writePackFixture(root: string, name: string): Promise<void> {
  const directory = path.join(root, name);
  await fs.mkdir(path.join(directory, "dist"), { recursive: true });
  await fs.writeFile(
    path.join(directory, "package.json"),
    JSON.stringify(
      {
        name,
        version: "1.0.0",
        files: ["dist"],
        scripts: { prepack: 'node -e "process.exit(1)"' },
      },
      null,
      2,
    ),
    "utf8",
  );
  await fs.writeFile(path.join(directory, "dist", "index.js"), "export {};\n");
  await fs.writeFile(
    path.join(directory, ".pnpmfile.cjs"),
    'require("fs").writeFileSync("pnpmfile-ran", "");\n',
    "utf8",
  );
}

test("packPackages packs isolated prebuilt artifacts without running lifecycle scripts or pnpmfile hooks", async () => {
  await withTemporaryDirectory("riebeckite-pack-", async (root) => {
    await Promise.all([
      writePackFixture(root, "fixture-one"),
      writePackFixture(root, "fixture-two"),
    ]);
    const tarballDir = path.join(root, "tarballs");
    await fs.mkdir(tarballDir);

    const packed = await packPackages(tarballDir, {
      repoRoot: root,
      packages: [
        { name: "fixture-one", directory: "fixture-one" },
        { name: "fixture-two", directory: "fixture-two" },
      ],
      concurrency: 2,
      logger: createLogger("pack-test"),
    });

    assert.equal(packed.size, 2);
    for (const artifact of packed.values()) {
      await fs.access(artifact.tarball);
    }
    for (const name of ["fixture-one", "fixture-two"]) {
      await assert.rejects(fs.access(path.join(root, name, "pnpmfile-ran")));
    }
  });
});
