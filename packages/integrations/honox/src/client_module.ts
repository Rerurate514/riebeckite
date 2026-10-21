import type { ResolvedRiebeckiteConfig } from "@riebeckite/core";
import { serializePublicClientConfig } from "@riebeckite/core";
import type { Plugin } from "vite";

const clientModuleId = "virtual:riebeckite/client";
const resolvedClientModuleId = `\0${clientModuleId}`;

export function riebeckiteClientModule(
  getConfig: () => Pick<ResolvedRiebeckiteConfig, "plugins" | "spa">,
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
  config: Pick<ResolvedRiebeckiteConfig, "plugins" | "spa">,
  development: boolean,
): string {
  const imports: string[] = [];
  const appInitializers: string[] = [];
  const pageInitializers: string[] = [];

  imports.push('import { ClientLifecycle } from "@riebeckite/core/client";');
  if (config.spa !== undefined) {
    imports.push('import { createClient } from "honox/client";');
    imports.push('import { startSpaNavigation } from "@riebeckite/spa";');
  }

  if (development) {
    imports.push(
      'import { initDevelopmentInspector } from "virtual:riebeckite/development-inspector";',
    );
    appInitializers.push("initDevelopmentInspector()");
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
    const initializers = entry.scope === "app" ? appInitializers : pageInitializers;
    initializers.push(
      `mountPluginClientInitializer(${JSON.stringify(entry.scope ?? "page")}, ${JSON.stringify(entry.moduleSpecifier)}, root, () => ${initializer})`,
    );
  }

  return `${imports.join("\n")}

const lifecycle = new ClientLifecycle();
let stopSpaNavigation;

function mountPluginClientInitializer(scope, name, root, initialize) {
  void lifecycle.mount({ scope, name, root, config: undefined, initialize });
}

function mountAppClientInitializers(root) {
${appInitializers.map((initializer) => `  ${initializer};`).join("\n")}
}

function mountPageClientInitializers(root) {
${pageInitializers.map((initializer) => `  ${initializer};`).join("\n")}
}

export function initRiebeckiteClient() {
  mountAppClientInitializers(document);
  mountPageClientInitializers(document.querySelector("#main-content") ?? document);
${
  config.spa === undefined
    ? ""
    : `  stopSpaNavigation ??= startSpaNavigation({
    ...${serializePublicClientConfig(config.spa)},
    onBeforePageCommit: () => lifecycle.unmount("page"),
    onPageCommit: async ({ root }) => {
      mountPageClientInitializers(root);
      await createClient();
    },
  });`
}
}

export async function remountRiebeckitePage(root) {
  await lifecycle.unmount("page");
  mountPageClientInitializers(root);
}

export async function disposeRiebeckiteClient() {
  stopSpaNavigation?.();
  stopSpaNavigation = undefined;
  await lifecycle.dispose();
}
`;
}
