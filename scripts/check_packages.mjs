import fs from "node:fs";
import path from "node:path";
import {
  catalogDependencies,
  expectedPackageMetadata,
  PACKAGE_DIRECTORIES,
  repositoryUrl,
  sharedPackageMetadata,
} from "./package_metadata.mjs";

const repositoryRoot = path.resolve(import.meta.dirname, "..");

function readJson(relativePath) {
  return JSON.parse(
    fs.readFileSync(path.join(repositoryRoot, relativePath), "utf8"),
  );
}

function canonicalJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const entries = Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`);
    return `{${entries.join(",")}}`;
  }
  return JSON.stringify(value);
}

function sameJson(left, right) {
  return canonicalJson(left) === canonicalJson(right);
}

function reportDifference(errors, packageName, property, expected, actual) {
  errors.push(
    `${packageName}: ${property} must be ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`,
  );
}

function checkExactValue(errors, packageName, manifest, property, expected) {
  if (!sameJson(manifest[property], expected)) {
    reportDifference(
      errors,
      packageName,
      property,
      expected,
      manifest[property],
    );
  }
}

function expectedExportEntry(source) {
  const output = `./dist/${source.slice(2).replace(/\.tsx?$/, ".js")}`;
  return {
    types: output.replace(/\.js$/, ".d.ts"),
    import: output,
    source,
    default: output,
  };
}

function checkExports(errors, directory, manifest) {
  if (!manifest.exports || typeof manifest.exports !== "object") {
    if (directory !== "packages/cli") {
      errors.push(
        `${manifest.name}: exports must define the public package entry points`,
      );
    }
    return;
  }

  for (const [subpath, target] of Object.entries(manifest.exports)) {
    if (typeof target === "string") {
      if (!target.startsWith("./")) {
        errors.push(
          `${manifest.name}: exports.${subpath} must be a package-relative path`,
        );
      }
      continue;
    }

    if (
      !target ||
      typeof target !== "object" ||
      typeof target.source !== "string"
    ) {
      errors.push(
        `${manifest.name}: exports.${subpath} must define a source entry point`,
      );
      continue;
    }

    const expected = expectedExportEntry(target.source);
    if (!sameJson(target, expected)) {
      reportDifference(
        errors,
        manifest.name,
        `exports.${subpath}`,
        expected,
        target,
      );
    }
  }

  const rootExport = manifest.exports["."];
  if (!rootExport || typeof rootExport !== "object") {
    errors.push(
      `${manifest.name}: exports["."] must define the primary entry point`,
    );
    return;
  }
  if (manifest.main !== rootExport.import) {
    reportDifference(
      errors,
      manifest.name,
      "main",
      rootExport.import,
      manifest.main,
    );
  }
  if (manifest.types !== rootExport.types) {
    reportDifference(
      errors,
      manifest.name,
      "types",
      rootExport.types,
      manifest.types,
    );
  }
}

function checkPublishReadinessMetadata(errors, directory, manifest) {
  if (
    typeof manifest.description !== "string" ||
    manifest.description.trim() === ""
  ) {
    errors.push(`${manifest.name}: description must be a non-empty string`);
  }
  if (
    !Array.isArray(manifest.keywords) ||
    manifest.keywords.length === 0 ||
    manifest.keywords.some(
      (keyword) => typeof keyword !== "string" || keyword.trim() === "",
    )
  ) {
    errors.push(
      `${manifest.name}: keywords must be a non-empty array of strings`,
    );
  }
  if (
    typeof manifest.engines?.node !== "string" ||
    manifest.engines.node.trim() === ""
  ) {
    errors.push(`${manifest.name}: engines.node must be a non-empty string`);
  }
  if (
    manifest.sideEffects !== false &&
    (!Array.isArray(manifest.sideEffects) ||
      manifest.sideEffects.length === 0 ||
      manifest.sideEffects.some(
        (entry) => typeof entry !== "string" || !entry.startsWith("./"),
      ))
  ) {
    errors.push(
      `${manifest.name}: sideEffects must be false or package-relative paths`,
    );
  }

  const readme = path.join(repositoryRoot, directory, "README.md");
  if (!fs.existsSync(readme)) {
    errors.push(
      `${manifest.name}: README.md must exist so npm can render package documentation`,
    );
  }

  const readmeJa = path.join(repositoryRoot, directory, "README_ja.md");
  if (!fs.existsSync(readmeJa)) {
    errors.push(
      `${manifest.name}: README_ja.md must exist so package documentation is available in Japanese`,
    );
  }
}

function checkPackage(directory) {
  const manifest = readJson(`${directory}/package.json`);
  const errors = [];
  const expected = expectedPackageMetadata(directory);

  for (const [property, value] of Object.entries(sharedPackageMetadata)) {
    checkExactValue(errors, manifest.name, manifest, property, value);
  }

  checkExactValue(errors, manifest.name, manifest, "repository", {
    type: "git",
    url: repositoryUrl,
    directory,
  });

  for (const [property, value] of Object.entries(expected)) {
    if (property === "scripts") {
      checkRequiredScripts(errors, manifest.name, manifest, value);
      continue;
    }

    checkExactValue(errors, manifest.name, manifest, property, value);
  }
  checkExports(errors, directory, manifest);
  checkPublishReadinessMetadata(errors, directory, manifest);

  for (const dependencySection of [
    "dependencies",
    "devDependencies",
    "peerDependencies",
  ]) {
    for (const [name, version] of Object.entries(
      manifest[dependencySection] ?? {},
    )) {
      if (version === catalogDependencies[name]) {
        errors.push(
          `${manifest.name}: ${dependencySection}.${name} must use "catalog:" instead of ${JSON.stringify(version)}`,
        );
      }
    }
  }

  return errors;
}

function checkRequiredScripts(errors, packageName, manifest, expectedScripts) {
  for (const [scriptName, expectedCommand] of Object.entries(
    expectedScripts ?? {},
  )) {
    const actualCommand = manifest.scripts?.[scriptName];

    if (actualCommand !== expectedCommand) {
      reportDifference(
        errors,
        packageName,
        `scripts.${scriptName}`,
        expectedCommand,
        actualCommand,
      );
    }
  }
}

function checkCatalog() {
  const workspace = fs.readFileSync(
    path.join(repositoryRoot, "pnpm-workspace.yaml"),
    "utf8",
  );
  const errors = [];
  for (const [name, version] of Object.entries(catalogDependencies)) {
    const expected = `  ${name.startsWith("@") ? `'${name}'` : name}: ${version}`;
    if (!workspace.includes(expected)) {
      errors.push(
        `pnpm-workspace.yaml: catalog entry missing: ${expected.trim()}`,
      );
    }
  }
  return errors;
}

const errors = [
  ...checkCatalog(),
  ...PACKAGE_DIRECTORIES.flatMap(checkPackage),
];
if (errors.length > 0) {
  console.error(
    `Package metadata validation failed (${errors.length} error(s)):`,
  );
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(
    `Package metadata validated for ${PACKAGE_DIRECTORIES.length} public packages.`,
  );
}
