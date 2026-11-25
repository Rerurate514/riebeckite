import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveInput } from "./command_fixture.js";

test("init defaults the directory and leaves preset defaults to the generator", () => {
  assert.deepEqual(resolveInput(["init"]).arguments, { directory: "." });
  assert.deepEqual(resolveInput(["init"]).options, {
    preset: undefined,
    utilities: undefined,
    force: false,
    listPresets: false,
    githubActions: false,
    cloudflareWorkers: false,
    contentRepository: undefined,
    siteRepository: undefined,
    packageManager: undefined,
  });
});

test("init reads the GitHub Actions deployment options", () => {
  const input = resolveInput([
    "init",
    "site",
    "--preset",
    "minimal",
    "--github-actions",
    "--content-repository",
    "octo-org/notes",
    "--site-repository",
    "octo-org/site",
  ]);
  assert.equal(input.arguments.directory, "site");
  assert.equal(input.options.preset, "minimal");
  assert.equal(input.options.githubActions, true);
  assert.equal(input.options.contentRepository, "octo-org/notes");
  assert.equal(input.options.siteRepository, "octo-org/site");
});

test("init reads the project file selection", () => {
  const input = resolveInput([
    "init",
    "site",
    "--utilities",
    "gitignore,editorconfig,npmrc,vscode",
  ]);
  assert.equal(input.options.utilities, "gitignore,editorconfig,npmrc,vscode");
  assert.throws(
    () => resolveInput(["init", "--utilities"]),
    /requires a value/,
  );
});

test("init reads the package manager", () => {
  assert.equal(
    resolveInput(["init", "site", "--package-manager", "pnpm"]).options
      .packageManager,
    "pnpm",
  );
});

test("init accepts the local Cloudflare Workers deployment", () => {
  assert.equal(
    resolveInput(["init", "--cloudflare-workers"]).options.cloudflareWorkers,
    true,
  );
  assert.throws(
    () => resolveInput(["init", "--content-repository"]),
    /requires a value/,
  );
});
