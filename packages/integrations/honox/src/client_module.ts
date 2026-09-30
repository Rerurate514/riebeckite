import {
  type ResolvedRiebeckiteConfig,
  serializePublicClientConfig,
} from "@riebeckite/core";
import type { Plugin } from "vite";

const clientModuleId = "virtual:riebeckite/client";
const resolvedClientModuleId = `\0${clientModuleId}`;

export function riebeckiteClientModule(
  getConfig: () => ResolvedRiebeckiteConfig,
): Plugin {
  return {
    name: "riebeckite-client-module",
    resolveId(id) {
      if (id === clientModuleId) return resolvedClientModuleId;
      return null;
    },
    load(id) {
      if (id !== resolvedClientModuleId) return null;
      return createClientModule(getConfig());
    },
  };
}

function createClientModule(config: ResolvedRiebeckiteConfig): string {
  const imports: string[] = [];
  const initializers: string[] = [];

  for (const [index, entry] of config.plugins
    .flatMap((plugin) => plugin.clientEntries ?? [])
    .entries()) {
    const localName = `pluginClientInitializer${index}`;
    const importTarget = entry.exportName
      ? `{ ${entry.exportName} as ${localName} }`
      : localName;
    imports.push(
      `import ${importTarget} from ${JSON.stringify(entry.moduleSpecifier)};`,
    );
    const publicConfig = entry.publicConfig;
    const initializer =
      publicConfig === undefined
        ? `${localName}()`
        : `${localName}(${serializePublicClientConfig(publicConfig)})`;
    initializers.push(
      `runPluginClientInitializer(${JSON.stringify(entry.moduleSpecifier)}, () => ${initializer})`,
    );
  }

  return `${imports.join("\n")}

function runPluginClientInitializer(name, initialize) {
  try {
    const result = initialize();
    if (result && typeof result.then === "function") {
      result.catch((error) => reportPluginClientError(name, error));
    }
  } catch (error) {
    reportPluginClientError(name, error);
  }
}

function reportPluginClientError(name, error) {
  console.error("[riebeckite] Plugin client initializer failed: " + name, error);
}

export function initRiebeckiteClient() {
${initializers.map((initializer) => `  ${initializer};`).join("\n")}
}
`;
}
