import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import type { ResolvedRiebeckiteConfig } from "@riebeckite/core";
import type { RiebeckiteProject } from "../src/application_root.js";
import {
  clearBuildOutputMarker,
  readBuildOutputMarker,
  resolveBuildOutputMarkerPath,
  writeBuildOutputMarker,
} from "../src/build_output.js";
import {
  MissingBuildOutputError,
  runWranglerDeployment,
} from "../src/publication/wrangler.js";

function makeConfig(root: string): ResolvedRiebeckiteConfig {
  return {
    site: {
      title: "Test",
      description: "",
      author: "",
      baseUrl: "",
      locale: "en",
      twitterSite: "",
      defaultOgImage: "",
      feed: { title: "Test", description: "", language: "en" },
    },
    content: {
      directory: path.join(root, "content"),
      exclude: [],
      filters: { publishStrategy: "explicit" },
    },
    theme: {
      name: "riebeckite",
      colorMode: "system",
      layout: "article",
      stylesheets: [],
      settings: { values: {}, attributes: {}, style: "" },
      styles: [],
    },
    plugins: [],
    cache: { enabled: false, directory: "" },
    buildDirectory: path.join(root, ".riebeckite"),
    outputDirectory: path.join(root, "dist"),
  };
}

function makeProject(root: string): RiebeckiteProject {
  const config = makeConfig(root);
  return {
    invocationCwd: root,
    projectRoot: root,
    configRoot: root,
    configPath: path.join(root, "riebeckite.config.ts"),
    appRoot: root,
    contentRoot: config.content.directory,
    config,
  };
}

async function makeRoot(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "riebeckite-deploy-guard-"));
}

async function seedOutput(root: string): Promise<void> {
  await fs.mkdir(path.join(root, "dist"), { recursive: true });
  await fs.writeFile(path.join(root, "dist", "index.html"), "<html></html>");
}

test("the build output marker lives under managed state", () => {
  const root = path.resolve("site");
  assert.equal(
    resolveBuildOutputMarkerPath(makeProject(root)),
    path.join(root, ".riebeckite", "build-output.json"),
  );
});

test("the build output marker round-trips and rejects a mismatched output directory", async (t) => {
  const root = await makeRoot();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const project = makeProject(root);

  await writeBuildOutputMarker(project);
  assert.deepEqual(await readBuildOutputMarker(project), {
    outputDirectory: path.join(root, "dist"),
  });

  const other = makeProject(root);
  (other.config as { outputDirectory?: string }).outputDirectory = path.join(
    root,
    "other-dist",
  );
  assert.equal(await readBuildOutputMarker(other), undefined);

  await clearBuildOutputMarker(project);
  assert.equal(await readBuildOutputMarker(project), undefined);
});

test("the build output marker records the publication fingerprint", async (t) => {
  const root = await makeRoot();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const project = makeProject(root);
  await writeBuildOutputMarker(project, {
    publicationFingerprint: "fingerprint",
    completedAt: "2026-01-10T00:00:00.000Z",
  });
  assert.deepEqual(await readBuildOutputMarker(project), {
    outputDirectory: path.join(root, "dist"),
    publicationFingerprint: "fingerprint",
    completedAt: "2026-01-10T00:00:00.000Z",
  });
});

test("the shared deploy gate refuses build output that is not from a completed build", async (t) => {
  const root = await makeRoot();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await seedOutput(root);

  await fs.mkdir(path.join(root, "content"), { recursive: true });
  await assert.rejects(
    runWranglerDeployment(makeProject(root), {
      provider: "cloudflare-workers",
      dryRun: true,
    }),
    /Publication gate blocked|artifact-invalid|artifact-not-from-build/u,
  );
});

test("deploy stops when dist is missing", async (t) => {
  const root = await makeRoot();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await assert.rejects(
    runWranglerDeployment(makeProject(root), {
      provider: "cloudflare-workers",
      dryRun: true,
    }),
    (error) => {
      assert.ok(error instanceof MissingBuildOutputError);
      return true;
    },
  );
});
