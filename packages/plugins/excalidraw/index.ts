import { createStyleAsset, definePlugin } from "@riebeckite/core";
import { remarkExcalidrawMarkdownEmbed } from "./excalidraw_markdown.js";
import {
  listExcalidrawDocumentPaths,
  renderAttachment,
  resolveExcalidrawDocument,
} from "./excalidraw_scene.js";
import { PLUGIN_NAME } from "./excalidraw_shared.js";
import { createExcalidrawRehypePlugin } from "./src/rehype_embeds.js";
import { createExcalidrawRenderSession } from "./src/render-static.js";

export function excalidraw() {
  const session = createExcalidrawRenderSession();
  const embeds = new Map<string, string>();
  let embedSequence = 0;
  const storeEmbed = (html: string): string => {
    const id = `excalidraw-${++embedSequence}`;
    embeds.set(id, html);
    return id;
  };

  return definePlugin({
    name: PLUGIN_NAME,
    order: -21,
    processedContentCache: {
      version: "excalidraw-v3",
      dependencyMode: "tracked",
    },
    extendMarkdownPipeline: (pipeline, context) => {
      pipeline.use(remarkExcalidrawMarkdownEmbed, {
        contentIndex: context.contentIndex,
        contentSource: context.contentSource,
        session,
        storeEmbed,
      });
    },
    rehypePlugins: [createExcalidrawRehypePlugin(embeds)],
    renderers: [
      {
        name: "excalidraw-embed",
        render: async (context) => renderAttachment(context, session),
      },
    ],
    pageTypes: [
      {
        id: "excalidraw-document",
        paths: ({ manifest }) => listExcalidrawDocumentPaths(manifest),
        outputDependencies: [{ type: "global" }],
        resolve: (context) => resolveExcalidrawDocument(context, session),
        resolveRoute: (context) => resolveExcalidrawDocument(context, session),
      },
    ],
    buildEndFastPathSafe: true,
    buildEnd: async () => {
      embeds.clear();
      await session.dispose();
    },
    dispose: async () => {
      embeds.clear();
      await session.dispose();
    },
    assets: [
      createStyleAsset(PLUGIN_NAME, "@riebeckite/plugin-excalidraw/style.css"),
    ],
  });
}
