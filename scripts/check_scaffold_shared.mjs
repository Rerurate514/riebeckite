import fs from "node:fs";
import path from "node:path";

export const repositoryRoot = path.resolve(import.meta.dirname, "..");
export const scaffoldDir = path.join(
  repositoryRoot,
  "packages",
  "create-riebeckite",
  "src",
  "scaffold",
);
export const createRiebeckitePackageRoot = path.join(
  repositoryRoot,
  "packages",
  "create-riebeckite",
);

// The scaffold pins every generated Riebeckite dependency to the workspace
// release version. This is the value those pins must match.
export const createRiebeckiteManifest = JSON.parse(
  fs.readFileSync(
    path.join(createRiebeckitePackageRoot, "package.json"),
    "utf8",
  ),
);
export const expectedRiebeckiteSpec = `^${createRiebeckiteManifest.version}`;

export const errors = [];

export function expect(condition, message) {
  if (!condition) errors.push(message);
}

export function expectConfigPassesBiome(root, label) {
  const configPath = path.join(root, "riebeckite.config.ts");
  if (!fs.existsSync(configPath)) return;

  try {
    execSync(`npx --no-install biome lint "${configPath}"`, {
      cwd: repositoryRoot,
      stdio: "inherit",
    });
  } catch {
    errors.push(
      `${label}: generated riebeckite.config.ts must pass biome lint`,
    );
  }
}

export function expectHoverPreviewSelector(config, label) {
  expect(
    config.includes("selector: 'a[href^=\"/\"]'"),
    `${label}: hoverPreview selector must be emitted as a quoted string literal`,
  );
  expect(
    !config.includes('selector: a[href^="/"]'),
    `${label}: hoverPreview selector must not be emitted as an unquoted expression`,
  );
}

export function readSiteFile(root, name) {
  const file = path.join(root, name);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
}

export const scaffoldSources = [
  path.join(scaffoldDir, "presets.ts"),
  path.join(scaffoldDir, "templates.ts"),
  path.join(scaffoldDir, "template-loader.ts"),
  path.join(scaffoldDir, "content-pages.ts"),
  path.join(scaffoldDir, "next-steps.ts"),
  path.join(scaffoldDir, "version.ts"),
  path.join(repositoryRoot, "scripts", "check_scaffold.mjs"),
];
