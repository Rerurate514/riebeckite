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

function main() {
  const [version, ...extraArguments] = process.argv.slice(2);
  if (!version || extraArguments.length > 0) {
    throw new Error("Usage: pnpm bump:version <version>");
  }
  if (!SEMVER_PATTERN.test(version)) {
    throw new Error(
      `Expected an exact semantic version, received ${JSON.stringify(version)}`,
    );
  }

  const manifests = PACKAGE_DIRECTORIES.map(readManifest);
  for (const { manifest, manifestPath, relativePath } of manifests) {
    manifest.version = version;
    try {
      writeManifest(manifestPath, manifest);
    } catch (error) {
      throw new Error(`Could not update ${relativePath}: ${error.message}`);
    }
  }

  console.log(`Updated ${manifests.length} public packages to ${version}.`);
}

try {
  main();
} catch (error) {
  console.error(`Version bump failed: ${error.message}`);
  process.exitCode = 1;
}
