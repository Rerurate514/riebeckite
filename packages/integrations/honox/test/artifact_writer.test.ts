import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { createBuildArtifactWriter } from "../src/ssg/artifact_writer.js";

test("build artifact writer publishes a complete replacement", async () => {
  const root = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-artifacts-"),
  );
  const outputDirectory = path.join(root, "dist");
  try {
    await fs.mkdir(outputDirectory);
    await fs.writeFile(path.join(outputDirectory, "old.html"), "old");

    const writer = await createBuildArtifactWriter({ outputDirectory });
    await writer.write("index.html", "new");
    await writer.write("assets/app.js", "console.log('new')");
    await writer.publish();

    assert.equal(
      await fs.readFile(path.join(outputDirectory, "index.html"), "utf8"),
      "new",
    );
    assert.equal(
      await fs.readFile(path.join(outputDirectory, "assets", "app.js"), "utf8"),
      "console.log('new')",
    );
    await assert.rejects(fs.access(path.join(outputDirectory, "old.html")));
    await assert.rejects(writer.write("after.html", "closed"));
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("build artifact writer rejects paths outside its staging directory", async () => {
  const root = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-artifacts-"),
  );
  try {
    const writer = await createBuildArtifactWriter({
      outputDirectory: path.join(root, "dist"),
    });
    await assert.rejects(writer.write("../outside.txt", "no"));
    await writer.discard();
    await assert.rejects(fs.access(path.join(root, "outside.txt")));
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("build artifact writer restores an interrupted publication", async () => {
  const root = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-artifacts-"),
  );
  const outputDirectory = path.join(root, "dist");
  const backupDirectory = path.join(root, ".riebeckite", "backup");
  const stagingDirectory = path.join(root, ".riebeckite", "staging");
  try {
    await fs.mkdir(backupDirectory, { recursive: true });
    await fs.writeFile(path.join(backupDirectory, "old.html"), "old");
    await fs.mkdir(stagingDirectory);
    await fs.writeFile(
      path.join(root, ".riebeckite", "build-output.json"),
      JSON.stringify({
        backupDirectory,
        outputDirectory,
        stagingDirectory,
        state: "previous-output-moved",
      }),
    );

    const writer = await createBuildArtifactWriter({ outputDirectory });
    assert.equal(
      await fs.readFile(path.join(outputDirectory, "old.html"), "utf8"),
      "old",
    );
    await assert.rejects(
      fs.access(path.join(root, ".riebeckite", "build-output.json")),
    );
    await writer.discard();
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
