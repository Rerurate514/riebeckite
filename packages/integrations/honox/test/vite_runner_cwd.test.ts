import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { buildHonoxApplication } from "../src/vite_runner.js";

async function createTemporaryDirectory(): Promise<string> {
  return await fs.mkdtemp(path.join(os.tmpdir(), "riebeckite-honox-cwd-"));
}

async function samePath(left: string, right: string): Promise<void> {
  assert.equal(await fs.realpath(left), await fs.realpath(right));
}

test("buildHonoxApplication runs Vite from the application root and restores the working directory", async () => {
  const temporaryRoot = await createTemporaryDirectory();
  const appRoot = path.join(temporaryRoot, "app-root");
  const foreignRoot = path.join(temporaryRoot, "foreign");
  const observedPath = path.join(temporaryRoot, "observed-cwd.txt");
  const originalDirectory = process.cwd();

  try {
    await fs.mkdir(appRoot, { recursive: true });
    await fs.mkdir(foreignRoot, { recursive: true });
    await fs.writeFile(
      path.join(appRoot, "vite.config.ts"),
      [
        'import fs from "node:fs";',
        "export default {",
        "  plugins: [",
        "    {",
        '      name: "record-working-directory",',
        "      configResolved() {",
        `        fs.writeFileSync(${JSON.stringify(observedPath)}, process.cwd());`,
        "      },",
        "    },",
        "  ],",
        "};",
        "",
      ].join("\n"),
    );
    await fs.writeFile(
      path.join(appRoot, "index.html"),
      "<!doctype html><html><body>working directory</body></html>",
    );

    process.chdir(foreignRoot);
    try {
      await buildHonoxApplication({ root: appRoot });
      assert.equal(process.cwd(), foreignRoot);
    } finally {
      process.chdir(originalDirectory);
    }

    await samePath((await fs.readFile(observedPath, "utf8")).trim(), appRoot);
  } finally {
    await fs.rm(temporaryRoot, { recursive: true, force: true });
  }
});
