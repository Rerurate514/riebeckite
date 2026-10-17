import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { PACKAGE_DIRECTORIES } from "../package_metadata.mjs";

const root = path.resolve(import.meta.dirname, "../..");
const metadataPath = path.join(root, ".ci-build-metadata.json");

const digest = (file) =>
  createHash("sha256").update(fs.readFileSync(file)).digest("hex");

function filesIn(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? filesIn(file) : [file];
  });
}

function metadata() {
  const packageVersions = Object.fromEntries(
    PACKAGE_DIRECTORIES.map((directory) => {
      const manifest = JSON.parse(
        fs.readFileSync(path.join(root, directory, "package.json"), "utf8"),
      );
      return [manifest.name, manifest.version];
    }),
  );
  const distFiles = PACKAGE_DIRECTORIES.flatMap((directory) =>
    filesIn(path.join(root, directory, "dist")).map((file) => [
      path.relative(root, file).split(path.sep).join("/"),
      digest(file),
    ]),
  );
  return {
    commit:
      process.env.GITHUB_SHA ??
      execFileSync("git", ["rev-parse", "HEAD"], {
        cwd: root,
        encoding: "utf8",
      }).trim(),
    lockfile: digest(path.join(root, "pnpm-lock.yaml")),
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    packageVersions,
    distFiles: Object.fromEntries(distFiles),
  };
}

function verify(actual, expected) {
  for (const key of ["commit", "lockfile", "node", "platform", "arch"]) {
    if (actual[key] !== expected[key])
      throw new Error(`Build artifact ${key} does not match this runner.`);
  }
  if (
    JSON.stringify(actual.packageVersions) !==
    JSON.stringify(expected.packageVersions)
  ) {
    throw new Error(
      "Build artifact package versions do not match this checkout.",
    );
  }
  if (JSON.stringify(actual.distFiles) !== JSON.stringify(expected.distFiles)) {
    throw new Error(
      "Build artifact contents do not match its integrity manifest.",
    );
  }
}

const command = process.argv[2];
if (command === "write") {
  fs.writeFileSync(metadataPath, `${JSON.stringify(metadata(), null, 2)}\n`);
} else if (command === "verify") {
  if (!fs.existsSync(metadataPath))
    throw new Error("Build artifact metadata is missing.");
  verify(JSON.parse(fs.readFileSync(metadataPath, "utf8")), metadata());
} else {
  throw new Error("Usage: node scripts/ci/build_artifact.mjs <write|verify>");
}
