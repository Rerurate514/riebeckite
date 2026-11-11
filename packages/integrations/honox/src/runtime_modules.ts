import type { ResolvedRiebeckiteConfig } from "@riebeckite/core";
import type { Plugin } from "vite";
import type { ResolvedHonoxApplication } from "./vite_runner.js";

export const riebeckiteConfigModuleId = "virtual:riebeckite/config";
export const riebeckiteContentModuleId = "virtual:riebeckite/content";
export const riebeckiteContentRenderersModuleId =
  "virtual:riebeckite/content-renderers";

const runtimeModuleIds = [
  riebeckiteConfigModuleId,
  riebeckiteContentModuleId,
  riebeckiteContentRenderersModuleId,
] as const;

const resolvedConfigModuleId = `\0${riebeckiteConfigModuleId}`;
const resolvedContentModuleId = `\0${riebeckiteContentModuleId}`;
const resolvedContentRenderersModuleId = `\0${riebeckiteContentRenderersModuleId}`;

/**
 * Provides the framework-owned bootstrap modules a generated site imports
 * instead of keeping resolved-config and content-manager ceremony in
 * `app/config.ts` and `app/content.ts`.
 */
export function riebeckiteRuntimeModules(
  getApplication: () => ResolvedHonoxApplication,
): Plugin {
  let development = false;
  return {
    name: "riebeckite-runtime-modules",
    configResolved(config) {
      development = config.command === "serve";
    },
    resolveId(id) {
      if (id === riebeckiteConfigModuleId) return resolvedConfigModuleId;
      if (id === riebeckiteContentModuleId) return resolvedContentModuleId;
      if (id === riebeckiteContentRenderersModuleId)
        return resolvedContentRenderersModuleId;
      return null;
    },
    load(id) {
      if (id === resolvedConfigModuleId) {
        const { appRoot, configFile } = getApplication();
        return createConfigModule(appRoot, configFile);
      }
      if (id === resolvedContentModuleId)
        return createContentModule(development);
      if (id === resolvedContentRenderersModuleId)
        return createContentRenderersModule(getApplication().config);
      return null;
    },
  };
}

function createContentRenderersModule(
  config: ResolvedRiebeckiteConfig,
): string {
  const formats = config.plugins.flatMap(
    (plugin) => plugin.contentFormats ?? [],
  );
  const renderers = formats.filter((format) => format.rendererModule);
  const imports = renderers
    .map(
      (format, index) =>
        `import renderer${index} from ${JSON.stringify(format.rendererModule)};`,
    )
    .join("\n");
  const entries = renderers
    .map(
      (format, index) =>
        `{ extension: ${JSON.stringify(format.extension)}, renderer: renderer${index}, options: formats[${formats.indexOf(format)}]?.rendererOptions }`,
    )
    .join(",\n");
  return `import { preparePluginComponent } from "@riebeckite/core";
import { jsx } from "hono/jsx/jsx-runtime";
import { config } from ${JSON.stringify(riebeckiteConfigModuleId)};
${imports}
const formats = config.plugins.flatMap((plugin) => plugin.contentFormats ?? []);
const renderers = [${entries}];
const pluginComponents = config.plugins.flatMap((plugin) => plugin.components ?? []);

function createPluginComponent(component) {
  return async (props) => {
    const prepared = await preparePluginComponent(
      component,
      props && typeof props === "object" ? props : {},
    );
    return jsx("div", {
      "data-riebeckite-component": prepared.name,
      "data-riebeckite-component-props": prepared.props,
      ...(prepared.interactive ? { "data-riebeckite-component-interactive": "true" } : {}),
      dangerouslySetInnerHTML: { __html: prepared.content },
    });
  };
}

const registeredComponents = Object.fromEntries(
  pluginComponents.map((component) => [component.name, createPluginComponent(component)]),
);

export function renderContent(sourcePath) {
  const entry = renderers.find((renderer) => sourcePath.toLowerCase().endsWith(renderer.extension));
  if (!entry) return undefined;
  const options = entry.options && typeof entry.options === "object" ? entry.options : {};
  return entry.renderer(sourcePath, {
    ...options,
    components: { ...registeredComponents, ...(options.components ?? {}) },
  });
}
`;
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

function createContentModule(development: boolean): string {
  if (!development) {
    return `import { ContentManager } from "@riebeckite/core";
import { createContentSource } from "@riebeckite/node";
import { config } from ${JSON.stringify(riebeckiteConfigModuleId)};

export const content = new ContentManager(
  createContentSource(config.content),
  [],
  { config, plugins: config.plugins, isDevelopment: import.meta.env.DEV },
);
`;
  }
  return `import { ContentManager } from "@riebeckite/core";
import { createContentSource } from "@riebeckite/node";
import { createDevelopmentTrace } from "@riebeckite/honox/runtime";
import { config } from ${JSON.stringify(riebeckiteConfigModuleId)};

const trace = createDevelopmentTrace();
export const content = new ContentManager(
  createContentSource(config.content),
  [],
  {
    config,
    plugins: config.plugins,
    isDevelopment: true,
    observability: trace.observability,
    traceRecorder: trace,
  },
);
`;
}
