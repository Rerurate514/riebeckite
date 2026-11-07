import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { computeBundleFingerprint } from "../src/ssg/inventory.js";
import {
  buildHonoxApplication,
  canReuseClientBuild,
} from "../src/vite_runner.js";

async function createTemporaryDirectory(): Promise<string> {
  return await fs.mkdtemp(path.join(os.tmpdir(), "riebeckite-honox-cwd-"));
}

async function samePath(left: string, right: string): Promise<void> {
  assert.equal(await fs.realpath(left), await fs.realpath(right));
}

test("client bundle reuse requires matching application inputs and manifest", async () => {
  const root = await createTemporaryDirectory();
  const configFile = path.join(root, "vite.config.ts");
  const outputDirectory = path.join(root, "dist");
  try {
    await fs.mkdir(path.join(root, "app"), { recursive: true });
    await fs.mkdir(path.join(outputDirectory, ".vite"), { recursive: true });
    await fs.writeFile(configFile, "export default {}\n");
    await fs.writeFile(path.join(root, "app", "client.ts"), "export {}\n");
    await fs.writeFile(
      path.join(outputDirectory, ".vite", "manifest.json"),
      "{}",
    );
    const manifestChecksum = createHash("sha256").update("{}").digest("hex");
    await fs.mkdir(path.join(root, ".riebeckite"));
    await fs.writeFile(
      path.join(root, ".riebeckite", "ssg-output-cache.json"),
      JSON.stringify({
        version: 4,
        bundleFingerprint: await computeBundleFingerprint(root, configFile),
        configFile,
        outputs: {},
        finalOutputInventory: {
          ".vite/manifest.json": manifestChecksum,
        },
      }),
    );

    assert.equal(await canReuseClientBuild({ root, outputDirectory }), true);
    await fs.writeFile(
      path.join(root, "app", "client.ts"),
      "export const v = 2\n",
    );
    assert.equal(await canReuseClientBuild({ root, outputDirectory }), false);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("client bundle reuse rejects missing, corrupt, and incomplete artifacts", async () => {
  const root = await createTemporaryDirectory();
  const configFile = path.join(root, "vite.config.ts");
  const outputDirectory = path.join(root, "dist");
  const manifestPath = path.join(outputDirectory, ".vite", "manifest.json");
  const assetPath = path.join(outputDirectory, "assets", "app.js");
  try {
    await fs.mkdir(path.dirname(manifestPath), { recursive: true });
    await fs.mkdir(path.dirname(assetPath), { recursive: true });
    await fs.mkdir(path.join(root, "app"), { recursive: true });
    await fs.writeFile(configFile, "export default {}\n");
    await fs.writeFile(path.join(root, "app", "client.ts"), "export {}\n");
    const manifest = JSON.stringify({ entry: { file: "assets/app.js" } });
    await fs.writeFile(manifestPath, manifest);
    await fs.writeFile(assetPath, "original");
    await fs.mkdir(path.join(root, ".riebeckite"));
    await fs.writeFile(
      path.join(root, ".riebeckite", "ssg-output-cache.json"),
      JSON.stringify({
        version: 4,
        bundleFingerprint: await computeBundleFingerprint(root, configFile),
        configFile,
        outputs: {},
        finalOutputInventory: {
          ".vite/manifest.json": createHash("sha256")
            .update(manifest)
            .digest("hex"),
          "assets/app.js": createHash("sha256")
            .update("original")
            .digest("hex"),
        },
      }),
    );

    assert.equal(await canReuseClientBuild({ root, outputDirectory }), true);
    await fs.writeFile(assetPath, "corrupt");
    assert.equal(await canReuseClientBuild({ root, outputDirectory }), false);
    await fs.rm(assetPath);
    assert.equal(await canReuseClientBuild({ root, outputDirectory }), false);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("client bundle reuse rejects changes in file-linked local packages", async () => {
  const root = await createTemporaryDirectory();
  const packageRoot = path.join(root, "shared");
  const configFile = path.join(root, "vite.config.ts");
  const outputDirectory = path.join(root, "dist");
  try {
    await fs.mkdir(path.join(root, "app"), { recursive: true });
    await fs.mkdir(path.join(outputDirectory, ".vite"), { recursive: true });
    await fs.mkdir(packageRoot, { recursive: true });
    await fs.writeFile(
      path.join(root, "package.json"),
      JSON.stringify({ dependencies: { shared: "file:./shared" } }),
    );
    await fs.writeFile(
      path.join(packageRoot, "index.ts"),
      "export const v = 1\n",
    );
    await fs.writeFile(configFile, "export default {}\n");
    await fs.writeFile(path.join(root, "app", "client.ts"), "export {}\n");
    await fs.writeFile(
      path.join(outputDirectory, ".vite", "manifest.json"),
      "{}",
    );
    await fs.mkdir(path.join(root, ".riebeckite"));
    await fs.writeFile(
      path.join(root, ".riebeckite", "ssg-output-cache.json"),
      JSON.stringify({
        version: 4,
        bundleFingerprint: await computeBundleFingerprint(root, configFile),
        configFile,
        outputs: {},
        finalOutputInventory: {
          ".vite/manifest.json": createHash("sha256")
            .update("{}")
            .digest("hex"),
        },
      }),
    );

    assert.equal(await canReuseClientBuild({ root, outputDirectory }), true);
    await fs.writeFile(
      path.join(packageRoot, "index.ts"),
      "export const v = 2\n",
    );
    assert.equal(await canReuseClientBuild({ root, outputDirectory }), false);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("client bundle reuse rejects changes in workspace packages", async () => {
  const root = await createTemporaryDirectory();
  const packageRoot = path.join(root, "shared");
  const configFile = path.join(root, "vite.config.ts");
  const outputDirectory = path.join(root, "dist");
  try {
    await fs.mkdir(path.join(root, "app"), { recursive: true });
    await fs.mkdir(path.join(outputDirectory, ".vite"), { recursive: true });
    await fs.mkdir(packageRoot, { recursive: true });
    await fs.writeFile(
      path.join(root, "pnpm-workspace.yaml"),
      "packages:\n  - '*'\n",
    );
    await fs.writeFile(
      path.join(root, "package.json"),
      JSON.stringify({ dependencies: { shared: "workspace:*" } }),
    );
    await fs.writeFile(
      path.join(packageRoot, "package.json"),
      JSON.stringify({ name: "shared" }),
    );
    await fs.writeFile(
      path.join(packageRoot, "index.ts"),
      "export const v = 1\n",
    );
    await fs.writeFile(configFile, "export default {}\n");
    await fs.writeFile(path.join(root, "app", "client.ts"), "export {}\n");
    await fs.writeFile(
      path.join(outputDirectory, ".vite", "manifest.json"),
      "{}",
    );
    await fs.mkdir(path.join(root, ".riebeckite"));
    await fs.writeFile(
      path.join(root, ".riebeckite", "ssg-output-cache.json"),
      JSON.stringify({
        version: 4,
        bundleFingerprint: await computeBundleFingerprint(root, configFile),
        configFile,
        outputs: {},
        finalOutputInventory: {
          ".vite/manifest.json": createHash("sha256")
            .update("{}")
            .digest("hex"),
        },
      }),
    );

    assert.equal(await canReuseClientBuild({ root, outputDirectory }), true);
    await fs.writeFile(
      path.join(packageRoot, "index.ts"),
      "export const v = 2\n",
    );
    assert.equal(await canReuseClientBuild({ root, outputDirectory }), false);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

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
      await samePath(process.cwd(), foreignRoot);
    } finally {
      process.chdir(originalDirectory);
    }

    await samePath((await fs.readFile(observedPath, "utf8")).trim(), appRoot);
  } finally {
    await fs.rm(temporaryRoot, { recursive: true, force: true });
  }
});
