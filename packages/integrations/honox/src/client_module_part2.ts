import {
  type ResolvedRiebeckiteConfig,
  serializePublicClientConfig,
} from "@riebeckite/core";

export function createClientModule(
  config: Pick<ResolvedRiebeckiteConfig, "plugins" | "spa">,
  development: boolean,
): string {
  const imports: string[] = [];
  const appInitializers: string[] = [];
  const appConditionalInitializers: string[] = [];
  const pageInitializers: string[] = [];
  const clientEntries = config.plugins.flatMap(
    (plugin) => plugin.clientEntries ?? [],
  );
  const markdownComponents = config.plugins.flatMap(
    (plugin) => plugin.markdownComponents ?? [],
  );
  const interactiveMarkdownComponents = markdownComponents.filter(
    (component) => component.client !== undefined,
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
  if (interactiveMarkdownComponents.length > 0) {
    imports.push('import { hydrateRoot } from "hono/jsx/dom/client";');
    imports.push('import { jsx } from "hono/jsx/jsx-runtime";');
  }
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
    const scope = entry.scope ?? "page";
    const rootMode = entry.root ?? "page";
    if (entry.presenceSelector === undefined) {
      const initializers = scope === "app" ? appInitializers : pageInitializers;
      initializers.push(
        `mountPluginClientInitializer(${JSON.stringify(scope)}, ${JSON.stringify(entry.moduleSpecifier)}, resolveClientEntryRoot(${JSON.stringify(scope)}, root, ${JSON.stringify(rootMode)}), ${serializedConfig}, ${runtimeArguments})`,
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
    const conditionalInitializers =
      scope === "app" ? appConditionalInitializers : pageInitializers;
    conditionalInitializers.push(
      `mountConditionalPluginClientInitializer(${JSON.stringify(scope)}, ${JSON.stringify(entry.moduleSpecifier)}, root, ${serializedConfig}, ${JSON.stringify(entry.presenceSelector)}, ${JSON.stringify(rootMode)}, ${hasRuntimes ? `${serializedRuntimeIds}, ` : ""}async () => { const { ${entry.exportName ?? "default"}: initializer } = await import(${JSON.stringify(entry.moduleSpecifier)}); return ${dynamicWrapper}; })`,
    );
  }

  if (interactiveMarkdownComponents.length > 0) {
    pageInitializers.push("mountMarkdownComponents(root)");
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
${runtimeSupport}const clientModuleDevelopment = ${development ? "true" : "false"};
const conditionalInitializerLoads = new Map();
const warnedConditionalMarkers = new Set();
let stopSpaNavigation;

function resolveClientEntryRoot(scope, pageRoot, rootMode) {
  return scope === "app" || rootMode === "document" ? document : pageRoot;
}

function mountPluginClientInitializer(scope, name, root, config, ${hasRuntimes ? "runtimeIds, " : ""}initialize) {
  void lifecycle.mount({ scope, name, root, config, ${hasRuntimes ? "runtimes: createPluginRuntimeHost(root, runtimeIds), " : ""}initialize }).catch((error) => console.error("[riebeckite] Client initializer failed: " + name, error));
}

function loadConditionalPluginClientInitializer(name, load) {
  let pending = conditionalInitializerLoads.get(name);
  if (!pending) {
    pending = load().catch((error) => {
      conditionalInitializerLoads.delete(name);
      throw error;
    });
    conditionalInitializerLoads.set(name, pending);
  }
  return pending;
}

function mountConditionalPluginClientInitializer(scope, name, pageRoot, config, presenceSelector, rootMode, ${hasRuntimes ? "runtimeIds, " : ""}load) {
  const marker = document.querySelector(presenceSelector);
  if (!marker) return;
  const root = resolveClientEntryRoot(scope, pageRoot, rootMode);
  if (clientModuleDevelopment && scope === "page" && "contains" in root && !root.contains(marker) && !warnedConditionalMarkers.has(name)) {
    warnedConditionalMarkers.add(name);
    console.warn('[riebeckite] Client initializer "' + name + '" has a presence marker outside its page root; set root: "document" or use context.marker.');
  }
  void loadConditionalPluginClientInitializer(name, load).then((initialize) => {
    if (!marker.isConnected) return;
    if ("isConnected" in root && !root.isConnected) return;
    void lifecycle.mount({ scope, name, root, marker, config, ${hasRuntimes ? "runtimes: createPluginRuntimeHost(root, runtimeIds), " : ""}initialize }).catch((error) => console.error("[riebeckite] Client initializer failed: " + name, error));
  }, (error) => console.error("[riebeckite] Client initializer module failed: " + name, error));
}

function mountAppClientInitializers(root) {
${appInitializers.map((initializer) => `  ${initializer};`).join("\n")}
}

function mountAppConditionalClientInitializers(root) {
${appConditionalInitializers.map((initializer) => `  ${initializer};`).join("\n")}
}

function mountPageClientInitializers(root) {
${pageInitializers.map((initializer) => `  ${initializer};`).join("\n")}
}

${
  interactiveMarkdownComponents.length === 0
    ? ""
    : `function mountMarkdownComponents(root) {
  mountPluginClientInitializer("page", "plugin-markdown-components", root, undefined, ${hasRuntimes ? "[], " : ""}async (context) => {
    const roots = [...context.root.querySelectorAll("[data-riebeckite-component-interactive]")];
    const results = await Promise.allSettled(roots.map(async (element) => {
      const name = element.getAttribute("data-riebeckite-component");
      const props = element.getAttribute("data-riebeckite-component-props");
      if (!name || props === null) return undefined;
      const entry = markdownComponentEntries[name];
      if (!entry) return undefined;
      const module = await entry.load();
      const Component = module[entry.exportName];
      if (typeof Component !== "function" || context.signal.aborted || !element.isConnected) return undefined;
      return hydrateRoot(element, jsx(Component, JSON.parse(props)));
    }));
    const cleanups = results.flatMap((result) => {
      if (result.status === "fulfilled") return result.value ? [result.value] : [];
      console.error("[riebeckite] Markdown component failed", result.reason);
      return [];
    });
    return () => cleanups.forEach((root) => root.unmount());
  });
}

const markdownComponentEntries = {
${interactiveMarkdownComponents
  .map(
    (component) =>
      `  ${JSON.stringify(component.name)}: { exportName: ${JSON.stringify(component.client?.exportName ?? "default")}, load: () => import(${JSON.stringify(component.client?.moduleSpecifier)}) }`,
  )
  .join(",\n")}
};`
}

export function initRiebeckiteClient() {
  mountAppClientInitializers(document);
  mountPageClientInitializers(document.querySelector("#main-content") ?? document);
  mountAppConditionalClientInitializers(document);
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
      mountAppConditionalClientInitializers(root);
    },
  });`
}
}

export async function remountRiebeckitePage(root) {
  await lifecycle.unmount("page");
  mountPageClientInitializers(root);
  mountAppConditionalClientInitializers(root);
}

export async function disposeRiebeckiteClient() {
  stopSpaNavigation?.();
  stopSpaNavigation = undefined;
  await lifecycle.dispose();
}
`;
}
