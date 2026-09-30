import fs from "node:fs/promises";
import path from "node:path";
import { parse } from "@babel/parser";
import type { Plugin, PluginOption } from "vite";

const honoxIslandDependencyPluginName = "inject-importing-islands";
const importingIslandsExport = "__importing_islands";
type ModuleResolver = {
  resolve(source: string, importer?: string): Promise<{ id: string } | null>;
};

/**
 * Replaces HonoX's dependency walker with one that remains inside the app
 * directory. Riebeckite configurations import plugins with large dependency
 * graphs, which must not be traversed merely to determine whether a route
 * imports an island.
 */
export function replaceHonoxIslandDependencyPlugin(
  plugins: PluginOption[],
): PluginOption[] {
  return [
    ...plugins.map(disableHonoxIslandDependencyPlugin),
    scopedIslandDependencyPlugin(),
  ];
}

function disableHonoxIslandDependencyPlugin(
  plugin: PluginOption,
): PluginOption {
  if (!plugin || typeof plugin === "boolean") return plugin;

  if (Array.isArray(plugin)) {
    return plugin.map(disableHonoxIslandDependencyPlugin);
  }

  if (plugin instanceof Promise) {
    return plugin.then(disableHonoxIslandDependencyPlugin) as PluginOption;
  }

  if (plugin.name !== honoxIslandDependencyPluginName) return plugin;

  return { ...plugin, transform: undefined };
}

function scopedIslandDependencyPlugin(): Plugin {
  let appDirectory = "";
  let islandDirectory = "";

  return {
    name: "riebeckite-inject-importing-islands",
    configResolved(config) {
      appDirectory = path.resolve(config.root, "app");
      islandDirectory = path.join(appDirectory, "islands");
    },
    async transform(sourceCode, id) {
      const modulePath = toFilePath(id);
      if (
        !isInDirectory(modulePath, appDirectory) ||
        !isJavaScriptModule(modulePath)
      ) {
        return;
      }

      if (!(await importsIsland(modulePath, sourceCode, this))) return;

      return {
        code: `${sourceCode}\nexport const ${importingIslandsExport} = true;\n`,
        map: null,
      };
    },
  };

  async function importsIsland(
    modulePath: string,
    sourceCode: string,
    pluginContext: ModuleResolver,
  ): Promise<boolean> {
    const visited = new Set<string>();

    const visit = async (
      currentModulePath: string,
      currentSourceCode: string,
    ): Promise<boolean> => {
      if (visited.has(currentModulePath)) return false;
      visited.add(currentModulePath);

      if (isInDirectory(currentModulePath, islandDirectory)) return true;

      const importSources = getStaticImportSources(currentSourceCode);
      for (const importSource of importSources) {
        const resolved = await pluginContext.resolve(
          importSource,
          currentModulePath,
        );
        if (!resolved) continue;

        const dependencyPath = toFilePath(resolved.id);
        if (
          !isInDirectory(dependencyPath, appDirectory) ||
          !isJavaScriptModule(dependencyPath)
        ) {
          continue;
        }

        try {
          const dependencySourceCode = await fs.readFile(
            dependencyPath,
            "utf8",
          );
          if (await visit(dependencyPath, dependencySourceCode)) return true;
        } catch {
          // Vite will report an unresolved or unreadable module separately.
        }
      }

      return false;
    };

    return visit(modulePath, sourceCode);
  }
}

function getStaticImportSources(sourceCode: string): string[] {
  const ast = parse(sourceCode, {
    sourceType: "module",
    plugins: ["typescript", "jsx"],
  });

  return ast.program.body.flatMap((statement) => {
    if (
      statement.type === "ImportDeclaration" ||
      statement.type === "ExportNamedDeclaration" ||
      statement.type === "ExportAllDeclaration"
    ) {
      return statement.source ? [statement.source.value] : [];
    }
    return [];
  });
}

function toFilePath(id: string): string {
  return id.split("?", 1)[0] ?? id;
}

function isInDirectory(filePath: string, directory: string): boolean {
  const relativePath = path.relative(directory, filePath);
  return (
    relativePath !== "" &&
    !relativePath.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relativePath)
  );
}

function isJavaScriptModule(filePath: string): boolean {
  return /\.[cm]?[jt]sx?$/.test(filePath);
}
