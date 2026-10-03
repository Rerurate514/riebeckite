import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDefaultWranglerConfig,
  workerNameFromDirectory,
} from "../src/commands/deploy.js";

test("workerNameFromDirectory normalizes directory names into Worker names", () => {
  assert.equal(workerNameFromDirectory("My Site"), "my-site");
  assert.equal(workerNameFromDirectory("my_site"), "my-site");
  assert.equal(workerNameFromDirectory("--My--Site--"), "my-site");
  assert.equal(workerNameFromDirectory("my.site"), "my-site");
  assert.equal(workerNameFromDirectory("MySite"), "mysite");
});

test("workerNameFromDirectory falls back when nothing usable remains", () => {
  assert.equal(workerNameFromDirectory(""), "riebeckite-site");
  assert.equal(workerNameFromDirectory("---"), "riebeckite-site");
});

test("workerNameFromDirectory caps the name at 63 characters", () => {
  const name = workerNameFromDirectory("a".repeat(80));
  assert.equal(name.length, 63);
  assert.equal(name, "a".repeat(63));
});

test("buildDefaultWranglerConfig produces valid JSON with the Worker name", () => {
  const content = buildDefaultWranglerConfig("my-site");
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
