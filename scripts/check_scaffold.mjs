import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  checkEmpty,
  checkMinimal,
  checkShowcase,
  checkStarter,
} from "./check_scaffold_cases.mjs";
import { checkScaffoldVersion } from "./check_scaffold_config.mjs";
import { checkGeneratedConfigTypes } from "./check_scaffold_presets.mjs";
import {
  createRiebeckitePackageRoot,
  errors,
  repositoryRoot,
  scaffoldSources,
} from "./check_scaffold_shared.mjs";

async function main() {
  // 1. Biome on the scaffold sources this feature owns (no --write: this
  //    check must not mutate). The whole scaffold directory is excluded so
  //    untouched files (index.ts) cannot surface line-ending noise.
  try {
    execSync(
      `npx --no-install biome check ${scaffoldSources.map((p) => `"${p}"`).join(" ")}`,
      { cwd: repositoryRoot, stdio: "inherit" },
    );
  } catch {
    errors.push("biome check reported issues in the scaffold sources");
  }

  // 2. Build create-riebeckite so the scaffolders reflect the current sources.
  try {
    execSync("node ../../scripts/build_package.mjs", {
      cwd: createRiebeckitePackageRoot,
      stdio: "inherit",
    });
  } catch {
    errors.push(
      "failed to build packages/create-riebeckite before scaffolding",
    );
    return;
  }

  const distUrl = pathToFileURL(
    path.join(
      createRiebeckitePackageRoot,
      "dist",
      "src",
      "scaffold",
      "index.js",
    ),
  ).href;
  const { scaffoldRiebeckiteSite, SCAFFOLD_PRESETS } = await import(distUrl);

  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "check-scaffold-"));
  try {
    checkScaffoldVersion();
    await checkStarter(scaffoldRiebeckiteSite, tmpRoot);
    await checkMinimal(scaffoldRiebeckiteSite, tmpRoot);
    await checkShowcase(scaffoldRiebeckiteSite, tmpRoot);
    await checkEmpty(scaffoldRiebeckiteSite, tmpRoot);
    await checkGeneratedConfigTypes(
      scaffoldRiebeckiteSite,
      SCAFFOLD_PRESETS,
      tmpRoot,
    );
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
}

await main();

if (errors.length > 0) {
  console.error(`Scaffold validation failed (${errors.length} error(s)):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(
    "Scaffold validated: biome clean, presets generate tiered options and localized READMEs/examples.",
  );
}
