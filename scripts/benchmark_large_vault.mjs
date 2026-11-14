import fs from "node:fs/promises";
import path from "node:path";
import {
  baseDir,
  repeatCount,
  scenarioFilter,
  sizes,
} from "./bench_lv_config.mjs";
import { measure, summarizeSamples } from "./bench_lv_measure.mjs";
import {
  append,
  generateVault,
  notePath,
  renameMove,
  writeNote,
} from "./bench_lv_site.mjs";

for (const size of sizes) {
  const samplesByScenario = new Map();
  for (let runIndex = 0; runIndex < repeatCount; runIndex++) {
    const directory = path.join(
      baseDir,
      String(size),
      String(runIndex),
      "vault",
    );
    const cacheDirectory = path.join(
      baseDir,
      String(size),
      String(runIndex),
      "cache",
    );
    for (const scenario of createScenarios(directory, size)) {
      if (scenarioFilter.size > 0 && !scenarioFilter.has(scenario.name))
        continue;
      await fs.rm(path.join(baseDir, String(size), String(runIndex)), {
        recursive: true,
        force: true,
      });
      await generateVault(directory, size);
      if (scenario.warm !== false) {
        await measure(
          directory,
          cacheDirectory,
          `${scenario.name} baseline`,
          scenario.pluginVersion ?? "v1",
        );
      }
      await scenario.prepare();
      const sample = await measure(
        directory,
        cacheDirectory,
        scenario.name,
        scenario.pluginVersion ?? "v1",
      );
      const samples = samplesByScenario.get(scenario.name) ?? [];
      samples.push(sample);
      samplesByScenario.set(scenario.name, samples);
    }
  }

  const rows = [];
  for (const [scenario, samples] of samplesByScenario) {
    const row = summarizeSamples(scenario, samples);
    rows.push({ size, ...row });
    console.log(JSON.stringify({ size, ...row }));
  }

  console.log(JSON.stringify(rows, null, 2));
}

function createScenarios(directory, size) {
  return [
    { name: "cold build", prepare: async () => undefined, warm: false },
    { name: "no-change warm build", prepare: async () => undefined },
    {
      name: "single independent note edit",
      prepare: () =>
        append(directory, notePath(size - 1), "\nIndependent edit.\n"),
    },
    {
      name: "highly-linked note edit",
      prepare: () => append(directory, notePath(0), "\nHub edit.\n"),
    },
    {
      name: "embedded note edit",
      prepare: () => append(directory, notePath(5), "\nEmbed edit.\n"),
    },
    {
      name: "referenced local asset edit",
      prepare: () =>
        fs.writeFile(
          path.join(directory, "assets", "asset-0.png"),
          Buffer.from(`asset changed ${size}`),
        ),
    },
    {
      name: "new note",
      prepare: () => writeNote(directory, size, { extra: "New note." }),
    },
    {
      name: "deleted note",
      prepare: () =>
        fs.rm(path.join(directory, notePath(size - 2)), { force: true }),
    },
    {
      name: "rename move",
      prepare: () => renameMove(directory, Math.max(1, size - 3)),
    },
    {
      name: "plugin config change",
      prepare: async () => undefined,
      pluginVersion: "v2",
    },
  ];
}
