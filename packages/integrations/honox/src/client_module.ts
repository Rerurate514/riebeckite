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
    if (entry.presenceSelector === undefined) {
      imports.push(
        `import ${importTarget} from ${JSON.stringify(entry.moduleSpecifier)};`,
      );
    }
    const publicConfig = entry.publicConfig;
    const serializedConfig =
      publicConfig === undefined
        ? "undefined"
        : serializePublicClientConfig(publicConfig);
    const initializer =
      entry.initializerArguments === "context"
        ? `${localName}(context)`
        : entry.initializerArguments === "root"
          ? `${localName}(context.root)`
          : `${localName}(context.config)`;
    const initializers =
      entry.scope === "app" ? appInitializers : pageInitializers;
    if (entry.presenceSelector === undefined) {
      initializers.push(
        `mountPluginClientInitializer(${JSON.stringify(entry.scope ?? "page")}, ${JSON.stringify(entry.moduleSpecifier)}, root, ${serializedConfig}, (context) => ${initializer})`,
      );
      continue;
    }
    const dynamicInitializer =
      entry.initializerArguments === "context"
        ? `initializer(context)`
        : entry.initializerArguments === "root"
          ? `initializer(context.root)`
          : `initializer(context.config)`;
    initializers.push(
      `mountConditionalPluginClientInitializer(${JSON.stringify(entry.scope ?? "page")}, ${JSON.stringify(entry.moduleSpecifier)}, root, ${serializedConfig}, ${JSON.stringify(entry.presenceSelector)}, async () => { const { ${entry.exportName ?? "default"}: initializer } = await import(${JSON.stringify(entry.moduleSpecifier)}); return (context) => ${dynamicInitializer}; })`,
    );
  }

  return `${imports.join("\n")}

const lifecycle = new ClientLifecycle();
let stopSpaNavigation;

function mountPluginClientInitializer(scope, name, root, config, initialize) {
  void lifecycle.mount({ scope, name, root, config, initialize });
}

function mountConditionalPluginClientInitializer(scope, name, root, config, presenceSelector, load) {
  if (!root.querySelector(presenceSelector)) return;
  void load().then((initialize) => {
    if ("isConnected" in root && !root.isConnected) return;
    void lifecycle.mount({ scope, name, root, config, initialize });
  }, (error) => console.error("[riebeckite] Client initializer module failed: " + name, error));
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
    onPageCommit: async ({ root, signal }) => {
      if (signal.aborted) return;
      await createClient();
      if (signal.aborted || !root.isConnected) return;
      mountPageClientInitializers(root);
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
