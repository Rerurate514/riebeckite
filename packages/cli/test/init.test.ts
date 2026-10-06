import assert from "node:assert/strict";
import { test } from "node:test";
import { parseCommand } from "../src/cli.js";

test("parseCommand defaults init to the starter preset without deployment", () => {
  assert.deepEqual(parseCommand(["init"]), {
    name: "init",
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

test("parseCommand reads the GitHub Actions deployment options", () => {
  assert.deepEqual(
    parseCommand([
      "init",
      "site",
      "--preset",
      "minimal",
      "--github-actions",
      "--content-repository",
      "octo-org/notes",
      "--site-repository",
      "octo-org/site",
    ]),
    {
      name: "init",
      directory: "site",
      force: false,
      preset: "minimal",
      listPresets: false,
      githubActions: true,
      cloudflareWorkers: false,
      contentRepository: "octo-org/notes",
      siteRepository: "octo-org/site",
    },
  );
});

test("parseCommand accepts the local Cloudflare Workers deployment", () => {
  assert.equal(
    parseCommand(["init", "--cloudflare-workers"]).cloudflareWorkers,
    true,
  );
});

test("parseCommand rejects conflicting or incomplete deployment options", () => {
  assert.throws(
    () => parseCommand(["init", "--github-actions", "--cloudflare-workers"]),
    /mutually exclusive/,
  );
  assert.throws(
    () => parseCommand(["init", "--content-repository", "octo-org/notes"]),
    /requires --github-actions/,
  );
  assert.throws(
    () => parseCommand(["init", "--content-repository"]),
    /requires an owner\/repository value/,
  );
});
