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
  const clientEntries = config.plugins.flatMap(
    (plugin) => plugin.clientEntries ?? [],
  );
  const runtimeEntries = new Map<
    string,
    {
      moduleSpecifier: string;
      exportName?: string;
      options: unknown;
    }
  >();
  for (const entry of clientEntries) {
    for (const runtime of entry.runtimeEntries ?? []) {
      if (runtimeEntries.has(runtime.id)) {
        throw new Error(`Duplicate plugin runtime id: ${runtime.id}`);
      }
      runtimeEntries.set(runtime.id, {
        moduleSpecifier: runtime.moduleSpecifier,
        exportName: runtime.exportName,
        options: runtime.options,
      });
    }
  }
  const hasRuntimes = runtimeEntries.size > 0;

  imports.push('import { ClientLifecycle } from "@riebeckite/core/client";');
  if (hasRuntimes) {
    imports.push(
      'import { createClientRuntimeHost, InteractiveRuntimeRegistry } from "@riebeckite/runtime/client";',
    );
  }
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

  for (const [index, entry] of clientEntries.entries()) {
    const localName = `pluginClientInitializer${index}`;
    const runtimeIds = (entry.runtimeEntries ?? []).map(
      (runtime) => runtime.id,
    );
    const serializedRuntimeIds = serializePublicClientConfig(runtimeIds);
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
    const ensureRuntimes =
      runtimeIds.length > 0
        ? `await ensurePluginRuntimes(${serializedRuntimeIds}); `
        : "";
    const initializerWrapper =
      runtimeIds.length > 0
        ? `async (context) => { ${ensureRuntimes}return ${initializer}; }`
        : `(context) => ${initializer}`;
    const runtimeArguments = hasRuntimes
      ? `${serializedRuntimeIds}, ${initializerWrapper}`
      : initializerWrapper;
    const runtimeHost = hasRuntimes
      ? `runtimes: createPluginRuntimeHost(root, ${serializedRuntimeIds}), `
      : "";
    const initializers =
      entry.scope === "app" ? appInitializers : pageInitializers;
    if (entry.presenceSelector === undefined) {
      initializers.push(
        `mountPluginClientInitializer(${JSON.stringify(entry.scope ?? "page")}, ${JSON.stringify(entry.moduleSpecifier)}, root, ${serializedConfig}, ${runtimeArguments})`,
      );
      continue;
    }
    const dynamicInitializer =
      entry.initializerArguments === "context"
        ? `initializer(context)`
        : entry.initializerArguments === "root"
          ? `initializer(context.root)`
          : `initializer(context.config)`;
    const dynamicWrapper =
      runtimeIds.length > 0
        ? `async (context) => { ${ensureRuntimes}return ${dynamicInitializer}; }`
        : `(context) => ${dynamicInitializer}`;
    initializers.push(
      `mountConditionalPluginClientInitializer(${JSON.stringify(entry.scope ?? "page")}, ${JSON.stringify(entry.moduleSpecifier)}, root, ${serializedConfig}, ${JSON.stringify(entry.presenceSelector)}, ${hasRuntimes ? `${serializedRuntimeIds}, ` : ""}async () => { const { ${entry.exportName ?? "default"}: initializer } = await import(${JSON.stringify(entry.moduleSpecifier)}); return ${dynamicWrapper}; })`,
    );
  }

  const runtimeSupport = hasRuntimes
    ? `const pluginRuntimeRegistry = new InteractiveRuntimeRegistry();
const pluginRuntimeLoads = new Map();
const pluginRuntimeEntries = {
${[...runtimeEntries.entries()]
  .map(
    ([id, runtime]) =>
      `  ${JSON.stringify(id)}: { moduleSpecifier: ${JSON.stringify(runtime.moduleSpecifier)}, exportName: ${JSON.stringify(runtime.exportName ?? "default")}, load: () => import(${JSON.stringify(runtime.moduleSpecifier)})${runtime.options === undefined ? "" : `, options: ${serializePublicClientConfig(runtime.options)}`} }`,
  )
  .join(",\n")}
};

async function ensurePluginRuntimes(ids) {
  await Promise.all(ids.map(async (id) => {
    let load = pluginRuntimeLoads.get(id);
    if (!load) {
      const entry = pluginRuntimeEntries[id];
      if (!entry) throw new Error("Unknown plugin runtime: " + id);
      load = entry.load().then((module) => {
        const factory = module[entry.exportName];
        if (typeof factory !== "function") throw new Error("Plugin runtime \\"" + id + "\\" did not export a factory.");
        const definition = factory(entry.options);
        if (!definition || definition.id !== id) throw new Error("Plugin runtime \\"" + id + "\\" returned a mismatched definition.");
        pluginRuntimeRegistry.register(definition);
      }).catch((error) => {
        pluginRuntimeLoads.delete(id);
        throw error;
      });
      pluginRuntimeLoads.set(id, load);
    }
    await load;
  }));
}

function createPluginRuntimeHost(root, ids) {
  if (ids.length === 0) return undefined;
  return createClientRuntimeHost({ registry: pluginRuntimeRegistry, root });
}
`
    : "";

  return `${imports.join("\n")}

const lifecycle = new ClientLifecycle();
${runtimeSupport}let stopSpaNavigation;

function mountPluginClientInitializer(scope, name, root, config, ${hasRuntimes ? "runtimeIds, " : ""}initialize) {
  void lifecycle.mount({ scope, name, root, config, ${hasRuntimes ? "runtimes: createPluginRuntimeHost(root, runtimeIds), " : ""}initialize });
}

function mountConditionalPluginClientInitializer(scope, name, root, config, presenceSelector, ${hasRuntimes ? "runtimeIds, " : ""}load) {
  if (!root.querySelector(presenceSelector)) return;
  void load().then((initialize) => {
    if ("isConnected" in root && !root.isConnected) return;
    void lifecycle.mount({ scope, name, root, config, ${hasRuntimes ? "runtimes: createPluginRuntimeHost(root, runtimeIds), " : ""}initialize });
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
