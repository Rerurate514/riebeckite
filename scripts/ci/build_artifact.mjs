import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { PACKAGE_DIRECTORIES } from "../package_metadata.mjs";

export const SCHEMA_VERSION = 1;

const root = path.resolve(import.meta.dirname, "../..");
export const metadataPath = path.join(root, ".ci-build-metadata.json");

const ENVIRONMENT_KEYS = ["commit", "lockfile", "node", "platform", "arch"];
const REQUIRED_KEYS = [
  "schemaVersion",
  ...ENVIRONMENT_KEYS,
  "packageVersions",
  "distFiles",
];

export class BuildArtifactError extends Error {
  constructor(message) {
    super(message);
    this.name = "BuildArtifactError";
  }
}

const digest = (file) =>
  createHash("sha256").update(fs.readFileSync(file)).digest("hex");

function filesIn(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? filesIn(file) : [file];
  });
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function byPath(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function formatValue(value) {
  if (typeof value === "string") return value;
  if (value === undefined) return "<missing>";
  return JSON.stringify(value);
}

function formatList(values) {
  const shown = values.slice(0, 10);
  const hidden = values.length - shown.length;
  return hidden > 0
    ? `${shown.join(", ")} (+${hidden} more)`
    : shown.join(", ");
}

function environmentMismatch(key, artifactValue, runnerValue) {
  return [
    "Build artifact environment mismatch:",
    `  Key:      ${key}`,
    `  Artifact: ${formatValue(artifactValue)}`,
    `  Runner:   ${formatValue(runnerValue)}`,
    "",
    "Possible causes:",
    "  - The artifact came from a different workflow run or job environment.",
    "  - The runner toolchain changed after the artifact was built.",
    "",
    "Artifact verification failed.",
  ].join("\n");
}

function formatMismatch(key, artifactValue, expectedValue) {
  return [
    "Build artifact format mismatch:",
    `  Key:      ${key}`,
    `  Artifact: ${formatValue(artifactValue)}`,
    `  Expected: ${formatValue(expectedValue)}`,
    "",
    "Rebuild the artifact with the current workflow.",
    "",
    "Artifact verification failed.",
  ].join("\n");
}

export function resolveCommit(rootDirectory = root, env = process.env) {
  if (env.GITHUB_SHA) return env.GITHUB_SHA;
  return execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: rootDirectory,
    encoding: "utf8",
  }).trim();
}

export function createMetadata({
  rootDirectory = root,
  packageDirectories = PACKAGE_DIRECTORIES,
  commit = resolveCommit(rootDirectory),
} = {}) {
  const packageVersions = {};
  const distFiles = [];
  for (const directory of packageDirectories) {
    const manifest = JSON.parse(
      fs.readFileSync(
        path.join(rootDirectory, directory, "package.json"),
        "utf8",
      ),
    );
    packageVersions[manifest.name] = manifest.version;
    for (const file of filesIn(path.join(rootDirectory, directory, "dist"))) {
      const relative = path
        .relative(rootDirectory, file)
        .split(path.sep)
        .join("/");
      distFiles.push([relative, digest(file)]);
    }
  }
  distFiles.sort(([left], [right]) => byPath(left, right));
  return {
    schemaVersion: SCHEMA_VERSION,
    commit,
    lockfile: digest(path.join(rootDirectory, "pnpm-lock.yaml")),
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    packageVersions,
    distFiles: Object.fromEntries(distFiles),
  };
}

export function assertMetadata(value) {
  if (!isRecord(value)) {
    throw new BuildArtifactError(
      "Build artifact metadata is not a JSON object.",
    );
  }
  const missing = REQUIRED_KEYS.filter((key) => !(key in value));
  if (missing.length > 0) {
    throw new BuildArtifactError(
      `Build artifact metadata is missing required field(s): ${missing.join(", ")}.`,
    );
  }
  if (value.schemaVersion !== SCHEMA_VERSION) {
    throw new BuildArtifactError(
      formatMismatch("schemaVersion", value.schemaVersion, SCHEMA_VERSION),
    );
  }
  for (const key of ENVIRONMENT_KEYS) {
    if (typeof value[key] !== "string" || value[key].length === 0) {
      throw new BuildArtifactError(
        `Build artifact metadata field ${key} must be a non-empty string.`,
      );
    }
  }
  if (!isRecord(value.packageVersions)) {
    throw new BuildArtifactError(
      "Build artifact metadata field packageVersions must be an object.",
    );
  }
  for (const [name, version] of Object.entries(value.packageVersions)) {
    if (typeof version !== "string" || version.length === 0) {
      throw new BuildArtifactError(
        `Build artifact package version for ${name} must be a non-empty string.`,
      );
    }
  }
  if (!isRecord(value.distFiles)) {
    throw new BuildArtifactError(
      "Build artifact metadata field distFiles must be an object.",
    );
  }
  if (Object.keys(value.distFiles).length === 0) {
    throw new BuildArtifactError(
      "Build artifact metadata contains no dist files.",
    );
  }
  for (const [file, hash] of Object.entries(value.distFiles)) {
    if (typeof hash !== "string" || !/^[a-f0-9]{64}$/.test(hash)) {
      throw new BuildArtifactError(
        `Build artifact digest for ${file} is not a SHA-256 hex string.`,
      );
    }
  }
  return value;
}

export function parseMetadata(text) {
  let value;
  try {
    value = JSON.parse(text);
  } catch (error) {
    throw new BuildArtifactError(
      `Build artifact metadata is not valid JSON: ${error.message}`,
    );
  }
  return assertMetadata(value);
}

export function readMetadata(file = metadataPath) {
  if (!fs.existsSync(file)) {
    throw new BuildArtifactError(
      [
        `Build artifact metadata is missing: ${file}`,
        "",
        "Ensure the build job uploaded the artifact and this job downloaded it.",
        'Generate it locally with "pnpm ci:build-artifact write" after building the packages.',
        "",
        "Artifact verification failed.",
      ].join("\n"),
    );
  }
  return parseMetadata(fs.readFileSync(file, "utf8"));
}

function comparePackageVersions(actual, expected) {
  const names = [
    ...new Set([...Object.keys(actual), ...Object.keys(expected)]),
  ];
  const differences = names.sort(byPath).flatMap((name) => {
    if (actual[name] === expected[name]) return [];
    return [
      `  ${name}: artifact=${formatValue(actual[name])} runner=${formatValue(expected[name])}`,
    ];
  });
  if (differences.length === 0) return;
  throw new BuildArtifactError(
    [
      "Build artifact package versions do not match this checkout:",
      ...differences,
      "",
      "Artifact verification failed.",
    ].join("\n"),
  );
}

function compareDistFiles(actual, expected) {
  const actualFiles = new Set(Object.keys(actual));
  const expectedFiles = new Set(Object.keys(expected));
  const missing = [...expectedFiles]
    .filter((file) => !actualFiles.has(file))
    .sort(byPath);
  const extra = [...actualFiles]
    .filter((file) => !expectedFiles.has(file))
    .sort(byPath);
  const changed = [...actualFiles]
    .filter(
      (file) => expectedFiles.has(file) && actual[file] !== expected[file],
    )
    .sort(byPath);
  if (missing.length === 0 && extra.length === 0 && changed.length === 0) {
    return;
  }
  const details = [];
  if (missing.length > 0) details.push(`  Missing: ${formatList(missing)}`);
  if (extra.length > 0) details.push(`  Extra:   ${formatList(extra)}`);
  if (changed.length > 0) details.push(`  Changed: ${formatList(changed)}`);
  throw new BuildArtifactError(
    [
      "Build artifact contents do not match its integrity manifest:",
      ...details,
      "",
      "Artifact verification failed.",
    ].join("\n"),
  );
}

export function verify(actual, expected) {
  assertMetadata(actual);
  for (const key of ENVIRONMENT_KEYS) {
    if (actual[key] !== expected[key]) {
      throw new BuildArtifactError(
        environmentMismatch(key, actual[key], expected[key]),
      );
    }
  }
  comparePackageVersions(actual.packageVersions, expected.packageVersions);
  compareDistFiles(actual.distFiles, expected.distFiles);
}

export function main(argv = process.argv.slice(2)) {
  const [command] = argv;
  if (command === "write") {
    fs.writeFileSync(
      metadataPath,
      `${JSON.stringify(createMetadata(), null, 2)}\n`,
    );
    return;
  }
  if (command === "verify") {
    verify(readMetadata(), createMetadata());
    return;
  }
  throw new BuildArtifactError(
    "Usage: node scripts/ci/build_artifact.mjs <write|verify>",
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    if (error instanceof BuildArtifactError) {
      console.error(error.message);
      process.exitCode = 1;
    } else {
      throw error;
    }
  }
}
