import fs from "node:fs/promises";
import path from "node:path";
import { measure, runBuild } from "./bench_ssg_measure.mjs";
import {
  cacheStateMode,
  contentStatePaths,
  repeatCount,
  shouldRun,
  sizes,
  workRoot,
} from "./bench_ssg_shared.mjs";
import { createSite } from "./bench_ssg_site.mjs";
import { summarize } from "./bench_ssg_util.mjs";

async function applyCacheStateMode(siteRoot) {
  if (cacheStateMode === "all") return;
  if (cacheStateMode === "pcc" || cacheStateMode === "pcc+state") {
    await fs.rm(path.join(siteRoot, ".riebeckite", "ssg-output-cache.json"), {
      force: true,
    });
  }
  if (cacheStateMode === "pcc") {
    for (const statePath of contentStatePaths(siteRoot)) {
      await fs.rm(statePath, { force: true });
    }
  }
}

if (process.env.RIEBECKITE_BENCH_BUILD_ONCE) {
  const input = JSON.parse(process.env.RIEBECKITE_BENCH_BUILD_ONCE);
  console.log(JSON.stringify(await runBuild(input.siteRoot, input.scenario)));
  process.exit(0);
}

for (const size of sizes) {
  const samples = [];
  for (let runIndex = 0; runIndex < repeatCount; runIndex++) {
    const siteRoot = path.join(
      workRoot,
      String(size),
      String(runIndex),
      "site",
    );
    await fs.rm(path.dirname(siteRoot), { recursive: true, force: true });
    await createSite(siteRoot, size);
    if (shouldRun("cold")) {
      samples.push(await measure(siteRoot, "cold"));
    }
    if (shouldRun("no-change")) {
      await measure(siteRoot, "no-change baseline");
      await applyCacheStateMode(siteRoot);
      samples.push(await measure(siteRoot, "no-change"));
    }
    if (shouldRun("single-edit")) {
      await measure(siteRoot, "single-edit baseline");
      await applyCacheStateMode(siteRoot);
      await fs.appendFile(
        path.join(siteRoot, "vault", notePath(size - 1)),
        "\nIndependent edit.\n",
        "utf8",
      );
      samples.push(await measure(siteRoot, "single-edit"));
    }
    if (shouldRun("link-edit")) {
      await measure(siteRoot, "link-edit baseline");
      await applyCacheStateMode(siteRoot);
      await fs.appendFile(
        path.join(siteRoot, "vault", notePath(size - 1)),
        `\n[[${slugPath(0)}]]\n`,
        "utf8",
      );
      samples.push(await measure(siteRoot, "link-edit"));
    }
  }
  for (const scenario of ["cold", "no-change", "single-edit", "link-edit"]) {
    const scenarioSamples = samples.filter(
      (sample) => sample.scenario === scenario,
    );
    if (scenarioSamples.length > 0)
      console.log(
        JSON.stringify({
          size,
          cacheState: cacheStateMode,
          ...summarize(scenario, scenarioSamples),
        }),
      );
  }
}
