import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { wranglerConfigForDirectory } from "create-riebeckite/scaffold";
import type { RiebeckiteProject } from "../src/application_root.js";
import { resolveDeployRoot } from "../src/commands/deploy.js";

test("resolveDeployRoot targets the app directory", () => {
  assert.equal(
    resolveDeployRoot({
      projectRoot: "/repo",
      appRoot: "/repo/apps/web",
    } as RiebeckiteProject),
    "/repo/apps/web",
  );
});

test("wranglerConfigForDirectory normalizes directory names into Worker names", () => {
  const workerName = (directoryName: string): string =>
    (
      JSON.parse(
        wranglerConfigForDirectory(path.join("/tmp", directoryName)),
      ) as { name: string }
    ).name;

  assert.equal(workerName("My Site"), "my-site");
  assert.equal(workerName("my_site"), "my-site");
  assert.equal(workerName("--My--Site--"), "my-site");
  assert.equal(workerName("my.site"), "my-site");
  assert.equal(workerName("MySite"), "mysite");
});

test("wranglerConfigForDirectory falls back when nothing usable remains", () => {
  const workerName = (directoryName: string): string =>
    (
      JSON.parse(
        wranglerConfigForDirectory(path.join("/tmp", directoryName)),
      ) as { name: string }
    ).name;

  assert.equal(workerName("---"), "riebeckite-site");
  assert.equal(workerName("..."), "riebeckite-site");
});

test("wranglerConfigForDirectory caps the name at 63 characters", () => {
  const name = "a".repeat(80);
  const config = JSON.parse(
    wranglerConfigForDirectory(path.join("/tmp", name)),
  ) as { name: string };
  assert.equal(config.name.length, 63);
  assert.equal(config.name, "a".repeat(63));
});

test("wranglerConfigForDirectory produces valid JSON with the Worker name", () => {
  const content = wranglerConfigForDirectory(path.join("/tmp", "my-site"));
  assert.ok(content.endsWith("\n"));

  const config = JSON.parse(content) as {
    name: string;
    compatibility_date: string;
    compatibility_flags: string[];
    assets: { directory: string };
  };
  assert.equal(config.name, "my-site");
  assert.equal(typeof config.compatibility_date, "string");
  assert.ok(config.compatibility_flags.includes("nodejs_compat"));
  assert.equal(config.assets.directory, "./dist");
});
