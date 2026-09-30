import fs from "node:fs";
import path from "node:path";
import { PACKAGE_DIRECTORIES } from "./package_metadata.mjs";

const repositoryRoot = path.resolve(import.meta.dirname, "..");
const SEMVER_PATTERN =
  /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9A-Za-z-]*))*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

function readManifest(directory) {
  const relativePath = path.join(directory, "package.json");
  const manifestPath = path.join(repositoryRoot, relativePath);
  let text;

  try {
    text = fs.readFileSync(manifestPath, "utf8");
  } catch (error) {
    throw new Error(`Could not read ${relativePath}: ${error.message}`);
  }

  let manifest;
  try {
    manifest = JSON.parse(text);
  } catch (error) {
    throw new Error(`Could not parse ${relativePath}: ${error.message}`);
  }

  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    throw new Error(`${relativePath} must contain a JSON object`);
  }
  if (typeof manifest.name !== "string" || manifest.name.length === 0) {
    throw new Error(`${relativePath} must define a package name`);
  }

  return { manifest, manifestPath, relativePath };
}

function writeManifest(manifestPath, manifest) {
  const temporaryPath = `${manifestPath}.${process.pid}.${Date.now()}.tmp`;

  try {
    fs.writeFileSync(temporaryPath, `${JSON.stringify(manifest, null, 2)}\n`);
    fs.renameSync(temporaryPath, manifestPath);
  } catch (error) {
    fs.rmSync(temporaryPath, { force: true });
    throw error;
  }
}

// The scaffold pins every generated Riebeckite dependency to one version
// spec. Keep it in lockstep with the manifests so freshly created sites
// install the released packages instead of a stale line.
const scaffoldVersionRelative =
  "packages/integrations/honox/src/scaffold/version.ts";
const scaffoldVersionPath = path.join(repositoryRoot, scaffoldVersionRelative);
const SCAFFOLD_VERSION_PATTERN =
  /(export const RIEBECKITE_VERSION = "\^)([^"]*)(";)/;

function readScaffoldVersion() {
  let text;
  try {
    text = fs.readFileSync(scaffoldVersionPath, "utf8");
  } catch (error) {
    throw new Error(
      `Could not read ${scaffoldVersionRelative}: ${error.message}`,
    );
  }
  const match = SCAFFOLD_VERSION_PATTERN.exec(text);
  if (!match) {
    throw new Error(
      `Could not find RIEBECKITE_VERSION in ${scaffoldVersionRelative}`,
    );
  }
  return match[2];
}

function writeScaffoldVersion(version) {
  const text = fs.readFileSync(scaffoldVersionPath, "utf8");
  const updated = text.replace(SCAFFOLD_VERSION_PATTERN, `$1${version}$3`);
  if (updated === text) {
    throw new Error(
      `Could not update RIEBECKITE_VERSION in ${scaffoldVersionRelative}`,
    );
  }
  const temporaryPath = `${scaffoldVersionPath}.${process.pid}.${Date.now()}.tmp`;
  try {
    fs.writeFileSync(temporaryPath, updated, "utf8");
    fs.renameSync(temporaryPath, scaffoldVersionPath);
  } catch (error) {
    fs.rmSync(temporaryPath, { force: true });
    throw error;
  }
}

function main() {
  const rawArguments = process.argv.slice(2);
  const dryRun = rawArguments.includes("--dry-run");
  const [version, ...extraArguments] = rawArguments.filter(
    (argument) => argument !== "--dry-run",
  );
  if (!version || extraArguments.length > 0) {
    throw new Error("Usage: pnpm bump:version <version> [--dry-run]");
  }
  if (!SEMVER_PATTERN.test(version)) {
    throw new Error(
      `Expected an exact semantic version, received ${JSON.stringify(version)}`,
    );
  }

  const manifests = PACKAGE_DIRECTORIES.map(readManifest);
  if (dryRun) {
    const changed = manifests.filter(
      ({ manifest }) => manifest.version !== version,
    );
    const scaffoldVersion = readScaffoldVersion();
    const scaffoldChanged = scaffoldVersion !== version;
    if (changed.length === 0 && !scaffoldChanged) {
      console.log(
        `All ${manifests.length} public packages already use ${version}.`,
      );
      return;
    }
    console.log(
      `[dry-run] Would update ${changed.length} public package(s) to ${version}:`,
    );
    for (const { manifest, relativePath } of changed) {
      console.log(`  ${relativePath}: ${manifest.version} -> ${version}`);
    }
    if (scaffoldChanged) {
      console.log(
        `  ${scaffoldVersionRelative}: ^${scaffoldVersion} -> ^${version}`,
      );
    }
    return;
  }

  for (const { manifest, manifestPath, relativePath } of manifests) {
    manifest.version = version;
    try {
      writeManifest(manifestPath, manifest);
    } catch (error) {
      throw new Error(`Could not update ${relativePath}: ${error.message}`);
    }
  }

  writeScaffoldVersion(version);

  console.log(
    `Updated ${manifests.length} public packages and the scaffold version to ${version}.`,
  );
}

try {
  main();
} catch (error) {
  console.error(`Version bump failed: ${error.message}`);
  process.exitCode = 1;
}
