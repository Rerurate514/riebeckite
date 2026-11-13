#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { collectChanges } from "./changelog.mjs";
import { PACKAGE_DIRECTORIES } from "./package_metadata.mjs";

const repositoryRoot = path.resolve(import.meta.dirname, "..");

export const ARTIFACT_LEDGER_PATH = "release-artifacts.json";

const LEDGER_VERSION = 1;

const ROOT_DOCUMENT_ENTRY =
  /^(?:README(?:_ja)?\.md|LICENSE(?:\.[^/]*)?|BRIDGE(?:_ja)?\.md)$/i;

const VERSION_COUPLED_PACKAGES = new Set(["create-riebeckite"]);

const usage = `Usage:
  node scripts/release_artifacts.mjs check
  node scripts/release_artifacts.mjs baseline

check     Compare each package's published files with ${ARTIFACT_LEDGER_PATH}
          and fail when a changed package has no pending change entry.
baseline  Record the current published files as the comparison baseline.`;

function readManifest(root, directory) {
  return JSON.parse(
    fs.readFileSync(path.join(root, directory, "package.json"), "utf8"),
  );
}

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function hashManifest(manifest) {
  const { version: _version, ...rest } = manifest;
  return sha256(JSON.stringify(rest));
}

function requiresBuiltOutput(manifest) {
  return JSON.stringify({
    exports: manifest.exports ?? {},
    bin: manifest.bin ?? {},
    main: manifest.main ?? "",
  }).includes("./dist/");
}

function listFiles(directory) {
  const files = [];

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === "node_modules") {
      continue;
    }

    const absolute = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...listFiles(absolute));
    } else if (entry.isFile()) {
      files.push(absolute);
    }
  }

  return files;
}

export function hashPackageArtifacts(root, directory) {
  const packageRoot = path.join(root, directory);
  const manifest = readManifest(root, directory);

  const published = [];

  for (const entry of manifest.files ?? []) {
    if (!entry.includes("/") && ROOT_DOCUMENT_ENTRY.test(entry)) {
      continue;
    }

    const absolute = path.join(packageRoot, entry);

    if (!fs.existsSync(absolute)) {
      if (entry === "dist" && requiresBuiltOutput(manifest)) {
        throw new Error(
          `${manifest.name}: dist is missing; run pnpm build:packages before checking published artifacts.`,
        );
      }

      continue;
    }

    if (fs.statSync(absolute).isDirectory()) {
      published.push(...listFiles(absolute));
    } else {
      published.push(absolute);
    }
  }

  const files = published
    .map((absolute) => ({
      relative: path.relative(packageRoot, absolute).split(path.sep).join("/"),
      hash: sha256(fs.readFileSync(absolute)),
    }))
    .sort((left, right) => left.relative.localeCompare(right.relative));

  const hash = crypto.createHash("sha256");

  hash.update(`package.json\0${hashManifest(manifest)}\n`);

  for (const file of files) {
    hash.update(`${file.relative}\0${file.hash}\n`);
  }

  return { name: manifest.name, hash: hash.digest("hex") };
}

export function computeArtifactHashes(root, directories) {
  const hashes = new Map();

  for (const directory of directories) {
    hashes.set(directory, hashPackageArtifacts(root, directory));
  }

  return hashes;
}

export function readArtifactLedger(root = repositoryRoot) {
  const ledgerPath = path.join(root, ARTIFACT_LEDGER_PATH);

  if (!fs.existsSync(ledgerPath)) {
    return null;
  }

  const parsed = JSON.parse(fs.readFileSync(ledgerPath, "utf8"));

  if (
    parsed?.version !== LEDGER_VERSION ||
    !parsed.packages ||
    typeof parsed.packages !== "object" ||
    Array.isArray(parsed.packages)
  ) {
    throw new Error(
      `${ARTIFACT_LEDGER_PATH} is not a valid artifact ledger; run node scripts/release_artifacts.mjs baseline.`,
    );
  }

  return parsed.packages;
}

export function writeArtifactLedger(root, hashes) {
  const packages = {};

  for (const { name, hash } of [...hashes.values()].sort((left, right) =>
    left.name.localeCompare(right.name),
  )) {
    packages[name] = hash;
  }

  fs.writeFileSync(
    path.join(root, ARTIFACT_LEDGER_PATH),
    `${JSON.stringify({ version: LEDGER_VERSION, packages }, null, 2)}\n`,
  );
}

export function findUncoveredChanges(changed, entryPackages) {
  const listed = new Set(entryPackages);

  return changed.filter(
    ({ name }) => !listed.has(name) && !VERSION_COUPLED_PACKAGES.has(name),
  );
}

export function checkArtifactCoverage({
  root = repositoryRoot,
  directories = PACKAGE_DIRECTORIES,
  entryPackages = [],
} = {}) {
  const ledger = readArtifactLedger(root);
  const current = computeArtifactHashes(root, directories);

  if (ledger === null) {
    return { baseline: true, changed: [], uncovered: [], current };
  }

  const changed = [];

  for (const [directory, { name, hash }] of current) {
    if (ledger[name] !== hash) {
      changed.push({ directory, name });
    }
  }

  return {
    baseline: false,
    changed,
    uncovered: findUncoveredChanges(changed, entryPackages),
    current,
  };
}

function reportUncovered(uncovered) {
  console.error(
    "\nThese packages publish different files but no pending change entry lists them:",
  );

  for (const { name } of uncovered) {
    console.error(`  - ${name}`);
  }

  console.error(
    "\nAdd the package to a change entry, or revert the change to what is published.",
  );
}

function main(rawArguments) {
  const command = rawArguments[0];

  if (command === "baseline") {
    const hashes = computeArtifactHashes(repositoryRoot, PACKAGE_DIRECTORIES);

    writeArtifactLedger(repositoryRoot, hashes);

    console.log(
      `Recorded ${hashes.size} package artifact hash(es) in ${ARTIFACT_LEDGER_PATH}.`,
    );

    return 0;
  }

  if (command === "check") {
    const coverage = checkArtifactCoverage({
      root: repositoryRoot,
      directories: PACKAGE_DIRECTORIES,
      entryPackages: collectChanges(repositoryRoot).unreleased.flatMap(
        (entry) => entry.packages,
      ),
    });

    if (coverage.baseline) {
      console.error(
        `${ARTIFACT_LEDGER_PATH} is missing; run node scripts/release_artifacts.mjs baseline.`,
      );

      return 1;
    }

    if (coverage.uncovered.length > 0) {
      reportUncovered(coverage.uncovered);

      return 1;
    }

    console.log(
      `${coverage.changed.length} package artifact(s) changed; all are covered by change entries.`,
    );

    return 0;
  }

  console.error(usage);

  return 1;
}

function isMainModule() {
  const entry = process.argv[1];

  if (!entry) {
    return false;
  }

  return pathToFileURL(path.resolve(entry)).href === import.meta.url;
}

if (isMainModule()) {
  process.exitCode = main(process.argv.slice(2));
}
