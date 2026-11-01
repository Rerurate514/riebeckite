import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { resolveConfig } from "@riebeckite/core";
import type { RiebeckiteProject } from "../src/application_root.js";
import { runDoctorCommand } from "../src/commands/doctor.js";

test("doctor reports unused and duplicate assets without deleting them", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "riebeckite-doctor-"));
  try {
    await fs.writeFile(
      path.join(root, "index.md"),
      "---\npublish: true\n---\n![A](a.png)\n",
    );
    await fs.writeFile(path.join(root, "a.png"), "same-bytes");
    await fs.writeFile(path.join(root, "b.png"), "same-bytes");
    await fs.writeFile(path.join(root, "c.bin"), "unused");
    const config = resolveConfig({
      site: { title: "Doctor" },
      content: { directory: root },
    });
    const project: RiebeckiteProject = {
      invocationCwd: root,
      projectRoot: root,
      configRoot: root,
      configPath: path.join(root, "riebeckite.config.ts"),
      appRoot: root,
      contentRoot: root,
      config,
    };
    const output: string[] = [];
    const original = console.log;
    console.log = (value: unknown) => {
      output.push(String(value));
    };
    try {
      await runDoctorCommand(project, { json: true });
    } finally {
      console.log = original;
    }
    const report = JSON.parse(output.join("\n")) as {
      diagnostics: { code: string; subject: { value?: string } }[];
    };
    const codes = report.diagnostics.map((diagnostic) => diagnostic.code);
    assert.ok(codes.includes("ASSET_DUPLICATE"));
    assert.ok(
      report.diagnostics.some(
        (diagnostic) =>
          diagnostic.code === "ASSET_UNUSED" &&
          diagnostic.subject.value === "b.png",
      ),
    );
    assert.ok(
      report.diagnostics.some(
        (diagnostic) =>
          diagnostic.code === "ASSET_UNUSED" &&
          diagnostic.subject.value === "c.bin",
      ),
    );
    assert.equal(
      await fs.readFile(path.join(root, "b.png"), "utf8"),
      "same-bytes",
    );
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
