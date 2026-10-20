import type { ResolvedRiebeckiteConfig } from "@riebeckite/core";
import { serializePublicClientConfig } from "@riebeckite/core";
import type { Plugin } from "vite";

const clientModuleId = "virtual:riebeckite/client";
const resolvedClientModuleId = `\0${clientModuleId}`;

export function riebeckiteClientModule(
  getConfig: () => Pick<ResolvedRiebeckiteConfig, "plugins">,
): Plugin {
  let development = false;
  return {
    name: "riebeckite-client-module",
    config(_config, environment) {
      development = environment.command === "serve";
    },
    resolveId(id) {
      if (id === clientModuleId) return resolvedClientModuleId;
      return null;
    },
    load(id) {
      if (id !== resolvedClientModuleId) return null;
      return createClientModule(getConfig(), development);
    },
  };
}

function createClientModule(
  config: Pick<ResolvedRiebeckiteConfig, "plugins">,
  development: boolean,
): string {
  const imports: string[] = [];
  const initializers: string[] = [];

  if (development) {
    imports.push(
      'import { initDevelopmentInspector } from "virtual:riebeckite/development-inspector";',
    );
    initializers.push("initDevelopmentInspector()");
  }

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
