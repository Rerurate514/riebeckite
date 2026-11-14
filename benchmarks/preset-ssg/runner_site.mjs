import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createBenchmarkContent } from "./lib.mjs";
import {
  appRoot,
  execFileAsync,
  metricsEnabled,
  root,
} from "./runner_config.mjs";
import { generatedPluginOrder } from "./runner_scenario.mjs";

export async function createSite(siteRoot, preset, count) {
  const { scaffoldRiebeckiteSite } = await import(
    pathToFileURL(
      path.join(root, "packages/create-riebeckite/src/scaffold/index.ts"),
    )
  );
  await scaffoldRiebeckiteSite({
    targetDirectory: siteRoot,
    name: `benchmark-${preset}-${count}`,
    preset,
    site: {
      title: `Benchmark ${preset}`,
      baseUrl: "https://benchmark.example.test",
    },
  });
  await linkWorkspacePackages(siteRoot);
  await createBenchmarkContent({
    contentDirectory: path.join(siteRoot, "content"),
    count,
    preset,
  });
  return generatedPluginOrder(
    await fs.readFile(path.join(siteRoot, "riebeckite.config.ts"), "utf8"),
  );
}

export async function buildWorkspacePackages() {
  await execFileAsync(
    process.execPath,
    [path.join(root, "scripts", "build_packages.mjs")],
    {
      cwd: root,
      env: process.env,
      maxBuffer: 1024 * 1024 * 8,
    },
  );
}

export async function linkWorkspacePackages(siteRoot) {
  const nodeModulesDirectory = path.join(siteRoot, "node_modules");
  const namespaceDirectory = path.join(siteRoot, "node_modules", "@riebeckite");
  await fs.mkdir(namespaceDirectory, { recursive: true });
  const packageRoots = [
    path.join(root, "packages"),
    path.join(root, "packages", "integrations"),
    path.join(root, "packages", "plugins"),
    path.join(root, "packages", "themes"),
  ];
  const packageDirectories = (
    await Promise.all(
      packageRoots.map(async (packageRoot) =>
        (
          await fs.readdir(packageRoot, { withFileTypes: true })
        )
          .filter((entry) => entry.isDirectory())
          .map((entry) => path.join(packageRoot, entry.name)),
      ),
    )
  ).flat();
  for (const directory of packageDirectories) {
    const packagePath = path.join(directory, "package.json");
    const packageJson = await fs
      .readFile(packagePath, "utf8")
      .then((source) => JSON.parse(source))
      .catch(() => undefined);
    if (
      typeof packageJson?.name !== "string" ||
      !packageJson.name.startsWith("@riebeckite/")
    ) {
      continue;
    }
    const destination = path.join(
      namespaceDirectory,
      packageJson.name.slice("@riebeckite/".length),
    );
    await fs.symlink(directory, destination, "junction");
  }
  const runtimeDependencies = await fs.readdir(
    path.join(appRoot, "node_modules"),
    {
      withFileTypes: true,
    },
  );
  for (const dependency of runtimeDependencies) {
    if (
      (!dependency.isDirectory() && !dependency.isSymbolicLink()) ||
      dependency.name.startsWith(".")
    )
      continue;
    if (dependency.name === "@riebeckite") continue;
    const source = path.join(appRoot, "node_modules", dependency.name);
    if (!dependency.name.startsWith("@")) {
      await linkJunctionIfAbsent(
        source,
        path.join(nodeModulesDirectory, dependency.name),
      );
      continue;
    }
    const scopeDirectory = path.join(nodeModulesDirectory, dependency.name);
    await fs.mkdir(scopeDirectory, { recursive: true });
    const scopedDependencies = await fs.readdir(source, {
      withFileTypes: true,
    });
    for (const scopedDependency of scopedDependencies) {
      if (!scopedDependency.isDirectory() && !scopedDependency.isSymbolicLink())
        continue;
      await linkJunctionIfAbsent(
        path.join(source, scopedDependency.name),
        path.join(scopeDirectory, scopedDependency.name),
      );
    }
  }
  await linkJunctionIfAbsent(
    path.join(
      root,
      "packages",
      "plugins",
      "mermaid",
      "node_modules",
      "puppeteer",
    ),
    path.join(nodeModulesDirectory, "puppeteer"),
  );
  await linkJunctionIfAbsent(
    path.join(
      root,
      "packages",
      "plugins",
      "excalidraw",
      "node_modules",
      "lz-string",
    ),
    path.join(nodeModulesDirectory, "lz-string"),
  );
  await fs.mkdir(path.join(nodeModulesDirectory, "@d2lang"), {
    recursive: true,
  });
  await linkJunctionIfAbsent(
    path.join(
      root,
      "packages",
      "plugins",
      "d2",
      "node_modules",
      "@d2lang",
      "d2",
    ),
    path.join(nodeModulesDirectory, "@d2lang", "d2"),
  );
  await fs.mkdir(path.join(nodeModulesDirectory, "@marp-team"), {
    recursive: true,
  });
  await linkJunctionIfAbsent(
    path.join(
      root,
      "packages",
      "plugins",
      "marp",
      "node_modules",
      "@marp-team",
      "marp-core",
    ),
    path.join(nodeModulesDirectory, "@marp-team", "marp-core"),
  );
}

export async function linkJunctionIfAbsent(source, destination) {
  const resolvedSource = await fs.realpath(source);
  try {
    const existing = await fs.lstat(destination);
    if (!existing.isSymbolicLink())
      throw new Error(
        `Refusing to replace non-link dependency: ${destination}`,
      );
    if ((await fs.realpath(destination)) !== resolvedSource)
      throw new Error(
        `Refusing to replace mismatched dependency link: ${destination}`,
      );
    return;
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  await fs.symlink(resolvedSource, destination, "junction");
}

export async function invokeBuild(siteRoot, label) {
  const { stdout } = await execFileAsync(
    process.execPath,
    [
      "--import",
      "tsx",
      fileURLToPath(import.meta.url),
      "--buildOnce",
      JSON.stringify({ siteRoot, label, metricsEnabled }),
    ],
    { cwd: siteRoot, maxBuffer: 1024 * 1024 * 8 },
  );
  return JSON.parse(stdout.trim().split(/\r?\n/).at(-1));
}

export async function optionalAlias(name, packageDirectory) {
  try {
    const resolved = await fs.realpath(packageDirectory);
    return [{ find: new RegExp(`^${name}$`), replacement: resolved }];
  } catch {
    return [];
  }
}
