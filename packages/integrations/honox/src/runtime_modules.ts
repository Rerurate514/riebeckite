import type { Plugin } from "vite";
import type { ResolvedHonoxApplication } from "./vite_runner.js";

export const riebeckiteConfigModuleId = "virtual:riebeckite/config";
export const riebeckiteContentModuleId = "virtual:riebeckite/content";

const runtimeModuleIds = [
  riebeckiteConfigModuleId,
  riebeckiteContentModuleId,
] as const;

const resolvedConfigModuleId = `\0${riebeckiteConfigModuleId}`;
const resolvedContentModuleId = `\0${riebeckiteContentModuleId}`;

/**
 * Provides the framework-owned bootstrap modules a generated site imports
 * instead of keeping resolved-config and content-manager ceremony in
 * `app/config.ts` and `app/content.ts`.
 */
export function riebeckiteRuntimeModules(
  getApplication: () => ResolvedHonoxApplication,
): Plugin {
  return {
    name: "riebeckite-runtime-modules",
    resolveId(id) {
      if (id === riebeckiteConfigModuleId) return resolvedConfigModuleId;
      if (id === riebeckiteContentModuleId) return resolvedContentModuleId;
      return null;
    },
    load(id) {
      if (id === resolvedConfigModuleId) {
        const { appRoot, configFile } = getApplication();
        return createConfigModule(appRoot, configFile);
      }
      if (id === resolvedContentModuleId) return createContentModule();
      return null;
    },
  };
}

export function isRiebeckiteRuntimeModuleId(
  id: string | null | undefined,
): boolean {
  if (!id) return false;
  return runtimeModuleIds.some(
    (moduleId) => id === moduleId || id === `\0${moduleId}`,
  );
}

function createConfigModule(appRoot: string, configFile: string): string {
  const configSpecifier = configFile.replace(/\\/g, "/");
  return `import * as rawConfigModule from ${JSON.stringify(configSpecifier)};
import { resolveConfigModule } from "@riebeckite/core";
import { resolveHonoxConfig } from "@riebeckite/honox/runtime";

export const config = resolveHonoxConfig(
  resolveConfigModule(rawConfigModule),
  ${JSON.stringify(appRoot)},
);
`;
}

function createContentModule(): string {
  return `import { ContentManager } from "@riebeckite/core";
import { config } from ${JSON.stringify(riebeckiteConfigModuleId)};

export const content = new ContentManager(
  config.content.directory,
  config.content.exclude,
  { config, plugins: config.plugins },
);
`;
}
