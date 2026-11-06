import assert from "node:assert/strict";
import { test } from "node:test";
import { parseArguments } from "../src/arguments.js";
import { interactiveAnswersToOptions } from "../src/interactive.js";

test("interactive answers without deployment map to a plain scaffold", () => {
  const options = interactiveAnswersToOptions({
    directory: "my-site",
    preset: "starter",
    utilities: ["editorconfig", "vscode"],
    contentSource: "local",
    deployment: "none",
  });
  assert.deepEqual(options, {
    directory: "my-site",
    force: false,
    preset: "starter",
    utilities: ["editorconfig", "vscode"],
    listPresets: false,
    deployment: { type: "none" },
  });
});

test("interactive answers with GitHub Actions enable the workflow", () => {
  const options = interactiveAnswersToOptions({
    directory: "my-site",
    preset: "starter",
    utilities: ["editorconfig", "vscode"],
    contentSource: "local",
    deployment: "github-actions",
  });
  assert.deepEqual(options, {
    directory: "my-site",
    force: false,
    preset: "starter",
    utilities: ["editorconfig", "vscode"],
    listPresets: false,
    deployment: { type: "github-actions", content: { type: "local" } },
  });
});

test("interactive answers with Cloudflare Workers select local-first deployment", () => {
  const options = interactiveAnswersToOptions({
    directory: "my-site",
    preset: "starter",
    utilities: ["editorconfig", "vscode"],
    contentSource: "local",
    deployment: "cloudflare",
  });
  assert.deepEqual(options, {
    directory: "my-site",
    force: false,
    preset: "starter",
    utilities: ["editorconfig", "vscode"],
    listPresets: false,
    deployment: { type: "cloudflare-workers" },
  });
});

test("interactive separate-directory content keeps the directory and local deployment", () => {
  const options = interactiveAnswersToOptions({
    directory: "site",
    preset: "starter",
    utilities: ["editorconfig", "vscode"],
    contentSource: "directory",
    contentDirectory: "../vault",
    deployment: "github-actions",
  });
  assert.deepEqual(options, {
    directory: "site",
    force: false,
    preset: "starter",
    utilities: ["editorconfig", "vscode"],
    listPresets: false,
    contentDirectory: "../vault",
    deployment: { type: "github-actions", content: { type: "local" } },
  });
});

test("external content forces GitHub Actions and keeps both repositories", () => {
  const options = interactiveAnswersToOptions({
    directory: "my-site",
    preset: "showcase",
    utilities: ["editorconfig", "vscode"],
    contentSource: "external",
    contentRepository: "OWNER/notes",
    siteRepository: "OWNER/site",
  });
  assert.deepEqual(options, {
    directory: "my-site",
    force: false,
    preset: "showcase",
    utilities: ["editorconfig", "vscode"],
    listPresets: false,
    deployment: {
      type: "github-actions",
      content: {
        type: "external",
        contentRepository: "OWNER/notes",
        siteRepository: "OWNER/site",
      },
    },
  });
});

test("interactive external content can clone the content repository", () => {
  const options = interactiveAnswersToOptions({
    directory: "my-site",
    preset: "showcase",
    utilities: ["editorconfig", "vscode"],
    contentSource: "external",
    contentRepository: "OWNER/notes",
    siteRepository: "OWNER/site",
    cloneContent: true,
  });
  assert.deepEqual(options, {
    directory: "my-site",
    force: false,
    preset: "showcase",
    utilities: ["editorconfig", "vscode"],
    listPresets: false,
    cloneContent: true,
    deployment: {
      type: "github-actions",
      content: {
        type: "external",
        contentRepository: "OWNER/notes",
        siteRepository: "OWNER/site",
      },
    },
  });
});

test("non-interactive defaults are unchanged", () => {
  const options = parseArguments([]);
  assert.deepEqual(options, {
    directory: ".",
    force: false,
    preset: "starter",
    utilities: ["gitignore", "editorconfig", "gitattributes", "biome"],
    listPresets: false,
    deployment: { type: "none" },
  });
});

test("--content-directory and --domain configure a separate directory layout", () => {
  const options = parseArguments([
    "site",
    "--github-actions",
    "--content-directory",
    "../vault",
    "--domain",
    "directories.example.com",
  ]);
  assert.deepEqual(options, {
    directory: "site",
    force: false,
    preset: "starter",
    utilities: ["gitignore", "editorconfig", "gitattributes", "biome"],
    listPresets: false,
    contentDirectory: "../vault",
    customDomain: "directories.example.com",
    deployment: { type: "github-actions", content: { type: "local" } },
  });
});

test("--content-directory rejects absolute paths", () => {
  assert.throws(
    () => parseArguments(["site", "--content-directory", "/vault"]),
    /must be relative to the project/,
  );
  assert.throws(
    () => parseArguments(["site", "--content-directory", "C:\\vault"]),
    /must be relative to the project/,
  );
});

test("--domain rejects values that are not hostnames", () => {
  assert.throws(
    () => parseArguments(["site", "--domain", "localhost"]),
    /requires a hostname/,
  );
  assert.throws(
    () => parseArguments(["site", "--domain", "https://example.com"]),
    /requires a hostname/,
  );
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
    utilities: ["gitignore", "editorconfig", "gitattributes", "biome"],
    listPresets: true,
    deployment: {
      type: "github-actions",
      content: {
        type: "external",
        contentRepository: "OWNER/notes",
        siteRepository: "OWNER/site",
      },
    },
  });
});

test("--clone-content opts in to cloning an external content repository", () => {
  const options = parseArguments([
    "my-site",
    "--github-actions",
    "--content-repository",
    "OWNER/notes",
    "--site-repository",
    "OWNER/site",
    "--clone-content",
  ]);
  assert.equal(options.cloneContent, true);
  assert.equal(
    parseArguments([
      "my-site",
      "--github-actions",
      "--content-repository",
      "OWNER/notes",
      "--site-repository",
      "OWNER/site",
    ]).cloneContent,
    undefined,
  );
  assert.throws(
    () => parseArguments(["my-site", "--clone-content"]),
    /--clone-content requires --content-repository and --site-repository/,
  );
});

test("Cloudflare Workers can be selected outside interactive mode", () => {
  assert.deepEqual(parseArguments(["my-site", "--cloudflare-workers"]), {
    directory: "my-site",
    force: false,
    preset: "starter",
    utilities: ["gitignore", "editorconfig", "gitattributes", "biome"],
    listPresets: false,
    deployment: { type: "cloudflare-workers" },
  });
});

test("--utilities selects the generated project files", () => {
  const options = parseArguments([
    "my-site",
    "--utilities",
    "gitignore,editorconfig,npmrc,vscode",
  ]);
  assert.deepEqual(options.utilities, [
    "gitignore",
    "editorconfig",
    "npmrc",
    "vscode",
  ]);

  assert.deepEqual(
    parseArguments(["my-site", "--utilities", "none"]).utilities,
    [],
  );

  assert.throws(
    () => parseArguments(["my-site", "--utilities", "unknown"]),
    /Unknown utility/,
  );
  assert.throws(
    () => parseArguments(["my-site", "--utilities"]),
    /requires a comma-separated list/,
  );
});

test("--features selects validated feature packs", () => {
  assert.deepEqual(
    parseArguments(["my-site", "--features", "diagrams,i18n"]).features,
    ["diagrams", "i18n"],
  );
  assert.throws(
    () => parseArguments(["--features", "unknown"]),
    /Unknown feature/,
  );
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
    () => parseArguments(["--content-repository", "OWNER/notes"]),
    /requires --github-actions/,
  );
  assert.throws(
    () => parseArguments(["one", "two"]),
    /Usage: create-riebeckite/,
  );
});
