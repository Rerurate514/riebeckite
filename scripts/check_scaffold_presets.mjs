import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  errors,
  expectConfigPassesBiome,
  repositoryRoot,
} from "./check_scaffold_shared.mjs";

export const generatedRoots = new Map();

export async function generate(scaffoldRiebeckiteSite, tmpRoot, name, options) {
  const target = path.join(tmpRoot, name);
  await scaffoldRiebeckiteSite({
    targetDirectory: target,
    overwrite: true,
    ...options,
  });
  checkGeneratedCommands(target, name);
  expectConfigPassesBiome(target, name);
  generatedRoots.set(name, target);
  return target;
}

export async function checkGeneratedConfigTypes(
  scaffoldRiebeckiteSite,
  presets,
  tmpRoot,
) {
  for (const { name } of presets) {
    if (generatedRoots.has(name)) continue;
    await generate(scaffoldRiebeckiteSite, tmpRoot, name, {
      preset: name,
      site: {
        title: "Preset Type Check",
        baseUrl: "https://example.com",
        locale: "en",
      },
    });
  }

  const configs = [...generatedRoots.values()]
    .map((root) =>
      path
        .relative(tmpRoot, path.join(root, "riebeckite.config.ts"))
        .split(path.sep)
        .join("/"),
    )
    .filter((config) => fs.existsSync(path.join(tmpRoot, config)));
  const tsconfigPath = path.join(tmpRoot, "tsconfig.json");
  fs.writeFileSync(
    tsconfigPath,
    JSON.stringify(
      {
        extends: path.join(repositoryRoot, "tsconfig.json"),
        compilerOptions: {
          noEmit: true,
          skipLibCheck: true,
          typeRoots: [path.join(repositoryRoot, "node_modules", "@types")],
        },
        include: configs,
      },
      null,
      2,
    ),
  );

  try {
    execSync(`npx --no-install tsc -p "${tsconfigPath}"`, {
      cwd: repositoryRoot,
      stdio: "inherit",
    });
  } catch {
    errors.push(
      "generated riebeckite.config.ts files must typecheck against the plugin option types",
    );
  }
}

// Every generated site must teach the local CLI (`npm exec riebeckite …`), not
// `npx riebeckite`, which probes the npm registry for a non-existent package
// when the local binary is missing.
export function checkGeneratedCommands(root, label) {
  const scan = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        scan(absolute);
        continue;
      }
      if (!/\.(md|json|ts|tsx|txt)$/.test(entry.name)) continue;
      const text = fs.readFileSync(absolute, "utf8");
      if (text.includes("npx riebeckite")) {
        errors.push(
          `${label}: ${path.relative(root, absolute)} must use npm exec riebeckite commands instead of npx riebeckite`,
        );
      }
    }
  };
  scan(root);
}
