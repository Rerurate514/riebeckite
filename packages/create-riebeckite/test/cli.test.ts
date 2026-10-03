import assert from "node:assert/strict";
import { test } from "node:test";
import { parseArguments } from "../src/arguments.js";
import {
  DEFAULT_INTERACTIVE_DEPLOYMENT,
  interactiveAnswersToOptions,
} from "../src/interactive.js";

test("interactive deployment defaults to no deployment setup", () => {
  assert.equal(DEFAULT_INTERACTIVE_DEPLOYMENT, "none");
});

test("interactive answers without deployment map to a plain scaffold", () => {
  const options = interactiveAnswersToOptions({
    directory: "my-site",
    preset: "starter",
    contentSource: "local",
    deployment: "none",
  });
  assert.deepEqual(options, {
    directory: "my-site",
    force: false,
    preset: "starter",
    listPresets: false,
    githubActions: false,
    cloudflareWorkers: false,
    contentRepository: undefined,
    siteRepository: undefined,
  });
});

test("interactive answers with GitHub Actions enable the workflow", () => {
  const options = interactiveAnswersToOptions({
    directory: "my-site",
    preset: "starter",
    contentSource: "local",
    deployment: "github-actions",
  });
  assert.deepEqual(options, {
    directory: "my-site",
    force: false,
    preset: "starter",
    listPresets: false,
    githubActions: true,
    cloudflareWorkers: false,
    contentRepository: undefined,
    siteRepository: undefined,
  });
});

test("interactive answers with Cloudflare Workers select local-first deployment", () => {
  const options = interactiveAnswersToOptions({
    directory: "my-site",
    preset: "starter",
    contentSource: "local",
    deployment: "cloudflare",
  });
  assert.deepEqual(options, {
    directory: "my-site",
    force: false,
    preset: "starter",
    listPresets: false,
    githubActions: false,
    cloudflareWorkers: true,
    contentRepository: undefined,
    siteRepository: undefined,
  });
});

test("external content forces GitHub Actions and keeps both repositories", () => {
  const options = interactiveAnswersToOptions({
    directory: "my-site",
    preset: "showcase",
    contentSource: "external",
    deployment: "none",
    contentRepository: "OWNER/notes",
    siteRepository: "OWNER/site",
  });
  assert.deepEqual(options, {
    directory: "my-site",
    force: false,
    preset: "showcase",
    listPresets: false,
    githubActions: true,
    cloudflareWorkers: false,
    contentRepository: "OWNER/notes",
    siteRepository: "OWNER/site",
  });
});

test("non-interactive defaults are unchanged", () => {
  const options = parseArguments([]);
  assert.deepEqual(options, {
    directory: ".",
    force: false,
    preset: "starter",
    listPresets: false,
    githubActions: false,
    cloudflareWorkers: false,
    contentRepository: undefined,
    siteRepository: undefined,
  });
});

test("existing flags keep parsing", () => {
  const options = parseArguments([
    "my-site",
    "--preset",
    "showcase",
    "--github-actions",
    "--content-repository",
    "OWNER/notes",
    "--site-repository",
    "OWNER/site",
    "--force",
    "--list-presets",
  ]);
  assert.deepEqual(options, {
    directory: "my-site",
    force: true,
    preset: "showcase",
    listPresets: true,
    githubActions: true,
    cloudflareWorkers: false,
    contentRepository: "OWNER/notes",
    siteRepository: "OWNER/site",
  });
});

test("existing argument errors keep throwing", () => {
  assert.throws(() => parseArguments(["--unknown"]), /Unknown option/);
  assert.throws(
    () => parseArguments(["--preset", "unknown"]),
    /Unknown preset/,
  );
  assert.throws(
    () => parseArguments(["--content-repository"]),
    /requires an owner\/repository value\./,
  );
  assert.throws(
    () => parseArguments(["--site-repository", "--force"]),
    /requires an owner\/repository value\./,
  );
  assert.throws(
    () => parseArguments(["one", "two"]),
    /Usage: create-riebeckite/,
  );
});
