import type { ResolvedRiebeckiteConfig } from "@riebeckite/core";
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
    initializers.push(localName);
  }

  return `${imports.join("\n")}

export function initRiebeckiteClient() {
${initializers.map((name) => `  ${name}();`).join("\n")}
}
`;
}
