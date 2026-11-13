import {
  createClientEntry,
  createStyleAsset,
  definePlugin,
} from "@riebeckite/core";
import type { DiagramPluginDefinition } from "./types.js";

export function defineDiagramPlugin<TOptions>(
  definition: DiagramPluginDefinition<TOptions>,
) {
  return definePlugin({
    name: definition.name,
    order: definition.order,
    options: definition.options,
    processedContentCache: definition.processedContentCache,
    validateOptions: definition.validateOptions,
    extendHtmlPipeline: (pipeline) =>
      pipeline.use(definition.rehype as never, definition.options),
    assets: definition.style
      ? [createStyleAsset(definition.name, definition.style)]
      : undefined,
    clientEntries: definition.client
      ? [
          createClientEntry(definition.name, {
            moduleSpecifier: definition.client.moduleSpecifier,
            exportName: definition.client.exportName,
            scope: "page",
            initializerArguments: "context",
            presenceSelector: definition.client.presenceSelector,
          }),
        ]
      : undefined,
  });
}
