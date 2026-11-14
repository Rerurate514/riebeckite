import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  errors,
  expect,
  expectedRiebeckiteSpec,
  repositoryRoot,
  scaffoldDir,
} from "./check_scaffold_shared.mjs";

export function expectConfigPassesBiome(root, label) {
  const configPath = path.join(root, "riebeckite.config.ts");
  if (!fs.existsSync(configPath)) return;

  try {
    execFileSync(
      process.execPath,
      [
        path.join(
          repositoryRoot,
          "node_modules",
          "@biomejs",
          "biome",
          "bin",
          "biome",
        ),
        "lint",
        configPath,
      ],
      { cwd: repositoryRoot, stdio: "pipe" },
    );
  } catch (error) {
    const detail =
      error instanceof Error && "stderr" in error
        ? String(error.stderr).trim().split("\n").slice(0, 3).join(" | ")
        : String(error);
    errors.push(
      `${label}: generated riebeckite.config.ts must pass biome lint (${detail})`,
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

export function checkScaffoldVersion() {
  const source = fs.readFileSync(path.join(scaffoldDir, "version.ts"), "utf8");
  expect(
    source.includes(`"${expectedRiebeckiteSpec}"`),
    `version.ts must pin ${expectedRiebeckiteSpec} to match the workspace release version`,
  );
}
